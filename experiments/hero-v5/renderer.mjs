/** REAL Blank Engine experimental runtime proof. THREE.GLTFLoader from the repo's
 * own browser module path; not a Blender image and not generated illustration.
 * Source: official CC-BY Blender Studio Einar v1 (attribution in UI).
 * Source Cycles film shader is NOT identical to this static PBR port.
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const WIDTH=960,HEIGHT=760;
const scene=new THREE.Scene();scene.background=new THREE.Color('#30343a');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
renderer.setSize(WIDTH,HEIGHT);renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
document.querySelector('#viewport').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe5f0ff,0x323840,2.25));
const key=new THREE.DirectionalLight(0xffede2,4.2);key.position.set(-2,5,4);scene.add(key);
const fill=new THREE.DirectionalLight(0xd4eaff,2.3);fill.position.set(3,3,4);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffeadd,1.1);rim.position.set(3,5,-3);scene.add(rim);
const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,100);
let face=null,eyeL=null,eyeR=null,loaded=false,root=null,front=null,lateral=null,eyeCenter=null,headHeight=0,metrics={};
function objBox(node){return new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());}
function matching(name){
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const key=norm(name);let found=null;
 root.traverse(o=>{if(!o.isMesh)return;
  const own=norm(o.name);let parent=o.parent;
  const byParent=parent&&norm(parent.name).includes(key);
  if(own.includes(key)||byParent)found??=o;
 });
 return found;
}
function cross3(a,b){return a.clone().add(b).multiplyScalar(.5);}
function describe(root){
 const result={mesh_count:0,triangles:0,materials:[],face_textured:false,eye_textured:false,
  eyes_separate:false,cornea_separate:false,blink_playing:false,animation_clips:0,head_height_m:null,
  renderer:'Three.js WebGL2 (Blank Engine experimental Character Lab), real GLTFLoader',
  output_color_space:'sRGB',tone_mapping:'ACESFilmic',static_only:true,photorealism_approved:false,
  credit:'Einar Rig (CC-BY) Blender Foundation | studio.blender.org'};
 const materials=new Set();
 root.traverse(o=>{
  if(!o.isMesh)return;
  result.mesh_count++;
  const g=o.geometry;
  const t=g.index?g.index.count:g.attributes.position?.count||0;
  result.triangles+=Math.floor(t/3);
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(!m)continue;materials.add(m);
   const uses=!!m.map;
   const normalized=String(o.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
   if(normalized.includes('einarhead')&&uses)result.face_textured=true;
   if((normalized.includes('geoeyel')||normalized.includes('geoeyer'))&&uses)result.eye_textured=true;
  }
 });
 result.materials=[...materials].map(m=>({name:m.name,type:m.type,has_map:!!m.map,
  has_normal_map:!!m.normalMap,roughness:m.roughness,metalness:m.metalness,
  transmission:m.transmission||0,transparent:m.transparent}));
 result.eyes_separate=!!(eyeL&&eyeR);
 result.cornea_separate=!!(matching('GEO-eye.cornea.L')&&matching('GEO-eye.cornea.R'));
 result.head_height_m=headHeight;
 return result;
}
async function load(){
 if(loaded)return metrics;
 const progress=document.getElementById('status');
 progress.textContent='Loading real source-pinned Einar glTF into Blank Engine WebGL…';
 const gltf=await new GLTFLoader().loadAsync('/artifacts/hero-v5-einar/einar-static-pbr.glb');
 root=gltf.scene;scene.add(root);
 root.updateWorldMatrix(true,true);
 face=matching('GEO-einar_head');eyeL=matching('GEO-eye.L');eyeR=matching('GEO-eye.R');
 if(!face||!eyeL||!eyeR){const names=[];root.traverse(o=>{if(o.isMesh)names.push(o.name);});
 throw new Error('Original Einar head/eyes missing from runtime glTF; actual mesh names='+JSON.stringify(names));}
 const bounds=new THREE.Box3().setFromObject(face),center=bounds.getCenter(new THREE.Vector3());
 headHeight=bounds.getSize(new THREE.Vector3()).y;
 eyeCenter=cross3(objBox(eyeL),objBox(eyeR));
 front=eyeCenter.clone().sub(center);front.y=0;
 if(front.length()<.002)throw new Error('Source eye/front vector degenerate');
 front.normalize();
 lateral=objBox(eyeR).sub(objBox(eyeL));lateral.y=0;
 lateral.addScaledVector(front,-lateral.dot(front));
 if(lateral.length()<.001)throw new Error('Einar eye lateral baseline degenerate');
 lateral.normalize();
 if(headHeight<.05||headHeight>3)throw new Error('Unexpected head bounding scale '+headHeight);
 metrics=describe(root);metrics.animation_clips=gltf.animations.length;
 if(!metrics.face_textured||!metrics.eye_textured||!metrics.cornea_separate)
  throw new Error('PBR glTF evidence insufficient: '+JSON.stringify(metrics));
 loaded=true;progress.textContent='REAL Einar static glTF loaded by Blank Engine WebGL; blink/film shaders not yet ported.';
 return metrics;
}
function show(view='front'){
 if(!loaded)throw new Error('Call load first');
 const views={
  front:{dir:front,target:eyeCenter.clone().add(new THREE.Vector3(0,-headHeight*.15,0)),height:headHeight*1.32},
  three_quarter:{dir:front.clone().multiplyScalar(.75).addScaledVector(lateral,.65).normalize(),
    target:eyeCenter.clone().add(new THREE.Vector3(0,-headHeight*.15,0)),height:headHeight*1.32},
  profile:{dir:lateral,target:eyeCenter.clone().add(new THREE.Vector3(0,-headHeight*.15,0)),height:headHeight*1.32},
  eyes_macro:{dir:front,target:eyeCenter,height:headHeight*.49},
  eyes_three_quarter:{dir:front.clone().multiplyScalar(.86).addScaledVector(lateral,.51).normalize(),
    target:eyeCenter,height:headHeight*.49}
 };
 const shot=views[view];if(!shot)throw new Error('Unknown camera view '+view);
 const aspect=WIDTH/HEIGHT,h=shot.height;
 camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2;camera.bottom=-h/2;
 camera.position.copy(shot.target).addScaledVector(shot.dir,Math.max(.8,headHeight*3));
 camera.lookAt(shot.target);camera.up.set(0,1,0);camera.updateProjectionMatrix();
 renderer.render(scene,camera);
 return {view,loaded_meshes:metrics.mesh_count,face_textured:metrics.face_textured,eye_textured:metrics.eye_textured};
}
window.blankHeroV5={load,show,report:()=>({...metrics})};
document.getElementById('status').textContent='Ready for automated real WebGL model load.';
