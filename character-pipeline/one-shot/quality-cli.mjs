#!/usr/bin/env node
// Run only evidence gates. It does not start Blender or give automated approval.
import fs from 'node:fs';
import path from 'node:path';
import {initialize,advance,validatePlan} from './quality-gates.mjs';
const [cmd,planFile,workDir,evidenceFile]=process.argv.slice(2);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
function write(filename,value,create=false){
 fs.mkdirSync(path.dirname(filename),{recursive:true});
 const file=filename+'.next';
 fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 if(create&&fs.existsSync(filename)){fs.rmSync(file);throw Error('JOB_ALREADY_INITIALIZED');}
 fs.renameSync(file,filename);
}
try{
 if(!planFile)throw Error('usage: check-plan <plan> | init <plan> <job-dir> | advance <plan> <job-dir> <evidence>');
 const plan=json(planFile);
 if(cmd==='check-plan'){validatePlan(plan);console.log('VALID_SOURCE_DECLARATION_NOT_A_PHOTOREAL_PASS');}
 else if(cmd==='init'){
  if(!workDir)throw Error('JOB_DIR_REQUIRED');
  if(fs.existsSync(path.join(workDir,'state.json')))throw Error('JOB_ALREADY_INITIALIZED');
  write(path.join(workDir,'state.json'),initialize(plan,path.dirname(path.resolve(planFile))),true);
  console.log('BLOCKED_PENDING_CALIBRATION');
 }else if(cmd==='advance'){
  if(!workDir||!evidenceFile)throw Error('EVIDENCE_FILE_REQUIRED');
  const filename=path.join(workDir,'state.json');
  const next=advance(json(filename),plan,json(evidenceFile),path.dirname(path.resolve(evidenceFile)));
  write(filename,next);
  console.log(JSON.stringify({status:next.status,completed:next.phases.at(-1).stage,
   release_allowed:next.release_allowed},null,2));
 }else throw Error('UNKNOWN_COMMAND');
}catch(e){console.error('ONE_SHOT_BLOCKED:'+e.message);process.exitCode=1;}
