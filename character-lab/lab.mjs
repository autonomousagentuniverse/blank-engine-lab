/** Isolated Blank Engine Character Lab. All user GLBs remain local to the browser. */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HERO_REFERENCE,MAX_CHARACTER_BYTES,inspectLabGlb,auditLoadedCharacter,createCharacterPackage} from './character-spec.mjs';
import {mapHumanoidBones,REQUIRED_HUMANOID} from '../character/retarget.mjs';
import {repairSuitedMaterials} from './repair.mjs';
import {finishHeroPBR} from './hero-finish.mjs';
import {repairHeroEyes,inspectHeroEyes} from './eyes.mjs';
import {createUniversalInspector} from '../inspection/focus.mjs';
import {REVIEW_VIEWS,LIGHT_PRESETS,auditStaticReview} from './hero-review.mjs';
const $=id=>document.getElementById(id);
const viewport=$('viewport'),renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
viewport.insertBefore(renderer.domElement,viewport.firstChild);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x131f31);
const camera=new THREE.PerspectiveCamera(39,1,.04,180);camera.position.set(3,1.85,4.7);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;controls.minDistance=.13;controls.maxDistance=14;controls.maxPolarAngle=Math.PI*.54;
const ambient=new THREE.HemisphereLight(0xdbeeff,0x384052,1.25);scene.add(ambient);
const key=new THREE.DirectionalLight(0xfff1e0,2.6);key.position.set(-3,7,4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=8;key.shadow.camera.bottom=-6;key.shadow.bias=-.00035;scene.add(key);
const rim=new THREE.DirectionalLight(0x85b7fc,1.55);rim.position.set(4,5,-4);scene.add(rim);
const fill=new THREE.DirectionalLight(0xc3deff,.9);fill.position.set(3,2,5);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshStandardMaterial({color:0x5d6877,roughness:.88,metalness:0}));floor.rotateX(-Math.PI/2);floor.receiveShadow=true;scene.add(floor);
const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05,.018,8,128),new THREE.MeshBasicMaterial({color:0x80abbc,transparent:true,opacity:.6}));ring.rotateX(-Math.PI/2);ring.position.y=.018;scene.add(ring);
const grid=new THREE.GridHelper(40,40,0x51647a,0x30465b);grid.position.y=.013;grid.material.transparent=true;grid.material.opacity=.26;scene.add(grid);
let reviewView='front',reviewLight='portrait',capturedViews=new Set(),sourceRoot=null,sourceGltf=null,stageRoot=null,mixer=null,actions=[],activeAction=null,assetBytes=null,assetName='',assetOrigin='',assetLicense='',audit=null,paused=false,turntable=false,skeletonHelper=null,skeletonVisible=false,wireframe=false,currentMaterial=null;
const originalMaterials=new Map();let sunMode=false,latestRun=performance.now(),frames=0,elapsed=0,loadTicket=0;
const setStatus=(text,error=false)=>{$('status').textContent=text;$('status').classList.toggle('error',error);};

// Shared with Object Builder and Scene Builder: selection is a 3D surface
// anchor, not a character-specific bone, eye or facial landmark.
const detailInspector=createUniversalInspector(THREE,{
 camera,canvas:renderer.domElement,controls,getRoots:()=>stageRoot?[stageRoot]:[],afterFocus:updateDetailUI
});
function updateDetailUI(state=detailInspector.getState()){
 const selected=state.selected;
 $('detailPick').textContent='Pick any detail: '+(state.armed?'ON':'off');
 $('detailName').textContent=selected?`Selected: ${selected.label} · ${selected.distance.toFixed(2)} m`:'Select any visible feature: eye, hand, clothing seam, prop or component.';
 $('detailDistance').disabled=!selected;$('detailDistance').value=selected?Math.min(5,selected.distance):1;
 $('detailDistanceValue').textContent=selected?selected.distance.toFixed(2)+' m':'—';
 for(const id of ['detailBookmark','detailCapture','detailReturn'])$(id).disabled=!selected;
}
function syncDetailBookmarks(){
 const select=$('detailSaved'),selected=select.value;
 select.innerHTML='<option value="">Saved inspection views</option>';
 for(const item of detailInspector.bookmarks.list()){
  const option=document.createElement('option');option.value=String(item.id);option.textContent=item.label;select.add(option);
 }
 if([...select.options].some(o=>o.value===selected))select.value=selected;
}

