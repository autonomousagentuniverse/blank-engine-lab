import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validatePlan,initialize,advance,digest,hashFile,PHASES} from './quality-gates.mjs';

function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'blank-one-shot-'));
 const src=path.join(root,'source.blend');fs.writeFileSync(src,'FIXTURE_NOT_A_REAL_BLENDER_FILE');
 const sourceHash=hashFile(src);
 const plan={schema:'blank.one-shot.plan.v1',id:'test-cc0-character',
  source:{file:'source.blend',sha256:sourceHash,origin:'cc0_derived',
    ancestors:['Vitruvian CC0'],license:'CC0',creator:'Identified CC0 creator',license_verified:true},
  targets:{hair_style:'Side-parted layered hair, varied guides',hairline:'Source measured front and temples',
   brow_growth:'Inner upward then outer temporal',eye_anatomy:'Corneal contact and eyelids',
   skin_reference:'Rights cleared physical material charts',identity_goal:'Distinct but CC0 derived human'},
  mechanical_limits:{max_hair_light_ratio:2.0,min_scalp_coverage:.85,
   min_direction_entropy:.60,max_hair_head_penetration:.02,
   max_eye_intersection_mm:.3,max_lip_midline_jump_mm:.1},
  views:[{id:'front',camera:'CAM_FRONT'},{id:'three_quarter',camera:'CAM_3Q'},
   {id:'profile',camera:'CAM_PROFILE'},{id:'eyes_macro',camera:'CAM_EYES'}],
  render:{engine:'CYCLES',resolution:[700,700],samples:32}};
 function artifact(name='evidence.txt'){
  fs.writeFileSync(path.join(root,name),'actual local synthetic test artifact '+name);
  return {name,sha256:hashFile(path.join(root,name))};
 }
 function evidence(stage,measurements,files=[artifact()]){
  return {schema:'blank.one-shot.evidence.v1',stage,source_sha256:sourceHash,
   plan_sha256:digest(plan),method:'test-fixture-provenance-only',files,measurements};
 }
 function calibration(mod={}){
  return {lit_hair_luminance:80,emission_hair_luminance:60,hair_mask_pixels:1200,
   mask_method:'source-matched fixture pixels',
   light_sweep:{source_sha256:sourceHash,levels:3,same_camera:true},...mod};
 }
 function construction(mod={}){
  return {source_sha256:sourceHash,probe_script_sha256:'b'.repeat(64),
   hair:{samples:5000,scalp_coverage:.89,direction_entropy:.76,head_penetration_rate:.01},
   eyes:{max_contact_intersection_mm:.09,contact_points:150},
   brows:{sampled_roots:1800,growth_field:'surface-following directional test field'},
   skin:{albedo_uv_verified:true,normal_uv_verified:true,roughness_uv_verified:true},
   identity:{midline_jump_mm:.015,facs_preserved:true},...mod};
 }
 return {root,plan,sourceHash,artifact,evidence,calibration,construction,
   initial:()=>initialize(plan,root),
   start:()=>advance(initialize(plan,root),plan,evidence('calibration',calibration()),root),
   cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
function rejecting(fn,phrase){assert.throws(fn,e=>e.message.includes(phrase));}
test('five exact fail-closed stages never imply a deployment',()=>assert.deepEqual(PHASES,
 ['calibration','construction','preview','human_review','webgl_parity']));
test('provenance and valid source hash required',()=>{
 const f=fixture();try{
 assert.ok(validatePlan(f.plan));assert.equal(f.initial().release_allowed,false);
 f.plan.source.license_verified=false;rejecting(()=>f.initial(),'SOURCE_RIGHTS');
 f.plan.source.license_verified=true;f.plan.source.sha256='0'.repeat(64);
 rejecting(()=>f.initial(),'SOURCE_SHA_CHANGED');
 }finally{f.cleanup();}
});
test('honestly declared CC0 derivation allowed as research, never original claim',()=>{
 const f=fixture();try{
 f.plan.source.ancestors=[];
 rejecting(()=>validatePlan(f.plan),'CC0_DERIVATION');
 f.plan.source.origin='independent_original';assert.ok(validatePlan(f.plan));
 f.plan.source.ancestors=['Vitruvian'];rejecting(()=>validatePlan(f.plan),'CLAIM_OF_ORIGINALITY');
 }finally{f.cleanup();}
});
test('semantic requirements cannot be omitted',()=>{
 const f=fixture();try{
 f.plan.targets.hairline='';rejecting(()=>validatePlan(f.plan),'SEMANTIC_TARGETS');
 }finally{f.cleanup();}
});
test('historical MIRA05 overbright ratio is explicitly rejected at calibration',()=>{
 const f=fixture();try{
 const e=f.evidence('calibration',f.calibration({lit_hair_luminance:177,emission_hair_luminance:60.4}));
 rejecting(()=>advance(f.initial(),f.plan,e,f.root),'HAIR_LIGHT_RATIO_EXCEEDS_LIMIT');
 }finally{f.cleanup();}
});
test('bad light-sweep provenance and absent evidence are rejected',()=>{
 const f=fixture();try{
 const e=f.evidence('calibration',f.calibration());
 e.measurements.light_sweep.source_sha256='0'.repeat(64);
 rejecting(()=>advance(f.initial(),f.plan,e,f.root),'LIGHT_SWEEP_PROVENANCE');
 e.measurements.light_sweep.source_sha256=f.sourceHash;e.files=[];
 rejecting(()=>advance(f.initial(),f.plan,e,f.root),'EVIDENCE_FILES_REQUIRED');
 }finally{f.cleanup();}
});
test('calibration pass advances only to construction and cannot release',()=>{
 const f=fixture();try{
 const a=f.start();assert.equal(a.phase_index,1);
 assert.equal(a.status,'BLOCKED_PENDING_CONSTRUCTION');assert.equal(a.release_allowed,false);
 rejecting(()=>advance(a,f.plan,f.evidence('preview',{}),f.root),'WRONG_OR_OUT_OF_ORDER_STAGE');
 }finally{f.cleanup();}
});
test('construction fails on uniform hair directions, scalp gaps and collision',()=>{
 const f=fixture();try{
 const a=f.start();const c=f.construction();
 c.hair.direction_entropy=.1;
 rejecting(()=>advance(a,f.plan,f.evidence('construction',c),f.root),'HAIR_GUIDES_TOO_UNIFORM');
 c.hair.direction_entropy=.7;c.hair.scalp_coverage=.3;
 rejecting(()=>advance(a,f.plan,f.evidence('construction',c),f.root),'SCALP_VISIBLE_THROUGH_GROOM');
 c.hair.scalp_coverage=.95;c.hair.head_penetration_rate=.15;
 rejecting(()=>advance(a,f.plan,f.evidence('construction',c),f.root),'HAIR_PENETRATES_HEAD');
 }finally{f.cleanup();}
});
test('eyes, skin texture maps and lip midline gates are independent',()=>{
 const f=fixture();try{
 const a=f.start(),c=f.construction();c.eyes.max_contact_intersection_mm=2;
 rejecting(()=>advance(a,f.plan,f.evidence('construction',c),f.root),'EYELID_CONTACT_UNVERIFIED');
 c.eyes.max_contact_intersection_mm=.09;c.skin.normal_uv_verified=false;
 rejecting(()=>advance(a,f.plan,f.evidence('construction',c),f.root),'SKIN_TEXTURE_MAPPING_UNVERIFIED');
 c.skin.normal_uv_verified=true;c.identity.midline_jump_mm=3.92;
 rejecting(()=>advance(a,f.plan,f.evidence('construction',c),f.root),'FACIAL_TOPOLOGY_UNVERIFIED');
 }finally{f.cleanup();}
});
test('construction passing does not certify image quality',()=>{
 const f=fixture();try{
 const a=advance(f.start(),f.plan,f.evidence('construction',f.construction()),f.root);
 assert.equal(a.status,'BLOCKED_PENDING_PREVIEW');assert.equal(a.release_allowed,false);
 }finally{f.cleanup();}
});
test('forged PNG image headers are rejected and cannot proceed to review',()=>{
 const f=fixture();try{
 const a=advance(f.start(),f.plan,f.evidence('construction',f.construction()),f.root);
 const frames=f.plan.views.map(v=>({id:v.id,camera:v.camera,file:v.id+'.png',width:700,height:700}));
 const files=frames.map(v=>{const name=v.file;fs.writeFileSync(path.join(f.root,name),Buffer.alloc(14000));
  return {name,sha256:hashFile(path.join(f.root,name))}});
 rejecting(()=>advance(a,f.plan,f.evidence('preview',{engine:'CYCLES',samples:32,frames},files),f.root),
  'INVALID_PNG_EVIDENCE');
 }finally{f.cleanup();}
});
test('stale stage evidence and modified artifact bytes reject advancement',()=>{
 const f=fixture();try{
 const state=f.initial(),e=f.evidence('calibration',f.calibration());
 fs.appendFileSync(path.join(f.root,'evidence.txt'),'tamper');
 rejecting(()=>advance(state,f.plan,e,f.root),'EVIDENCE_HASH_CHANGED');
 e.files[0].sha256=hashFile(path.join(f.root,'evidence.txt'));
 e.source_sha256='0'.repeat(64);
 rejecting(()=>advance(state,f.plan,e,f.root),'EVIDENCE_SOURCE_OR_PLAN_MISMATCH');
 }finally{f.cleanup();}
});
test('real human review is blocked without prior four-view Cycles preview',()=>{
 const f=fixture();try{
 const state=advance(f.start(),f.plan,f.evidence('construction',f.construction()),f.root);
 rejecting(()=>advance(state,f.plan,f.evidence('human_review',{reviewer:'Actual Person',
 human_attestation:true,eyes:'approve'}),f.root),'WRONG_OR_OUT_OF_ORDER_STAGE');
 assert.equal(state.release_allowed,false);
 }finally{f.cleanup();}
});
