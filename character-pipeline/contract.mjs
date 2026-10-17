// One fail-closed character contract. A technical pass never grants visual approval.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const REFERENCE=Object.freeze({
  id:'HUMAN-A05',
  role:'reference_only',
  blend:'6c5d1236c0a9bae7746014f515b7d480cd644aa21799ae0435fabf521e2368ac',
  front:'1435d4d4433746f8ed8c03910ef3702145fe6bd90dc2369343cc6cac4cbbe25a',
  original:'1c6663da0a2e9d6822978467c244e9186edc76083bae2414e02f9e695e711f7b',
  rights:'Einar Rig (CC-BY) Blender Foundation | studio.blender.org',
  run:39026642127
});
export const VIEWS=['front','three_quarter','profile','eyes_macro'];
const check=(value,code)=>{if(!value)throw Error(code);};
export const digest=obj=>crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
export function fileHash(file){
  const h=crypto.createHash('sha256'),fd=fs.openSync(file,'r'),b=Buffer.alloc(1048576);
  try{for(let n;(n=fs.readSync(fd,b,0,b.length,null));)h.update(b.subarray(0,n));}
  finally{fs.closeSync(fd);}
  return h.digest('hex');
}
export function validatePlan(p){
  check(p?.schema==='blank.character.plan.v1','INVALID_PLAN_SCHEMA');
  check(/^[a-z0-9][a-z0-9-]{3,63}$/.test(p?.id??''),'INVALID_ID');
  const s=p?.source;
  const groundup=s?.origin==='independent_original_human';
  const licensed=s?.origin==='licensed_cc0_variant';
  check(groundup||licensed,'UNSUPPORTED_HUMAN_SOURCE_CLASS');
  check(s?.derived_from_einar===false&&Array.isArray(s?.ancestors),
    'DERIVATIVE_OR_UNKNOWN_ANCESTRY');
  if(groundup){
    check(s.ancestors.length===0,'DERIVATIVE_OR_UNKNOWN_ANCESTRY');
  }else{
    check(s.ancestors.length===1,'CC0_BASE_ANCESTRY_MUST_BE_EXPLICIT');
    const a=s.ancestors[0];
    check(a&&a.repo==='ibrews/VitruvianGodot'&&
      a.commit==='bdecdcd537b4031fdd0fb299b7e4f93f084fffa0'&&
      a.license==='CC0-1.0'&&a.rights_verified===true&&
      /^[0-9a-f]{64}$/.test(a.head_glb_sha256??'')&&
      s.is_original_topology===false,
      'UNVERIFIED_CC0_BASE_ANCESTRY');
    check(s.identity_variant_claim===true,'CC0_VARIANT_IDENTITY_CLAIM_REQUIRED');
  }
  check(s?.rights_verified===true&&!!s.creator?.trim()&&!!s.license?.trim(),'SOURCE_RIGHTS_MISSING');
  check(typeof s.file==='string'&&s.file.endsWith('.blend'),'BLEND_FILE_REQUIRED');
  check(/^[0-9a-f]{64}$/.test(s.sha256),'SOURCE_SHA256_REQUIRED');
  check(![REFERENCE.blend,REFERENCE.original].includes(s.sha256),'REFERENCE_CANNOT_BECOME_NEW_HUMAN');
  check(p?.render?.engine==='CYCLES'&&p.render.profile==='blank-head-v1',
    'CYCLES_CAMERA_PROFILE_REQUIRED');
  check(p.render.samples>=16&&p.render.samples<=512&&Number.isInteger(p.render.samples),
    'RENDER_SAMPLES_INVALID');
  check(JSON.stringify(p.render.resolution)==='[700,700]','MATCHED_RESOLUTION_REQUIRED');
  check(Array.isArray(p.views)&&p.views.length===4&&
    VIEWS.every((view,i)=>p.views[i]?.id===view&&!!p.views[i].camera?.trim()),
    'FOUR_AUTHORED_CAMERAS_REQUIRED');
  check(new Set(p.views.map(v=>v.camera)).size===4,'CAMERAS_NOT_DISTINCT');
  check(p.reference?.blend===REFERENCE.blend&&p.reference?.front===REFERENCE.front,
    'FROZEN_REFERENCE_CHANGED');
  return true;
}
export function prepare(p,baseDir){
  validatePlan(p);
  const file=path.resolve(baseDir,p.source.file);
  check(fs.existsSync(file)&&fs.statSync(file).isFile(),'SOURCE_FILE_NOT_FOUND');
  check(fileHash(file)===p.source.sha256,'SOURCE_SHA_CHANGED');
  return {schema:'blank.character.lock.v1',plan_hash:digest(p),source_sha256:p.source.sha256,
    status:'LOCKED_NOT_VISUALLY_APPROVED'};
}
function png(file){
  check(fs.existsSync(file)&&fs.statSync(file).size>=12000,'PNG_NOT_PRESENT_OR_TOO_SMALL:'+file);
  const fd=fs.openSync(file,'r'),b=Buffer.alloc(33);
  try{check(fs.readSync(fd,b,0,33,0)===33,'INVALID_PNG');}
  finally{fs.closeSync(fd);}
  check(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&
    b.toString('ascii',12,16)==='IHDR','INVALID_PNG');
  check(b.readUInt32BE(16)===700&&b.readUInt32BE(20)===700,'PNG_RESOLUTION_CHANGED');
  return fileHash(file);
}
export function renderEvidence(p,lock,report,dir){
  validatePlan(p);
  check(lock?.schema==='blank.character.lock.v1'&&lock.plan_hash===digest(p)&&
    lock.source_sha256===p.source.sha256&&lock.status==='LOCKED_NOT_VISUALLY_APPROVED',
    'SOURCE_LOCK_MISMATCH');
  check(report?.schema==='blank.character.cycles.v1'&&report.plan_hash===lock.plan_hash&&
    report.source_sha256===lock.source_sha256&&report.engine==='CYCLES'&&
    report.profile==='blank-head-v1','INVALID_RENDER_PROVENANCE');
  check(Array.isArray(report.frames)&&report.frames.length===4,'FOUR_RENDER_FRAMES_REQUIRED');
  const frameHashes={};
  for(let i=0;i<4;i++){
    const f=report.frames[i],view=VIEWS[i];
    check(f?.id===view&&f.camera===p.views[i].camera&&f.file===view+'.png',
      'CAMERA_OR_FRAME_MISMATCH:'+view);
    const actual=png(path.join(dir,f.file));
    check(actual===f.sha256,'RENDER_HASH_MISMATCH:'+view);
    frameHashes[view]=actual;
  }
  return {status:'TECHNICAL_PASS_VISUAL_BLOCKED',origin:p.source.origin,
    fingerprint:digest({source:p.source.sha256,plan:lock.plan_hash,frames:frameHashes}),
    source:p.source.sha256,frames:frameHashes};
}
export function humanGate(review,evidence){
  check(review?.schema==='blank.character.human-review.v1'&&
    review.fingerprint===evidence.fingerprint,'MISSING_OR_STALE_HUMAN_REVIEW');
  check(!!review.reviewer?.trim()&&review.reviewer!=='model'&&review.reviewer!=='automated',
    'HUMAN_REVIEWER_REQUIRED');
  check(review.human_attestation===true&&review.anatomy_ok===true&&
    review.distinct_from_reference===true&&review.photoreal_ok===true&&
    (evidence.origin!=='licensed_cc0_variant'||review.distinct_from_source_base===true),
    'HUMAN_VISUAL_OR_NOVELTY_REJECTED');
  check(!!review.reviewed_at&&!Number.isNaN(Date.parse(review.reviewed_at)),
    'REVIEW_DATE_REQUIRED');
  return {status:'CYCLES_VISUALLY_ACCEPTED_WEBGL_NOT_TESTED',
    evidence_fingerprint:evidence.fingerprint,reviewer:review.reviewer,
    release_allowed:false};
}
