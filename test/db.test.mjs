import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {requireDatabaseUrl,saveGameSpec,createProject,claimNextTask} from '../db/store.mjs';

test('requires postgres URL without exposing secret',()=>{
  assert.throws(()=>requireDatabaseUrl({}),/not configured/);
  assert.throws(()=>requireDatabaseUrl({BLANK_PG_URL:'https://example.com'}),/PostgreSQL connection URL/);
  assert.equal(requireDatabaseUrl({BLANK_PG_URL:'postgresql://user:secret@localhost/db'}),'postgresql://user:secret@localhost/db');
});
test('migration creates tables transactionally',async()=>{
  const sql=await readFile(new URL('../db/migrations/0001_core.sql',import.meta.url),'utf8');
  for(const name of ['blank_projects','blank_spec_revisions','blank_agent_runs','blank_agent_tasks','blank_agent_events'])
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.'+name));
  assert.match(sql,/BEGIN;[\s\S]*COMMIT;/);
});
test('stale spec revision rolls back atomically',async()=>{
  const calls=[];
  const client={query:async s=>{calls.push(s.trim().split(/\s+/)[0]);return {rowCount:0,rows:[]}},release:()=>calls.push('RELEASE')};
  await assert.rejects(()=>saveGameSpec({connect:async()=>client},{projectId:'x',expectedRevision:0,spec:{}}),/revision conflict/);
  assert.deepEqual(calls,['BEGIN','UPDATE','ROLLBACK','RELEASE']);
});
test('createProject writes initial revision atomically',async()=>{
  const calls=[];
  const c={query:async s=>{calls.push(s.trim().split(/\s+/)[0]);return s.startsWith('INSERT INTO public.blank_projects')?{rows:[{id:'p',spec_revision:0}]}:{rows:[]}},release:()=>calls.push('RELEASE')};
  const result=await createProject({connect:async()=>c},{name:'Demo',spec:{}});
  assert.equal(result.id,'p');
  assert.deepEqual(calls,['BEGIN','INSERT','INSERT','COMMIT','RELEASE']);
});
test('task leasing uses SKIP LOCKED',async()=>{
  let statement='';
  const db={query:async s=>{statement=s;return {rows:[]}}};
  assert.equal(await claimNextTask(db,{workerId:'w1'}),null);
  assert.match(statement,/SKIP LOCKED/);
  assert.match(statement,/lease_expires_at<now\(\)/);
});
