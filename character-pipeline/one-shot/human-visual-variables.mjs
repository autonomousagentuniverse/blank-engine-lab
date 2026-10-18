// Research-only v1: explicit controls, source pins, inspectable teacher proposals.
// Never infer proprietary image-generator latent variables or release permissions.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root=new URL('../contracts/',import.meta.url);
const parse=name=>JSON.parse(readFileSync(new URL(name,root),'utf8'));
export const CONTRACTS=Object.freeze({
  variables:parse('human_visual_variable_system.v1.json'),
  defects:parse('human_defect_taxonomy.v1.json'),
  proposal:parse('teacher_delta_proposal.v1.json'),
  evaluation:parse('render_evaluation_report.v1.json')
});
const err=(code,detail='')=>{throw new Error(code+(detail?':'+detail:''))};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const number=x=>typeof x==='number'&&Number.isFinite(x);
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const sameKeys=(obj,allowed,label)=>{
  if(!object(obj))err(label+'_NOT_OBJECT');
  for(const name of Object.keys(obj))if(!allowed.includes(name))err(label+'_UNKNOWN_FIELD',name);
};
const own=(obj,key)=>Object.hasOwn(obj,key);
export const sourceSha=()=>CONTRACTS.variables.source.sha256;

export function validateContracts(){
  const {variables,defects,proposal,evaluation}=CONTRACTS;
  if(variables.schema!=='blank.human.visual-variables.v1')err('CONTRACT_SCHEMA');
  if(!sha(sourceSha()))err('SOURCE_SHA_INVALID');
  if(!object(variables.controls)||!Object.keys(variables.controls).length)err('EMPTY_VARIABLE_CATALOG');
  let active=0,proposed=0;
  for(const [path,control] of Object.entries(variables.controls)){
    if(!/^[a-z][a-z_]*\.[a-z][a-z0-9_]*$/.test(path))err('CONTROL_PATH_INVALID',path);
    if(control.type!=='number'||!number(control.default)||!number(control.min)||!number(control.max)||
      control.min>control.default||control.default>control.max)err('CONTROL_BOUNDS',path);
    if(!['implemented','unimplemented'].includes(control.binding?.status))err('BINDING_INVALID',path);
    if(control.binding.status==='implemented'){
      active++;
      if(typeof control.binding.target!=='string'||!control.binding.target)err('MISSING_BLENDER_BINDING',path);
    }else{
      proposed++;
      if(control.binding.target!==null)err('PHANTOM_BLENDER_BINDING',path);
    }
  }
  if(active!==4)err('ACTIVE_BINDING_COUNT_CHANGED');
  if(defects.schema!=='blank.human.defect-taxonomy.v1'||!Array.isArray(defects.defects))err('DEFECT_SCHEMA');
  const ids=defects.defects.map(x=>x.id);
  if(ids.length!==new Set(ids).size||ids.some(x=>typeof x!=='string'||!x))err('DEFECT_IDS_DUPLICATE');
  if(proposal.schema!=='blank.human.teacher-delta-proposal.v1'||proposal.application?.allowed_automatically!==false)err('TEACHER_POLICY');
  if(evaluation.schema!=='blank.human.render-evaluation-report.v1'||evaluation.release_allowed!==false)err('EVALUATION_POLICY');
  if(variables.release_allowed!==false||defects.release_allowed!==false||proposal.release_allowed!==false)err('RELEASE_POLICY');
  const preset=variables.presets.technical_full_body_baseline.values;
  if(!object(preset)||Object.keys(preset).length!==active)err('BASELINE_PRESET_MISSING');
  for(const [name,value] of Object.entries(preset)){
    const spec=variables.controls[name];
    if(!spec||spec.binding.status!=='implemented'||!number(value)||value<spec.min||value>spec.max)err('BASELINE_PRESET_INVALID',name);
  }
  return {contracts_valid:true,controls:active+proposed,implemented:active,unimplemented:proposed,defects:ids.length,
    source_sha256:sourceSha(),release_allowed:false,photorealism_certified:false};
}

export function compileBlenderRenderConfig(request){
  validateContracts();
  if(!object(request)||request.schema!=='blank.human.visual-render-request.v1')err('REQUEST_SCHEMA');
  sameKeys(request,['schema','source_sha256','values','image_generation_used','release_allowed'],'REQUEST');
  if(request.source_sha256!==sourceSha())err('WRONG_SOURCE_SHA');
  if(request.image_generation_used!==false)err('IMAGE_GENERATOR_NOT_BLENDER_EVIDENCE');
  if(request.release_allowed!==false)err('NO_RELEASE_AUTHORITY');
  if(!object(request.values)||!Object.keys(request.values).length)err('CONTROL_VALUES_MISSING');
  const allowed=CONTRACTS.variables.controls;
  const requested={};
  for(const [name,value] of Object.entries(request.values)){
    if(!own(allowed,name))err('UNKNOWN_CONTROL',name);
    const spec=allowed[name];
    if(spec.binding.status!=='implemented')err('UNIMPLEMENTED_CONTROL',name);
    if(!number(value)||value<spec.min||value>spec.max)err('CONTROL_OUT_OF_BOUNDS',name);
    if(name==='render.cycles_samples'&&!Number.isInteger(value))err('SAMPLES_MUST_BE_INTEGER',name);
    requested[name]=value;
  }
  const baseline={...CONTRACTS.variables.presets.technical_full_body_baseline.values};
  const merged={...baseline,...requested};
  return {
    schema:'blank.human.blender-render-config.v1',
    source_sha256:sourceSha(),
    controls:merged,
    overridden_control_names:Object.keys(requested).sort(),
    binding_evidence:Object.fromEntries(Object.keys(merged).map(k=>[k,allowed[k].binding.target])),
    actual_geometry_changed:false,
    image_generation_used:false,
    photorealism_approved:false,
    release_allowed:false
  };
}

