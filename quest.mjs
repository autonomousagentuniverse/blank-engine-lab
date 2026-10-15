/** Blank Engine Alpha 0.5: deterministic, renderer-independent playable quest runtime.
 * No generated scripts, eval, or network access. Version 1 specs are still valid.
 */
import {validateSpec,worldLayout} from './core.mjs';
export const INTERACT_RADIUS=3.4;
const GATE_ANCHOR={x:27,z:25};
const LANTERN_ANCHOR={x:-22,z:18};
const SPAWN={x:0,z:0};
const PLAY_BOUND=61.4;
const at=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const pos=(x,z)=>({x,z});

export function isWalkable(layout,x,z,radius=0.65){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>PLAY_BOUND-radius||Math.abs(z)>PLAY_BOUND-radius)return false;
 return layout.buildings.every((b,i)=>{
  const depth=b.width*(.7+(i%3)*.14);
  return Math.abs(x-b.x)>=b.width/2+radius || Math.abs(z-b.z)>=depth/2+radius;
 });
}
export function clearPosition(layout,anchor,radius=0.75,avoid=[]){
  const allowed=p=>isWalkable(layout,p.x,p.z,radius)&&avoid.every(q=>at(p,q)>3.7);
  if(allowed(anchor))return {...anchor};
  for(let ring=2;ring<=50;ring+=2){
    for(let i=0;i<32;i++){
      const angle=i*Math.PI/16, p=pos(anchor.x+Math.cos(angle)*ring,anchor.z+Math.sin(angle)*ring);
      if(allowed(p))return p;
    }
  }
  throw new Error('Unable to place a reachable objective');
}

