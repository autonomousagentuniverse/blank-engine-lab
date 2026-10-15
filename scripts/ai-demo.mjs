#!/usr/bin/env node
import {createNvidiaClient} from '../ai/nvidia.mjs';
import {createGameWithAgents} from '../ai/orchestrator.mjs';
try {
 const result=await createGameWithAgents({
  instruction:'Create a sci-fi city at night with 10 buildings and 4 robots, and a mission to reach the marketplace.',
  client:createNvidiaClient(),
  concurrency:2
 });
 console.log('Six-agent test: PASS');
 console.log('Valid GameSpec:',JSON.stringify(result.spec));
 console.log('Agents completed:',result.roles.length);
 console.log('Usage:',JSON.stringify(Object.fromEntries(Object.entries(result.usage).map(([k,v])=>[k,{input:v.prompt_tokens,output:v.completion_tokens}]))));
} catch(error) {
 console.error('Six-agent test: FAIL '+String(error?.message||'unknown').slice(0,100));
 process.exitCode=1;
}
