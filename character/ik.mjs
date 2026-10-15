import {nextGaitPhase,stanceForFoot,updateFootLock,calibrateHandContact} from './motion.mjs';
/** Animation-layer IK. Rapier is the only authority for actor/world motion.
 * Two-bone IK adjusts rotations, never model/world translations.
 * Safe on rigs that are missing an ankle or wrist: unsupported chains are skipped.
 */
export const MAX_FOOT_STEP = 0.42;
export const MAX_FOOT_REACH = 0.34;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=v=>v&&[v.x,v.y,v.z].every(Number.isFinite);

/** Stable triangle solve in world space. Pole steers the knee/elbow without flipping. */
export function solveTwoBone(hip,target,pole,upperLength,lowerLength) {
  if(![hip,target,pole].every(finite)||![upperLength,lowerLength].every(v=>Number.isFinite(v)&&v>0.0001))throw Error('Invalid IK chain');
  const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
  const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
  const mul=(a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});
  const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const length=a=>Math.hypot(a.x,a.y,a.z);
  const norm=a=>mul(a,1/(length(a)||1));
  const raw=sub(target,hip),rawDistance=length(raw);
  const direction=rawDistance>1e-8?norm(raw):{x:0,y:-1,z:0};
  const minD=Math.abs(upperLength-lowerLength)+1e-5;
  const maxD=upperLength+lowerLength-1e-5;
  const distance=clamp(rawDistance,minD,maxD);
  const end=add(hip,mul(direction,distance));
  const along=(distance*distance+upperLength*upperLength-lowerLength*lowerLength)/(2*distance);
  const sideLength=Math.sqrt(Math.max(0,upperLength*upperLength-along*along));
  let side=sub(sub(pole,hip),mul(direction,dot(sub(pole,hip),direction)));
  if(length(side)<1e-6){const ref=Math.abs(direction.x)<.8?{x:1,y:0,z:0}:{x:0,y:0,z:1};side=sub(ref,mul(direction,dot(ref,direction)));}
  const knee=add(add(hip,mul(direction,along)),mul(norm(side),sideLength));
  return {knee,end,clamped:Math.abs(distance-rawDistance)>1e-4};
}

/** Interpret finite ground probes from Rapier or a simple test-heightfield. */
export function groundContact(result,actorFeetY){
  if(!result||!Number.isFinite(result.y)||!finite(result.normal)||result.normal.y<.45)return null;
  if(Math.abs(result.y-actorFeetY)>MAX_FOOT_STEP)return null;
  return {y:result.y,normal:result.normal};
}

/** Rotate a bone toward a desired next joint in world-space, blended with authored animation. */
export function aimBone(THREE,bone,fromWorld,toWorld,weight){
  if(!bone?.parent||!finite(fromWorld)||!finite(toWorld)||!(weight>0))return false;
  const start=new THREE.Vector3().copy(fromWorld),end=new THREE.Vector3().copy(toWorld);
  const joint=new THREE.Vector3();bone.getWorldPosition(joint);
  const old=start.sub(joint),desired=end.sub(joint);
  if(old.lengthSq()<1e-8||desired.lengthSq()<1e-8)return false;
  const delta=new THREE.Quaternion().setFromUnitVectors(old.normalize(),desired.normalize());
  const worldQ=new THREE.Quaternion();bone.getWorldQuaternion(worldQ);
  const parentQ=new THREE.Quaternion();bone.parent.getWorldQuaternion(parentQ);
  const localTarget=parentQ.invert().multiply(delta.multiply(worldQ));
  bone.quaternion.slerp(localTarget,clamp(weight,0,1));
  bone.updateWorldMatrix(true,true);
  return true;
}

export function applyTwoBoneIK(THREE,chain,target,pole,blend=1){
  const {upper,lower,endLocal}=chain??{};
  if(!upper?.isBone||!lower?.isBone||!endLocal||!finite(target)||!finite(pole))return false;
  upper.updateWorldMatrix(true,true);
  const hip=new THREE.Vector3(),knee=new THREE.Vector3(),ankle=new THREE.Vector3();
  upper.getWorldPosition(hip);lower.getWorldPosition(knee);
  lower.localToWorld(ankle.copy(endLocal));
  const l1=hip.distanceTo(knee),l2=knee.distanceTo(ankle);
  if(l1<.03||l2<.03)return false;
  const answer=solveTwoBone(hip,target,pole,l1,l2);
  aimBone(THREE,upper,knee,answer.knee,blend);
  lower.updateWorldMatrix(true,true);
  const currentEnd=lower.localToWorld(new THREE.Vector3().copy(endLocal));
  aimBone(THREE,lower,currentEnd,answer.end,blend);
  return true;
}

