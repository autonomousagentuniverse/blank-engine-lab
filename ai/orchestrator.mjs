/** Multi-agent GameSpec creation. All model calls stay server-side. */
import {DEFAULT_SPEC,validateSpec} from '../core.mjs';
import {parseAgentJson,DEFAULT_NVIDIA_MODEL} from './nvidia.mjs';
export const AGENT_ROLES=Object.freeze(['director','world','gameplay','character','mission','qa']);
const specialists=['world','gameplay','character','mission'];
const instructions={
 director:'Creative direction. Output JSON only: {"intent":"short text","title":"game title max 70 chars"}.',
 world:'Create a world using existing engine capabilities. Output JSON only: {"time":"day or night","theme":"cyan or violet or amber or emerald","buildings":10,"seed":25}. Use valid ranges.',
 gameplay:'Balance hostile robots. Output JSON only: {"robots":4}. Robot count must be integer from 0 to 80.',
 character:'Offer character ideas as future work; do not claim they already exist. Output JSON only: {"note":"character design idea"} with note under 200 chars.',
 mission:'Write one playable game goal. Output JSON only: {"mission":"short objective"} under 160 chars.',
 qa:'Review this version-1 GameSpec for basic validity and the requested gameplay; do not claim a live gameplay test. Output JSON only: {"approve":true,"issues":[]}. Reject if invalid.'
};
export function roleModel(role,env=process.env) {
 if(!AGENT_ROLES.includes(role)) throw Error('Unsupported agent role');
 return env['BLANK_MODEL_'+role.toUpperCase()]||env.BLANK_MODEL||DEFAULT_NVIDIA_MODEL;
}
export async function mapBounded(items,concurrency,fn) {
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>4) throw Error('Invalid concurrency');
 let next=0;const results=new Array(items.length);
 async function worker(){while(next<items.length){let i=next++;results[i]=await fn(items[i],i);}}
 await Promise.all(Array.from({length:Math.min(items.length,concurrency)},()=>worker()));
 return results;
}
function merge(spec,role,out){
 const keys=role==='director'?['title']:role==='world'?['time','theme','buildings','seed']:role==='gameplay'?['robots']:role==='mission'?['mission']:[];
 let result={...spec};
 for(const k of keys) if(Object.hasOwn(out,k))result[k]=out[k];
 return validateSpec(result);
}
export async function createGameWithAgents({instruction,currentSpec=DEFAULT_SPEC,client,models={},concurrency=2,onResult=()=>{}}){
 if(typeof instruction!=='string'||!instruction.trim()||instruction.length>1000)throw Error('Invalid instruction');
 if(!client||typeof client.complete!=='function')throw Error('AI client required');
 const initial=validateSpec(currentSpec);
 const outputs={},usage={};
 async function call(role,spec,context=''){
  const model=models[role]||roleModel(role);
  const data=JSON.stringify({request:instruction,spec,context});
  if(data.length>5000)throw Error('Agent input too large');
  const reply=await client.complete({role,model,maxTokens:512,messages:[
   {role:'system',content:instructions[role]+' Respond with a single valid JSON object and no commentary. Preserve current spec if uncertain.'},
   {role:'user',content:data}
  ]});
  const value=parseAgentJson(reply.content);
  outputs[role]=value;usage[role]={model:reply.model,prompt_tokens:reply.usage?.prompt_tokens||0,completion_tokens:reply.usage?.completion_tokens||0};
  onResult({role,model:reply.model,usage:usage[role]});
  return value;
 }
 const director=await call('director',initial);
 let spec=merge(initial,'director',director);
 const pieces=await mapBounded(specialists,concurrency,role=>call(role,spec,JSON.stringify({intent:director.intent||''}).slice(0,350)));
 for(let i=0;i<specialists.length;i++)spec=merge(spec,specialists[i],pieces[i]);
 const review=await call('qa',spec,JSON.stringify({characterIdeas:outputs.character||{}}));
 if(review.approve!==true)throw Error('QA rejected generated GameSpec');
 return {spec:validateSpec(spec),roles:AGENT_ROLES,usage,notes:outputs.character?.note||'',qa:review};
}
