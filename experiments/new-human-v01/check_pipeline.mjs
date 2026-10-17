#!/usr/bin/env node
// Import REAL existing Blender Cycles output into a provenance-aware pipeline gate.
// This does not make up images or approve the candidate. Source and all pixels rehashed.
import fs from 'node:fs';
import path from 'node:path';
import {REFERENCE,digest,validatePlan,prepare,renderEvidence,humanGate} from '../../character-pipeline/contract.mjs';
const location=path.resolve(process.argv[2]||'artifacts/novel-human-v01');
const original=JSON.parse(fs.readFileSync(path.join(location,'report.json'),'utf8'));
if(original.status!=='FOUR_REAL_CYCLES_RENDERS_SUCCESS_AESTHETIC_REVIEW_REQUIRED'||
 original.upstream_repo!=='ibrews/VitruvianGodot'||
 original.upstream_commit!=='bdecdcd537b4031fdd0fb299b7e4f93f084fffa0'||
 original.identity_claim!=='NEW_CC0_DERIVED_VARIANT_NOT_INDEPENDENT_SCULPT'||
 original.einar_ancestry!==false||
 original.source_images_packed!==true)
 throw Error('UPSTREAM_OR_BLENDER_RENDER_REPORT_NOT_AUTHENTIC');
if(original.generated_blend.sha256!=='98c8a9f33014fb41d47c2ab99c310d978a04d9c30db45f0f371f2436dea9de86')
 throw Error('FROZEN_MIRA01_BLEND_SHA_CHANGED');
if(original.source_files?.['vitruvian_head.glb']?.sha256!==
 '54efb42e9f3dd7e7cf3c3e86ed5298f3ba26e341d5743245cbe2621c547c5f1f')
 throw Error('UNVERIFIED_CC0_SOURCE_ASSET');
const ancestry={
 repo:'ibrews/VitruvianGodot',commit:original.upstream_commit,
 license:'CC0-1.0',rights_verified:true,
 head_glb_sha256:original.source_files['vitruvian_head.glb'].sha256
};
const plan={
 schema:'blank.character.plan.v1',id:'mira-01',
 source:{origin:'licensed_cc0_variant',derived_from_einar:false,ancestors:[ancestry],
  creator:'Blank Engine authored CC0 derivative experiment',license:'CC0-1.0',
  rights_verified:true,identity_variant_claim:true,is_original_topology:false,
  file:'mira-01-cc0-derived.blend',sha256:original.generated_blend.sha256},
 render:{engine:'CYCLES',profile:'blank-head-v1',samples:20,resolution:[700,700]},
 views:original.frames.map(v=>({id:v.id,camera:v.camera})),
 reference:{blend:REFERENCE.blend,front:REFERENCE.front}
};
validatePlan(plan);
const lock=prepare(plan,location);
const report={schema:'blank.character.cycles.v1',plan_hash:digest(plan),
 source_sha256:plan.source.sha256,engine:'CYCLES',profile:'blank-head-v1',
 frames:original.frames.map(({id,camera,file,sha256})=>({id,camera,file,sha256}))};
const evidence=renderEvidence(plan,lock,report,location);
if(evidence.origin!=='licensed_cc0_variant'||evidence.status!=='TECHNICAL_PASS_VISUAL_BLOCKED')
 throw Error('SOURCE_DERIVATIVE_RECLASSIFIED_WITHOUT_HUMAN_REVIEW');
let rejected=false;
try{humanGate(null,evidence)}catch(err){rejected=err.message.includes('MISSING_OR_STALE_HUMAN_REVIEW')}
if(!rejected)throw Error('CRITICAL_AUTO_APPROVAL_BUG');
for(const [name,obj] of [['mira-plan.json',plan],['source.lock.json',lock],
 ['render-report.json',report],['technical-evidence.json',evidence]]){
 fs.writeFileSync(path.join(location,name),JSON.stringify(obj,null,2)+'\n');
}
console.log(JSON.stringify({status:'TECHNICAL_PASS_VISUAL_BLOCKED',
 origin:evidence.origin,verified_frames:Object.keys(evidence.frames).length,
 fingerprint:evidence.fingerprint,
 source_sha256:lock.source_sha256,
 human_visual_approved:false,approved_for_production:false},null,2));
