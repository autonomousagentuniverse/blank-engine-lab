/** Server-only PostgreSQL adapter: do not import from browser/editor. */
import { readFile } from 'node:fs/promises';

export function requireDatabaseUrl(env=process.env) {
  const value=env.BLANK_PG_URL;
  if(typeof value!=='string' || !value.trim()) throw new Error('BLANK_PG_URL is not configured');
  try {
    const u=new URL(value);
    if(!['postgres:','postgresql:'].includes(u.protocol)||!u.hostname) throw new Error();
  } catch {throw new Error('BLANK_PG_URL must be a PostgreSQL connection URL');}
  return value;
}
export async function openStore(env=process.env) {
  const connectionString=requireDatabaseUrl(env);
  const {Pool}=await import('pg');
  return new Pool({connectionString,max:2,idleTimeoutMillis:10000,connectionTimeoutMillis:8000,allowExitOnIdle:true,application_name:'blank-engine'});
}
export async function checkConnection(pool) {
  const q=await pool.query('SELECT 1 AS ok');
  return q.rows[0]?.ok===1;
}
export async function applyInitialMigration(pool,file=new URL('./migrations/0001_core.sql',import.meta.url)) {
  const sql=await readFile(file,'utf8');
  await pool.query(sql);
  const q=await pool.query('SELECT version FROM public.blank_schema_migrations WHERE version=$1',['0001_core']);
  return q.rowCount===1;
}
export async function createProject(pool,{name,ownerRef=null,spec={}}) {
  if(typeof name!=='string'||!name.trim()||name.length>200) throw new Error('Invalid project name');
  if(!spec||Array.isArray(spec)||typeof spec!=='object') throw new Error('GameSpec must be an object');
  const c=await pool.connect();
  try {
    await c.query('BEGIN');
    const q=await c.query('INSERT INTO public.blank_projects(name,owner_ref,spec) VALUES ($1,$2,$3::jsonb) RETURNING id,spec_revision',[name.trim(),ownerRef,JSON.stringify(spec)]);
    await c.query('INSERT INTO public.blank_spec_revisions(project_id,revision,spec) VALUES ($1,$2,$3::jsonb)',[q.rows[0].id,0,JSON.stringify(spec)]);
    await c.query('COMMIT'); return q.rows[0];
  } catch(e) {await c.query('ROLLBACK');throw e;} finally {c.release();}
}
export async function saveGameSpec(pool,{projectId,expectedRevision,spec,actor='system'}) {
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw new Error('Invalid revision');
  if(!spec||Array.isArray(spec)||typeof spec!=='object')throw new Error('GameSpec must be an object');
  const c=await pool.connect();
  try {
    await c.query('BEGIN');
    const q=await c.query(
      'UPDATE public.blank_projects SET spec=$1::jsonb,spec_revision=spec_revision+1,updated_at=now() WHERE id=$2 AND spec_revision=$3 RETURNING spec_revision',
      [JSON.stringify(spec),projectId,expectedRevision]);
    if(q.rowCount!==1)throw new Error('GameSpec revision conflict or project missing');
    const revision=q.rows[0].spec_revision;
    await c.query('INSERT INTO public.blank_spec_revisions(project_id,revision,spec,created_by) VALUES($1,$2,$3::jsonb,$4)',
      [projectId,revision,JSON.stringify(spec),actor]);
    await c.query('COMMIT');return revision;
  } catch(e){await c.query('ROLLBACK');throw e;} finally{c.release();}
}
export async function enqueueRun(pool,{projectId,instruction,baseRevision,requestKey=null}) {
  if(typeof instruction!=='string'||!instruction.trim()||instruction.length>20000)throw new Error('Invalid instruction');
  if(!Number.isSafeInteger(baseRevision)||baseRevision<0)throw new Error('Invalid revision');
  const q=await pool.query(
    'INSERT INTO public.blank_agent_runs(project_id,instruction,base_revision,request_key) VALUES($1,$2,$3,$4) ON CONFLICT(project_id,request_key) DO UPDATE SET request_key=EXCLUDED.request_key RETURNING id,status',
    [projectId,instruction,baseRevision,requestKey]);
  return q.rows[0];
}
export async function claimNextTask(pool,{workerId,leaseSeconds=90}) {
  if(typeof workerId!=='string'||!workerId||workerId.length>100)throw new Error('Invalid workerId');
  if(!Number.isInteger(leaseSeconds)||leaseSeconds<15||leaseSeconds>900)throw new Error('Invalid lease');
  const q=await pool.query(
    "WITH picked AS (SELECT t.id FROM public.blank_agent_tasks t JOIN public.blank_agent_runs r ON r.id=t.run_id WHERE r.status IN ('queued','running') AND t.attempts<t.max_attempts AND ((t.status='queued' AND t.next_attempt_at<=now()) OR (t.status='leased' AND t.lease_expires_at<now())) ORDER BY t.created_at,t.id LIMIT 1 FOR UPDATE OF t SKIP LOCKED) UPDATE public.blank_agent_tasks t SET status='leased',lease_owner=$1,lease_expires_at=now()+($2::int * interval '1 second'),attempts=t.attempts+1,updated_at=now() FROM picked WHERE t.id=picked.id RETURNING t.*",
    [workerId,leaseSeconds]);
  return q.rows[0]??null;
}
