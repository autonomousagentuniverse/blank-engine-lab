import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {initialize,validatePlan,advance,digest,hashFile,PHASES} from './quality-gates.mjs';
const hex=x=>crypto.createHash('sha256').update(x).digest('hex');
const reject=(fn,code)=>assert.throws(fn,e=>e.message.includes(code));
function setup(origin='cc0_derived'){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'quality-one-shot-'));
 const src=path.join(dir,'mira.blend');fs.writeFileSync(src,'FAKE BLEND BYTES FOR CONTRACT TEST ONLY');
 const plan={schema:'blank.one-shot.plan.v1',id:'mira-calibration',
  source:{file:'mira.blend',sha256:hashFile(src),origin,
   creator:'Documented CC0 Asset Author',license:'CC0',license_verified:true,
   ancestors:origin==='cc0_derived'?['Vitruvian CC0']:[]},
  targets:{hair_style:'Natural side-swept 18cm layered hair with flexible clumps',
   hairline:'Irregular temporal transitions and crown coverage',
   brow_growth:'Mapped medial upward to lateral outward',
   eye_anatomy:'Fitted upper lower lids cornea and tearline',
   skin_reference:'Source material UV tangent and physically calibrated pore roughness',
   identity_goal:'Distinct facial proportions verified front and profile'},
  mechanical_limits:{max_hair_light_ratio:1.8,min_scalp_coverage:.94,
    min_direction_entropy:.45,min_face_luminance_retention:.75,max_hair_head_penetration:.02,
    max_eye_intersection_mm:.55,max_lip_midline_jump_mm:.1},
  views:['front','three_quarter','profile','eyes_macro'].map((id,i)=>({id,camera:'CAM'+i})),
  render:{engine:'CYCLES',resolution:[700,700],samples:32}};
 let state=initialize(plan,dir);
 const evidence=(stage,measurements,files=['probe.txt'])=>{
  for(const f of files)fs.writeFileSync(path.join(dir,f),'evidence '+stage+' '+f);
  return {schema:'blank.one-shot.evidence.v1',stage,plan_sha256:digest(plan),
   source_sha256:plan.source.sha256,method:'Measured via controlled real Blender source probe',
   files:files.map(name=>({name,sha256:hashFile(path.join(dir,name))})),measurements};
 };
 const calibration=(lit=80,emission=60.4,face=170,referenceFace=206)=>evidence('calibration',{
    lit_hair_luminance:lit,emission_hair_luminance:emission,
    face_luminance:face,face_reference_luminance:referenceFace,
    hair_mask_pixels:101522,mask_method:'shader-only emission binding color mask',
    light_sweep:{source_sha256:plan.source.sha256,levels:3,same_camera:true}});
 const geometry=()=>evidence('construction',{
    source_sha256:plan.source.sha256,probe_script_sha256:hex('source geometry probe'),
    hair:{samples:15000,scalp_coverage:.96,direction_entropy:.62,head_penetration_rate:.004},
    brows:{sampled_roots:2500,growth_field:'mapped eyebrow surface normals and follicle angular field'},
    eyes:{max_contact_intersection_mm:.35,contact_points:150},
    skin:{albedo_uv_verified:true,normal_uv_verified:true,roughness_uv_verified:true},
    identity:{midline_jump_mm:.03,facs_preserved:true}});
 const preview=()=>evidence('preview',{engine:'CYCLES',samples:32,
  frames:plan.views.map(v=>({id:v.id,camera:v.camera,file:v.id+'.png',width:700,height:700}))},
  plan.views.map(v=>v.id+'.png'));
 return {dir,src,plan,state,evidence,calibration,geometry,preview,
 cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test('preflight rejects missing manifest semantics, ancestry, rights and source edits',()=>{
 const d=setup();
 try{
  assert.equal(validatePlan(d.plan),true);
  d.plan.targets.hairline='';reject(()=>validatePlan(d.plan),'SEMANTIC_TARGETS');
  d.plan.targets.hairline='Natural front hairline';d.plan.source.ancestors=[];
  reject(()=>validatePlan(d.plan),'CC0_DERIVATION');
  d.plan.source.ancestors=['Vitruvian CC0'];d.plan.source.license_verified=false;
  reject(()=>validatePlan(d.plan),'SOURCE_RIGHTS');
  d.plan.source.license_verified=true;fs.appendFileSync(d.src,' tampered');
  reject(()=>initialize(d.plan,d.dir),'SOURCE_SHA_CHANGED');
 }finally{d.cleanup();}
});
test('MIRA05 measured 177 / 60.4 hair response is blocked',()=>{
 const d=setup();
 try{
  const before=JSON.stringify(d.state);
  reject(()=>advance(d.state,d.plan,d.calibration(177,60.4),d.dir),'HAIR_LIGHT_RATIO_EXCEEDS_LIMIT:2.930');
  assert.equal(JSON.stringify(d.state),before);
 }finally{d.cleanup();}
});
test('evidence hash and source provenance are mandatory',()=>{
 const d=setup();
 try{
  const e=d.calibration();e.files[0].sha256=hex('wrong');
  reject(()=>advance(d.state,d.plan,e,d.dir),'EVIDENCE_HASH_CHANGED');
  e.files[0].name='../escape';
  reject(()=>advance(d.state,d.plan,e,d.dir),'EVIDENCE_PATH_ESCAPE');
  e.files[0].name='probe.txt';e.files[0].sha256=hashFile(path.join(d.dir,'probe.txt'));
  e.source_sha256=hex('wrong');
  reject(()=>advance(d.state,d.plan,e,d.dir),'EVIDENCE_SOURCE_OR_PLAN');
 }finally{d.cleanup();}
});
test('geometry counts do not substitute for hair guide and scalp quality',()=>{
 const d=setup();
 try{
  d.state=advance(d.state,d.plan,d.calibration(),d.dir);
  const g=d.geometry();g.measurements.hair.direction_entropy=.2;
  reject(()=>advance(d.state,d.plan,g,d.dir),'HAIR_GUIDES_TOO_UNIFORM');
  g.measurements.hair.direction_entropy=.7;g.measurements.hair.scalp_coverage=.4;
  reject(()=>advance(d.state,d.plan,g,d.dir),'SCALP_VISIBLE_THROUGH_GROOM');
  g.measurements.hair.scalp_coverage=.96;g.measurements.eyes.max_contact_intersection_mm=2.0;
  reject(()=>advance(d.state,d.plan,g,d.dir),'EYELID_CONTACT_UNVERIFIED');
 }finally{d.cleanup();}
});
test('phase sequence blocks preview and review before evidence',()=>{
 const d=setup();
 try{
  reject(()=>advance(d.state,d.plan,d.preview(),d.dir),'WRONG_OR_OUT_OF_ORDER_STAGE');
  d.state=advance(d.state,d.plan,d.calibration(),d.dir);
  reject(()=>advance(d.state,d.plan,d.preview(),d.dir),'WRONG_OR_OUT_OF_ORDER_STAGE');
  d.state=advance(d.state,d.plan,d.geometry(),d.dir);
  assert.equal(d.state.status,'BLOCKED_PENDING_PREVIEW');
 }finally{d.cleanup();}
});
test('render camera provenance and human evidence fingerprints are separate',()=>{
 const d=setup();
 try{
  d.state=advance(d.state,d.plan,d.calibration(),d.dir);
  d.state=advance(d.state,d.plan,d.geometry(),d.dir);
  let p=d.preview();p.measurements.frames[1].camera='wrong';
  reject(()=>advance(d.state,d.plan,p,d.dir),'PREVIEW_CAMERA_OR_IMAGE_MISMATCH');
  p=d.preview();d.state=advance(d.state,d.plan,p,d.dir);
  assert.equal(d.state.status,'BLOCKED_PENDING_HUMAN_REVIEW');
  const note='in-person visual review';fs.writeFileSync(path.join(d.dir,'review.txt'),note);
  const reviewer=d.evidence('human_review',{
   reviewer:'Artist Reviewer',human_attestation:true,reviewed_at:'2026-10-17',
   preview_fingerprint:'wrong',
   eyes:'approve',hair:'approve',brows:'approve',skin:'approve',identity:'approve',overall:'approve'
  },['review.txt']);
  reject(()=>advance(d.state,d.plan,reviewer,d.dir),'REVIEW_NOT_PINNED_TO_PREVIEW');
  reviewer.measurements.preview_fingerprint=d.state.phases.at(-1).fingerprint;
  reviewer.measurements.hair='reject';
  reject(()=>advance(d.state,d.plan,reviewer,d.dir),'HUMAN_VISUAL_REJECTION');
  reviewer.measurements.hair='approve';
  d.state=advance(d.state,d.plan,reviewer,d.dir);
  assert.equal(d.state.status,'BLOCKED_PENDING_WEBGL_PARITY');
  assert.equal(d.state.release_allowed,false);
 }finally{d.cleanup();}
});
test('CC0-derived human cannot auto-promote as independent at WebGL stage',()=>{
 const d=setup();
 try{
  d.state=advance(d.state,d.plan,d.calibration(),d.dir);
  d.state=advance(d.state,d.plan,d.geometry(),d.dir);
  d.state=advance(d.state,d.plan,d.preview(),d.dir);
  d.state=advance(d.state,d.plan,d.evidence('human_review',{
    reviewer:'Real Reviewer',reviewed_at:'2026-10-17',human_attestation:true,
    preview_fingerprint:d.state.phases.at(-1).fingerprint,
    eyes:'approve',hair:'approve',brows:'approve',skin:'approve',identity:'approve',overall:'approve'
  }),d.dir);
  const evidence=d.evidence('webgl_parity',{
    cycles_preview_fingerprint:d.state.phases.find(x=>x.stage==='preview').fingerprint,
    same_camera:true,same_lighting:true,threejs_render_verified:true,
    human_parity_accepted:true,origin_rights_manual_accepted:true});
  reject(()=>advance(d.state,d.plan,evidence,d.dir),'DERIVED_ASSET_NOT_AUTOMATIC_ORIGINAL_RELEASE');
 }finally{d.cleanup();}
});
test('independent human with every stage approved still cannot auto-deploy',()=>{
 const d=setup('independent_original');
 try{
  for(const prepare of [()=>d.calibration(),()=>d.geometry(),()=>d.preview()]){
   const evidence=prepare();d.state=advance(d.state,d.plan,evidence,d.dir);
  }
  d.state=advance(d.state,d.plan,d.evidence('human_review',{
    reviewer:'Human Artist',human_attestation:true,reviewed_at:'2026-10-17',
    preview_fingerprint:d.state.phases.at(-1).fingerprint,
    eyes:'approve',hair:'approve',brows:'approve',skin:'approve',identity:'approve',overall:'approve'
  }),d.dir);
  d.state=advance(d.state,d.plan,d.evidence('webgl_parity',{
   cycles_preview_fingerprint:d.state.phases.find(x=>x.stage==='preview').fingerprint,
   same_camera:true,same_lighting:true,threejs_render_verified:true,
   human_parity_accepted:true,origin_rights_manual_accepted:true
  }),d.dir);
  assert.equal(d.state.phases.length,PHASES.length);
  assert.equal(d.state.status,'BLOCKED_PENDING_EXPLICIT_RELEASE_AUTHORIZATION');
  assert.equal(d.state.release_allowed,false);
  reject(()=>advance(d.state,d.plan,d.evidence('webgl_parity',{}),d.dir),'ALL_STAGES_FINISHED');
 }finally{d.cleanup();}
});

test('lighting that darkens hair but ruins the face fails coupled calibration',()=>{
 const d=setup();
 try{
  // Real MIRA05 10% light result: 79.365 hair vs 61.696 emission
  // but 108.38 face vs 206.00 original; face retention ~0.526.
  const e=d.calibration(79.3652,61.6961,108.3805,206.0023);
  reject(()=>advance(d.state,d.plan,e,d.dir),'SKIN_UNDEREXPOSED_BY_HAIR_FIX:0.526');
  assert.equal(d.state.phase_index,0);
  const acceptable=d.calibration(80,60.4,170,206);
  const next=advance(d.state,d.plan,acceptable,d.dir);
  assert.equal(next.phases[0].findings.face_luminance_retention>0.75,true);
 }finally{d.cleanup();}
});
