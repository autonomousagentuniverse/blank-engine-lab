/** Imported-rig contact calibration. Values are in engine-world metres.
 * Measured only from the validated, scaled scene; no IK may translate Rapier.
 */
const finite3=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
/** The foot bone is generally at the ANKLE. The collision floor contacts the SOLE.
 * Capture the difference in the normalized bind/standing pose before animation.
 * Bound it because dangling props and inaccurate skins can distort AABB geometry.
 */
export function measureSoleClearance(ankleWorld,visualFloor,{maxClearance=.4}={}){
 if(!finite3(ankleWorld)||!Number.isFinite(visualFloor)||!Number.isFinite(maxClearance)||maxClearance<=0)throw Error('Invalid avatar foot calibration');
 return clamp(ankleWorld.y-visualFloor,0,maxClearance);
}
/** Emit diagnostics for comparison across differently sized source rigs.
 * If either foot is missing, leave that chain without forced calibration.
 */
export function calibrateRigSoles(THREE,visual,chains){
 if(!visual?.updateWorldMatrix||!THREE?.Box3||!THREE?.Vector3)throw Error('Invalid avatar calibration scene');
 visual.updateWorldMatrix(true,true);
 const box=new THREE.Box3().setFromObject(visual);
 if(box.isEmpty()||!Number.isFinite(box.min.y))throw Error('Avatar has no calibrated geometry');
 const offsets={};
 for(const side of ['left','right']){
  const chain=chains?.[`${side}Leg`];
  if(!chain?.end?.isBone)continue;
  const ankle=chain.end.getWorldPosition(new THREE.Vector3());
  const offset=measureSoleClearance(ankle,box.min.y);
  chain.soleOffset=offset;
  offsets[side]=offset;
 }
 return offsets;
}
