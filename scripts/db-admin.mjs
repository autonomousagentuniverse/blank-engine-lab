#!/usr/bin/env node
import { openStore, checkConnection, applyInitialMigration } from '../db/store.mjs';
import { safeDatabaseFailure } from '../db/diagnostics.mjs';
const op=process.argv[2]??'check';
if (!['check','migrate'].includes(op)) {
  console.error('Usage: node scripts/db-admin.mjs check|migrate');
  process.exitCode=2;
} else {
  let pool;
  try {
    pool=await openStore();
    if (!await checkConnection(pool)) throw new Error('Unexpected SELECT 1 result');
    console.log('PostgreSQL connectivity: PASS');
    if (op==='migrate') {
      if (!await applyInitialMigration(pool)) throw new Error('Migration verification failed');
      console.log('Migration 0001_core: APPLIED');
    }
  } catch (error) {
    const diagnostic=safeDatabaseFailure(error);
    console.error(`PostgreSQL check: FAIL [${diagnostic.kind}]`);
    console.error(diagnostic.hint);
    process.exitCode=1;
  } finally {
    if (pool) await pool.end().catch(()=>{});
  }
}
