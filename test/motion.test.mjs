import test from 'node:test';
import assert from 'node:assert/strict';
import {nextGaitPhase,stanceForFoot,updateFootLock,calibrateHandContact,fadeSeconds} from '../character/motion.mjs';
const xyz=(x,y,z)=>({x,y,z});
const normal=xyz(0,1,0);
test('stance foot remains locked in world coordinates while actor and animated foot move',()=>{
 let lock=null;
 const initial=xyz(.3,.1,0),contact={y:0,normal};
 lock=updateFootLock(lock,{stance:true,foot:initial,hip:xyz(.3,1.1,0),contact,dt:.016,maxReach:1.8});
 const planted={...lock.point};
 for(let i=0;i<12;i++){
  lock=updateFootLock(lock,{stance:true,foot:xyz(.3+i*.03,.1,0),hip:xyz(.3+i*.03,1.1,0),contact,dt:.016,maxReach:1.8});
  assert.deepEqual(lock.point,planted,'stance contact must remain world anchored');
 }
 assert(lock.weight>.8);
});
test('overreach releases lock without silently moving its contact point or replanting in same stance',()=>{
 let state=updateFootLock(null,{stance:true,foot:xyz(0,0,0),hip:xyz(0,1,0),contact:{y:0,normal},dt:.016,maxReach:1.5});
 const point=state.point;
 state=updateFootLock(state,{stance:true,foot:xyz(4,0,0),hip:xyz(4,1,0),contact:{y:0,normal},dt:.016,maxReach:1.5});
 assert.equal(state.blocked,true);assert.deepEqual(state.point,point);
 for(let i=0;i<70;i++)state=updateFootLock(state,{stance:true,foot:xyz(4,0,0),hip:xyz(4,1,0),contact:{y:0,normal},dt:.016,maxReach:1.5});
 assert.equal(state.point,null);assert.equal(state.weight,0);
 assert.equal(updateFootLock(state,{stance:true,foot:xyz(4,0,0),hip:xyz(4,1,0),contact:{y:0,normal},dt:.016,maxReach:1.5}).point,null);
 state=updateFootLock(state,{stance:false,foot:xyz(4,0,0),hip:xyz(4,1,0),contact:null,dt:.016,maxReach:1.5});
 state=updateFootLock(state,{stance:true,foot:xyz(4,0,0),hip:xyz(4,1,0),contact:{y:0,normal},dt:.016,maxReach:1.5});
 assert.equal(state.point.x,4);
});
test('swing and airborne stance release smoothly; gait phase wraps predictably',()=>{
 let state=updateFootLock(null,{stance:true,foot:xyz(0,0,0),hip:xyz(0,1,0),contact:{y:0,normal},dt:.05});
 const weight=state.weight;
 state=updateFootLock(state,{stance:false,foot:xyz(0,0,0),hip:xyz(0,1,0),dt:.016});
 assert(state.weight<weight&&state.weight>0);
 const phase=nextGaitPhase(2*Math.PI-.02,1,.016);
 assert(phase>=0&&phase<2*Math.PI);
 assert(stanceForFoot(0,'left',0)&&stanceForFoot(0,'right',0));
 assert.notEqual(stanceForFoot(Math.PI/2,'left',2),stanceForFoot(Math.PI/2,'right',2));
});
test('hand contact reaches the actual object surface and reports when too far to touch',()=>{
 const shoulder=xyz(0,2,0),object=xyz(0,2,-2);
 const near=calibrateHandContact(shoulder,object,{armLength:1.3,surfaceRadius:.9});
 assert.equal(near.contact,true);assert(Math.abs(near.target.z+1.1)<1e-7);
 const far=calibrateHandContact(shoulder,object,{armLength:.8,surfaceRadius:.1});
 assert.equal(far.contact,false);assert(far.shortfall>1);assert(Math.abs(far.target.z)<.8);
 assert.throws(()=>calibrateHandContact(shoulder,object,{armLength:0}),/Invalid/);
});
test('animation transitions give falling and jumping priority, and walking stays phase matched',()=>{
 assert(fadeSeconds('walk','jump')<fadeSeconds('walk','idle'));
 assert.equal(fadeSeconds('run','run'),0);
 assert(fadeSeconds('walk','run')>0);
});

test('near-straight standing leg keeps a grounded lock within calibrated floor clearance',()=>{
 const hip=xyz(0,1.23,0),foot=xyz(0,.061,0),naturalLength=1.169;
 const lock=updateFootLock(null,{stance:true,foot,hip,contact:{y:0,normal},dt:1/60,maxReach:naturalLength*1.12});
 assert(lock.point&&lock.weight>0&&!lock.blocked,'floor should not cause an immediate lock release');
});

test('planted-foot solver rejects non-finite frame data rather than corrupting IK state',()=>{
 assert.throws(()=>updateFootLock(null,{stance:true,foot:xyz(NaN,0,0),hip:xyz(0,1,0),contact:{y:0,normal},dt:.016}),/Invalid/);
 assert.throws(()=>updateFootLock(null,{stance:true,foot:xyz(0,0,0),hip:xyz(0,1,0),dt:-.01}),/Invalid/);
});
