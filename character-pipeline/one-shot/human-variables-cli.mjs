#!/usr/bin/env node
// Human visual controls CLI — validates/compiles JSON, never renders or deploys.
import fs from 'node:fs';
import path from 'node:path';
import {validateContracts,compileBlenderRenderConfig,assessTeacherProposal,validateEvaluationReport} from './human-visual-variables.mjs';
const [cmd,...args]=process.argv.slice(2);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
try{
  if(cmd==='validate-contracts'&&args.length===0)console.log(JSON.stringify(validateContracts(),null,2));
  else if(cmd==='compile'&&args.length===2){
    const result=compileBlenderRenderConfig(json(args[0]));
    const dest=path.resolve(args[1]);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({created:dest,compiled_controls:Object.keys(result.controls).length,release_allowed:false}));
  }else if(cmd==='assess-proposal'&&args.length===1){
    console.log(JSON.stringify(assessTeacherProposal(json(args[0])),null,2));
  }else if(cmd==='validate-report'&&args.length===1){
    console.log(JSON.stringify(validateEvaluationReport(json(args[0])),null,2));
  }else throw Error('USAGE: validate-contracts | compile <request.json> <new-config.json> | assess-proposal <proposal.json> | validate-report <report.json>');
}catch(e){console.error('HUMAN_VISUAL_VARIABLES_BLOCKED:'+e.message);process.exitCode=1;}