/** Pure deterministic scene layout: meshes, quest targets and collision all share these positions. */
export function playableLayout(raw){
 const spec=validateSpec(raw), rawLayout=worldLayout(spec);
 const spawn=clearPosition(rawLayout,SPAWN);
 const gate=clearPosition(rawLayout,GATE_ANCHOR,2.8,[spawn]);
 const lantern=clearPosition(rawLayout,LANTERN_ANCHOR,1.8,[spawn,gate]);
 const robots=[];
 for(let i=0;i<rawLayout.robots.length;i++){
  const r=rawLayout.robots[i];
  const clear=clearPosition(rawLayout,pos(r.x,r.z),2.9,[spawn,gate,lantern,...robots]);
  robots.push({...r,x:clear.x,z:clear.z,id:i});
 }
 return {buildings:rawLayout.buildings,robots,spawn,gate,lantern};
}
export function questPlan(raw,layout=playableLayout(raw)){
 const spec=validateSpec(raw);
 const mission=spec.mission.toLowerCase();
 const lantern=/(lantern|crystal|hidden.+gate|marketplace.+gate)/i.test(mission);
 const robotRequest=mission.match(/(?:barter|trade|talk|speak|meet|visit)(?:\s+with|\s+to)?\s+(?:(\d+)|one|two|three|four)?\s*robots?/i);
 const wordCount={one:1,two:2,three:3,four:4};
 const wordMatch=mission.match(/(?:barter|trade|talk|speak|meet|visit)(?:\s+with|\s+to)?\s+(one|two|three|four)\s+robots?/i);
 const tradeGoal=layout.robots.length===0?0:robotRequest?Math.min(layout.robots.length,Number(robotRequest[1])||wordCount[wordMatch?.[1]]||1):lantern?Math.min(layout.robots.length,2):0;
 const stages=[...(tradeGoal?[{type:'trade',target:tradeGoal,label:`Barter with ${tradeGoal} robot${tradeGoal===1?'':'s'}`}]:[]),...(lantern?[{type:'lantern',label:'Collect the crystal lantern'}]:[]),{type:'gate',label:lantern?'Unlock the secret gate':'Reach the golden beacon'}];
 return {stages,mode:lantern?'lantern':'beacon',positions:{gate:layout.gate,lantern:layout.lantern},robotCount:layout.robots.length};
}
export function startQuest(plan){return {stage:0,traded:[],hasLantern:false,completed:false};}
export function assertProgress(plan,candidate){
 if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))return startQuest(plan);
 const traded=candidate.traded;
 if(!Number.isInteger(candidate.stage)||candidate.stage<0||candidate.stage>plan.stages.length||!Array.isArray(traded)||traded.length>plan.robotCount||traded.some(i=>!Number.isInteger(i)||i<0||i>=plan.robotCount)||new Set(traded).size!==traded.length||typeof candidate.hasLantern!=='boolean'||typeof candidate.completed!=='boolean')return startQuest(plan);
 // Prevent a crafted local-storage payload from inventing completed quests or skipped stages.
 const stageFromActions=plan.stages.findIndex(s=>s.type==='trade'&&traded.length<s.target || s.type==='lantern'&&!candidate.hasLantern);
 const expectedStage=stageFromActions<0?plan.stages.length-1:stageFromActions;
 if(candidate.completed){if(candidate.stage!==plan.stages.length||expectedStage!==plan.stages.length-1)return startQuest(plan);}
 else if(candidate.stage!==expectedStage)return startQuest(plan);
 if(!plan.stages.some(s=>s.type==='lantern')&&candidate.hasLantern)return startQuest(plan);
 if(plan.stages.some(s=>s.type==='lantern')&&candidate.hasLantern&&plan.stages.some(s=>s.type==='trade')&&traded.length<plan.stages[0].target)return startQuest(plan);
 return {stage:candidate.stage,traded:[...traded],hasLantern:candidate.hasLantern,completed:candidate.completed};
}
export function currentObjective(plan,state){return state.completed?'Mission complete!':plan.stages[state.stage]?.label??'Mission complete!';}
export function questTargets(plan,state,layout){
 if(state.completed)return [];
 const step=plan.stages[state.stage];
 if(!step)return [];
 if(step.type==='trade')return layout.robots.filter(r=>!state.traded.includes(r.id)).map(r=>({type:'robot',index:r.id,position:pos(r.x,r.z)}));
 return [{type:step.type,position:step.type==='lantern'?layout.lantern:layout.gate}];
}
/** Pure reducer; caller must verify interaction range against the scene geometry. */
export function questEvent(plan,state,event){
 const current=assertProgress(plan,state);
 if(current.completed)return {state:current,message:'Mission already complete.',changed:false};
 const step=plan.stages[current.stage];
 if(!event||(step.type==='trade'?'robot':step.type)!==event.type)return {state:current,message:`Next objective: ${step.label}`,changed:false};
 if(step.type==='trade'){
  if(!Number.isInteger(event.index)||event.index<0||event.index>=plan.robotCount)return {state:current,message:'Invalid robot.',changed:false};
  if(current.traded.includes(event.index))return {state:current,message:'You already traded with this robot.',changed:false};
  const traded=[...current.traded,event.index];
  const complete=traded.length>=step.target;
  return {state:{...current,traded,stage:complete?current.stage+1:current.stage},message:complete?'Trading complete. New objective unlocked.':`Traded with robot ${event.index+1} (${traded.length}/${step.target}).`,changed:true};
 }
 if(step.type==='lantern')return {state:{...current,hasLantern:true,stage:current.stage+1},message:'Crystal lantern collected. Find the secret gate!',changed:true};
 return {state:{...current,completed:true,stage:plan.stages.length},message:'MISSION COMPLETE — The gate is unlocked!',changed:true};
}
export function nearestTarget(plan,state,layout,player,radius=INTERACT_RADIUS){
 return questTargets(plan,state,layout).map(target=>({...target,distance:at(player,target.position)})).filter(t=>t.distance<=radius).sort((a,b)=>a.distance-b.distance)[0]||null;
}
export function progressStamp(spec){return JSON.stringify(validateSpec(spec));}
export function saveProgress(spec,plan,state){return {spec:progressStamp(spec),state:assertProgress(plan,state)};}
export function loadProgress(spec,plan,stored){return stored?.spec===progressStamp(spec)?assertProgress(plan,stored.state):startQuest(plan);}
