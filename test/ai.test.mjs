import test from 'node:test';
import assert from 'node:assert/strict';
import {createNvidiaClient,parseAgentJson} from '../ai/nvidia.mjs';
import {createGameWithAgents,mapBounded} from '../ai/orchestrator.mjs';
const answers={director:{title:'Test Sandbox',intent:'exploration'},world:{time:'day',theme:'amber',buildings:10,seed:12},gameplay:{robots:4},character:{note:'Character ideas pending'},mission:{mission:'Reach the marketplace'},qa:{approve:true,issues:[]}};
function mock() {
 let active=0,peak=0;
 return {get peak(){return peak;},async complete({role,model}){active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,2));active--;return {role,model,content:JSON.stringify(answers[role]),usage:{prompt_tokens:2,completion_tokens:2}};}};
}
test('all six agents produce bounded and validated v1 GameSpec',async()=>{
 const client=mock();const result=await createGameWithAgents({client,instruction:'Make a village'});
 assert.equal(result.roles.length,6);assert.equal(result.spec.buildings,10);assert.equal(result.spec.robots,4);assert.ok(client.peak<=2);
});
test('invalid model changes rejected',async()=>{
 const client=mock(),original=client.complete;
 client.complete=(args)=>args.role==='world'?Promise.resolve({role:'world',model:'test',content:JSON.stringify({...answers.world,buildings:999}),usage:{}}):original(args);
 await assert.rejects(createGameWithAgents({client,instruction:'Make a village'}),/buildings/);
});
test('QA can veto game changes',async()=>{
 const client=mock(),original=client.complete;
 client.complete=(args)=>args.role==='qa'?Promise.resolve({role:'qa',model:'test',content:'{"approve":false,"issues":["incomplete"]}',usage:{}}):original(args);
 await assert.rejects(createGameWithAgents({client,instruction:'Make a village'}),/QA rejected/);
});
test('parser rejects prose and Javascript',()=>{
 assert.throws(()=>parseAgentJson('explanation {"bad":true}'));
 assert.throws(()=>parseAgentJson('[]'));
 assert.deepEqual(parseAgentJson('{"yes":true}'),{yes:true});
});
test('safe HTTP error omits response contents',async()=>{
 const client=createNvidiaClient({apiKey:'test',fetchImpl:async()=>({ok:false,status:429,text:async()=> 'sensitive content'})});
 await assert.rejects(client.complete({role:'test',messages:[{role:'user',content:'hi'}]}),/HTTP_429/);
});
test('client prepares Nvidia request without accessing the browser',async()=>{
 let model;
 const client=createNvidiaClient({apiKey:'test',fetchImpl:async(_url,args)=>{model=JSON.parse(args.body).model;return {ok:true,json:async()=>({choices:[{message:{content:'READY'}}],usage:{prompt_tokens:2,completion_tokens:1}})};}});
 const r=await client.complete({role:'test',messages:[{role:'user',content:'hi'}]});
 assert.equal(model,'openai/gpt-oss-20b');assert.equal(r.content,'READY');
});
test('limited concurrency preserves input order',async()=>assert.deepEqual(await mapBounded([3,2,1],2,async x=>x),[3,2,1]));
