#!/usr/bin/env node
// prepare = source SHA lock; evaluate = render evidence plus separately authored human review.
import fs from 'node:fs';
import path from 'node:path';
import {validatePlan,prepare,renderEvidence,humanGate} from './contract.mjs';
const [cmd,planPath,dir,reviewPath]=process.argv.slice(2);
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
try{
  const plan=read(planPath);
  if(cmd==='check-plan'){
    validatePlan(plan);console.log('PLAN_VALID_BUT_NO_ASSET_GENERATED');
  }else if(cmd==='prepare'){
    if(!dir)throw Error('OUTPUT_DIRECTORY_REQUIRED');
    const lock=prepare(plan,path.dirname(path.resolve(planPath)));
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'plan.json'),JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
    fs.writeFileSync(path.join(dir,'source.lock.json'),JSON.stringify(lock,null,2)+'\n',{flag:'wx'});
    console.log('SOURCE_PINNED_VISUAL_APPROVAL_BLOCKED',lock.plan_hash);
  }else if(cmd==='evaluate'){
    if(!dir)throw Error('OUTPUT_DIRECTORY_REQUIRED');
    const lock=read(path.join(dir,'source.lock.json'));
    const report=read(path.join(dir,'render-report.json'));
    const evidence=renderEvidence(plan,lock,report,dir);
    if(!reviewPath){
      console.log(JSON.stringify(evidence,null,2));
      console.error('BLOCKED_PENDING_REAL_HUMAN_REVIEW');
      process.exitCode=3;
    }else{
      const gate=humanGate(read(reviewPath),evidence);
      fs.writeFileSync(path.join(dir,'human-approved.lock.json'),
        JSON.stringify(gate,null,2)+'\n',{flag:'wx'});
      console.log(JSON.stringify(gate,null,2));
    }
  }else throw Error('Commands: check-plan <plan>, prepare <plan> <dir>, evaluate <plan> <dir> [review]');
}catch(e){console.error('CHARACTER_PIPELINE_BLOCKED:'+e.message);process.exitCode=1;}