// Validate teacher output AS AN UNTRUSTED SUGGESTION, never execute it.
// Rights/source must be traced, numerical deltas cannot exceed contract.
export function assessTeacherProposal(input){
  validateContracts();
  if(!object(input)||input.schema!=='blank.human.teacher-delta-proposal.v1')err('PROPOSAL_SCHEMA');
  if(input.source_sha256!==sourceSha())err('WRONG_SOURCE_SHA');
  if(!Array.isArray(input.proposed_changes)||input.proposed_changes.length===0)err('PROPOSAL_EMPTY');
  if(input.application?.allowed_automatically!==false||input.release_allowed!==false)err('UNAUTHORIZED_TEACHER_APPLY');
  const catalog=CONTRACTS.variables.controls;
  const used=new Set(),blocked=[],reviewable=[];
  for(const entry of input.proposed_changes){
    if(!object(entry)||typeof entry.control!=='string'||!own(catalog,entry.control))err('UNKNOWN_CONTROL',entry?.control);
    if(used.has(entry.control))err('DUPLICATE_DELTA',entry.control);
    used.add(entry.control);
    if(!number(entry.delta))err('NONFINITE_DELTA',entry.control);
    const spec=catalog[entry.control];
    const desired=spec.default+entry.delta;
    if(desired<spec.min||desired>spec.max)err('DELTA_OUT_OF_BOUNDS',entry.control);
    if(typeof entry.reason!=='string'||entry.reason.trim().length<8)err('DELTA_REASON_REQUIRED',entry.control);
    if(spec.binding.status!=='implemented')blocked.push({control:entry.control,reason:'NO_3D_BLENDER_BINDING'});
    else reviewable.push({control:entry.control,proposed_value:desired});
  }
  const teacher=input.teacher;
  const rights=teacher?.rights_verified===true&&Array.isArray(teacher.reference_ids)&&teacher.reference_ids.length>0;
  return {schema:'blank.human.teacher-assessment.v1',
    status:!rights?'BLOCKED_UNVERIFIED_REFERENCE':blocked.length?'BLOCKED_UNIMPLEMENTED_CONTROL':'PENDING_MANUAL_REVIEW',
    blocked,reviewable,rights_verified:rights,applied_changes:[],source_mesh_changed:false,
    requires_manual_review:true,photorealism_approved:false,release_allowed:false};
}

export function validateEvaluationReport(report){
  validateContracts();
  if(!object(report)||report.schema!=='blank.human.render-evaluation-report.v1')err('EVALUATION_SCHEMA');
  if(report.source_sha256!==sourceSha())err('WRONG_SOURCE_SHA');
  if(report.release_allowed!==false||report.disposition?.release_allowed!==false||
    report.disposition?.production_deployed!==false)err('EVALUATION_RELEASE_FORGED');
  const template=CONTRACTS.evaluation;
  if(!object(report.perceptual_scores))err('PERCEPTUAL_SCORES_MISSING');
  for(const name of Object.keys(template.perceptual_scores)){
    const n=report.perceptual_scores[name];
    if(n!==null&&(!number(n)||n<0||n>1))err('PERCEPTUAL_SCORE_INVALID',name);
    if(n!==null&&report.review?.status!=='human_reviewed')err('UNREVIEWED_SCORE_FORGED',name);
  }
  if(report.review?.status==='human_reviewed'&&
    (!report.review.reviewer||report.evidence?.human_reviewer_attestation!==true))err('HUMAN_ATTESTATION_REQUIRED');
  if(report.evidence?.actual_blender_render_verified===true){
    const files=report.evidence.image_files,hashes=report.evidence.image_sha256;
    if(!Array.isArray(files)||!Array.isArray(hashes)||files.length<1||
      files.length!==hashes.length||hashes.some(x=>!sha(x)))err('BLENDER_FILE_PROOF_REQUIRED');
  }
  const validCodes=new Set(CONTRACTS.defects.defects.map(x=>x.id));
  for(const entry of report.defects||[]){
    if(!object(entry)||!validCodes.has(entry.id)||!CONTRACTS.defects.evaluation.allowed_severity.includes(entry.severity))err('UNKNOWN_DEFECT');
  }
  return {evaluation_valid:true,visual_review_status:report.review?.status||'missing',release_allowed:false,
    technical_passes_are_not_photorealism_approval:true};
}
