/** Humanoid bone binding and bounded rotation-only clip retargeting.
 * No physics/root-motion translation is accepted: Rapier remains authoritative.
 * Rest-delta transfer is appropriate for similarly oriented humanoid bind poses;
 * disparate coordinate systems require an offline calibration step.
 */
const ALIASES = Object.freeze({
  hips:['hips','pelvis','root','hip','spinebase'],
  spine:['spine','spine1','spine01','spine001','chest','upperbody'],
  head:['head','headend','head1'],
  leftUpperArm:['leftupperarm','leftarm','upperarml','upperarmleft','lupperarm','armleft','leftshoulder'],
  rightUpperArm:['rightupperarm','rightarm','upperarmr','upperarmright','rupperarm','armright','rightshoulder'],
  leftLowerArm:['leftforearm','leftlowerarm','lowerarml','forearml','lforearm','leftelbow'],
  rightLowerArm:['rightforearm','rightlowerarm','lowerarmr','forearmr','rforearm','rightelbow'],
  leftUpperLeg:['leftupleg','leftupperleg','leftthigh','thighl','uplegl','lthigh','upperlegl'],
  rightUpperLeg:['rightupleg','rightupperleg','rightthigh','thighr','uplegr','rthigh','upperlegr'],
  leftLowerLeg:['leftleg','leftlowerleg','leftshin','shinl','lowerlegl','calfl'],
  rightLowerLeg:['rightleg','rightlowerleg','rightshin','shinr','lowerlegr','calfr'],
  leftFoot:['leftfoot','footl','lfoot'],rightFoot:['rightfoot','footr','rfoot'],
  leftHand:['lefthand','handl','lhand'],rightHand:['righthand','handr','rhand']
});
export function normalizeBoneName(name) {
  if(typeof name!=='string')return '';
  return name.toLowerCase().split(/[|:]/).pop().replace(/[^a-z0-9]/g,'')
    .replace(/^(?:mixamorig\d*|jbip\d*|bip\d*|def|bone)/,'');
}
export function mapHumanoidBones(root) {
  if(!root||typeof root.traverse!=='function')throw Error('Humanoid root missing');
  const bones=[];root.traverse(obj=>{if(obj.isBone)bones.push(obj);});
  const mapped={};const used=new Set();
  for(const [role,names] of Object.entries(ALIASES)) {
    const bone=bones.find(b=>!used.has(b)&&names.includes(normalizeBoneName(b.name)));
    if(bone){mapped[role]=bone;used.add(bone);}
  }
  return mapped;
}
export const REQUIRED_HUMANOID=['hips','leftUpperArm','rightUpperArm','leftUpperLeg','rightUpperLeg'];
export function assertHumanoidMap(map) {
  const missing=REQUIRED_HUMANOID.filter(k=>!map[k]);
  if(missing.length)throw Error(`Unsupported humanoid skeleton (missing ${missing.join(', ')})`);
  return map;
}
function trackParts(name) {
  if(typeof name!=='string')return null;
  const m=name.match(/^(.+)\.(quaternion|position|scale)$/);
  return m?{name:m[1],channel:m[2]}:null;
}
function finiteArray(values){return values.length>0&&Array.from(values).every(Number.isFinite);}
/** Rebind source animation into the target skeleton using local rest rotation deltas.
 * Ignores all positional/root tracks to guarantee that animation cannot move physics bodies.
 */
export function retargetRotationClip(THREE,clip,sourceRoot,targetRoot,{name=clip?.name}={}) {
  if(!clip||!Array.isArray(clip.tracks)||clip.tracks.length>256)throw Error('Invalid animation clip');
  const src=assertHumanoidMap(mapHumanoidBones(sourceRoot));
  const dst=assertHumanoidMap(mapHumanoidBones(targetRoot));
  const tracks=[];
  for(const track of clip.tracks){
    const part=trackParts(track.name);if(!part||part.channel!=='quaternion')continue;
    const role=Object.keys(src).find(k=>src[k].name===part.name);
    if(!role||!dst[role])continue;
    const times=Array.from(track.times),values=Array.from(track.values);
    if(times.length<1||times.length>20000||values.length!==times.length*4||!finiteArray(times)||!finiteArray(values)||times.some((t,i)=>t<0||(i&&t<=times[i-1])))throw Error('Invalid animation keyframes');
    const sourceRest=src[role].quaternion.clone(),targetRest=dst[role].quaternion.clone();
    const inverse=sourceRest.clone().invert(),mapped=[];
    for(let i=0;i<values.length;i+=4){
      const delta=new THREE.Quaternion(values[i],values[i+1],values[i+2],values[i+3]);
      if(delta.lengthSq()<.00001)throw Error('Invalid animation quaternion');
      delta.normalize().premultiply(inverse);
      const out=targetRest.clone().multiply(delta).normalize();
      mapped.push(out.x,out.y,out.z,out.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${dst[role].name}.quaternion`,times,mapped));
  }
  if(!tracks.length)throw Error('No supported humanoid rotation tracks in clip');
  return new THREE.AnimationClip(name||'retargeted',clip.duration,tracks);
}
/** Sanitize authored animations. Root and pelvis translations are intentionally discarded. */
export function boneRotationClips(THREE,clips,root) {
  if(!Array.isArray(clips)||clips.length>32)throw Error('Too many animation clips');
  const bones=new Set();root.traverse(o=>{if(o.isBone)bones.add(o.name);});
  return clips.map(clip=>{
    if(!clip?.tracks||clip.tracks.length>256)throw Error('Animation track budget exceeded');
    const tracks=clip.tracks.filter(t=>{
      const p=trackParts(t.name);
      return p?.channel==='quaternion'&&bones.has(p.name)&&t.times.length<=20000;
    });
    return new THREE.AnimationClip(clip.name,clip.duration,tracks);
  }).filter(clip=>clip.tracks.length>0);
}
