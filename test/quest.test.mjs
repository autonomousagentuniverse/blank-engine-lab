import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseImportedGameSpec,DEFAULT_SPEC} from '../core.mjs';
import {playableLayout,isWalkable,questPlan,startQuest,questEvent,nearestTarget,currentObjective,questTargets,saveProgress,loadProgress} from '../quest.mjs';
const spec=parseImportedGameSpec(readFileSync(new URL('../examples/neon-frontier-night-market.json',import.meta.url),'utf8'));
const layout=playableLayout(spec),plan=questPlan(spec,layout);
test('real six-agent Night Market GameSpec compiles into a deterministic playable world',()=>{
 assert.equal(layout.buildings.length,10);
 assert.equal(layout.robots.length,4);
 assert.deepEqual(layout,playableLayout(spec));
 for(const p of [layout.spawn,layout.lantern,layout.gate,...layout.robots])assert.equal(isWalkable(layout,p.x,p.z,.65),true);
 assert.deepEqual(plan.stages.map(x=>x.type),['trade','lantern','gate']);
 assert.equal(plan.stages[0].target,4);
});
test('cannot skip ahead to the lantern or exit before trading',()=>{
 const state=startQuest(plan);
 assert.equal(questEvent(plan,state,{type:'gate'}).changed,false);
 assert.equal(questEvent(plan,state,{type:'lantern'}).changed,false);
 assert.equal(questTargets(plan,state,layout).length,4);
});
test('four unique robot trades, lantern collection and gate unlock complete mission',()=>{
 let state=startQuest(plan);
 for(let i=0;i<4;i++){
  const target=nearestTarget(plan,state,layout,layout.robots[i]);
  assert.equal(target?.type,'robot');
  let reply=questEvent(plan,state,{type:'robot',index:target.index});
  assert.equal(reply.changed,true);
  state=reply.state;
  assert.equal(state.traded.length,i+1);
  assert.equal(questEvent(plan,state,{type:'robot',index:i}).changed,false);
 }
 assert.equal(currentObjective(plan,state),'Collect the crystal lantern');
 assert.equal(questEvent(plan,state,{type:'gate'}).changed,false);
 assert.equal(nearestTarget(plan,state,layout,layout.lantern)?.type,'lantern');
 state=questEvent(plan,state,{type:'lantern'}).state;
 assert.equal(currentObjective(plan,state),'Unlock the secret gate');
 assert.equal(nearestTarget(plan,state,layout,layout.gate)?.type,'gate');
 state=questEvent(plan,state,{type:'gate'}).state;
 assert.equal(state.completed,true);
 assert.equal(state.stage,plan.stages.length);
 assert.equal(questEvent(plan,state,{type:'gate'}).changed,false);
});
test('quest is resumable for unchanged spec but resets after edits and malicious states',()=>{
 let state=startQuest(plan);
 state=questEvent(plan,state,{type:'robot',index:2}).state;
 const saved=saveProgress(spec,plan,state);
 assert.deepEqual(loadProgress(spec,plan,saved),state);
 assert.deepEqual(loadProgress({...spec,seed:90},questPlan({...spec,seed:90}),saved),startQuest(plan));
 assert.deepEqual(loadProgress(spec,plan,{spec:saved.spec,state:{stage:plan.stages.length,completed:true,hasLantern:false,traded:[]}}),startQuest(plan));
});
test('legacy beacon-only mission works even without robots',()=>{
 const bare={...DEFAULT_SPEC,robots:0,buildings:0,mission:'Reach the golden beacon'};
 const scene=playableLayout(bare),q=questPlan(bare,scene);
 assert.deepEqual(q.stages.map(x=>x.type),['gate']);
 assert.equal(questEvent(q,startQuest(q),{type:'gate'}).state.completed,true);
});
test('interaction range only includes nearby quest objects',()=>{
 assert.equal(nearestTarget(plan,startQuest(plan),layout,{x:0,z:0},.1),null);
 assert.equal(nearestTarget(plan,startQuest(plan),layout,layout.robots[1],3.4)?.index,1);
});
function pathExists(layout,start,goal){
 const size=123, origin=61,cell=p=>[Math.round(p.x)+origin,Math.round(p.z)+origin];
 const [sx,sz]=cell(start),[tx,tz]=cell(goal),visited=new Uint8Array(size*size);
 const cells=[[sx,sz]];visited[sz*size+sx]=1;
 for(let i=0;i<cells.length;i++){
  const [x,z]=cells[i];if(Math.hypot(x-tx,z-tz)<2)return true;
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=size||nz>=size||visited[nz*size+nx]||!isWalkable(layout,nx-origin,nz-origin))continue;
   visited[nz*size+nx]=1;cells.push([nx,nz]);
  }
 }
 return false;
}
test('walkable route to every Night Market objective for a dozen procedural seeds',()=>{
 for(let seed=40;seed<52;seed++){
  const candidate=playableLayout({...spec,seed});
  for(const goal of [candidate.lantern,candidate.gate,...candidate.robots])assert.equal(pathExists(candidate,candidate.spawn,goal),true,`Blocked route to target at seed ${seed}`);
 }
});
