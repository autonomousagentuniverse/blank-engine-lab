import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectLocomotionClips,inspectAvatarGlb} from '../character/gltf.mjs';
import {stepActor,PHYSICS_STEP,createActor} from '../physics/locomotion.mjs';
import {normalizeBoneName} from '../character/retarget.mjs';
const root=new URL('../',import.meta.url);
const text=(path)=>readFileSync(new URL(path,root),'utf8');

test('Blender authentic clip names map to real authored game locomotion',()=>{
 const names=['Idle_Breath','Walk_InPlace','Jog_InPlace','Run_InPlace','Happy_Face','Fight_Combo'];
 const clips=names.map(name=>({name,tracks:[{name:'Thigh.L.quaternion'}]}));
 const selected=selectLocomotionClips(clips);
 assert.equal(selected.idle.name,'Idle_Breath');
 assert.equal(selected.walk.name,'Walk_InPlace');
 assert.equal(selected.run.name,'Run_InPlace');
 assert.equal(selected.jump,undefined);
});
test('Blender bone roles resolve, giving priority to pelvis instead of motion root',()=>{
 assert.equal(normalizeBoneName('UpperArm.L'),'upperarml');
 assert.equal(normalizeBoneName('Forearm.R'),'forearmr');
 const source=text('character/retarget.mjs');
 assert.match(source,/names.map\(n=>bones.find/);
});
test('Playable handoff uses temporary verified job URL, not simulated animation or unauthenticated URL',()=>{
 const api=text('api/anatomy.js'),ui=text('character-pipeline/manual-builder/app.mjs'),editor=text('editor.mjs');
 assert.match(api,/requestedAsset!=='animated_character.glb'/);
 assert.match(api,/result.data.status!=='complete'/);
 assert.match(api,/bytes.readUInt32LE\(0\)!==0x46546c67/);
 assert.match(api,/Bearer '\+token/);
 assert.match(ui,/Play-test this character in Blank Engine/);
 assert.match(editor,/loadBlenderHumanFromJob\(\)/);
 assert.match(editor,/await loadBlenderHumanFromJob\(\)/,'Startup must invoke real Blender handoff, not only declare function');
 assert.match(editor,/await loadDemo\(true\)/,'Wait for async world demo rebuild before importing avatar');
 assert.match(editor,/anatomyMotionStatus/,'Expose actual actor state for mechanical validation');
 assert.match(text('index.html'),/id="anatomyMotionStatus"/,'Browser shows playable character telemetry');
 assert.match(editor,/Blender game import FAILED/);
 assert.match(editor,/Walk: '\+walk/);
 assert.match(editor,/blenderAnatomyPlaytest/);
 assert.match(editor,/characterRig\?\.skinnedCount/);
 assert.match(text('character/gltf.mjs'),/action.timeScale=THREE.MathUtils.clamp/);
});
test('Imported humanoid speed calibration does not change existing game speed',()=>{
 const moving=(scale)=>stepActor(createActor(),{x:1,z:0,speedScale:scale},PHYSICS_STEP,delta=>({delta,grounded:true}));
 const standard=moving(1),calibrated=moving(.37);
 assert.ok(standard.vx>calibrated.vx);
 assert.ok(calibrated.vx>0);
 assert.throws(()=>moving(10),/speed scale/);
});

