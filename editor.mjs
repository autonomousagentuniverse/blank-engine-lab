import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';
import { DEFAULT_SPEC, validateSpec, compilePrompt, worldLayout, parseImportedGameSpec } from './core.mjs';
const $=(id)=>document.getElementById(id);
const holder=$('viewport');
let spec;
try { spec=validateSpec(JSON.parse(localStorage.getItem('blankbox-game-v1'))); } catch { spec=validateSpec(DEFAULT_SPEC); }
let renderer,scene,camera,player,light,hemi,sky,ground,beacon,robotActors=[],walls=[],objects=[],t=0,last=performance.now(),fpsSum=0,fpsFrames=0,cameraYaw=0.45,cameraPitch=0.32,cameraDistance=16,mouseDown=false,prevX=0,prevY=0,paused=false;
const pressed=new Set();
const palette={cyan:0x24bde4,violet:0x9c83ff,amber:0xffb95b,emerald:0x43dca8};
let materials=[];
let playerPos=new THREE.Vector3(0,0.95,0), beaconPos=new THREE.Vector3(27,0,25);
function material(color, extra={}) { const m=new THREE.MeshStandardMaterial({color,roughness:.62,metalness:.26,...extra}); materials.push(m); return m; }
function addMesh(geo,mat,parent=scene){ const mesh=new THREE.Mesh(geo,mat); parent.add(mesh); return mesh; }
function clearWorld(){
  for(const m of objects){scene.remove(m); m.traverse(n=>{if(n.geometry)n.geometry.dispose();});}
  for(const m of materials)m.dispose();
  objects=[];materials=[];walls=[];robotActors=[];
}
function init(){
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(62,1,.1,300);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  holder.appendChild(renderer.domElement);
  light=new THREE.DirectionalLight(0xc6ebff,2.1); light.position.set(-14,31,-25);scene.add(light);
  hemi=new THREE.HemisphereLight(0x82c2ff,0x131624,1.6); scene.add(hemi);
  sky=new THREE.Color(0x071325);scene.background=sky;
  scene.fog=new THREE.FogExp2(0x071325,.012);
  window.addEventListener('resize',resize); resize();
  const c=renderer.domElement;
  c.addEventListener('pointerdown',(e)=>{mouseDown=true;prevX=e.clientX;prevY=e.clientY;c.setPointerCapture(e.pointerId);});
  c.addEventListener('pointerup',()=>mouseDown=false);
  c.addEventListener('pointercancel',()=>mouseDown=false);
  c.addEventListener('pointermove',(e)=>{if(!mouseDown)return;cameraYaw-=(e.clientX-prevX)*.006;cameraPitch=Math.max(.12,Math.min(1.25,cameraPitch+(e.clientY-prevY)*.004));prevX=e.clientX;prevY=e.clientY;});
  c.addEventListener('wheel',(e)=>{cameraDistance=Math.max(7,Math.min(32,cameraDistance+e.deltaY*.015));},{passive:true});
  window.addEventListener('keydown',e=>{ if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();pressed.add(e.code); });
  window.addEventListener('keyup',e=>pressed.delete(e.code));
  window.addEventListener('blur',()=>pressed.clear());
  document.querySelectorAll('[data-key]').forEach(b=>{
    const key=b.dataset.key;
    const on=e=>{e.preventDefault();pressed.add(key);};const off=e=>{e.preventDefault();pressed.delete(key);};
    b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off);b.addEventListener('pointercancel',off);
  });
  rebuild(); requestAnimationFrame(frame);
}
function resize(){const w=Math.max(1,holder.clientWidth),h=Math.max(1,holder.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
function wallCollision(x,z){if(Math.abs(x)>62||Math.abs(z)>62)return true;return walls.some(w=>Math.abs(x-w.x)<w.hw+.58 && Math.abs(z-w.z)<w.hd+.58);}
function makeRobot(x,z,phase,i,accent){
  const group=new THREE.Group(); group.position.set(x,0,z);
  const main=material(i%3===0?0xff6b81:0x758fa9,{metalness:.8});
  const eye=material(accent,{emissive:accent,emissiveIntensity:2.2});
  const shell=addMesh(new THREE.BoxGeometry(1.2,1.6,.8),main,group);shell.position.y=1.65;
  const head=addMesh(new THREE.BoxGeometry(.86,.68,.85),main,group);head.position.y=2.7;
  const visor=addMesh(new THREE.BoxGeometry(.59,.16,.12),eye,group);visor.position.set(0,2.75,-.47);
  for(const d of [-.39,.39]){const leg=addMesh(new THREE.BoxGeometry(.31,.9,.37),main,group);leg.position.set(d,.49,0);}
  scene.add(group);objects.push(group);
  robotActors.push({group,homeX:x,homeZ:z,phase,body:shell,head});
}
function makeBuilding(x,z,width,height,accent,i){
  const depth=width*(.7+(i%3)*.14),grp=new THREE.Group();grp.position.set(x,0,z);
  const slab=material(i%3===0?0x1f3e54:i%3===1?0x283246:0x26384b,{metalness:.35,roughness:.8});
  const tower=addMesh(new THREE.BoxGeometry(width,height,depth),slab,grp);tower.position.y=height/2;
  const cap=addMesh(new THREE.BoxGeometry(width+.35,.25,depth+.35),material(accent,{emissive:accent,emissiveIntensity:.9}),grp);cap.position.y=height;
  const edge=material(accent,{emissive:accent,emissiveIntensity:.9});
  for(const side of [-1,1]){const strip=addMesh(new THREE.BoxGeometry(.09,height*.78,.09),edge,grp);strip.position.set(side*(width/2-.15),height*.5,-depth/2-.018);}
  const windows=material(i%4===0?0xffd08a:accent,{emissive:i%4===0?0xffd08a:accent,emissiveIntensity:.75,transparent:true,opacity:.85});
  const rows=Math.min(8,Math.floor(height/2.8));
  for(let r=0;r<rows;r++)for(let col=0;col<3;col++){
    if((r*5+col*7+i)%5===0)continue;
    const window=addMesh(new THREE.PlaneGeometry(.48,.55),windows,grp);window.position.set((col-1)*width*.24,2.1+r*2.8,-depth/2-.018);
  }
  scene.add(grp);objects.push(grp);walls.push({x,z,hw:width/2,hd:depth/2});
}
function rebuild(){
  clearWorld();t=0;
  const accent=palette[spec.theme],night=spec.time==='night';
  sky.set(night?0x06101d:0x80b5d1);scene.fog.color.set(night?0x071325:0xa3c9cf);scene.fog.density=night?.012:.007;
  renderer.toneMappingExposure=night?1.35:1.0;
  hemi.color.set(night?0x6e91ec:0xe0eeff);hemi.groundColor.set(night?0x15192a:0x667b6f);hemi.intensity=night?1.5:2.8;
  light.color.set(night?0xa3b7ff:0xffedc9);light.intensity=night?1.5:3.0;
  light.position.set(-30,night?18:48,-15);
  const base=material(night?0x101c2d:0x577176,{roughness:1});
  ground=addMesh(new THREE.PlaneGeometry(150,150),base);ground.rotation.x=-Math.PI/2;objects.push(ground);
  const grid=new THREE.GridHelper(150,75,accent,night?0x1a3042:0x688a96);grid.position.y=.026;scene.add(grid);objects.push(grid);
  for(let i=0;i<8;i++){const road=addMesh(new THREE.BoxGeometry(i%2?150:1.3,.03,i%2?1.3:150),material(0x0b1a23));road.position.set(i%2?0:(i-4)*17,.037,i%2?(i-4)*17:0);objects.push(road);}
  const {buildings,robots}=worldLayout(spec);
  buildings.forEach((b,i)=>makeBuilding(b.x,b.z,b.width,b.height,accent,i));
  robots.forEach((r,i)=>makeRobot(r.x,r.z,r.phase,i,accent));
  const pgroup=new THREE.Group(),armor=material(0xc6e4ec,{metalness:.5}),trim=material(accent,{emissive:accent,emissiveIntensity:.8});
  const chest=addMesh(new THREE.BoxGeometry(1.15,1.38,.7),armor,pgroup);chest.position.y=1.62;
  const helmet=addMesh(new THREE.SphereGeometry(.47,12,8),armor,pgroup);helmet.position.y=2.64;
  const face=addMesh(new THREE.BoxGeometry(.62,.17,.09),trim,pgroup);face.position.set(0,2.65,-.43);
  for(const s of [-1,1]) {const limb=addMesh(new THREE.BoxGeometry(.32,.87,.35),armor,pgroup);limb.position.set(s*.3,.47,0);}
  pgroup.position.copy(playerPos);pgroup.position.y=0;scene.add(pgroup);objects.push(pgroup);player=pgroup;
  beacon=new THREE.Group();beacon.position.copy(beaconPos);
  const ring=addMesh(new THREE.TorusGeometry(2.2,.12,8,48),material(0xffd27a,{emissive:0xffbc37,emissiveIntensity:1.8}),beacon);ring.position.y=3;
  const center=addMesh(new THREE.IcosahedronGeometry(.66),material(0xffdc86,{emissive:0xffa51d,emissiveIntensity:2}),beacon);center.position.y=3;
  const beam=addMesh(new THREE.CylinderGeometry(.07,.07,13,8),material(0xffcc66,{transparent:true,opacity:.4,emissive:0xffbd4a,emissiveIntensity:1}),beacon);beam.position.y=6.5;
  scene.add(beacon);objects.push(beacon);
  syncUI();
}
function frame(now){requestAnimationFrame(frame);let dt=Math.min(.05,(now-last)/1000);last=now;if(!paused){update(dt);renderer.render(scene,camera);}fpsSum+=dt;fpsFrames++;if(fpsSum>=.5){$('fps').textContent=Math.round(fpsFrames/fpsSum)+' FPS';fpsSum=0;fpsFrames=0;}}
function update(dt){
  t+=dt;
  let dx=0,dz=0;
  if(pressed.has('KeyW')||pressed.has('ArrowUp'))dz-=1;
  if(pressed.has('KeyS')||pressed.has('ArrowDown'))dz+=1;
  if(pressed.has('KeyA')||pressed.has('ArrowLeft'))dx-=1;
  if(pressed.has('KeyD')||pressed.has('ArrowRight'))dx+=1;
  if(dx||dz){const angle=Math.atan2(dx,dz)+cameraYaw;const speed=10*dt;const vx=Math.sin(angle)*speed,vz=Math.cos(angle)*speed;
    const nx=playerPos.x+vx,nz=playerPos.z+vz;
    if(!wallCollision(nx,playerPos.z))playerPos.x=nx;
    if(!wallCollision(playerPos.x,nz))playerPos.z=nz;
    player.rotation.y=Math.atan2(vx,vz);
  }
  player.position.set(playerPos.x,Math.sin(t*9)*(dx || dz ? .05 : .01),playerPos.z);
  robotActors.forEach((r,i)=>{const a=t*.65+r.phase+i,rad=2.4; r.group.position.set(r.homeX+Math.sin(a)*rad,Math.sin(t*3+i)*.04,r.homeZ+Math.cos(a)*rad);r.group.rotation.y=-a;r.head.rotation.z=Math.sin(t*2+i)*.06;});
  const look=new THREE.Vector3(playerPos.x,1.55,playerPos.z),cp=cameraPitch;
  const dest=new THREE.Vector3(look.x+Math.sin(cameraYaw)*Math.cos(cp)*cameraDistance,look.y+Math.sin(cp)*cameraDistance,look.z+Math.cos(cameraYaw)*Math.cos(cp)*cameraDistance);
  camera.position.lerp(dest,Math.min(1,dt*10));camera.lookAt(look);
  beacon.rotation.y=t*.7;
  const dist=Math.hypot(playerPos.x-beaconPos.x,playerPos.z-beaconPos.z);
  $('distanceText').textContent=dist<3?'✓ Objective reached':Math.round(dist)+' m to target';
}
function syncUI(){
  $('gameTitle').textContent=spec.title;$('sceneName').textContent=spec.title;
  $('worldTime').textContent=spec.time==='night'?'Night':'Day';$('buildingCount').textContent=spec.buildings;
  $('robotCount').textContent=spec.robots;$('worldTheme').textContent=spec.theme[0].toUpperCase()+spec.theme.slice(1);
  $('missionText').textContent=spec.mission||'Free explore';$('entityCount').textContent=spec.robots+spec.buildings+2;
  $('specPreview').textContent=JSON.stringify(spec,null,2);
}
function setStatus(text,error=false){const el=$('status');el.textContent=text;el.classList.toggle('error',error);}
function applyPrompt(text){try{const result=compilePrompt(text,spec);if(result.applied.length){spec=result.spec;rebuild();persist();}setStatus(result.message,!result.applied.length);$('prompt').value='';}catch(e){setStatus(e.message,true);}}
function persist(){try{localStorage.setItem('blankbox-game-v1',JSON.stringify(spec));}catch(e){setStatus('Local storage unavailable; use Export to save your project.',true);}}
function exportSpec(){const b=new Blob([JSON.stringify(spec,null,2)],{type:'application/json'});const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download='blank-game-spec.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('Downloaded validated GameSpec JSON.');}
$('runBtn').onclick=()=>applyPrompt($('prompt').value);
$('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyPrompt(e.target.value);}});
document.querySelectorAll('[data-command]').forEach(x=>x.addEventListener('click',()=>applyPrompt(x.dataset.command)));
$('dayBtn').onclick=()=>applyPrompt(spec.time==='night'?'Make it daytime':'Make it nighttime');
$('resetBtn').onclick=()=>{playerPos=new THREE.Vector3(0,.95,0);cameraYaw=.45;cameraPitch=.32;cameraDistance=16;setStatus('Camera and player reset.');};
$('saveBtn').onclick=()=>{persist();setStatus('Project saved in this browser.');};
$('exportBtn').onclick=exportSpec;
$('importBtn').onclick=()=>$('importInput').click();
$('importInput').onchange=async (event)=>{
  const file=event.target.files?.[0];
  try {
    if(!file) return;
    if(file.size>8192) throw new Error('GameSpec file must be under 8 KB');
    const updated=parseImportedGameSpec(await file.text());
    spec=updated; rebuild(); persist();
    setStatus('Imported validated GameSpec. World regenerated.');
  } catch(e) { setStatus('Import rejected: '+e.message,true); }
  finally {event.target.value='';}
};
const openModal=()=>{$('jsonText').value=JSON.stringify(spec,null,2);$('modal').hidden=false;};
const closeModal=()=>{$('modal').hidden=true;};
$('navSpec').onclick=openModal;$('closeModal').onclick=closeModal;$('cancelSpec').onclick=closeModal;
$('applySpec').onclick=()=>{try{const updated=validateSpec(JSON.parse($('jsonText').value));spec=updated;rebuild();persist();closeModal();setStatus('GameSpec validated and applied.');}catch(e){setStatus(e.message,true);alert('Invalid GameSpec: '+e.message);}};
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal();});
try { init(); }catch(e){$('webglError').hidden=false;$('webglError').textContent='3D renderer could not initialize: '+e.message;setStatus('Rendering failed: '+e.message,true);}
