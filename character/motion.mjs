/** Frame-rate-invariant gait, planted foot locks, and bounded visual contact targets.
 * Pure values: no Three.js dependency, no modification of the Rapier actor.
 */
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const xyz=v=>v&&[v.x,v.y,v.z].every(Number.isFinite);
export const GAIT_STRIDE_METERS=2.7;
export function nextGaitPhase(phase,speed,dt){
 if(![phase,speed,dt].every(Number.isFinite)||dt<0)throw Error('Invalid gait time');
 return (phase+Math.max(0,speed)*Math.min(.05,dt)*2*Math.PI/GAIT_STRIDE_METERS)%(2*Math.PI);
}
export function stanceForFoot(phase,side,speed){
 if(speed<.28)return true;
 return Math.sin(phase+(side==='right'?Math.PI:0))>=-.16;
}
export function fadeSeconds(from,to){
 if(from===to)return 0;
 if(['jump','fall'].includes(to))return .095;
 if(from==='jump'||from==='fall')return .18;
 if((from==='walk'&&to==='run')||(from==='run'&&to==='walk'))return .20;
 return .23;
}
/** Weighted stance lock: stays in WORLD SPACE until swing/overstretch, never chases the animated ankle. */
export function updateFootLock(previous,{stance,foot,hip,contact,dt,maxReach=1.13,soleOffset=0}){
 if(!xyz(foot)||!xyz(hip)||!(dt>=0&&dt<=.1)||!(maxReach>0)||!Number.isFinite(soleOffset)||soleOffset<0||soleOffset>.4)throw Error('Invalid planted-foot sample');
 const current=previous??{point:null,normal:null,weight:0,blocked:false};
 let {point,normal,weight,blocked}=current;
 if(!stance){blocked=false;}
 if(stance&&!point&&!blocked&&contact&&Number.isFinite(contact.y)&&xyz(contact.normal)){
  point={x:foot.x,y:contact.y+.035+soleOffset,z:foot.z};normal={...contact.normal};
 }
 if(point && stance && Math.hypot(hip.x-point.x,hip.y-point.y,hip.z-point.z)>maxReach){
  blocked=true;
 }
 const targetWeight=point&&stance&&!blocked?1:0;
 weight+= (targetWeight-weight)*(1-Math.exp(-dt/(targetWeight?.075:.09)));
 weight=clamp(weight,0,1);
 if(weight<.015&&targetWeight===0){point=null;normal=null;weight=0;}
 return {point,normal,weight,blocked};
}
/** Sphere-approximate target surface, then limit the requested hand pose to anatomical reach.
 * `contact` is true only when the physical hand can reach the ACTUAL object surface.
 */
export function calibrateHandContact(shoulder,objectCenter,{armLength,surfaceRadius=0,reachFraction=.95}={}){
 if(!xyz(shoulder)||!xyz(objectCenter)||!(armLength>0)||!Number.isFinite(surfaceRadius)||surfaceRadius<0)throw Error('Invalid hand contact');
 const d={x:objectCenter.x-shoulder.x,y:objectCenter.y-shoulder.y,z:objectCenter.z-shoulder.z};
 const raw=Math.hypot(d.x,d.y,d.z);
 const length=Math.max(.001,raw),maxReach=armLength*clamp(reachFraction,.1,1);
 const surfaceDistance=Math.max(0,raw-surfaceRadius);
 const distance=clamp(surfaceDistance,.04,maxReach);
 const target={x:shoulder.x+d.x/length*distance,y:shoulder.y+d.y/length*distance,z:shoulder.z+d.z/length*distance};
 return {target,contact:surfaceDistance<=maxReach,shortfall:Math.max(0,surfaceDistance-maxReach)};
}
