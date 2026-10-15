/**
 * Server-only persistence bridge for a single six-agent creation run.
 * No generated code is executed; GameSpec accepted only after schema validation and QA.
 * Durable final revision, role evidence and status commit in ONE SQL transaction.
 */
import {randomUUID} from 'node:crypto';
import {DEFAULT_SPEC, validateSpec} from '../core.mjs';
import {AGENT_ROLES,createGameWithAgents} from './orchestrator.mjs';
import {createProject,enqueueRun} from '../db/store.mjs';

function errorCategory(e) {
  if (e?.message==='GameSpec revision conflict or project missing') return 'REVISION_CONFLICT';
  if (e?.message==='QA rejected generated GameSpec') return 'QA_REJECTED';
  if (e?.status===429) return 'MODEL_RATE_LIMIT';
  if (e?.message?.includes('NVIDIA request timeout')) return 'MODEL_TIMEOUT';
  if (e?.message?.startsWith('NVIDIA')) return 'MODEL_FAILURE';
  return 'CREATION_FAILED';
}

/** Validate input before allocating projects or running inference. */
export function validateCreationRequest({instruction,projectId=null,requestKey=null}) {
  if(typeof instruction!=='string'||!instruction.trim()||instruction.length>1000) throw new Error('Game instruction must be 1–1000 characters');
  if(projectId!==null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) throw new Error('Invalid project ID');
  if(requestKey!==null && (typeof requestKey!=='string'||requestKey.length>150||!requestKey.trim())) throw new Error('Invalid request key');
  return {instruction:instruction.trim(),projectId,requestKey:requestKey??randomUUID()};
}

async function recordFailedRun(pool,runId,error) {
  const code=errorCategory(error);
  try {
    await pool.query("UPDATE public.blank_agent_runs SET status='failed',last_error_code=$2,finished_at=now() WHERE id=$1 AND status='running'",[runId,code]);
    await pool.query("INSERT INTO public.blank_agent_events(run_id,kind,payload) VALUES($1,'creation_failed',$2::jsonb)",[runId,JSON.stringify({error_code:code})]);
  } catch {
    // Preserve the original error; infra failure may prevent recording failure.
  }
}

/** Generate, validate, and persist a GameSpec as one new project or an optimistic revision. */
export async function createPersistedGame({pool,client,instruction,projectId=null,requestKey=null,concurrency=2}) {
  if(!pool || typeof pool.query!=='function' || typeof pool.connect!=='function') throw new Error('PostgreSQL pool required');
  const req=validateCreationRequest({instruction,projectId,requestKey});
  let target=req.projectId,original,revision;
  if(target) {
    const found=await pool.query('SELECT id,spec,spec_revision FROM public.blank_projects WHERE id=$1',[target]);
    if(found.rowCount!==1) throw new Error('Game project not found');
    original=validateSpec(found.rows[0].spec);
    revision=found.rows[0].spec_revision;
    if(!Number.isSafeInteger(revision)||revision<0) throw new Error('Invalid stored revision');
  } else {
    original=validateSpec(DEFAULT_SPEC);
    const created=await createProject(pool,{name:'Blank AI Game',spec:original});
    target=created.id;revision=created.spec_revision;
  }
  const run=await enqueueRun(pool,{projectId:target,instruction:req.instruction,baseRevision:revision,requestKey:req.requestKey});
  const start=await pool.query("UPDATE public.blank_agent_runs SET status='running',started_at=now() WHERE id=$1 AND status='queued' AND base_revision=$2 RETURNING id",[run.id,revision]);
  if(start.rowCount!==1) throw new Error('Creation request already started; submit a new request instead');
  try {
    const result=await createGameWithAgents({instruction:req.instruction,currentSpec:original,client,concurrency});
    const spec=validateSpec(result.spec);
    const connection=await pool.connect();
    let nextRevision;
    try {
      await connection.query('BEGIN');
      const updated=await connection.query('UPDATE public.blank_projects SET spec=$1::jsonb,spec_revision=spec_revision+1,updated_at=now() WHERE id=$2 AND spec_revision=$3 RETURNING spec_revision',[JSON.stringify(spec),target,revision]);
      if(updated.rowCount!==1) throw new Error('GameSpec revision conflict or project missing');
      nextRevision=updated.rows[0].spec_revision;
      await connection.query('INSERT INTO public.blank_spec_revisions(project_id,revision,spec,created_by) VALUES($1,$2,$3::jsonb,$4)',[target,nextRevision,JSON.stringify(spec),'agent-run:'+run.id]);
      for(const role of AGENT_ROLES) {
        const usage=result.usage[role];
        const output=result.contributions[role];
        if(!usage || !output || typeof output!=='object' || Array.isArray(output)) throw new Error('Missing agent provenance');
        await connection.query("INSERT INTO public.blank_agent_tasks(run_id,role,status,provider,model,inputs,outputs,attempts,max_attempts,prompt_tokens,completion_tokens) VALUES($1,$2,'succeeded','nvidia',$3,$4::jsonb,$5::jsonb,1,1,$6,$7)",
          [run.id,role,usage.model,JSON.stringify({base_revision:revision}),JSON.stringify(output),usage.prompt_tokens,usage.completion_tokens]);
      }
      const finished=await connection.query("UPDATE public.blank_agent_runs SET status='succeeded',finished_at=now() WHERE id=$1 AND status='running' RETURNING id",[run.id]);
      if(finished.rowCount!==1) throw new Error('Run no longer running');
      await connection.query("INSERT INTO public.blank_agent_events(run_id,kind,payload) VALUES($1,'gamespec_published',$2::jsonb)",[run.id,JSON.stringify({project_id:target,revision:nextRevision})]);
      await connection.query('COMMIT');
    } catch(e) {
      await connection.query('ROLLBACK').catch(()=>{});
      throw e;
    } finally { connection.release(); }
    return {projectId:target,runId:run.id,revision:nextRevision,spec,roles:result.roles,usage:result.usage};
  } catch(e) {
    await recordFailedRun(pool,run.id,e);
    throw e;
  }
}
