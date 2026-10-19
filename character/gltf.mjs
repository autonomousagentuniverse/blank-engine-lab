import {fadeSeconds} from './motion.mjs';
/** Client-only, self-contained glTF 2.0 GLB import boundary.
 * Never loads remote sidecar resources or imports scripts from user content.
 */
import {assertHumanoidMap,mapHumanoidBones,boneRotationClips,retargetRotationClip} from './retarget.mjs';
import {makeMappedChains} from './ik.mjs';
import {calibrateRigSoles} from './calibration.mjs';
import {assertImportedTextureBudget} from '../materials/import-budget.mjs';
export const MAX_AVATAR_BYTES=8*1024*1024;
const DECODER=new TextDecoder('utf-8',{fatal:true});
export function inspectAvatarGlb(buffer) {
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<20||buffer.byteLength>MAX_AVATAR_BYTES)throw Error('GLB must be under 8 MB');
  const view=new DataView(buffer);
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength)throw Error('Invalid GLB v2 header');
  let offset=12,manifest=null;
  while(offset<buffer.byteLength){
    if(offset+8>buffer.byteLength)throw Error('Truncated GLB chunk');
    const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true);
    if(length%4||offset+8+length>buffer.byteLength)throw Error('Invalid GLB chunk length');
    if(type===0x4e4f534a){if(manifest!==null)throw Error('Duplicate GLB JSON chunk');
      manifest=JSON.parse(DECODER.decode(new Uint8Array(buffer,offset+8,length)).replace(/[\u0000\s]+$/g,''));
    }
    offset+=8+length;
  }
  if(!manifest||manifest.asset?.version!=='2.0')throw Error('Not a glTF 2.0 asset');
  if(!Array.isArray(manifest.skins)||!manifest.skins.length||manifest.skins.length>4)throw Error('GLB requires a rigged humanoid skin');
  if(!Array.isArray(manifest.nodes)||manifest.nodes.length>400||manifest.skins.some(s=>!Array.isArray(s.joints)||s.joints.length>128))throw Error('Avatar scene exceeds skeleton limits');
  if((manifest.meshes?.length||0)>80||(manifest.animations?.length||0)>32)throw Error('Avatar exceeds mesh/animation limits');
  if((manifest.extensionsRequired||[]).length)throw Error('Compressed/extended GLB assets are not supported yet');
  for(const item of [...(manifest.buffers||[]),...(manifest.images||[])]){
    if(typeof item.uri==='string'&&!item.uri.startsWith('data:'))throw Error('External GLB resources are not permitted');
  }
  return manifest;
}
/** Exact authored animation aliases, not substring guesses such as WalkJump. */
export function selectLocomotionClips(clips){
 if(!Array.isArray(clips))throw Error('Invalid authored animation list');
 const aliases={idle:['idle','idle_breath','idling','standing','stand'],walk:['walk','walk_inplace','walking'],run:['run','run_inplace','running','sprint','sprinting'],jump:['jump','jumping','leap'],fall:['fall','falling','airborne']};
 const out={};
 for(const [state,names] of Object.entries(aliases)){
  for(const name of names){
   const clip=clips.find(c=>typeof c?.name==='string'&&c.name.trim().toLowerCase()===name&&c.tracks?.length);
   if(clip){out[state]=clip;break;}
  }
  if(out[state])continue;
  for(const name of names){
   const clip=clips.find(c=>typeof c?.name==='string'&&c.name.toLowerCase().split(/[|:/]/).pop().trim()===name&&c.tracks?.length);
   if(clip){out[state]=clip;break;}
  }
 }
 return out;
}
function poseTrack(THREE,bone,amplitude,period) {
  if(!bone)return null;
  const rest=bone.quaternion.clone(),angles=[0,amplitude,0,-amplitude,0];
  const axis=new THREE.Vector3(1,0,0),values=[];
  for(const angle of angles){const q=rest.clone().multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));values.push(q.x,q.y,q.z,q.w);}
  return new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`,[0,period*.25,period*.5,period*.75,period],values);
}
/** Fall back to bone animation clips when an imported model lacks usable locomotion clips. */
export function generateLocomotionClips(THREE,mapping){
  const make=(name,amplitude,duration)=>{
    const pairs=[['leftUpperLeg',amplitude],['rightUpperLeg',-amplitude],['leftUpperArm',-amplitude*.65],['rightUpperArm',amplitude*.65]];
    const tracks=pairs.map(([role,a])=>poseTrack(THREE,mapping[role],a,duration)).filter(Boolean);
    return new THREE.AnimationClip(name,duration,tracks);
  };
  return [make('idle',.02,2),make('walk',.42,.85),make('run',.7,.55),make('jump',-.30,.65),make('fall',.14,.75)];
}
function release(root){
  const geom=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.geometry)geom.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
  geom.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}
export function createGlbAvatar(THREE,gltf){
  if(!gltf?.scene?.traverse)throw Error('GLB scene missing');
  let skinned=0;gltf.scene.traverse(o=>{if(o.isSkinnedMesh)skinned++;});
  if(!skinned)throw Error('Imported avatar contains no SkinnedMesh');
  const mapping=assertHumanoidMap(mapHumanoidBones(gltf.scene));
  const bounds=new THREE.Box3().setFromObject(gltf.scene);
  const height=bounds.max.y-bounds.min.y;
  if(!Number.isFinite(height)||height<=.01)throw Error('Avatar must have visible geometry');
  const scale=THREE.MathUtils.clamp(3.0/height,.04,25);
  const root=new THREE.Group(),visual=new THREE.Group();
  visual.add(gltf.scene);visual.scale.setScalar(scale);
  visual.position.y=-bounds.min.y*scale;
  root.add(visual);
  const mixer=new THREE.AnimationMixer(gltf.scene);
  const authored=boneRotationClips(THREE,gltf.animations||[],gltf.scene);
  const authoredStates=selectLocomotionClips(authored);
  const fallback=generateLocomotionClips(THREE,mapping);
  const states=['idle','walk','run','jump','fall'],actions={},clipSources={};
  for(const state of states){
    const clip=authoredStates[state]||fallback.find(c=>c.name===state);
    clipSources[state]=authoredStates[state]?'authored':'fallback';
    actions[state]=mixer.clipAction(clip);actions[state].enabled=true;
  }
  const poseChains=makeMappedChains(THREE,mapping);
  const soleOffsets=calibrateRigSoles(THREE,visual,poseChains);
  let playing='idle',disposed=false;
  actions.idle.play();
  return {
    root,poseChains,soleOffsets,clipSources:Object.freeze({...clipSources}),skinnedCount:skinned,boneCount:Object.keys(mapping).length,
    get animation(){return playing;},
    installRetargetedClips(donor){
      if(disposed)throw Error('Avatar disposed');
      if(!donor?.scene||!Array.isArray(donor.animations))throw Error('Animation source GLB is invalid');
      // Preflight every clip before touching the existing mixer actions: failures
      // must never damage a working player animation set.
      const replacements=[];
      for(const state of states){
        const source=findClip(donor.animations,state);
        if(!source)continue;
        const mapped=retargetRotationClip(THREE,source,donor.scene,gltf.scene,{name:`${state}-retargeted`});
        replacements.push([state,mapped]);
      }
      if(!replacements.length)throw Error('No matching idle/walk/run/jump/fall animation clips found in motion GLB');
      for(const [state,clip] of replacements){
        const previous=actions[state];previous.stop();
        actions[state]=mixer.clipAction(clip);
        if(playing===state)actions[state].reset().play();
      }
      return replacements.length;
    },
    update(actor,dt){
      if(disposed)return;
      const desired=states.includes(actor.motion)?actor.motion:'idle';
      if(desired!==playing){
        const previous=actions[playing], next=actions[desired];
        const duration=fadeSeconds(playing,desired);
        const cadence=['walk','run'].includes(playing)&&['walk','run'].includes(desired);
        next.reset();
        if(cadence){
          const sourceDuration=previous.getClip().duration;
          const targetDuration=next.getClip().duration;
          if(sourceDuration>0&&targetDuration>0)next.time=(previous.time%sourceDuration)/sourceDuration*targetDuration;
        }
        next.enabled=true;
        next.play();
        next.crossFadeFrom(previous,duration,false);
        playing=desired;
      }
      // Anatomy Builder's in-place clips are ~2 seconds long. Playing them at
      // original FPS while Rapier moves the body causes severe apparent foot
      // skating. Match a measured cycle cadence to physical ground speed.
      // This is preliminary speed calibration, not mocap/true stance matching.
      if(['walk','run'].includes(desired)){
        const action=actions[desired],clip=action.getClip();
        if(/_InPlace$/i.test(clip.name)){
          const speed=Math.hypot(actor.vx||0,actor.vz||0);
          const stride=desired==='run'?4.3:2.7;
          action.timeScale=THREE.MathUtils.clamp(speed*clip.duration/stride,.5,3.2);
        }
      }
      mixer.update(Math.min(.05,Math.max(0,dt)));
      root.position.y=actor.y;
    },
    dispose(){if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);release(gltf.scene);}
  };
}
/** Load with injected pinned GLTFLoader. The bytes are prevalidated before loader.parse. */
export async function loadGlbAvatar(THREE,GLTFLoader,buffer){
  inspectAvatarGlb(buffer);
  const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(buffer,'',resolve,reject));
  try{assertImportedTextureBudget(gltf.scene);return createGlbAvatar(THREE,gltf);}catch(e){release(gltf.scene);throw e;}
}

/** Import a second rigged animation donor and return its already-parsed scene.
 * The caller may safely release donor textures/meshes after clip data is copied.
 */
export async function loadMotionGlb(THREE,GLTFLoader,buffer){
  inspectAvatarGlb(buffer);
  return new Promise((resolve,reject)=>new GLTFLoader().parse(buffer,'',resolve,reject));
}
export function disposeMotionGlb(gltf){if(gltf?.scene)release(gltf.scene);}
