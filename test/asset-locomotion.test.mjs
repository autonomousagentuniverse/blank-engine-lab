import test from 'node:test';
import assert from 'node:assert/strict';
import {selectLocomotionClips} from '../character/gltf.mjs';
const clip=name=>({name,tracks:[{}]});
test('authored gerund walk and run used',()=>{
 const s=selectLocomotionClips(['Idle','Walking','Running','Jump','Falling'].map(clip));
 assert.equal(s.walk.name,'Walking');assert.equal(s.run.name,'Running');assert.equal(s.idle.name,'Idle');assert.equal(s.fall.name,'Falling');
});
test('combined move names do not masquerade as basic clips',()=>{
 const s=selectLocomotionClips(['WalkJump','RunCycle','Jumping Jack'].map(clip));
 assert.equal(s.walk,undefined);assert.equal(s.run,undefined);assert.equal(s.jump,undefined);
});
test('namespaced motion accepted and invalid tracks ignored',()=>{
 const s=selectLocomotionClips([clip('Robot|Walking'),clip('Rig:Run'),{name:'Idle',tracks:[]}]);
 assert.equal(s.walk.name,'Robot|Walking');assert.equal(s.run.name,'Rig:Run');assert.equal(s.idle,undefined);
});
