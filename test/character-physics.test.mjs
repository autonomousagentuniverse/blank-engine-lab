import test from 'node:test';
import assert from 'node:assert/strict';
import {createActor,stepActor,stepAccumulator,createFallbackMover,frameDelta,PHYSICS_STEP,WALK_SPEED,RUN_SPEED} from '../physics/locomotion.mjs';
import {limbWeights,validateSkin,SKIN_NAMES,createCharacterRig} from '../character/rig.mjs';
import {makePhysicsWorld,loadRapier,RAPIER_CDN} from '../physics/rapier.mjs';
import {playableLayout} from '../quest.mjs';
import {DEFAULT_SPEC} from '../core.mjs';

const deltaMover=(delta)=>({delta,grounded:false});
const groundMover=(actor)=>(delta)=>({delta:{...delta,y:Math.max(-actor.y,delta.y)},grounded:actor.y+delta.y<=0});
test('jump rising, falling, landing and edge-triggered jump',()=>{
 let actor=createActor(); let maxHeight=0;const dt=PHYSICS_STEP;
 for(let i=0;i<130;i++) {
  actor=stepActor(actor,{x:0,z:0,jump:i<65},dt,groundMover(actor));
  maxHeight=Math.max(maxHeight,actor.y);
 }
 assert.ok(maxHeight>.9&&maxHeight<2);
 assert.equal(actor.grounded,true);
 assert.equal(actor.y,0);
 assert.equal(actor.motion,'idle');
 actor=stepActor(actor,{jump:true},dt,groundMover(actor));
 assert.equal(actor.motion,'jump','fresh press after release can jump again');
});
test('holding jump cannot auto-hop on landing',()=>{
 let a=createActor();let launches=0,prev=a.grounded;
 for(let i=0;i<180;i++) {a=stepActor(a,{jump:true},PHYSICS_STEP,groundMover(a));if(prev&&a.motion==='jump')launches++;prev=a.grounded;}
 assert.equal(launches,1);assert.equal(a.grounded,true);
});
test('diagonal input is normalized and running outruns walking',()=>{
 let walk=createActor(),run=createActor();
 for(let i=0;i<90;i++) {
  walk=stepActor(walk,{x:1,z:1},PHYSICS_STEP,groundMover(walk));
  run=stepActor(run,{x:1,z:1,run:true},PHYSICS_STEP,groundMover(run));
 }
 assert.ok(run.x>walk.x);assert.ok(walk.vx**2+walk.vz**2<=WALK_SPEED**2+1e-4);
 assert.ok(run.vx**2+run.vz**2<=RUN_SPEED**2+1e-4);
});
test('invalid physics response refuses state corruption',()=>{
 assert.throws(()=>stepActor(createActor(),{x:1},PHYSICS_STEP,()=>({delta:{x:NaN,y:0,z:0},grounded:false})),/invalid motion/);
 assert.throws(()=>stepActor(createActor(),{},.6,deltaMover),/fixed/);
});
test('fallback collision preserves world geometry while WASM loads',()=>{
 let a=createActor();const collide=createFallbackMover((x,z)=>x<=0,a);
 a=stepActor(a,{x:1},PHYSICS_STEP,collide);
 assert.equal(a.x,0);
});
test('step accumulator advances fixed number of steps and clamps runaway time',()=>{
 let n=0;let remain=stepAccumulator(0,1,()=>{n++});
 assert.equal(n,6);assert.ok(remain>=0&&remain<PHYSICS_STEP);
 remain=stepAccumulator(remain,PHYSICS_STEP,()=>{n++});assert.equal(n,7);
});
test('skin weights normalize for deformable bone geometry',()=>{
 const {indices,weights}=limbWeights([0,-.25,-.75,-1],1);
 assert.equal(indices.length,16);assert.equal(weights.length,16);
 for(let i=0;i<weights.length;i+=4)assert.ok(Math.abs(weights[i]+weights[i+1]-1)<1e-10);
 assert.equal(weights[0],1);assert.equal(weights[weights.length-3],1);
});
test('only allowlisted skins are accepted',()=>{
 assert.deepEqual(SKIN_NAMES,['explorer','amber','obsidian']);
 assert.throws(()=>validateSkin('javascript:evil'),/Unknown/);
 assert.equal(validateSkin('explorer'),'explorer');
});

