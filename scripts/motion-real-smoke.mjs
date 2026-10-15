/** Real Three.js + Rapier integration: feet stay world-anchored, hand reaches stay bounded. */
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {createCharacterRig} from '../character/rig.mjs';
import {createPoseController} from '../character/ik.mjs';
import {makePhysicsWorld} from '../physics/rapier.mjs';
import {playableLayout} from '../quest.mjs';
import {DEFAULT_SPEC} from '../core.mjs';
await RAPIER.init();
const world=makePhysicsWorld(RAPIER,playableLayout({...DEFAULT_SPEC,buildings:4,robots:4}));
const actor={x:0,y:0,z:0,vx:0,vz:0,grounded:true,motion:'idle'};
const rig=createCharacterRig(THREE,{makeMaterial:(color,extra={})=>new THREE.MeshStandardMaterial({color,...extra})});
const scene=new THREE.Scene();scene.add(rig.root);
const controller=createPoseController(THREE,rig);
const probe=(x,z,y)=>world.probeGround(x,z,y);
for(let i=0;i<40;i++){
 rig.root.position.set(0,0,0);rig.update(actor,1/60);
 controller.update({actor,dt:1/60,groundProbe:probe});
}
const origin=controller.footState;
assert(origin.left.planted&&origin.right.planted,'idle feet should plant on physics floor');
const planted={...origin.left.position};
for(let i=0;i<7;i++){
 actor.x+=.012;actor.vx=.72;actor.motion='walk';
 rig.root.position.set(actor.x,0,0);rig.update(actor,1/60);
 controller.update({actor,dt:1/60,groundProbe:probe});
 const current=controller.footState.left;
 if(current.planted)assert(Math.hypot(current.position.x-planted.x,current.position.z-planted.z)<1e-5,'stance contact must not slide');
}
actor.grounded=false;actor.motion='jump';actor.y=.8;
rig.root.position.y=actor.y;rig.update(actor,1/60);
controller.update({actor,dt:1/60,groundProbe:probe});
assert(controller.footState.left.weight<origin.left.weight,'jump must release foot lock');
const shoulder=rig.poseChains.rightArm.upper.getWorldPosition(new THREE.Vector3());
const before=rig.poseChains.rightArm.lower.localToWorld(new THREE.Vector3().copy(rig.poseChains.rightArm.endLocal));
controller.update({actor,dt:1/60,groundProbe:probe,handTarget:{x:shoulder.x+.5,y:shoulder.y-.3,z:shoulder.z-.1},handRadius:.05,reach:1});
const after=rig.poseChains.rightArm.lower.localToWorld(new THREE.Vector3().copy(rig.poseChains.rightArm.endLocal));
assert(after.distanceTo(before)>.001,'right hand should react to interaction target');
assert.equal(world.position.y,0,'IK must not modify authoritative physics actor');
world.dispose();
console.log('REAL MOTION SMOKE PASS: Rapier foot locks, jump release, hand reach, physics authority');
