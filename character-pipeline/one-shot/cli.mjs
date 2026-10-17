#!/usr/bin/env node
// Run after generating actual evidence. No host actions, no deployments.
import fs from 'node:fs';
import path from 'node:path';
import {initialize,advance,validatePlan,PHASES} from './quality-gates.mjs';
const args=process.argv.slice(2),cmd=args[0];
const read=x=>JSON.parse(fs.readFileSync(x,'utf8'));
function writeNew(file,obj){
 fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify(obj,null,2)+'\n',{flag:'wx'});
}
function replace(file,obj){
 const t=file+'.tmp';
 fs.writeFileSync(t,JSON.stringify(obj,null,2)+'\n',{flag:'wx'});
 fs.renameSync(t,file);
}
try{
 if(cmd==='validate'){
  if(args.length!==2)throw Error('Usage: validate <plan.json>');
  validatePlan(read(args[1]));
  console.log('PLAN_STRUCTURALLY_VALID_NOT_A_RENDER_OR_PHOTOREAL_PASS');
 }else if(cmd==='init'){
  if(args.length!==3)throw Error('Usage: init <plan.json> <new-run-dir>');
  const plan=read(args[1]),dir=path.resolve(args[2]);
  if(fs.existsSync(dir))throw Error('RUN_DIRECTORY_ALREADY_EXISTS');
  const state=initialize(plan,path.dirname(path.resolve(args[1])));
  fs.mkdirSync(dir,{recursive:true});
  writeNew(path.join(dir,'plan.json'),plan);
  writeNew(path.join(dir,'state.json'),state);
  console.log('ONE_SHOT_BLOCKED_NEEDS',PHASES[0],dir);
 }else if(cmd==='submit'){
  if(args.length!==3)throw Error('Usage: submit <run-dir> <stage-evidence.json>');
  const dir=path.resolve(args[1]),file=path.resolve(args[2]);
  const plan=read(path.join(dir,'plan.json')),state=read(path.join(dir,'state.json')),evidence=read(file);
  const next=advance(state,plan,evidence,path.dirname(file));
  const receipt=next.phases.at(-1);
  writeNew(path.join(dir,'receipts',String(next.phase_index).padStart(2,'0')+'-'+receipt.stage+'.json'),receipt);
  replace(path.join(dir,'state.json'),next);
  console.log(JSON.stringify({stage:receipt.stage,technical_evidence_accepted:true,
    fingerprint:receipt.fingerprint,next:next.status,release_allowed:false},null,2));
 }else if(cmd==='status'){
  if(args.length!==2)throw Error('Usage: status <run-dir>');
  const dir=path.resolve(args[1]),state=read(path.join(dir,'state.json'));
  console.log(JSON.stringify({id:state.id,status:state.status,phase_index:state.phase_index,
   next:PHASES[state.phase_index]??'EXPLICIT_RELEASE_REQUEST',
   history:state.phases.map(p=>({stage:p.stage,fingerprint:p.fingerprint})),
   release_allowed:false},null,2));
 }else{
  throw Error('Commands: validate <plan>; init <plan> <run-dir>; submit <run-dir> <evidence>; status <run-dir>');
 }
}catch(e){console.error('ONE_SHOT_BLOCKED:',e.message);process.exitCode=1;}
