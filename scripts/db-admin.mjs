#!/usr/bin/env node
import {openStore,checkConnection,applyInitialMigration} from '../db/store.mjs';
const op=process.argv[2]??'check';
if(!['check','migrate'].includes(op)){console.error('Usage: db-admin.mjs check|migrate');process.exitCode=2;}
else{
  let pool;
  try{
    pool=await openStore();
    if(!await checkConnection(pool))throw new Error('Connection failed');
    console.log('PostgreSQL connectivity: PASS');
    if(op==='migrate'){
      if(!await applyInitialMigration(pool))throw new Error('Migration failed');
      console.log('Migration 0001_core: APPLIED');
    }
  }catch{
    console.error('Database operation failed. Check BLANK_PG_URL access, TLS and database permissions.');
    process.exitCode=1;
  }finally{if(pool)await pool.end().catch(()=>{});}
}
