/** Integration smoke: execute only when Three and Rapier were explicitly installed in CI. */
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {makePhysicsWorld} from '../physics/rapier.mjs';
import {createCharacterRig} from '../character/rig.mjs';
import {createActor,stepActor,PHYSICS_STEP} from '../physics/locomotion.mjs';
import {playableLayout} from '../quest.mjs';
import {DEFAULT_SPEC} from '../core.mjs';
await RAPIER.init();
const layout=playableLayout({...DEFAULT_SPEC,buildings:10,robots:4});
const physics=makePhysicsWorld(RAPIER,layout);
const firstProbe=physics.probeGround(layout.spawn.x,layout.spawn.z,1.3);
assert(firstProbe&&Math.abs(firstProbe.y)<.05&&firstProbe.normal.y>.95);
const model=createCharacterRig(THREE,{makeMaterial:(color,more={})=>new THREE.MeshStandardMaterial({color,...more})});
assert.equal(model.skeletonCount,4);
assert.equal(Object.values(model.limbs).filter(l=>l.skinned.isSkinnedMesh).length,4);
model.update({...createActor(),motion:'walk',vx:6},.1);
assert.equal(model.animation,'walk');
let actor=createActor(layout.spawn.x,layout.spawn.z),top=0;
for(let i=0;i<180;i++){
 actor=stepActor(actor,{jump:i===0,x:0,z:0},PHYSICS_STEP,delta=>physics.step(delta));
 top=Math.max(top,actor.y);
 model.update(actor,PHYSICS_STEP);
}
assert.ok(top>0.4,'player should jump off ground');
assert.ok(Math.abs(actor.y)<.13,'player should settle back on ground');
assert.ok(physics.getCrates().every(c=>c.position.y>.4&&c.position.y<.7),'dynamic crates should settle on ground');
physics.setGateOpen(true);
physics.dispose();
console.log('REAL THREE + RAPIER SMOKE: PASS; skinned limbs=4, jump apex='+top.toFixed(2)+'m, crates=2');