function updateMaterialSelection(){
 const s=$('materialSelect');const option=s.selectedOptions[0];currentMaterial=option?originalMaterials.get(Number(option.value))?.material:null;
 for(const id of ['roughness','metalness','resetMaterials'])$(id).disabled=!currentMaterial;
 if(currentMaterial){$('roughness').value=currentMaterial.roughness??.8;$('metalness').value=currentMaterial.metalness??0;}
 $('roughnessValue').textContent=Number($('roughness').value).toFixed(2);$('metalnessValue').textContent=Number($('metalness').value).toFixed(2);
}
function cleanModel(){
 detailInspector.clear({restore:false});detailInspector.bookmarks.clear();syncDetailBookmarks();
 $('downloadRepairedBtn').disabled=true;
 if(skeletonHelper){scene.remove(skeletonHelper);skeletonHelper.geometry.dispose();skeletonHelper.material.dispose();skeletonHelper=null;}
 if(stageRoot){scene.remove(stageRoot);stageRoot=null;}
 if(mixer){mixer.stopAllAction();mixer.uncacheRoot(sourceRoot);mixer=null;}
 // GLTFLoader resources are disposed on replacement; never dispose shared studio materials.
 const geo=new Set(),mats=new Set(),textures=new Set();
 sourceRoot?.traverse(o=>{if(o.geometry)geo.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){mats.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
 geo.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
 sourceRoot=null;sourceGltf=null;originalMaterials.clear();activeAction=null;actions=[];currentMaterial=null;
}
async function assetDigest(buffer){const d=await crypto.subtle.digest('SHA-256',buffer);return [...new Uint8Array(d)].map(n=>n.toString(16).padStart(2,'0')).join('');}
async function loadGLB(buffer,{name,origin,license}){
 const ticket=++loadTicket,pre=inspectLabGlb(buffer);setStatus('Validating glTF geometry, rig, animations and materials…');
 const gltf=await new Promise((res,rej)=>new GLTFLoader().parse(buffer,'',res,rej));
 if(ticket!==loadTicket)return;
 const report=auditLoadedCharacter(gltf.scene,gltf.animations,{THREE});
 if(report.skinnedMeshes<1)throw Error('Character Lab requires real GPU-skinned meshes');
 const boneMap=mapHumanoidBones(gltf.scene),missing=REQUIRED_HUMANOID.filter(n=>!boneMap[n]);
 cleanModel();capturedViews.clear();refreshReview();sourceRoot=gltf.scene;sourceGltf=gltf;assetBytes=buffer;assetName=name;assetOrigin=origin;assetLicense=license;
 const bbox=new THREE.Box3().setFromObject(sourceRoot),height=bbox.getSize(new THREE.Vector3()).y;
 if(!Number.isFinite(height)||height<.2)throw Error('Character geometry has invalid height');
 const scale=1.82/height,root=new THREE.Group();sourceRoot.scale.setScalar(scale);sourceRoot.position.set(-bbox.getCenter(new THREE.Vector3()).x*scale,-bbox.min.y*scale,-bbox.getCenter(new THREE.Vector3()).z*scale);
 root.add(sourceRoot);stageRoot=root;scene.add(root);
 sourceRoot.traverse(obj=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;}});
 audit={...report,validatedBones:Object.keys(boneMap).length,missingRoles:missing,originalBytes:pre.bytes,heightMeters:height};
 mixer=new THREE.AnimationMixer(sourceRoot);actions=gltf.animations.map(clip=>mixer.clipAction(clip));
 const cs=$('clipSelect');cs.innerHTML='';cs.disabled=actions.length===0;
 if(actions.length){gltf.animations.forEach((clip,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=clip.name||`Clip ${i+1}`;cs.add(opt)});const idle=gltf.animations.findIndex(c=>/idle|stand/i.test(c.name));cs.value=String(Math.max(0,idle));playClip(Number(cs.value));}
 else {const opt=document.createElement('option');opt.textContent='No authored animations';cs.add(opt);}
 $('pauseBtn').disabled=$('resetPoseBtn').disabled=!actions.length;$('neutralPoseBtn').disabled=!actions.length;$('captureBtn').disabled=false;
 const names=new Map();let k=0;sourceRoot.traverse(o=>{for(const mat of (Array.isArray(o.material)?o.material:o.material?[o.material]:[]))if(!names.has(mat))names.set(mat,k++);});
 const ms=$('materialSelect');ms.innerHTML='';for(const [m,i] of names){originalMaterials.set(i,{material:m,roughness:m.roughness??1,metalness:m.metalness??0});const opt=document.createElement('option');opt.value=String(i);opt.textContent=m.name||`Material ${i+1}`;ms.add(opt);}ms.disabled=!names.size;ms.value='0';updateMaterialSelection();
 $('emptyState').hidden=true;$('modelTitle').textContent=name;$('runtimeState').textContent='RIGGED 3D ASSET · ACTIVE';$('animationPill').textContent=actions.length?`${actions.length} AUTHORED CLIPS`:'RIGGED · NO CLIPS';
 applyReviewView(reviewView);
 const stats={vertices:report.vertices.toLocaleString(),triangles:report.triangles.toLocaleString(),bones:String(report.bones),skinnedMeshes:String(report.skinnedMeshes),textures:String(report.textures),materials:String(report.materials),animations:String(gltf.animations.length),decoded:`${(report.decodedTextureBytes/1048576).toFixed(1)} MiB`};
 $('audit').innerHTML='';for(const [key,value] of Object.entries(stats)){$('audit').append(Object.assign(document.createElement('dt'),{textContent:key.replace(/([A-Z])/g,' $1')}),Object.assign(document.createElement('dd'),{textContent:value}));}
 const problems=[...report.warnings,...missing.map(n=>`Missing canonical rig role: ${n}`)];
 $('quality').innerHTML='';
 for(const line of [...(problems.length?problems:['Rigged asset meets structural checks']),`Photorealism: NOT VERIFIED — inspect lighting, face, cloth and deformation visually`,`License: ${license}`]){$('quality').append(Object.assign(document.createElement('p'),{textContent:line}));}
 $('exportBtn').disabled=false;setStatus(`Loaded ${name} · ${report.skinnedMeshes} skinned meshes · ${report.textures} image textures · ${actions.length} authored clips${missing.length?' · skeleton-mapping review required':''}.`);
}
function playClip(i){if(!mixer||!actions[i])return;const next=actions[i];next.reset();next.enabled=true;next.play();if(activeAction&&activeAction!==next)next.crossFadeFrom(activeAction,.23,false);activeAction=next;paused=false;$('pauseBtn').textContent='Pause';}
/** Static gate: take all screenshots from an authored idle pose rather than
 * an arbitrary frame from the walking animation. It does NOT change the GLB. */
