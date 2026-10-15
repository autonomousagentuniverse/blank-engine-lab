import test from 'node:test';
import assert from 'node:assert/strict';
import {solveTwoBone,groundContact,createPoseController,makeMappedChains,MAX_FOOT_STEP,alignFootToGround} from '../character/ik.mjs';
const p=(x,y,z)=>({x,y,z});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test('two-bone IK keeps anatomical lengths on reachable target',()=>{
 const hip=p(0,2,0),target=p(.3,.2,.1);
 const r=solveTwoBone(hip,target,p(1,1,1),1,1);
 assert(Math.abs(dist(hip,r.knee)-1)<1e-8);
 assert(Math.abs(dist(r.knee,r.end)-1)<1e-8);
 assert(dist(r.end,target)<1e-8);
 assert.equal(r.clamped,false);
});
test('unreachable target is clamped instead of stretching bones',()=>{
 const hip=p(0,0,0),r=solveTwoBone(hip,p(100,0,0),p(0,0,1),.7,.7);
 assert.equal(r.clamped,true);
 assert(r.end.x<1.40001);
 assert(Math.abs(dist(hip,r.knee)-.7)<1e-6);
});
test('pole singularity produces stable finite knee',()=>{
 const r=solveTwoBone(p(0,2,0),p(0,.5,0),p(0,1,0),.9,.9);
 assert(Object.values(r.knee).every(Number.isFinite));
});
test('invalid IK input is safely rejected',()=>{
 assert.throws(()=>solveTwoBone(p(NaN,1,0),p(0,0,0),p(1,0,0),1,1));
 assert.throws(()=>solveTwoBone(p(0,1,0),p(0,0,0),p(1,0,0),0,1));
});
test('ground probe accepts traversable slopes within foot step budget',()=>{
 const s=groundContact({y:.18,normal:p(.22,.94,.25)},0);
 assert.equal(s.y,.18);
 assert.equal(groundContact({y:MAX_FOOT_STEP+.01,normal:p(0,1,0)},0),null);
 assert.equal(groundContact({y:0,normal:p(0,.2,1)},0),null);
 assert.equal(groundContact(null,0),null);
});
test('chain mapping accepts only complete anatomically connected limbs',()=>{
 const fake=()=>({isBone:true,position:{clone:()=>p(0,-.4,0)}});
 const upper=fake(),lower=fake(),foot=fake();foot.parent=lower;
 const result=makeMappedChains(null,{leftUpperLeg:upper,leftLowerLeg:lower,leftFoot:foot,rightUpperArm:upper});
 assert.deepEqual(Object.keys(result),['leftLeg']);
});
test('pose controller degrades to no-op when imported rig lacks foot chains',()=>{
 const root={updateWorldMatrix:()=>{}};const rig={root,poseChains:{}};
 const ctrl=createPoseController(null,rig);
 let probes=0;
 ctrl.update({actor:{grounded:true,vx:0,vz:0,y:0},dt:.016,groundProbe:()=>{probes++;throw Error('unexpected probe');}});
 ctrl.update({actor:{grounded:false,vx:0,vz:0,y:1},dt:.016});
 assert.equal(probes,0);
 assert.deepEqual(ctrl.chains,[]);
});

test('ankle rotation safely ignores incomplete rigs and steep contacts',()=>{
 assert.equal(alignFootToGround(null,null,{x:0,y:1,z:0}),false);
 assert.equal(alignFootToGround(null,{isBone:true,parent:null},{x:0,y:1,z:0}),false);
 assert.equal(alignFootToGround(null,{isBone:true,parent:{}},{x:1,y:0,z:0}),false);
});
