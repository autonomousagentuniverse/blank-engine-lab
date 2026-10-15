#!/usr/bin/env node
import {createNvidiaClient,DEFAULT_NVIDIA_MODEL} from '../ai/nvidia.mjs';
try {
 const client=createNvidiaClient();
 const answer=await client.complete({role:'smoke',model:process.env.BLANK_MODEL||DEFAULT_NVIDIA_MODEL,maxTokens:128,messages:[
  {role:'system',content:'Reply with only READY.'},
  {role:'user',content:'Confirm this NVIDIA chat endpoint works.'}
 ]});
 console.log('NVIDIA inference: PASS');
 console.log('Model:',answer.model);
 console.log('Output received:',Boolean(answer.content));
 console.log('Token usage:',JSON.stringify(answer.usage));
} catch(error) {
 console.error('NVIDIA inference: FAIL '+String(error?.message||'unknown').slice(0,100));
 process.exitCode=1;
}