/** Return two-bone chains when a complete anatomical limb is available. */
export function makeMappedChains(THREE,bones){
  const out={};
  for(const side of ['left','right'])for(const [part,upperKey,lowerKey,endKey] of [
    ['Leg',`${side}UpperLeg`,`${side}LowerLeg`,`${side}Foot`],
    ['Arm',`${side}UpperArm`,`${side}LowerArm`,`${side}Hand`]]) {
    const upper=bones?.[upperKey],lower=bones?.[lowerKey],end=bones?.[endKey];
    if(upper?.isBone&&lower?.isBone&&end?.isBone&&end.parent===lower){
      out[`${side}${part}`]={upper,lower,endLocal:end.position.clone(),end};
    }
  }
  return out;
}

/** Apply bounded ground-normal compensation to an imported humanoid ankle. */
export function alignFootToGround(THREE,foot,normal,blend=.35){
 if(!foot?.isBone||!foot.parent||!finite(normal)||normal.y<.8||!(blend>0))return false;
 foot.updateWorldMatrix(true,true);
 const worldQ=foot.getWorldQuaternion(new THREE.Quaternion());
 const up=new THREE.Vector3(0,1,0).applyQuaternion(worldQ).normalize();
 const targetUp=new THREE.Vector3(normal.x,normal.y,normal.z).normalize();
 const angle=Math.acos(clamp(up.dot(targetUp),-1,1));
 if(angle<.003)return true;
 const capped=up.clone().lerp(targetUp,Math.min(1,.28/angle)).normalize();
 const delta=new THREE.Quaternion().setFromUnitVectors(up,capped);
 const parentQ=foot.parent.getWorldQuaternion(new THREE.Quaternion());
 const desired=parentQ.invert().multiply(delta.multiply(worldQ));
 foot.quaternion.slerp(desired,clamp(blend,0,.75));
 foot.updateWorldMatrix(true,true);
 return true;
}
/** World-space stance lock with budgeted stretch. In air, release all locks. */
export function createPoseController(THREE,rig){
  const chains=rig?.poseChains||{};
  let phase=0,locks={left:null,right:null};
  const tmp=Object.keys(chains).length?new THREE.Vector3():null;
  const state=()=>Object.fromEntries(['left','right'].map(side=>[side,{
    planted:!!locks[side]?.point&&locks[side].weight>.5,
    weight:locks[side]?.weight??0,
    position:locks[side]?.point?{...locks[side].point}:null
  }]));
  return {
    get chains(){return Object.keys(chains);},
    get footState(){return state();},
    get gaitPhase(){return phase;},
    reset(){locks={left:null,right:null};phase=0;},
    update({actor,dt,groundProbe,handTarget=null,handRadius=0,reach=0}){
      if(!actor||!(dt>=0)||!Number.isFinite(dt)||!rig?.root)return;
      rig.root.updateWorldMatrix(true,true);
      const speed=Math.hypot(actor.vx||0,actor.vz||0);
      phase=nextGaitPhase(phase,speed,dt);
      for(const side of ['left','right']){
        const chain=chains[`${side}Leg`];if(!chain||typeof groundProbe!=='function')continue;
        chain.lower.updateWorldMatrix(true,true);
        const foot=chain.lower.localToWorld(tmp.copy(chain.endLocal)).clone();
        const hip=chain.upper.getWorldPosition(new THREE.Vector3());
        const grounded=!!actor.grounded;
        const stance=grounded&&stanceForFoot(phase,side,speed);
        const probePoint=locks[side]?.point??foot;
        const sample=stance?groundContact(groundProbe(probePoint.x,probePoint.z,actor.y+1.2),actor.y):null;
        const knee=chain.lower.getWorldPosition(new THREE.Vector3());
        const maxReach=(hip.distanceTo(knee)+knee.distanceTo(foot))*.96;
        // Neither foot follows moving ankles once planted. Stance ends on gait phase
        // change, jumping, invalid contact, or a reach limit (never stretch the leg).
        locks[side]=updateFootLock(locks[side],{stance:stance&&!!sample,foot,hip,
          contact:sample,dt:Math.min(dt,.05),maxReach:Math.max(.15,maxReach)});
        const lock=locks[side];
        if(!lock.point||lock.weight<.025)continue;
        const pole={x:hip.x,y:hip.y+.15,z:hip.z-1};
        applyTwoBoneIK(THREE,chain,lock.point,pole,lock.weight*.86);
        if(chain.end?.isBone&&lock.normal)alignFootToGround(THREE,chain.end,lock.normal,lock.weight*.45);
      }
      if(reach>0&&finite(handTarget)&&chains.rightArm){
        const chain=chains.rightArm;
        const shoulder=chain.upper.getWorldPosition(new THREE.Vector3());
        const elbow=chain.lower.getWorldPosition(new THREE.Vector3());
        const hand=chain.lower.localToWorld(new THREE.Vector3().copy(chain.endLocal));
        const length=shoulder.distanceTo(elbow)+elbow.distanceTo(hand);
        if(length>.05){
          const contact=calibrateHandContact(shoulder,handTarget,{armLength:length,surfaceRadius:handRadius});
          const pole={x:shoulder.x+1,y:shoulder.y-.2,z:shoulder.z-.45};
          applyTwoBoneIK(THREE,chain,contact.target,pole,clamp(reach,0,1)*.9);
        }
      }
    }
  };
}
