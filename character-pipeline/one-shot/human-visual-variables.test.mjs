import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateContracts,compileBlenderRenderConfig,assessTeacherProposal,validateEvaluationReport,CONTRACTS,sourceSha} from './human-visual-variables.mjs';

const request=()=>({schema:'blank.human.visual-render-request.v1',
 source_sha256:sourceSha(),image_generation_used:false,release_allowed:false,
 values:{"camera.margin":.1,"camera.three_quarter_orbit_degrees":32,"render.cycles_samples":36,"render.exposure_ev":-3.3}});
const reject=(x,code)=>assert.throws(x,e=>e.message.includes(code));
test('All four JSON contracts load and include 4 true executable bindings',()=>{
 const p=validateContracts();assert.equal(p.implemented,4);assert.equal(p.unimplemented,32);
 assert.equal(p.controls,36);assert.equal(p.defects,18);assert.equal(p.release_allowed,false);
});
test('Compile actual Blender render parameters without inventing geometry',()=>{
 const cfg=compileBlenderRenderConfig(request());assert.equal(cfg.controls["camera.margin"],.1);
 assert.equal(cfg.controls["render.cycles_samples"],36);assert.equal(cfg.actual_geometry_changed,false);
 assert.equal(cfg.image_generation_used,false);assert.equal(cfg.source_sha256,sourceSha());
 assert.equal(cfg.release_allowed,false);
});
test('Partial changes retain verified baseline and separate overwritten controls',()=>{
 const q=request();q.values={"camera.margin":.08};
 const cfg=compileBlenderRenderConfig(q);assert.equal(cfg.controls["render.cycles_samples"],28);
 assert.deepEqual(cfg.overridden_control_names,["camera.margin"]);
});
test('Reject fake Blender morph bindings and unknown/deprecated controls',()=>{
 const q=request();q.values={"morphology.jaw_width":.2};reject(()=>compileBlenderRenderConfig(q),"UNIMPLEMENTED_CONTROL");
 q.values={"arbitrary.secret_variable":.5};reject(()=>compileBlenderRenderConfig(q),"UNKNOWN_CONTROL");
 q.values={"__proto__.constructor":1};reject(()=>compileBlenderRenderConfig(q),"UNKNOWN_CONTROL");
});
test('Reject source hash mismatch, text-image provenance and release bypass',()=>{
 const q=request();q.source_sha256="0".repeat(64);reject(()=>compileBlenderRenderConfig(q),"WRONG_SOURCE_SHA");
 q.source_sha256=sourceSha();q.image_generation_used=true;reject(()=>compileBlenderRenderConfig(q),"IMAGE_GENERATOR_NOT_BLENDER_EVIDENCE");
 q.image_generation_used=false;q.release_allowed=true;reject(()=>compileBlenderRenderConfig(q),"NO_RELEASE_AUTHORITY");
});
test('Reject nonfinite, out of range and fractional Cycles sample values',()=>{
 const q=request();q.values={"camera.margin":.3};reject(()=>compileBlenderRenderConfig(q),"CONTROL_OUT_OF_BOUNDS");
 q.values={"render.cycles_samples":18.5};reject(()=>compileBlenderRenderConfig(q),"SAMPLES_MUST_BE_INTEGER");
 q.values={"camera.margin":null};reject(()=>compileBlenderRenderConfig(q),"CONTROL_OUT_OF_BOUNDS");
});
test('Teacher example remains blocked, never applies an unimplemented jaw edit',()=>{
 const result=assessTeacherProposal(CONTRACTS.proposal);assert.equal(result.status,"BLOCKED_UNVERIFIED_REFERENCE");
 assert.equal(result.blocked.length,2);assert.deepEqual(result.applied_changes,[]);assert.equal(result.release_allowed,false);
});
test('Even a rights-verified teacher suggestion requires manual review',()=>{
 const t=structuredClone(CONTRACTS.proposal);
 t.teacher.rights_verified=true;t.teacher.reference_ids=["photo-reference-rights-cleared"];
 t.proposed_changes=[{control:"camera.margin",delta:.02,reason:"Wider full body framing test"}];
 const r=assessTeacherProposal(t);assert.equal(r.status,"PENDING_MANUAL_REVIEW");
 assert.equal(r.applied_changes.length,0);assert.equal(r.reviewable[0].proposed_value,.095);
});
test('Reject unauthorized auto-apply, duplicate changes and invalid teacher ranges',()=>{
 const x=structuredClone(CONTRACTS.proposal);x.application.allowed_automatically=true;
 reject(()=>assessTeacherProposal(x),"UNAUTHORIZED_TEACHER_APPLY");
 x.application.allowed_automatically=false;x.proposed_changes.push({...x.proposed_changes[0]});
 reject(()=>assessTeacherProposal(x),"DUPLICATE_DELTA");
 x.proposed_changes=[{control:"camera.margin",delta:.95,reason:"Deliberate out-of-range"}];
 reject(()=>assessTeacherProposal(x),"DELTA_OUT_OF_BOUNDS");
});
test('Render report cannot fabricate a realism number without human review',()=>{
 const t=structuredClone(CONTRACTS.evaluation);
 assert.equal(validateEvaluationReport(t).release_allowed,false);
 t.perceptual_scores.face_realism=.9;
 reject(()=>validateEvaluationReport(t),"UNREVIEWED_SCORE_FORGED");
 t.review.status="human_reviewed";t.review.reviewer="actual reviewer";
 reject(()=>validateEvaluationReport(t),"HUMAN_ATTESTATION_REQUIRED");
});
test('Technical score cannot assert render proof without hashed Blender evidence',()=>{
 const r=structuredClone(CONTRACTS.evaluation);
 r.evidence.actual_blender_render_verified=true;
 reject(()=>validateEvaluationReport(r),"BLENDER_FILE_PROOF_REQUIRED");
});
test('Defect taxonomy guards identifiers; release always fails closed',()=>{
 const r=structuredClone(CONTRACTS.evaluation);
 r.defects=[{id:"render_not_blender",severity:"blocker"}];assert.equal(validateEvaluationReport(r).release_allowed,false);
 r.defects=[{id:"hypothetical_not_in_taxonomy",severity:"blocker"}];reject(()=>validateEvaluationReport(r),"UNKNOWN_DEFECT");
 r.defects=[];r.release_allowed=true;reject(()=>validateEvaluationReport(r),"EVALUATION_RELEASE_FORGED");
});
