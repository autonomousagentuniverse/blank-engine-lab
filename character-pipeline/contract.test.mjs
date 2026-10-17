import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {REFERENCE,VIEWS,validatePlan,prepare,renderEvidence,humanGate,digest} from './contract.mjs';
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const good=()=>({
 schema:'blank.character.plan.v1',id:'new-human-001',
 source:{origin:'independent_original_human',derived_from_einar:false,ancestors:[],
   creator:'Sculptor',license:'CC-BY-4.0',rights_verified:true,
   file:'new-human.blend',sha256:hash('independently authored source')},
 render:{engine:'CYCLES',profile:'blank-head-v1',samples:32,resolution:[700,700]},
 views:VIEWS.map((id,i)=>({id,camera:'CAM_'+i})),
 reference:{blend:REFERENCE.blend,front:REFERENCE.front}
});
const rejects=(fn,reason)=>assert.throws(fn,e=>e.message.includes(reason));
test('good new-human plan describes only source—not visual success',()=>{
 assert.equal(validatePlan(good()),true);
});
test('source Einar lineage cannot pass even with valid custom model SHA',()=>{
 const p=good();p.source.origin='einar_derivative';
 rejects(()=>validatePlan(p),'UNSUPPORTED_HUMAN_SOURCE_CLASS');
 p.source.origin='independent_original_human';p.source.derived_from_einar=true;
 rejects(()=>validatePlan(p),'DERIVATIVE');
 p.source.derived_from_einar=false;p.source.sha256=REFERENCE.blend;
 rejects(()=>validatePlan(p),'REFERENCE_CANNOT_BECOME_NEW_HUMAN');
});
test('unknown rights or ancestry must be rejected',()=>{
 const p=good();p.source.rights_verified=false;
 rejects(()=>validatePlan(p),'SOURCE_RIGHTS_MISSING');
 p.source.rights_verified=true;p.source.ancestors=['Einar'];
 rejects(()=>validatePlan(p),'DERIVATIVE');
});
test('camera and lighting protocol cannot silently drift',()=>{
 const p=good();p.views[1].camera=p.views[0].camera;
 rejects(()=>validatePlan(p),'CAMERAS_NOT_DISTINCT');
 p.views[1].camera='CAM_1';p.render.engine='EEVEE';
 rejects(()=>validatePlan(p),'CYCLES_CAMERA_PROFILE');
 p.render.engine='CYCLES';p.render.resolution=[512,512];
 rejects(()=>validatePlan(p),'MATCHED_RESOLUTION');
});
test('reference A05 image and source identifiers are pinned',()=>{
 const p=good();p.reference.front=hash('unrelated photo');
 rejects(()=>validatePlan(p),'FROZEN_REFERENCE_CHANGED');
 assert.equal(REFERENCE.id,'HUMAN-A05');
});
test('a real source cannot change after manifest creation',()=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'blank-contract-'));
 try{
 const p=good();const f=path.join(d,p.source.file);
 fs.writeFileSync(f,'independently authored source');
 assert.equal(prepare(p,d).source_sha256,p.source.sha256);
 fs.appendFileSync(f,'changed');
 rejects(()=>prepare(p,d),'SOURCE_SHA_CHANGED');
 }finally{fs.rmSync(d,{recursive:true,force:true});}
});
test('a missing render and a mismatched camera both fail before human review',()=>{
 const p=good(),lock={schema:'blank.character.lock.v1',plan_hash:digest(p),
   source_sha256:p.source.sha256,status:'LOCKED_NOT_VISUALLY_APPROVED'};
 const frames=p.views.map(v=>({id:v.id,camera:v.camera,file:v.id+'.png',sha256:hash(v.id)}));
 const r={schema:'blank.character.cycles.v1',plan_hash:lock.plan_hash,
   source_sha256:lock.source_sha256,engine:'CYCLES',profile:'blank-head-v1',frames};
 rejects(()=>renderEvidence(p,lock,r,'/not/a/real/render'),'PNG_NOT_PRESENT');
 r.frames[0].camera='WRONG';
 rejects(()=>renderEvidence(p,lock,r,'/not/a/real/render'),'CAMERA_OR_FRAME_MISMATCH');
});
test('technical evidence without separate human review cannot approve',()=>{
 const e={fingerprint:hash('one immutable scene')};
 rejects(()=>humanGate(null,e),'MISSING_OR_STALE_HUMAN_REVIEW');
 const r={schema:'blank.character.human-review.v1',fingerprint:hash('old render'),
  reviewer:'Real Reviewer',human_attestation:true,
  anatomy_ok:true,photoreal_ok:true,distinct_from_reference:true,reviewed_at:'2026-10-17'};
 rejects(()=>humanGate(r,e),'MISSING_OR_STALE');
 r.fingerprint=e.fingerprint;r.distinct_from_reference=false;
 rejects(()=>humanGate(r,e),'HUMAN_VISUAL_OR_NOVELTY');
 r.distinct_from_reference=true;
 assert.equal(humanGate(r,e).release_allowed,false);
});

test('pinned CC0 ancestry explicitly allowed but must never be called an independent sculpt',()=>{
 const p=good();
 p.source.origin='licensed_cc0_variant';
 p.source.ancestors=[{repo:'ibrews/VitruvianGodot',
   commit:'bdecdcd537b4031fdd0fb299b7e4f93f084fffa0',
   license:'CC0-1.0',rights_verified:true,
   head_glb_sha256:hash('validated base face GLB')}];
 p.source.is_original_topology=false;
 p.source.identity_variant_claim=true;
 assert.equal(validatePlan(p),true);
 p.source.is_original_topology=true;
 rejects(()=>validatePlan(p),'UNVERIFIED_CC0_BASE_ANCESTRY');
 p.source.is_original_topology=false;p.source.ancestors[0].repo='Einar-source';
 rejects(()=>validatePlan(p),'UNVERIFIED_CC0_BASE_ANCESTRY');
});
test('license-compliant CC0 source does not bypass visual comparison with the CC0 base',()=>{
 const e={fingerprint:hash('new human frames'),origin:'licensed_cc0_variant'};
 const review={schema:'blank.character.human-review.v1',fingerprint:e.fingerprint,
   reviewer:'External Human',human_attestation:true,anatomy_ok:true,
   distinct_from_reference:true,photoreal_ok:true,reviewed_at:'2026-10-17'};
 rejects(()=>humanGate(review,e),'HUMAN_VISUAL_OR_NOVELTY_REJECTED');
 review.distinct_from_source_base=true;
 assert.equal(humanGate(review,e).release_allowed,false);
});
