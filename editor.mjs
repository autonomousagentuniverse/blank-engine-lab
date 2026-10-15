import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';
import { DEFAULT_SPEC, validateSpec, compilePrompt, parseImportedGameSpec } from './core.mjs';
import { playableLayout, isWalkable, questPlan, startQuest, questEvent, nearestTarget, currentObjective, saveProgress, loadProgress, questTargets } from './quest.mjs';
import {createActor,stepActor,stepAccumulator,createFallbackMover,frameDelta} from './physics/locomotion.mjs';
import {initializeRapier,makePhysicsWorld} from './physics/rapier.mjs';
import {createCharacterRig,SKIN_NAMES} from './character/rig.mjs';
import {loadGlbAvatar,loadMotionGlb,disposeMotionGlb,MAX_AVATAR_BYTES} from './character/gltf.mjs';
import {createPoseController} from './character/ik.mjs';
import {createPBRLibrary,DEFAULT_MATERIALS,PRESETS,TARGETS,validateMaterialProfiles,compileMaterialCommand,tileBoxGeometry,tilePlaneGeometry,retileGeometry} from './materials/pbr.mjs';
import {loadCompressedAuthoredSet,createKTX2Adapter} from './materials/compression.mjs';
import {CC0_CATALOG,readPreparedMaterial} from './materials/catalog.mjs';
const $=(id)=>document.getElementById(id);
const holder=$('viewport');
let spec;
try { spec=validateSpec(JSON.parse(localStorage.getItem('blankbox-game-v1'))); } catch { spec=validateSpec(DEFAULT_SPEC); }
let renderer,scene,camera,player,characterRig,actor,physicsWorld,physicsToken=0,physicsAccum=0,crateMeshes=[],light,hemi,sky,ground,beacon,gateDoor,lanternObject,world,quest,progress,robotActors=[],walls=[],objects=[],t=0,last=performance.now(),fpsSum=0,fpsFrames=0,cameraYaw=0.45,cameraPitch=0.32,cameraDistance=16,mouseDown=false,prevX=0,prevY=0,paused=false;
const pressed=new Set();
const palette={cyan:0x24bde4,violet:0x9c83ff,amber:0xffb95b,emerald:0x43dca8};
let materials=[],pbrLibrary=null,robotBodyMaterials=[];
const authoredFiles=new Map();
const catalogSelections=new Map(); // Session-only, never persisted to browser storage.
let ktx2Adapter=null;
const materialKey='blankbox-material-profiles-v1';
let materialProfiles={...DEFAULT_MATERIALS};
try{materialProfiles=validateMaterialProfiles(JSON.parse(localStorage.getItem(materialKey)));}catch{}
let playerPos=new THREE.Vector3(0,0.95,0), beaconPos=new THREE.Vector3(27,0,25);
const progressKey='blankbox-playstate-v1';
const skinKey='blankbox-player-skin-v1';
let selectedSkin=SKIN_NAMES.includes(localStorage.getItem(skinKey))?localStorage.getItem(skinKey):SKIN_NAMES[0];
let avatarBytes=null,avatarMotionBytes=null,avatarGeneration=0,poseController=null,poseReach=0,poseReachTarget=null,poseReachRadius=0;
let autoDemoRequested=false;
function material(color, extra={}) { const m=new THREE.MeshStandardMaterial({color,roughness:.62,metalness:.26,...extra}); materials.push(m); return m; }
function addMesh(geo,mat,parent=scene){ const mesh=new THREE.Mesh(geo,mat); parent.add(mesh); return mesh; }
function clearWorld(){
  physicsToken++;avatarGeneration++;
  characterRig?.dispose?.();
  if(physicsWorld){physicsWorld.dispose();physicsWorld=null;}
  crateMeshes=[];physicsAccum=0;
  for(const m of objects){scene.remove(m); m.traverse(n=>{if(n.geometry)n.geometry.dispose();});}
  for(const m of materials)m.dispose();
  pbrLibrary?.dispose();pbrLibrary=null;robotBodyMaterials=[];
  objects=[];materials=[];walls=[];robotActors=[];lanternObject=null;characterRig=null;
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
  window.addEventListener('keydown',e=>{ if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return; if(e.code==='KeyE'){if(!e.repeat)interact();return;} if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();pressed.add(e.code); });
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
function wallCollision(x,z){return !isWalkable(world,x,z,.65)||(!progress.completed&&Math.abs(x-world.gate.x)<2.4&&Math.abs(z-world.gate.z)<.85);}
function makeRobot(x,z,phase,i,accent){
  const group=new THREE.Group(); group.position.set(x,0,z);
  const main=pbrLibrary.materialFor('robots').clone();materials.push(main);robotBodyMaterials.push(main);
  const eye=material(accent,{emissive:accent,emissiveIntensity:2.2});
  const shell=addMesh(new THREE.BoxGeometry(1.2,1.6,.8),main,group);shell.position.y=1.65;
  const head=addMesh(new THREE.BoxGeometry(.86,.68,.85),main,group);head.position.y=2.7;
  const visor=addMesh(new THREE.BoxGeometry(.59,.16,.12),eye,group);visor.position.set(0,2.75,-.47);
  const marker=addMesh(new THREE.TorusGeometry(.8,.085,8,32),material(0xffda72,{emissive:0xffbb36,emissiveIntensity:2.2}),group);marker.position.y=3.4;marker.rotation.x=Math.PI/2;
  for(const d of [-.39,.39]){const leg=addMesh(new THREE.BoxGeometry(.31,.9,.37),main,group);leg.position.set(d,.49,0);}
  scene.add(group);objects.push(group);
  robotActors.push({group,homeX:x,homeZ:z,phase,body:shell,head,marker});
}
function makeBuilding(x,z,width,height,accent,i){
  const depth=width*(.7+(i%3)*.14),grp=new THREE.Group();grp.position.set(x,0,z);
  const slab=pbrLibrary.materialFor('buildings');
  const tower=addMesh(tileBoxGeometry(THREE,width,height,depth,3),slab,grp);tower.position.y=height/2;tower.userData.surfaceType='buildings';
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
  clearWorld();t=0;pbrLibrary=createPBRLibrary(THREE,materialProfiles);
  const accent=palette[spec.theme],night=spec.time==='night';
  sky.set(night?0x06101d:0x80b5d1);scene.fog.color.set(night?0x071325:0xa3c9cf);scene.fog.density=night?.012:.007;
  renderer.toneMappingExposure=night?1.35:1.0;
  hemi.color.set(night?0x6e91ec:0xe0eeff);hemi.groundColor.set(night?0x15192a:0x667b6f);hemi.intensity=night?1.5:2.8;
  light.color.set(night?0xa3b7ff:0xffedc9);light.intensity=night?1.5:3.0;
  light.position.set(-30,night?18:48,-15);
  const base=pbrLibrary.materialFor('ground');
  ground=addMesh(tilePlaneGeometry(THREE,150,150,3),base);ground.rotation.x=-Math.PI/2;ground.userData.surfaceType='ground';objects.push(ground);
  const grid=new THREE.GridHelper(150,75,accent,night?0x1a3042:0x688a96);grid.position.y=.026;scene.add(grid);objects.push(grid);
  for(let i=0;i<8;i++){const road=addMesh(tileBoxGeometry(THREE,i%2?150:1.3,.03,i%2?1.3:150,3),pbrLibrary.materialFor('roads'));road.position.set(i%2?0:(i-4)*17,.037,i%2?(i-4)*17:0);road.userData.surfaceType='roads';objects.push(road);}
  world=playableLayout(spec); quest=questPlan(spec,world);
  progress=loadProgress(spec,quest,readProgress());
  beaconPos.set(world.gate.x,0,world.gate.z);
  playerPos.set(world.spawn.x,.95,world.spawn.z);
  world.buildings.forEach((b,i)=>makeBuilding(b.x,b.z,b.width,b.height,accent,i));
  world.robots.forEach((r,i)=>makeRobot(r.x,r.z,r.phase,i,accent));
  // A skinned player rig follows the authoritative physics actor, never the reverse.
  actor=createActor(world.spawn.x,world.spawn.z);
  characterRig=createCharacterRig(THREE,{skin:selectedSkin,makeMaterial:material,armorMaterial:pbrLibrary.materialFor('armor')});
  poseController=createPoseController(THREE,characterRig);poseReach=0;poseReachTarget=null;poseReachRadius=0;
  player=characterRig.root;player.position.set(actor.x,0,actor.z);
  scene.add(player);objects.push(player);
  // An imported GLB is kept only in memory. Rebuilds reparse it so materials
  // cannot reference geometry disposed by clearWorld(). Stale loads are ignored.
  if(avatarBytes)loadAvatarBytes(avatarBytes,{restoring:true});
  const generation=physicsToken;
  $('physicsState').textContent='PHYSICS: LOADING';
  initializeRapier().then(RAPIER=>{
    if(generation!==physicsToken)return;
    let engine;
    try{engine=makePhysicsWorld(RAPIER,world,{gateOpen:progress.completed});}
    catch(e){$('physicsState').textContent='PHYSICS: FALLBACK';return;}
    if(generation!==physicsToken){engine.dispose();return;}
    physicsWorld=engine;
    engine.teleport(actor.x,actor.y,actor.z);
    // Match slope visuals exactly to the Rapier contact geometry.
    for(const ramp of engine.getTerrain()){
      const mesh=addMesh(new THREE.BoxGeometry(ramp.size.x,ramp.size.y,ramp.size.z),
        material(spec.time==='night'?0x2a5365:0x7b9e9d,{roughness:.93,metalness:.05}));
      mesh.position.set(ramp.position.x,ramp.position.y,ramp.position.z);
      mesh.quaternion.set(ramp.rotation.x,ramp.rotation.y,ramp.rotation.z,ramp.rotation.w);
      mesh.userData.calibrationRamp=true;objects.push(mesh);
    }
    crateMeshes=engine.getCrates().map(crate=>{
      const mesh=addMesh(new THREE.BoxGeometry(1.1,1.1,1.1),material(0xe5a15b,{metalness:.3,roughness:.7}));
      mesh.position.set(crate.position.x,crate.position.y,crate.position.z);
      objects.push(mesh);return mesh;
    });
    $('physicsState').textContent='PHYSICS: RAPIER';
  }).catch(()=>{if(generation===physicsToken)$('physicsState').textContent='PHYSICS: FALLBACK';});
  beacon=new THREE.Group();beacon.position.copy(beaconPos);
  const ring=addMesh(new THREE.TorusGeometry(2.2,.12,8,48),material(0xffd27a,{emissive:0xffbc37,emissiveIntensity:1.8}),beacon);ring.position.y=3;
  const center=addMesh(new THREE.IcosahedronGeometry(.66),material(0xffdc86,{emissive:0xffa51d,emissiveIntensity:2}),beacon);center.position.y=3;
  const beam=addMesh(new THREE.CylinderGeometry(.07,.07,13,8),material(0xffcc66,{transparent:true,opacity:.4,emissive:0xffbd4a,emissiveIntensity:1}),beacon);beam.position.y=6.5;
  for(const side of [-1,1]){
    const pillar=addMesh(new THREE.BoxGeometry(.48,5.4,.54),material(0x456a83,{metalness:.67}),beacon);
    pillar.position.set(side*2.1,2.7,0);
  }
  const arch=addMesh(new THREE.BoxGeometry(4.8,.46,.66),material(accent,{emissive:accent,emissiveIntensity:1.1}),beacon);arch.position.y=5.5;
  gateDoor=addMesh(new THREE.BoxGeometry(3.6,3.8,.13),material(0x2c8bb3,{transparent:true,opacity:.43,emissive:accent,emissiveIntensity:.6}),beacon);gateDoor.position.y=2.05;
  scene.add(beacon);objects.push(beacon);
  const lamp=new THREE.Group();lamp.position.set(world.lantern.x,0,world.lantern.z);
  const lampGlass=material(0x86d9ff,{emissive:0x36d8ff,emissiveIntensity:2.4,metalness:.22,roughness:.12});
  const orb=addMesh(new THREE.OctahedronGeometry(.72),lampGlass,lamp);orb.position.y=2;
  const lampBase=addMesh(new THREE.CylinderGeometry(.28,.65,.85,8),material(0x162d48,{metalness:.6}),lamp);lampBase.position.y=.43;
  const lampRing=addMesh(new THREE.TorusGeometry(.92,.065,8,32),material(accent,{emissive:accent,emissiveIntensity:1.6}),lamp);lampRing.position.y=1.85;
  scene.add(lamp);objects.push(lamp);lanternObject=lamp;
  for(let i=0;i<3;i++){const stallPos=world.robots[i]?.x!==undefined?{x:world.robots[i].x+4,z:world.robots[i].z+4}:null;
    if(!stallPos||!isWalkable(world,stallPos.x,stallPos.z,2.2))continue;
    const stall=new THREE.Group();stall.position.set(stallPos.x,0,stallPos.z);
    const counter=addMesh(new THREE.BoxGeometry(3.1,1.1,1.55),material(0x2e3b58),stall);counter.position.y=.75;
    const canopy=addMesh(new THREE.BoxGeometry(3.5,.18,1.95),material(accent,{emissive:accent,emissiveIntensity:.9}),stall);canopy.position.y=2.8;
    for(const sx of [-1.35,1.35]){const post=addMesh(new THREE.CylinderGeometry(.07,.07,2.8,6),material(0x7299ba),stall);post.position.set(sx,1.4,-.7);}
    scene.add(stall);objects.push(stall);
  }
  for(const [target,entry] of authoredFiles)applyAuthoredFiles(target,entry.files,pbrLibrary,{restoring:true,fallbacks:entry.fallbacks}).catch(e=>setStatus('Texture restore failed: '+e.message,true));
  syncUI(); refreshQuestHUD();
}
function frame(now){requestAnimationFrame(frame);let dt=frameDelta(now,last);last=now;if(!paused){update(dt);renderer.render(scene,camera);}fpsSum+=dt;fpsFrames++;if(fpsSum>=.5){$('fps').textContent=Math.round(fpsFrames/fpsSum)+' FPS';fpsSum=0;fpsFrames=0;}}
function update(dt){
  t+=dt;
  let dx=0,dz=0;
  if(pressed.has('KeyW')||pressed.has('ArrowUp'))dz-=1;
  if(pressed.has('KeyS')||pressed.has('ArrowDown'))dz+=1;
  if(pressed.has('KeyA')||pressed.has('ArrowLeft'))dx-=1;
  if(pressed.has('KeyD')||pressed.has('ArrowRight'))dx+=1;
  const angle=Math.atan2(dx,dz)+cameraYaw;
  const magnitude=Math.min(1,Math.hypot(dx,dz));
  const input={x:Math.sin(angle)*magnitude,z:Math.cos(angle)*magnitude,
    jump:pressed.has('Space'),run:pressed.has('ShiftLeft')||pressed.has('ShiftRight')};
  physicsAccum=stepAccumulator(physicsAccum,dt,step=>{
    const move=physicsWorld ? (delta=>physicsWorld.step(delta)) : createFallbackMover((x,z)=>!wallCollision(x,z),actor);
    actor=stepActor(actor,input,step,move);
    if(physicsWorld)physicsWorld.setGateOpen(progress.completed);
  });
  playerPos.set(actor.x,actor.y,actor.z);
  player.position.set(actor.x,0,actor.z);
  if(Math.hypot(actor.vx,actor.vz)>0.2)player.rotation.y=Math.atan2(actor.vx,actor.vz);
  characterRig.update(actor,dt);
  if(poseController){
    poseController.update({actor,dt,groundProbe:(x,z,fromY)=>physicsWorld?.probeGround(x,z,fromY)??{y:0,normal:{x:0,y:1,z:0}},handTarget:poseReachTarget,handRadius:poseReachRadius,reach:poseReach});
    poseReach=Math.max(0,poseReach-dt*2.4);
  }
  if(physicsWorld){
    const crates=physicsWorld.getCrates();
    crateMeshes.forEach((mesh,i)=>{const body=crates[i];if(!body)return;
      mesh.position.set(body.position.x,body.position.y,body.position.z);
      mesh.quaternion.set(body.rotation.x,body.rotation.y,body.rotation.z,body.rotation.w);
    });
  }
  robotActors.forEach((r,i)=>{const a=t*.65+r.phase+i,rad=.9;const nx=r.homeX+Math.sin(a)*rad,nz=r.homeZ+Math.cos(a)*rad;
    if(isWalkable(world,nx,nz,1.1))r.group.position.set(nx,Math.sin(t*3+i)*.04,nz);else r.group.position.set(r.homeX,0,r.homeZ);
    r.group.rotation.y=-a;r.head.rotation.z=Math.sin(t*2+i)*.06;
    r.body.material.emissive?.set(progress.traded.includes(i)?0x185e40:0x06101b);
    r.marker.visible=quest.stages[progress.stage]?.type==='trade'&&!progress.traded.includes(i);
    r.marker.scale.setScalar(1+Math.sin(t*3+i)*.12);
  });
  const look=new THREE.Vector3(playerPos.x,playerPos.y+1.55,playerPos.z),cp=cameraPitch;
  const dest=new THREE.Vector3(look.x+Math.sin(cameraYaw)*Math.cos(cp)*cameraDistance,look.y+Math.sin(cp)*cameraDistance,look.z+Math.cos(cameraYaw)*Math.cos(cp)*cameraDistance);
  camera.position.lerp(dest,Math.min(1,dt*10));camera.lookAt(look);
  // Gate is stationary so the player can walk through its arch once unlocked.
  if(gateDoor)gateDoor.position.y+=( (progress.completed?6.8:2.05)-gateDoor.position.y)*Math.min(1,dt*3);
  if(lanternObject){lanternObject.visible=quest.mode==='lantern'&&!progress.hasLantern&&quest.stages[progress.stage]?.type==='lantern';lanternObject.rotation.y=t*.7;lanternObject.position.y=Math.sin(t*2)*.12;}
  refreshQuestHUD();
}
function syncUI(){
  $('gameTitle').textContent=spec.title;$('sceneName').textContent=spec.title;
  $('worldTime').textContent=spec.time==='night'?'Night':'Day';$('buildingCount').textContent=spec.buildings;
  $('robotCount').textContent=spec.robots;$('worldTheme').textContent=spec.theme[0].toUpperCase()+spec.theme.slice(1);
  $('skinName').textContent=avatarBytes?'Imported GLB':selectedSkin;
  $('worldLiveSummary').textContent=`${spec.robots} robots · ${spec.time==='day'?'Daytime':'Nighttime'} · ${spec.buildings} buildings`;
  $('missionText').textContent=spec.mission||'Explore the world';$('entityCount').textContent=spec.robots+spec.buildings+4;
  $('specPreview').textContent=JSON.stringify(spec,null,2);
  syncMaterialUI();
}
function readProgress(){try{return JSON.parse(localStorage.getItem(progressKey));}catch{return null;}}
function clearProgress(){try{localStorage.removeItem(progressKey);}catch{}}
function persistProgress(){try{localStorage.setItem(progressKey,JSON.stringify(saveProgress(spec,quest,progress)));}catch{setStatus('Mission save unavailable. Use local browser storage.',true);}}
function liveLayout(){return {...world,robots:world.robots.map((r,i)=>({...r,x:robotActors[i]?.group.position.x??r.x,z:robotActors[i]?.group.position.z??r.z}))};}
function refreshQuestHUD(){
  if(!quest||!progress)return;
  $('questObjective').textContent=currentObjective(quest,progress);
  $('questProgress').textContent=progress.completed?'COMPLETE':`STEP ${progress.stage+1} / ${quest.stages.length}`;
  $('questProgress').classList.toggle('complete',progress.completed);
  if(progress.completed){$('distanceText').textContent='✓ Secret gate opened';$('interactHint').textContent='Mission complete — Restart Mission to play again';$('interactBtn').disabled=true;return;}
  const targets=questTargets(quest,progress,liveLayout());
  const closest=targets.map(target=>({...target,distance:Math.hypot(target.position.x-playerPos.x,target.position.z-playerPos.z)})).sort((a,b)=>a.distance-b.distance)[0];
  $('distanceText').textContent=closest?`${Math.round(closest.distance)} m to ${closest.type==='robot'?'robot':closest.type==='lantern'?'lantern':'gate'}`:'--';
  const target=nearestTarget(quest,progress,liveLayout(),playerPos);
  $('interactBtn').disabled=!target;
  $('interactHint').textContent=target?`E / INTERACT · ${target.type==='robot'?'Trade with robot '+(target.index+1):target.type==='lantern'?'Collect lantern':'Unlock gate'}`:'Move closer to the highlighted quest target';
}
function interact(){
  if(!quest||progress.completed)return;
  const target=nearestTarget(quest,progress,liveLayout(),playerPos);
  if(!target){setStatus('Move close to an active mission target, then press E or Interact.',true);return;}
  const out=questEvent(quest,progress,{type:target.type,index:target.index});
  if(out.changed){
    poseReachTarget={x:target.position.x,y:target.type==='robot'?2.05:target.type==='lantern'?1.6:2.3,z:target.position.z};
    poseReachRadius=target.type==='robot'?.55:target.type==='lantern'?.35:.15;
    poseReach=1;progress=out.state;persistProgress();if(physicsWorld)physicsWorld.setGateOpen(progress.completed);
  }
  setStatus(out.message,!out.changed);refreshQuestHUD();
}
async function loadDemo(silent=false){
  if(autoDemoRequested)return;
  autoDemoRequested=true;
  try{
    const response=await fetch('./examples/neon-frontier-night-market.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Demo GameSpec not available');
    const raw=await response.text();spec=parseImportedGameSpec(raw);
    clearProgress();rebuild();persist();
    setStatus('Loaded the actual NVIDIA six-agent Night Market GameSpec. Trade with four robots to begin.');
  }catch(e){if(!silent)setStatus('Demo could not load: '+e.message,true);}
  finally{autoDemoRequested=false;}
}
function setStatus(text,error=false){const el=$('status');el.textContent=text;el.classList.toggle('error',error);}
function syncMaterialUI(){
 const target=$('materialTarget')?.value||'buildings';
 if($('materialPreset'))$('materialPreset').value=materialProfiles[target];
 if($('materialSummary')&&pbrLibrary){const budget=pbrLibrary.budget;$('materialSummary').textContent=pbrLibrary.hasAuthored(target)?target+': imported PBR · '+(budget.authoredGPUBytes/1048576).toFixed(2)+' MiB estimated GPU payload · current session only':target+': '+materialProfiles[target]+' · '+budget.mapCount+' maps, '+(budget.cpuBytes/1048576).toFixed(2)+' MiB';}
}
function persistMaterials(){try{localStorage.setItem(materialKey,JSON.stringify(materialProfiles));}catch{setStatus('Texture preferences could not be saved in this browser.',true);}}
function updateMaterial(target,preset){
 if(!TARGETS.includes(target)||!Object.hasOwn(PRESETS,preset))throw Error('Unsupported texture preset');
 const previous=materialProfiles[target];
 if(previous===preset&&!pbrLibrary?.hasAuthored(target)){syncMaterialUI();return;}
 try{
  pbrLibrary.update(target,preset);
  if(target==='robots')for(const m of robotBodyMaterials){const glow=m.emissive?.clone();pbrLibrary.applyTo(target,m);if(glow)m.emissive.copy(glow);}
  authoredFiles.delete(target);catalogSelections.delete(target);materialProfiles[target]=preset;persistMaterials();syncMaterialUI();
 }catch(e){pbrLibrary.update(target,previous);throw e;}
}
function applyPrompt(text){
 const previous=spec,oldMaterials={...materialProfiles};
 try{
  const worldEdit=compilePrompt(text,spec),materialEdit=compileMaterialCommand(text,materialProfiles);
  if(!worldEdit.applied.length&&!materialEdit.applied.length){setStatus(worldEdit.message,true);return;}
  if(worldEdit.applied.length){
   playableLayout(worldEdit.spec);
   spec=worldEdit.spec;materialProfiles=materialEdit.profiles;
   for(const target of TARGETS)if(oldMaterials[target]!==materialProfiles[target]){authoredFiles.delete(target);catalogSelections.delete(target);}
   clearProgress();rebuild();persist();persistMaterials();
  }else for(const target of TARGETS){if(oldMaterials[target]!==materialEdit.profiles[target])updateMaterial(target,materialEdit.profiles[target]);}
  setStatus([...worldEdit.applied,...materialEdit.applied].join(' · '));$('prompt').value='';
 }catch(e){
  if(spec!==previous||TARGETS.some(k=>materialProfiles[k]!==oldMaterials[k])){
   spec=previous;materialProfiles=oldMaterials;try{rebuild();}catch{}
  }
  setStatus('World edit failed: '+e.message,true);
 }
}
function persist(){try{localStorage.setItem('blankbox-game-v1',JSON.stringify(spec));}catch(e){setStatus('Local storage unavailable; use Export to save your project.',true);}}
function exportSpec(){const b=new Blob([JSON.stringify(spec,null,2)],{type:'application/json'});const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download='blank-game-spec.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('Downloaded validated GameSpec JSON.');}

async function ensureKTX2Adapter(files){
 if(!Object.values(files).some(file=>file&&/\.ktx2$/i.test(file.name)))return null;
 if(!ktx2Adapter){
  const {KTX2Loader}=await import('three/addons/loaders/KTX2Loader.js');
  ktx2Adapter=createKTX2Adapter(KTX2Loader,renderer);
 }
 return ktx2Adapter;
}
function retileSurface(target,meters){
 for(const object of objects)object.traverse?.(mesh=>{if(mesh.userData?.surfaceType===target)retileGeometry(mesh.geometry,meters);});
}
async function applyAuthoredFiles(target,files,library,{restoring=false,fallbacks={}}={}){
 const transcoder=await ensureKTX2Adapter(files);
 const set=await loadCompressedAuthoredSet(THREE,files,{transcoder,fallbacks});
 if(library!==pbrLibrary){set.dispose();return false;}
 try{
  library.installAuthored(target,set);
  if(target==='robots')for(const mat of robotBodyMaterials){const glow=mat.emissive?.clone();library.applyTo(target,mat);if(glow)mat.emissive.copy(glow);}
  authoredFiles.set(target,{files,fallbacks});const catalog=catalogSelections.get(target);if(catalog)retileSurface(target,catalog.metersPerTile);
    syncMaterialUI();
  if(!restoring)setStatus('Imported '+set.budget.maps+' authored PBR map(s) for '+target+' · '+set.budget.ktx2Slots+' KTX2 ('+set.budget.compressedSlots+' GPU compressed) · '+(set.budget.gpuEstimatedBytes/1048576).toFixed(2)+' MiB estimated texture payload · physics and quest preserved.');
  return true;
 }catch(e){set.dispose();throw e;}
}
async function importAuthoredImages(){
 const target=$('materialTarget').value;
 const files={albedo:$('pbrAlbedo').files?.[0],normal:$('pbrNormal').files?.[0],orm:$('pbrOrm').files?.[0]};
 const fallbacks={albedo:$('pbrFallback').files?.[0]};
 if(!files.albedo){setStatus('Select a color/albedo image first.',true);return;}
 for(const slot of ['normal','orm'])if(!files[slot])delete files[slot];
 $('pbrImport').disabled=true;
 try{catalogSelections.delete(target);await applyAuthoredFiles(target,files,pbrLibrary,{fallbacks});}catch(e){setStatus('PBR import rejected: '+e.message,true);}
 finally{$('pbrImport').disabled=false;}
}
// Prepared, locally hosted CC0 assets are fetched only from this site's /library/ path.
// No player-device requests to Poly Haven; production ships the offline asset pack.
const cc0Select=$('cc0Material');
for(const asset of CC0_CATALOG){const option=document.createElement('option');option.value=asset.id;option.textContent=asset.name+' · '+asset.category;cc0Select.append(option);}
$('cc0Apply').onclick=async()=>{
 const id=cc0Select.value,target=$('materialTarget').value;
 const button=$('cc0Apply');button.disabled=true;
 try{
  const {entry,files}=await readPreparedMaterial(id);
  const existing=catalogSelections.get(target);
  catalogSelections.set(target,entry);
  try{
   const applied=await applyAuthoredFiles(target,files,pbrLibrary);
   if(applied){retileSurface(target,entry.metersPerTile);setStatus('Applied Poly Haven CC0 '+entry.name+' to '+target+' (tile '+entry.metersPerTile+' m); physics and quest preserved.');}
  }catch(e){if(existing)catalogSelections.set(target,existing);else catalogSelections.delete(target);throw e;}
 }catch(e){setStatus('CC0 material unavailable: '+e.message,true);}
 finally{button.disabled=false;}
};
$('pbrImport').onclick=importAuthoredImages;
$('materialTarget').onchange=syncMaterialUI;
$('materialApply').onclick=()=>{try{const target=$('materialTarget').value,preset=$('materialPreset').value;updateMaterial(target,preset);setStatus('Applied '+preset+' texture to '+target+'; quest and physics preserved.');}catch(e){setStatus('Material edit failed: '+e.message,true);}};
$('runBtn').onclick=()=>applyPrompt($('prompt').value);
$('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyPrompt(e.target.value);}});
document.querySelectorAll('[data-command]').forEach(x=>x.addEventListener('click',()=>applyPrompt(x.dataset.command)));
$('dayBtn').onclick=()=>applyPrompt(spec.time==='night'?'Make it daytime':'Make it nighttime');
$('resetBtn').onclick=()=>{actor=createActor(world.spawn.x,world.spawn.z);if(physicsWorld)physicsWorld.teleport(actor.x,0,actor.z);playerPos.set(actor.x,actor.y,actor.z);physicsAccum=0;cameraYaw=.45;cameraPitch=.32;cameraDistance=16;poseController?.reset();setStatus('Player and physics body reset. Quest progress retained.');};
$('restartQuestBtn').onclick=()=>{clearProgress();progress=startQuest(quest);refreshQuestHUD();setStatus('Mission restarted.');};
$('interactBtn').onclick=interact;
function discardAvatarRig(rig){
  const i=objects.indexOf(rig.root);if(i!==-1)objects.splice(i,1);
  scene.remove(rig.root);rig.dispose?.();
  if(!rig.dispose)rig.root.traverse(o=>{if(o.geometry)o.geometry.dispose();});
}
function replaceAvatarRig(candidate){
  if(!scene||!actor)throw Error('Game world is not ready');
  const previous=characterRig;
  candidate.root.position.set(actor.x,actor.y,actor.z);
  scene.add(candidate.root);objects.push(candidate.root);
  characterRig=candidate;player=candidate.root;poseController=createPoseController(THREE,candidate);poseReach=0;poseReachTarget=null;poseReachRadius=0;
  if(previous)discardAvatarRig(previous);
  $('skinName').textContent=avatarBytes?'Imported GLB':selectedSkin;
}
async function loadAvatarBytes(buffer,{restoring=false}={}){
  const current=++avatarGeneration;
  if(!restoring){$('avatarStatus').textContent='Avatar: validating rig and animation clips…';}
  let candidate;
  try{
    const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
    candidate=await loadGlbAvatar(THREE,GLTFLoader,buffer);
    if(current!==avatarGeneration){candidate.dispose();return;}
    // Preserve existing scene and physics if loading or validation fails.
    if(!restoring)avatarMotionBytes=null;
    avatarBytes=buffer;
    replaceAvatarRig(candidate);
    if(avatarMotionBytes){
      try{await loadMotionBytes(avatarMotionBytes,{restoring:true});}
      catch{avatarMotionBytes=null;$('avatarStatus').textContent='Avatar: imported GLB · saved donor clip unavailable (fallback animations active)';}
    }
    $('avatarStatus').textContent=`Avatar: rigged GLB (${candidate.boneCount} bones, ${candidate.skinnedCount} skinned meshes) · calibrated feet L=${(candidate.soleOffsets.left??0).toFixed(2)}m R=${(candidate.soleOffsets.right??0).toFixed(2)}m · Walk: ${candidate.clipSources.walk} · Run: ${candidate.clipSources.run}`;
    if(!restoring)setStatus('Imported rigged GLB. Walk, run or jump to test skeletal animation.');
  }catch(e){
    if(current!==avatarGeneration)return;
    if(restoring){avatarBytes=null;$('avatarStatus').textContent='Avatar: procedural fallback (could not reload GLB)';}
    else {$('avatarStatus').textContent='Avatar import rejected: '+e.message;setStatus('Avatar import rejected: '+e.message,true);}
  }
}
async function loadMotionBytes(buffer,{restoring=false}={}){
  if(!avatarBytes||!characterRig?.installRetargetedClips)throw Error('Import a rigged character GLB before adding motion clips');
  const generation=avatarGeneration,rig=characterRig;
  let donor;
  try{
    const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
    donor=await loadMotionGlb(THREE,GLTFLoader,buffer);
    if(generation!==avatarGeneration||rig!==characterRig)return;
    const count=characterRig.installRetargetedClips(donor);
    avatarMotionBytes=buffer;
    $('avatarStatus').textContent=`Avatar: imported GLB · ${count} donor motion states retargeted`;
    if(!restoring)setStatus(`Transferred ${count} locomotion animations onto the current avatar skeleton.`);
  }finally{disposeMotionGlb(donor);}
}
$('motionBtn').onclick=()=>$('motionInput').click();
$('motionInput').onchange=async event=>{
  const file=event.target.files?.[0];
  try {if(!file)return;if(file.size>MAX_AVATAR_BYTES)throw Error('GLB must be under 8 MB');await loadMotionBytes(await file.arrayBuffer());}
  catch(e){setStatus('Motion import rejected: '+e.message,true);}
  finally{event.target.value='';}
};
$('avatarBtn').onclick=()=>$('avatarInput').click();
$('avatarInput').onchange=async event=>{
  const file=event.target.files?.[0];
  try {if(!file)return;if(file.size>MAX_AVATAR_BYTES)throw Error('GLB must be under 8 MB');await loadAvatarBytes(await file.arrayBuffer());}
  catch(e){setStatus('Avatar import rejected: '+e.message,true);}
  finally{event.target.value='';}
};
$('skinBtn').onclick=()=>{
  if(avatarBytes){avatarBytes=null;avatarMotionBytes=null;avatarGeneration++;replaceAvatarRig(createCharacterRig(THREE,{skin:selectedSkin,makeMaterial:material,armorMaterial:pbrLibrary.materialFor('armor')}));$('avatarStatus').textContent='Avatar: procedural rig restored';setStatus('Imported GLB unloaded; procedural avatar restored.');return;}
  selectedSkin=SKIN_NAMES[(SKIN_NAMES.indexOf(selectedSkin)+1)%SKIN_NAMES.length];characterRig.setSkin(selectedSkin);$('skinName').textContent=selectedSkin;
  try{localStorage.setItem(skinKey,selectedSkin);}catch{}
  setStatus('Changed skinned character appearance: '+selectedSkin);
};
$('demoBtn').onclick=()=>loadDemo();
$('saveBtn').onclick=()=>{persist();setStatus('Project saved in this browser.');};
$('exportBtn').onclick=exportSpec;
$('importBtn').onclick=()=>$('importInput').click();
$('importInput').onchange=async (event)=>{
  const file=event.target.files?.[0];
  try {
    if(!file) return;
    if(file.size>8192) throw new Error('GameSpec file must be under 8 KB');
    const updated=parseImportedGameSpec(await file.text());
    spec=updated;clearProgress();rebuild();persist();
    setStatus('Imported validated GameSpec. World regenerated.');
  } catch(e) { setStatus('Import rejected: '+e.message,true); }
  finally {event.target.value='';}
};
const openModal=()=>{$('jsonText').value=JSON.stringify(spec,null,2);$('modal').hidden=false;};
const closeModal=()=>{$('modal').hidden=true;};
$('navSpec').onclick=openModal;$('closeModal').onclick=closeModal;$('cancelSpec').onclick=closeModal;
$('applySpec').onclick=()=>{try{const updated=validateSpec(JSON.parse($('jsonText').value));spec=updated;clearProgress();rebuild();persist();closeModal();setStatus('GameSpec validated and applied.');}catch(e){setStatus(e.message,true);alert('Invalid GameSpec: '+e.message);}};
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal();});
try { init(); if(!localStorage.getItem('blankbox-game-v1'))loadDemo(true); }catch(e){$('webglError').hidden=false;$('webglError').textContent='3D renderer could not initialize: '+e.message;setStatus('Rendering failed: '+e.message,true);}
