#!/usr/bin/env node
/** Verify the six Blank Engine tables and migration ledger without modifying data. */
import {openStore} from '../db/store.mjs';
const names=['blank_schema_migrations','blank_projects','blank_spec_revisions','blank_agent_runs','blank_agent_tasks','blank_agent_events'];
const pool=await openStore();
try {
  const q=await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[])",[names]);
  const present=new Set(q.rows.map(r=>r.table_name));
  const missing=names.filter(name=>!present.has(name));
  if(missing.length) throw new Error('Blank Engine schema incomplete: '+missing.join(', '));
  const migration=await pool.query('SELECT version FROM public.blank_schema_migrations WHERE version=$1',['0001_core']);
  if(migration.rowCount!==1) throw new Error('Blank Engine schema migration ledger missing 0001_core');
  console.log('Blank Engine schema verification: PASS (6 tables, migration 0001_core)');
} catch(e) {
  console.error('Blank Engine schema verification failed: '+(e?.code||'SCHEMA_INCOMPLETE'));
  process.exitCode=1;
} finally {
  await pool.end();
}
