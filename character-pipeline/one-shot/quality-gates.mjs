// Quality-first one-shot orchestration. Runtime and image audits are evidence,
// NEVER a substitute for a human aesthetic judgment. No deployment side effect.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const PHASES=Object.freeze(['calibration','construction','preview','human_review','webgl_parity']);
const assert=(yes,code)=>{if(!yes)throw new Error(code);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const sha=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
export const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
export const hashFile=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const string=x=>typeof x==='string'&&x.trim().length>0;
const between=(x,a,b)=>finite(x)&&x>=a&&x<=b;
const distinct=x=>new Set(x).size===x.length;

export function validatePlan(p){
 assert(p?.schema==='blank.one-shot.plan.v1','PLAN_SCHEMA');
 assert(typeof p.id==='string'&&/^[a-z0-9][a-z0-9-]{3,63}$/.test(p.id),'PLAN_ID');
 const s=p.source;
 assert(object(s)&&string(s.file)&&s.file.endsWith('.blend')&&sha(s.sha256),'SOURCE_MANIFEST');
 assert(s.origin==='cc0_derived'||s.origin==='independent_original','SOURCE_ORIGIN');
 assert(s.license_verified===true&&string(s.creator)&&string(s.license),'SOURCE_RIGHTS');
 assert(Array.isArray(s.ancestors),'SOURCE_ANCESTRY_REQUIRED');
 if(s.origin==='cc0_derived')assert(s.ancestors.length>0,'CC0_DERIVATION_MUST_BE_DECLARED');
 if(s.origin==='independent_original')assert(s.ancestors.length===0,'CLAIM_OF_ORIGINALITY_UNSUPPORTED');
 const t=p.targets;
 assert(object(t)&&string(t.hair_style)&&string(t.hairline)&&string(t.brow_growth)&&
 string(t.eye_anatomy)&&string(t.skin_reference)&&string(t.identity_goal),'SEMANTIC_TARGETS_REQUIRED');
 const limits=p.mechanical_limits;
 assert(object(limits),'PHYSICAL_LIMITS_REQUIRED');
 assert(between(limits.max_hair_light_ratio,1.0,4.0),'LIGHT_RATIO_LIMIT');
 assert(between(limits.min_scalp_coverage,0,1),'SCALP_COVERAGE_LIMIT');
 assert(between(limits.min_direction_entropy,0,1),'HAIR_DIRECTION_LIMIT');
 assert(between(limits.max_hair_head_penetration,0,1),'HAIR_COLLISION_LIMIT');
 assert(between(limits.max_eye_intersection_mm,0,5),'EYE_INTERSECTION_LIMIT');
 assert(between(limits.max_lip_midline_jump_mm,0,.5),'MIDLINE_LIMIT');
 assert(Array.isArray(p.views)&&p.views.length===4&&
   ['front','three_quarter','profile','eyes_macro'].every((v,i)=>p.views[i]?.id===v&&string(p.views[i].camera)),
   'FOUR_AUTHORED_CAMERAS');
 assert(distinct(p.views.map(v=>v.camera)),'CAMERA_COLLISION');
 assert(p.render?.engine==='CYCLES'&&p.render?.resolution?.[0]===700&&
   p.render?.resolution?.[1]===700&&Number.isInteger(p.render.samples)&&p.render.samples>=16,
   'REAL_CYCLES_RENDER_CONTRACT');
 return true;
}
export function initialize(plan,planDir){
 validatePlan(plan);
 const full=path.resolve(planDir,plan.source.file);
 assert(fs.existsSync(full)&&fs.statSync(full).isFile(),'SOURCE_FILE_MISSING');
 assert(hashFile(full)===plan.source.sha256,'SOURCE_SHA_CHANGED');
 return {schema:'blank.one-shot.state.v1',id:plan.id,plan_sha256:digest(plan),
  source_sha256:plan.source.sha256,source_origin:plan.source.origin,phase_index:0,
  phases:[],status:'BLOCKED_PENDING_CALIBRATION',release_allowed:false,
  independent_human_confirmed:false};
}
function verifiedFiles(e,base){
 assert(Array.isArray(e.files)&&e.files.length>0,'EVIDENCE_FILES_REQUIRED');
 const names=new Set();
 const result={};
 for(const item of e.files){
  assert(object(item)&&string(item.name)&&sha(item.sha256),'EVIDENCE_FILE_RECORD');
  assert(!path.isAbsolute(item.name)&&!item.name.includes('\\')&&
    item.name.split('/').every(c=>c!=='.'&&c!=='..'&&c!==''),'EVIDENCE_PATH_ESCAPE');
  assert(!names.has(item.name),'DUPLICATE_EVIDENCE_FILE');names.add(item.name);
  const file=path.resolve(base,item.name);
  assert(file.startsWith(path.resolve(base)+path.sep),'EVIDENCE_PATH_ESCAPE');
  assert(fs.existsSync(file)&&fs.statSync(file).isFile(),'EVIDENCE_NOT_FOUND:'+item.name);
  assert(hashFile(file)===item.sha256,'EVIDENCE_HASH_CHANGED:'+item.name);
  result[item.name]=item.sha256;
 }
 return result;
}
function stageValidation(stage,e,p,history){
 const m=e.measurements;
 assert(object(m),'MEASUREMENTS_MISSING');
 if(stage==='calibration'){
  // Comparing lit and emission snapshots measures illumination contribution
  // without claiming the resulting ratio establishes photographic realism.
  assert(between(m.lit_hair_luminance,0,255)&&between(m.emission_hair_luminance,1,255),
    'HAIR_CALIBRATION_NOT_MEASURED');
  assert(string(m.mask_method)&&between(m.hair_mask_pixels,100,25000000),'HAIR_MASK_UNVERIFIED');
  assert(object(m.light_sweep)&&m.light_sweep.source_sha256===p.source.sha256,
    'LIGHT_SWEEP_PROVENANCE');
  assert(m.light_sweep.levels>=2&&m.light_sweep.same_camera===true,'LIGHT_SWEEP_INCOMPLETE');
  const ratio=m.lit_hair_luminance/m.emission_hair_luminance;
  assert(ratio<=p.mechanical_limits.max_hair_light_ratio,
    'HAIR_LIGHT_RATIO_EXCEEDS_LIMIT:'+ratio.toFixed(3));
  return {hair_light_ratio:ratio,light_levels:m.light_sweep.levels};
 }
 if(stage==='construction'){
  assert(m.source_sha256===p.source.sha256,'CONSTRUCTION_USES_OTHER_SOURCE');
  assert(string(m.probe_script_sha256)&&sha(m.probe_script_sha256),'MEASUREMENT_PROBE_UNPINNED');
  assert(object(m.hair)&&object(m.eyes)&&object(m.brows)&&object(m.skin)&&object(m.identity),
    'COMPONENT_EVIDENCE_REQUIRED');
  assert(Number.isInteger(m.hair.samples)&&m.hair.samples>=1000,'HAIR_NOT_MEASURED');
  assert(between(m.hair.scalp_coverage,0,1)&&m.hair.scalp_coverage>=p.mechanical_limits.min_scalp_coverage,
    'SCALP_VISIBLE_THROUGH_GROOM');
  assert(between(m.hair.direction_entropy,0,1)&&
    m.hair.direction_entropy>=p.mechanical_limits.min_direction_entropy,
    'HAIR_GUIDES_TOO_UNIFORM');
  assert(between(m.hair.head_penetration_rate,0,1)&&
    m.hair.head_penetration_rate<=p.mechanical_limits.max_hair_head_penetration,
    'HAIR_PENETRATES_HEAD');
  assert(Number.isInteger(m.brows.sampled_roots)&&m.brows.sampled_roots>=200 &&
    string(m.brows.growth_field),'BROW_GROWTH_UNVERIFIED');
  assert(between(m.eyes.max_contact_intersection_mm,0,100)&&
    m.eyes.max_contact_intersection_mm<=p.mechanical_limits.max_eye_intersection_mm &&
    m.eyes.contact_points>=100,'EYELID_CONTACT_UNVERIFIED');
  assert(m.skin.albedo_uv_verified===true&&m.skin.normal_uv_verified===true&&
    m.skin.roughness_uv_verified===true,'SKIN_TEXTURE_MAPPING_UNVERIFIED');
  assert(between(m.identity.midline_jump_mm,0,100)&&
    m.identity.midline_jump_mm<=p.mechanical_limits.max_lip_midline_jump_mm &&
    m.identity.facs_preserved===true,'FACIAL_TOPOLOGY_UNVERIFIED');
  return {construction_technical:true,hair:m.hair,eye:m.eyes};
 }
 if(stage==='preview'){
  assert(history.length===2,'PHASE_SEQUENCE');
  assert(m.engine==='CYCLES'&&m.samples>=p.render.samples,'PREVIEW_NOT_CYCLES');
  assert(Array.isArray(m.frames)&&m.frames.length===4,'PREVIEW_NOT_FOUR_VIEWS');
  assert(p.views.every((v,i)=>m.frames[i].id===v.id&&m.frames[i].camera===v.camera &&
    m.frames[i].width===700&&m.frames[i].height===700 &&
    e.files.some(f=>f.name===m.frames[i].file)),
    'PREVIEW_CAMERA_OR_IMAGE_MISMATCH');
  return {preview_photos:m.frames.map(f=>f.file),validated_for_human_review:true};
 }
 if(stage==='human_review'){
  const last=history.at(-1);
  assert(last.stage==='preview','PREVIEW_NEEDED_FIRST');
  assert(string(m.reviewer)&&m.reviewer!=='model'&&m.reviewer!=='automated'&&
    m.human_attestation===true,'REAL_HUMAN_REVIEW_REQUIRED');
  assert(m.preview_fingerprint===last.fingerprint,'REVIEW_NOT_PINNED_TO_PREVIEW');
  assert(['eyes','hair','brows','skin','identity','overall'].every(k=>m[k]==='approve'),
    'HUMAN_VISUAL_REJECTION');
  assert(string(m.reviewed_at)&&!Number.isNaN(Date.parse(m.reviewed_at)),'REVIEW_TIME');
  return {reviewer:m.reviewer,visual_acceptance:'HUMAN_ACCEPTED_NOT_EXPORTED'};
 }
 if(stage==='webgl_parity'){
  assert(history.at(-1).stage==='human_review','HUMAN_APPROVAL_REQUIRED');
  assert(m.cycles_preview_fingerprint===history.find(x=>x.stage==='preview').fingerprint,
    'WEBGL_COMPARE_WRONG_CYCLES');
  assert(m.same_camera===true&&m.same_lighting===true&&
    m.threejs_render_verified===true&&m.human_parity_accepted===true,
    'WEBGL_MATCH_NOT_VERIFIED');
  assert(p.source.origin==='independent_original'&&m.origin_rights_manual_accepted===true,
    'DERIVED_ASSET_NOT_AUTOMATIC_ORIGINAL_RELEASE');
  return {runtime_parity:true,release_allowed:false,requires_explicit_deploy_authorization:true};
 }
 throw Error('UNKNOWN_STAGE');
}
export function advance(state,plan,evidence,base){
 validatePlan(plan);
 assert(state?.schema==='blank.one-shot.state.v1'&&state.plan_sha256===digest(plan)&&
   state.source_sha256===plan.source.sha256,'STATE_NOT_LINKED_TO_PLAN');
 const stage=PHASES[state.phase_index];
 assert(stage,'ALL_STAGES_FINISHED');
 assert(evidence?.schema==='blank.one-shot.evidence.v1'&&evidence.stage===stage,
   'WRONG_OR_OUT_OF_ORDER_STAGE');
 assert(evidence.source_sha256===plan.source.sha256&&
  evidence.plan_sha256===state.plan_sha256,'EVIDENCE_SOURCE_OR_PLAN_MISMATCH');
 assert(typeof evidence.method==='string'&&evidence.method.length>=8,'EVIDENCE_METHOD_UNKNOWN');
 const files=verifiedFiles(evidence,base);
 const findings=stageValidation(stage,evidence,plan,state.phases);
 const fingerprint=digest({stage,source:state.source_sha256,plan:state.plan_sha256,
   files,measurements:evidence.measurements,prior:state.phases.at(-1)?.fingerprint??null});
 const next={...state,phase_index:state.phase_index+1,
   phases:[...state.phases,{stage,fingerprint,files,findings}],
   status:state.phase_index===PHASES.length-1?'BLOCKED_PENDING_EXPLICIT_RELEASE_AUTHORIZATION':
      'BLOCKED_PENDING_'+PHASES[state.phase_index+1].toUpperCase(),release_allowed:false};
 return next;
}