// Minimal Three-compatible fake proves skinned bones + attributes are used, without GPU/web in unit tests.
class Group {constructor(){this.children=[];this.position={set() {},y:0};this.rotation={y:0};} add(x){this.children.push(x);} }
class Geometry {constructor(){this.ys=[-.8,-.5,0];this.attributes={};} translate(){} getAttribute(){return {count:this.ys.length,getY:(i)=>this.ys[i]};} setAttribute(name,value){this.attributes[name]=value;} }
class Mesh extends Group {constructor(geo,mat){super();this.geometry=geo;this.material=mat;this.position={set(){},y:0};this.rotation={x:0,y:0,z:0};} }
class SkinnedMesh extends Mesh {bind(skel){this.skeleton=skel;} }
class Bone extends Group {constructor(){super();this.position={y:0};this.rotation={x:0};} }
class Attribute {constructor(array,width){this.array=array;this.itemSize=width;} }
class Skeleton {constructor(bones){this.bones=bones;} }
const FakeThree={Group,Mesh,SkinnedMesh,Bone,Skeleton,Uint16BufferAttribute:Attribute,Float32BufferAttribute:Attribute,
 BoxGeometry:Geometry,SphereGeometry:Geometry,CylinderGeometry:Geometry};
test('rig creates actual skinned mesh binding for four articulated limbs and applies animation',()=>{
 const colors=[];const rig=createCharacterRig(FakeThree,{makeMaterial:(c)=>{const m={color:{setHex(v){m.colorValue=v}},emissive:{setHex(){}},value:c};colors.push(m);return m;}});
 assert.equal(rig.skeletonCount,4);
 for(const l of Object.values(rig.limbs)) {
  assert.ok(l.skinned instanceof SkinnedMesh);
  assert.equal(l.skinned.skeleton.bones.length,2);
  assert.equal(l.skinned.geometry.attributes.skinIndex.itemSize,4);
  assert.equal(l.skinned.geometry.attributes.skinWeight.itemSize,4);
 }
 assert.equal(rig.update({...createActor(),motion:'run',vx:9},.15),'run');
 assert.notEqual(rig.limbs.leftLeg.upper.rotation.x,rig.limbs.rightLeg.upper.rotation.x);
 assert.equal(rig.setSkin('amber'),'amber');assert.equal(rig.skin,'amber');
 assert.equal(colors[0].colorValue,0x352d37);
});

function fakeRapier(){
 const telemetry={colliders:[],bodies:[],steps:0,freed:0,removed:[]};
 const desc=(type,args)=>({type,args,setTranslation(x,y,z){this.t={x,y,z};return this;},setRotation(q){this.q=q;return this;},setRestitution(){return this;},setFriction(){return this;},setLinearDamping(){return this;},setAngularDamping(){return this;}});
 class World {constructor(){this.t=telemetry;} createCollider(d){const c={kind:d.type,t:d.t||{x:0,y:0,z:0},setTranslation(v){this.t=v;},translation(){return this.t;}};telemetry.colliders.push(c);return c;}
 createRigidBody(d){const b={t:d.t,translation(){return this.t},rotation(){return {x:0,y:0,z:0,w:1}}};telemetry.bodies.push(b);return b;}
 createCharacterController(){return {setApplyImpulsesToDynamicBodies(){},enableAutostep(){},enableSnapToGround(){},computeColliderMovement(c,d){this.d=d;},computedMovement(){return this.d;},computedGrounded(){return false;},free(){telemetry.freed++}};}
 removeCollider(c){telemetry.removed.push(c);} step(){telemetry.steps++} free(){telemetry.freed++}}
 return {rapier:{World,ColliderDesc:{cuboid:(...a)=>desc('box',a),capsule:(...a)=>desc('capsule',a)},RigidBodyDesc:{dynamic:()=>desc('dynamic',[])}},telemetry};
}
test('Rapier adapter constructs static geometry + capsule + dynamic crates and disposes once',()=>{
 const {rapier,telemetry}=fakeRapier();const scene=playableLayout({...DEFAULT_SPEC,buildings:3,robots:2});
 const p=makePhysicsWorld(rapier,scene);
 assert.equal(telemetry.bodies.length,2);
 assert.equal(telemetry.colliders.filter(c=>c.kind==='capsule').length,1);
 assert.equal(telemetry.colliders.length,1+3+1+1+2+1);
 assert.equal(p.getTerrain().length,1);
 assert.equal(p.getCrates().length,2);
 const before=p.position;p.step({x:.1,y:0,z:.2});assert.equal(p.position.x,before.x+.1);
 p.teleport(3,1,2);assert.equal(p.position.y,1);
 p.setGateOpen(true);p.setGateOpen(true);assert.equal(telemetry.removed.length,1);
 p.dispose();p.dispose();assert.equal(telemetry.freed,2);
});
test('loadRapier uses injected WASM loader for safe initialization tests',async()=>{
 let count=0;const fake={init:async()=>{count++}};
 assert.equal(await loadRapier(async()=>({default:fake})),fake);assert.equal(count,1);
 assert.match(RAPIER_CDN,/rapier3d-compat@0\.18\.0/);
});

test('RAF frame timestamp precedes performance clock without crashing gait',()=>{
 assert.equal(frameDelta(1000,1001),0);
 assert.equal(frameDelta(1060,1000),.05);
 assert.equal(frameDelta(1025,1000),.025);
 assert.equal(frameDelta(NaN,1000),0);
});
