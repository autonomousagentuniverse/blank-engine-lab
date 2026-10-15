import test from 'node:test';
import assert from 'node:assert/strict';
import {createPersistedGame,validateCreationRequest} from '../ai/persistent.mjs';
import {AGENT_ROLES} from '../ai/orchestrator.mjs';
import {parseImportedGameSpec,worldLayout,DEFAULT_SPEC} from '../core.mjs';

const roleReply={
  director:{title:'Floating Citadel',intent:'Explore'},
  world:{time:'day',theme:'amber',buildings:11,seed:7},
  gameplay:{robots:3},character:{note:'Citizens remain design-only'},
  mission:{mission:'Find the radio tower'},qa:{approve:true,issues:[]},
};
function clientWith(overrides={}) {return {async complete({role,model}) {const output=overrides[role]??roleReply[role]; if(output instanceof Error) throw output;return {content:JSON.stringify(output),model,usage:{prompt_tokens:2,completion_tokens:3}};}};}

function fakePool({existing=false,failAt='',revisionConflict=false}={}) {
  const projectId='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  const runId='11111111-2222-4333-8444-555555555555';
  const pool={calls:[],tasks:[],events:[],project:{id:projectId,spec:DEFAULT_SPEC,spec_revision:0},run:{id:runId,status:'queued'},};
  async function query(sql,params=[]) {
    pool.calls.push({sql,params});
    if(failAt && sql.includes(failAt)) throw Error('test database failure');
    if(sql.startsWith('SELECT id,spec,spec_revision FROM public.blank_projects')) return {rows:[pool.project],rowCount:existing?1:0};
    if(sql.startsWith('INSERT INTO public.blank_projects')) return {rows:[{id:projectId,spec_revision:0}],rowCount:1};
    if(sql.startsWith('INSERT INTO public.blank_spec_revisions')) return {rows:[],rowCount:1};
    if(sql.startsWith('INSERT INTO public.blank_agent_runs')) return {rows:[{id:runId,status:'queued'}],rowCount:1};
    if(sql.startsWith("UPDATE public.blank_agent_runs SET status='running'")) {pool.run.status='running';return {rows:[{id:runId}],rowCount:1};}
    if(sql.startsWith('UPDATE public.blank_projects')) {if(revisionConflict)return {rows:[],rowCount:0};pool.project.spec=JSON.parse(params[0]);pool.project.spec_revision++;return {rows:[{spec_revision:pool.project.spec_revision}],rowCount:1};}
    if(sql.startsWith('INSERT INTO public.blank_agent_tasks')) {pool.tasks.push(params);return {rows:[],rowCount:1};}
    if(sql.startsWith("UPDATE public.blank_agent_runs SET status='succeeded'")){pool.run.status='succeeded';return {rows:[{id:runId}],rowCount:1};}
    if(sql.startsWith("UPDATE public.blank_agent_runs SET status='failed'")){pool.run.status='failed';return {rows:[],rowCount:1};}
    if(sql.startsWith('INSERT INTO public.blank_agent_events')){pool.events.push(params);return {rows:[],rowCount:1};}
    return {rows:[],rowCount:0};
  }
  pool.query=query;
  pool.connect=async()=>({query,release(){}});
  return pool;
}

test('manual six-agent creation writes one GameSpec revision plus six task provenance rows',async()=>{
  const pool=fakePool();
  const out=await createPersistedGame({pool,client:clientWith(),instruction:'Create a small floating citadel',requestKey:'test:run-1'});
  assert.equal(out.revision,1);
  assert.equal(out.spec.title,'Floating Citadel');
  assert.equal(out.spec.buildings,11);
  assert.equal(pool.tasks.length,6);
  assert.deepEqual(pool.tasks.map(x=>x[1]),AGENT_ROLES);
  assert.ok(pool.tasks.every(t=>t[3].includes('base_revision')&&t[4].startsWith('{')));
  assert.equal(pool.run.status,'succeeded');
  assert.equal(pool.calls.filter(x=>x.sql==='COMMIT').length,2); // initial project + finalized spec
  assert.equal(pool.events.length,1);
  assert.equal(pool.events[0][0],out.runId);
});

test('existing project uses optimistic revision and does not make another project',async()=>{
  const pool=fakePool({existing:true});
  const out=await createPersistedGame({pool,client:clientWith(),instruction:'Update the city',projectId:pool.project.id});
  assert.equal(out.revision,1);
  assert.equal(pool.calls.filter(x=>x.sql.startsWith('INSERT INTO public.blank_projects')).length,0);
  assert.equal(pool.calls.filter(x=>x.sql.startsWith('UPDATE public.blank_projects')).length,1);
});

test('QA rejection records failed run but publishes no spec and no role ledger',async()=>{
  const pool=fakePool();
  await assert.rejects(createPersistedGame({pool,client:clientWith({qa:{approve:false,issues:['Needs work']}}),instruction:'A city'}),/QA rejected/);
  assert.equal(pool.run.status,'failed');
  assert.equal(pool.tasks.length,0);
  assert.equal(pool.calls.filter(x=>x.sql.startsWith('UPDATE public.blank_projects')).length,0);
  assert.equal(pool.events.length,1);
  assert.equal(JSON.parse(pool.events[0][1]).error_code,'QA_REJECTED');
});

test('stale revision rolls back final publish transaction, preserves run failure code',async()=>{
  const pool=fakePool({existing:true,revisionConflict:true});
  await assert.rejects(createPersistedGame({pool,client:clientWith(),instruction:'Change map',projectId:pool.project.id}),/revision conflict/);
  assert.equal(pool.run.status,'failed');
  assert.equal(pool.calls.filter(x=>x.sql==='ROLLBACK').length,1);
  assert.equal(pool.tasks.length,0);
  assert.equal(JSON.parse(pool.events[0][1]).error_code,'REVISION_CONFLICT');
});

test('inference error leaves existing GameSpec unchanged and records failure',async()=>{
  const pool=fakePool({existing:true});
  await assert.rejects(createPersistedGame({pool,client:clientWith({director:Error('simulated bad provider')}),instruction:'New world',projectId:pool.project.id}),/simulated bad provider/);
  assert.equal(pool.project.spec_revision,0);
  assert.equal(pool.run.status,'failed');
});

test('reject invalid game request before creating a project or contacting provider',async()=>{
  assert.throws(()=>validateCreationRequest({instruction:''}),/instruction/);
  assert.throws(()=>validateCreationRequest({instruction:'hi',projectId:'bogus'}),/project ID/);
  assert.throws(()=>validateCreationRequest({instruction:'hi',requestKey:''}),/request key/);
  const pool=fakePool();
  await assert.rejects(createPersistedGame({pool,client:clientWith(),instruction:'X'.repeat(1001)}),/1000/);
  assert.equal(pool.calls.length,0);
});

test('strict browser JSON import accepts approved v1 spec and rejects malformed or oversized files',()=>{
  const spec={...DEFAULT_SPEC,title:'Imported Game',buildings:5,robots:2};
  assert.deepEqual(parseImportedGameSpec(JSON.stringify(spec)),spec);
  assert.throws(()=>parseImportedGameSpec('{malformed'),/not valid JSON/);
  assert.throws(()=>parseImportedGameSpec(JSON.stringify({...spec,robots:100})),/robots/);
  assert.throws(()=>parseImportedGameSpec('X'.repeat(8193)),/under 8 KB/);
  const world=worldLayout(parseImportedGameSpec(JSON.stringify(spec)));
  assert.equal(world.buildings.length,5);assert.equal(world.robots.length,2);
});
