/** Six bounded, independently testable creation agents; they cannot bypass GameSpec validation. */
import {DEFAULT_SPEC,validateSpec} from '../core.mjs';
import {DEFAULT_NVIDIA_MODEL,parseAgentJson} from './nvidia.mjs';

export const AGENT_ROLES=Object.freeze(['director','world','gameplay','character','mission','qa']);
const specialists=['world','gameplay','character','mission'];
const instructions={
 director:'Propose a concise creative direction for this playable game. Respond only JSON with keys: intent, title. Title max 70 characters.',
 world:'Design the setting. Respond only JSON: {"time":"day|night","theme":"cyan|violet|amber|emerald","buildings":integer_0_to_150,"seed":integer_0_to_999999}.',
 gameplay:'Balance simple action gameplay. Respond only JSON: {"robots":integer_0_to_80}.',
 character:'Describe character ideas without claiming they are implemented. Respond only JSON: {"note":"string under 200 chars"}.',
 mission:'Write one playable objective. Respond only JSON: {"mission":"string under 160 chars"}.',
 qa:'Review the proposed JSON GameSpec for consistency and requested scope. Respond only JSON: {"approve":true_or_false,"issues":[]}. Do not claim to have played or rendered the game.',
};
export function roleModel(role,env=process.env) {
  if(!AGENT_ROLES.includes(role)) throw new Error('Unsupported role');
  const key=`BLANK_MODEL_${role.toUpperCase()}`;
  return env[key]||env.BLANK_MODEL||DEFAULT_NVIDIA_MODEL;
}
function restrictedMerge(spec,role,output) {
  const allowed=role==='world'?['time','theme','buildings','seed']
    :role==='gameplay'?['robots']
    :role==='mission'?['mission']
    :role==='director'?['title']:[];
  const next={...spec};
  for (const key of allowed) if(Object.hasOwn(output,key)) next[key]=output[key];
  return validateSpec(next);
}
function asJsonPrompt(instruction,spec,context='') {
  const request=JSON.stringify({instruction,currentSpec:spec,context});
  if(request.length>5000) throw new Error('AI context too large');
  return request;
}
/** At most concurrency active independent jobs; propagates error without silent retries. */
export async function mapBounded(values,concurrency,fn) {
  if(!Number.isInteger(concurrency)||concurrency<1||concurrency>4) throw new Error('Invalid concurrency');
  const results=new Array(values.length);
  let next=0;
  async function runner(){while(next<values.length){const i=next++;results[i]=await fn(values[i],i);}}
  await Promise.all(Array.from({length:Math.min(concurrency,values.length)},()=>runner()));
  return results;
}
/**
 * Produces a validated v1 GameSpec. No generated code is executed, no database
 * write occurs, and none of the LLMs can mutate the renderer directly.
 */
export async function createGameWithAgents({instruction,currentSpec=DEFAULT_SPEC,client,models={},concurrency=2,onResult=()=>{}}) {
  if(typeof instruction!=='string'||!instruction.trim()||instruction.length>1000) throw new Error('Invalid game instruction');
  if(!client||typeof client.complete!=='function') throw new Error('Model client required');
  const initial=validateSpec(currentSpec);
  const outputs={}; const usage={};
  async function call(role,spec,context='') {
    const reply=await client.complete({role,model:models[role]||roleModel(role),maxTokens:512,messages:[
      {role:'system',content:instructions[role]+' Return strictly valid JSON with no commentary. If uncertain, preserve existing specification values.'},
      {role:'user',content:asJsonPrompt(instruction,spec,context)}
    ]});
    const out=parseAgentJson(reply.content);
    outputs[role]=out;
    usage[role]={model:reply.model,prompt_tokens:reply.usage?.prompt_tokens||0,completion_tokens:reply.usage?.completion_tokens||0};
    onResult({role,model:reply.model,usage:usage[role]});
    return out;
  }
  const director=await call('director',initial);
  let spec=restrictedMerge(initial,'director',director);
  const contributions=await mapBounded(specialists,concurrency,role=>call(role,spec,JSON.stringify({direction:director.intent||''}).slice(0,350)));
  // Apply in a stable order regardless of network response order.
  for(let i=0;i<specialists.length;i++) spec=restrictedMerge(spec,specialists[i],contributions[i]);
  const review=await call('qa',spec,JSON.stringify({characters:outputs.character}));
  if(review.approve!==true) throw new Error('QA rejected generated GameSpec');
  return {spec:validateSpec(spec),roles:AGENT_ROLES,usage,contributions:outputs,notes:outputs.character?.note||'',qa:review};
}
