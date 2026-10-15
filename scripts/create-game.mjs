#!/usr/bin/env node
/** Manual, credentialed GitHub Actions or trusted CLI game-creation entrypoint. */
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {createNvidiaClient} from '../ai/nvidia.mjs';
import {createPersistedGame} from '../ai/persistent.mjs';
import {openStore} from '../db/store.mjs';

const instruction=process.env.BLANK_GAME_PROMPT;
const projectId=process.env.BLANK_PROJECT_ID?.trim()||null;
const key=process.env.GITHUB_RUN_ID ? `github-actions:${process.env.GITHUB_RUN_ID}` : `local:${randomUUID()}`;
let db;
try {
  // Initialize client before DB write to fail fast if NVIDIA credentials are absent.
  const client=createNvidiaClient();
  db=await openStore();
  const output=await createPersistedGame({pool:db,client,instruction,projectId,requestKey:key,concurrency:2});
  await mkdir('artifacts',{recursive:true});
  await writeFile('artifacts/blank-game-spec.json',JSON.stringify(output.spec,null,2)+'\n',{mode:0o600});
  await writeFile('artifacts/blank-game-receipt.json',JSON.stringify({projectId:output.projectId,runId:output.runId,revision:output.revision,agents:output.roles,usage:output.usage},null,2)+'\n',{mode:0o600});
  console.log('Blank Engine: game creation and PostgreSQL persistence PASS');
  console.log(`Project ID: ${output.projectId}; revision: ${output.revision}; agents: ${output.roles.length}`);
  console.log('Artifact: artifacts/blank-game-spec.json');
} catch(e) {
  // Do not log provider responses, SQL connection strings or raw secrets.
  console.error('Blank Engine create-game FAILED:',String(e?.message||'unknown').replace(/postgres(?:ql)?:\/\/\S+/gi,'[REDACTED]').slice(0,220));
  process.exitCode=1;
} finally {await db?.end().catch(()=>{});}