function freezeNeutralPose(){
 if(!actions.length||!mixer)return;
 const idx=sourceGltf.animations.findIndex(x=>/^idle$/i.test(x.name));
 const chosen=idx>=0?idx:0;
 actions.forEach(a=>a.stop());activeAction=actions[chosen];activeAction.reset().play();
 mixer.setTime(Math.min(.10,activeAction.getClip().duration*.15));
 paused=true;turntable=false;$('pauseBtn').textContent='Resume';$('turntableBtn').textContent='Orbit: off';$('clipSelect').value=String(chosen);
 setStatus('Neutral idle pose frozen for static appearance review. No motion-quality claim.');
}
function applyReviewView(name){
 detailInspector.clear({restore:false});
 if(!Object.hasOwn(REVIEW_VIEWS,name))throw Error('Invalid review camera');reviewView=name;
 const v=REVIEW_VIEWS[name];camera.position.set(...v.position);controls.target.set(...v.target);controls.update();
 $('reviewView').value=name;
}
function applyReviewLight(name){
 if(!Object.hasOwn(LIGHT_PRESETS,name))throw Error('Invalid studio lighting');reviewLight=name;
 const p=LIGHT_PRESETS[name];scene.background.setHex(p.bg);ambient.intensity=p.ambient;key.intensity=p.key;rim.intensity=p.rim;fill.intensity=p.fill;renderer.toneMappingExposure=p.exposure;
 $('lightBtn').textContent='Lighting: '+name;$('reviewLighting').value=name;
}
function refreshReview(){const review=auditStaticReview({captures:[...capturedViews]});$('reviewStatus').textContent=`Review captures: ${capturedViews.size}/5. Missing ${review.missingViews.join(', ')||'none'}. Photorealism not certified.`;}
$('neutralPoseBtn').onclick=freezeNeutralPose;
$('reviewView').onchange=e=>{freezeNeutralPose();applyReviewView(e.target.value)};
$('reviewLighting').onchange=e=>applyReviewLight(e.target.value);
$('captureBtn').onclick=()=>{
 if(!sourceRoot)return;
 freezeNeutralPose();renderer.render(scene,camera);
 renderer.domElement.toBlob(blob=>{
  if(!blob){setStatus('Capture failed: canvas unavailable',true);return;}
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`hero-v21-${reviewView}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  capturedViews.add(reviewView);refreshReview();setStatus('Saved '+reviewView+' still. Review face, hair, clothing and silhouette manually.');
 },'image/png');
};
applyReviewLight('portrait');refreshReview();updateDetailUI();syncDetailBookmarks();

// Precise generic inspection: freeze the current character before tapping a
// surface to avoid selecting an animated pose by accident.
$('detailPick').onclick=()=>{
 if(!sourceRoot){setStatus('Load a character before picking details.',true);return;}
 const enabling=!detailInspector.getState().armed;
 if(enabling)freezeNeutralPose();
 detailInspector.setArmed(enabling);
 setStatus(enabling?'Tap or click a specific surface feature in the 3D viewport.':'Detail picking disabled; saved views remain available.');
};
$('detailDistance').oninput=e=>{if(detailInspector.getState().selected)detailInspector.setDistance(Number(e.target.value));};
$('detailBookmark').onclick=()=>{
 const saved=detailInspector.bookmark();if(!saved)return;
 syncDetailBookmarks();$('detailSaved').value=String(saved.id);setStatus('Saved focus on '+saved.label+'; repeat this view during revisions.');
};
$('detailSaved').onchange=e=>{const id=Number(e.target.value);if(id&&detailInspector.recall(id))setStatus('Recalled inspection view '+id+'.');};
$('detailReturn').onclick=()=>{detailInspector.clear();setStatus('Returned from detailed inspection.');};
$('detailCapture').onclick=()=>{
 if(!detailInspector.getState().selected)return;
 // Capture the actual WebGL frame at the chosen focus, not a generated illustration.
 renderer.render(scene,camera);
 renderer.domElement.toBlob(blob=>{
  if(!blob){setStatus('Cannot capture inspection frame.',true);return;}
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='blank-feature-inspection.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setStatus('Saved close-up screenshot; use saved views to compare later revisions.');
 },'image/png');
};

async function openReference(){
 $('referenceBtn').disabled=true;setStatus('Fetching CC0 MakeHuman reference (6.7 MB)…');
 try{let response=await fetch(HERO_REFERENCE.localUrl,{cache:'no-store'});if(!response.ok)response=await fetch(HERO_REFERENCE.download,{cache:'force-cache'});
  if(!response.ok)throw Error(`Reference not reachable (HTTP ${response.status}); use Import GLB instead`);
  const raw=await response.arrayBuffer();if(raw.byteLength!==HERO_REFERENCE.bytes)throw Error('Reference size differs from pinned upstream asset');
  if(await assetDigest(raw)!==HERO_REFERENCE.sha256)throw Error('Reference SHA-256 integrity check failed');
  // Reference contains pink sockets without eyeballs; new eye meshes are parented
  // to the original animated head bone. Do not repair user-imported GLBs.
  const finished=repairHeroEyes(finishHeroPBR(repairSuitedMaterials(raw)));
  const eyeAudit=inspectHeroEyes(finished);
  if(eyeAudit.nodes!==8||eyeAudit.joints!==53||eyeAudit.clips!==4)throw Error('Corrected eye geometry failed audit');
  await loadGLB(finished,{name:'Suited Human — eye-corrected CC0 reference',origin:HERO_REFERENCE.source,license:HERO_REFERENCE.license});
  $('downloadRepairedBtn').disabled=false;freezeNeutralPose();applyReviewView('front');capturedViews.clear();refreshReview();
  setStatus('Repaired reference loaded: corrected head-bone eye geometry, opaque face/chest and PBR materials. Static review still required.');
 }catch(e){setStatus('Reference loading failed: '+e.message,true)}finally{$('referenceBtn').disabled=false;}
}
$('referenceBtn').onclick=openReference;
$('downloadRepairedBtn').onclick=()=>{if(!assetBytes||assetName!=='Suited Human — eye-corrected CC0 reference')return;const b=new Blob([assetBytes],{type:'model/gltf-binary'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='blank-hero-suited-v22-eyes.glb';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
$('avatarFile').onchange=async event=>{const file=event.target.files?.[0];try{if(file){if(file.size>MAX_CHARACTER_BYTES)throw Error('GLB is larger than 32 MiB');await loadGLB(await file.arrayBuffer(),{name:file.name,origin:'local-file',license:'user-supplied'});}}catch(e){setStatus('Import rejected: '+e.message,true)}finally{event.target.value='';}};
$('clipSelect').onchange=e=>playClip(Number(e.target.value));$('pauseBtn').onclick=()=>{paused=!paused;$('pauseBtn').textContent=paused?'Resume':'Pause';};
$('resetPoseBtn').onclick=()=>{actions.forEach(a=>a.stop());mixer?.setTime(0);if(actions.length)playClip(Number($('clipSelect').value));};
$('turntableBtn').onclick=()=>{turntable=!turntable;$('turntableBtn').textContent=`Orbit: ${turntable?'on':'off'}`;};
$('lightBtn').onclick=()=>applyReviewLight(reviewLight==='portrait'?'daylight':reviewLight==='daylight'?'neutral':'portrait');
$('skeletonBtn').onclick=()=>{skeletonVisible=!skeletonVisible;if(!sourceRoot){skeletonVisible=false;return;}if(skeletonHelper){scene.remove(skeletonHelper);skeletonHelper.geometry.dispose();skeletonHelper.material.dispose();skeletonHelper=null;}if(skeletonVisible){skeletonHelper=new THREE.SkeletonHelper(sourceRoot);scene.add(skeletonHelper)}$('skeletonBtn').textContent=`Skeleton: ${skeletonVisible?'on':'off'}`;};
$('wireBtn').onclick=()=>{wireframe=!wireframe;for(const {material} of originalMaterials.values())material.wireframe=wireframe;$('wireBtn').textContent=`Wireframe: ${wireframe?'on':'off'}`;};
$('materialSelect').onchange=updateMaterialSelection;
for(const id of ['roughness','metalness'])$(id).oninput=()=>{if(!currentMaterial)return;currentMaterial[id]=Number($(id).value);$(id+'Value').textContent=Number($(id).value).toFixed(2);currentMaterial.needsUpdate=true;};
$('resetMaterials').onclick=()=>{for(const {material,roughness,metalness} of originalMaterials.values()){material.roughness=roughness;material.metalness=metalness;material.needsUpdate=true;}updateMaterialSelection();setStatus('Restored original material parameters.');};
$('exportBtn').onclick=async()=>{try{const hash=await assetDigest(assetBytes);const pkg=createCharacterPackage({assetName,assetBytes:assetBytes.byteLength,assetHash:hash,license:assetLicense,audit,source:assetOrigin});
const blob=new Blob([JSON.stringify(pkg,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='blank-hero-character-spec.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('Exported CharacterSpec. Keep it alongside the matching GLB.');}catch(e){setStatus(e.message,true)}};
const ro=new ResizeObserver(()=>{const w=Math.max(1,viewport.clientWidth),h=Math.max(1,viewport.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);});ro.observe(viewport);
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(0,(now-latestRun)/1000));latestRun=now;if(mixer&&!paused)mixer.update(dt);if(turntable&&stageRoot)stageRoot.rotation.y+=dt*.32;controls.update();detailInspector.follow();renderer.render(scene,camera);frames++;elapsed+=dt;if(elapsed>=1){$('perfHud').textContent=`${Math.round(frames/elapsed)} FPS · ${renderer.info.render.calls} draw calls · ${renderer.info.render.triangles.toLocaleString()} triangles`;frames=0;elapsed=0;}}
requestAnimationFrame(frame);
