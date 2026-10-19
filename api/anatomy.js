// Vercel-only anatomical reconstruction.
// The browser submits the exact MakeHuman snapshot to this function, which forks
// a prepared Vercel Sandbox containing Blender and runs an isolated worker.
// Job status is retrieved by (sandbox UUID, worker UUID); no Redis/Render needed.
// Output links are unguessable, public, TEMPORARY sandbox URLs (not durable Blob).
import {Sandbox} from '@vercel/sandbox';
import {randomBytes,randomUUID} from 'node:crypto';
import {validateRequest} from '../character-pipeline/manual-builder/controls.mjs';
import {validateSnapshot} from '../character-pipeline/manual-builder/snapshot-validation.mjs';

export const config={maxDuration:60};

const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const JOB_RE=new RegExp('^('+UUID+')\\.('+UUID+')$');
const BASE='blank-anatomy-blender-base';
const JOB_TIMEOUT=30*60*1000;
const PORT=10000;
const SOURCE='/vercel/blank-engine-lab';
function sandboxName(id){return 'blank-anatomy-'+id;}
const TOKEN_PATH='/vercel/blank-engine-lab/.anatomy-worker-token';
async function tokenFromSandbox(sandbox){
 const bytes=await sandbox.readFileToBuffer({path:TOKEN_PATH});
 if(!bytes)throw Error('Sandbox token expired');
 const token=bytes.toString('utf8').trim();
 if(!/^[0-9a-f]{64}$/.test(token))throw Error('Invalid sandbox token');
 return token;
}
async function requestJSON(url,options){
 const r=await fetch(url,options);
 const text=await r.text();
 if(text.length>100000)throw Error('Sandbox worker returned an oversized status');
 let data;
 try{data=JSON.parse(text)}catch{throw Error('Sandbox worker returned invalid JSON')}
 return {status:r.status,data};
}
async function readyAt(base){
 for(let attempt=0;attempt<30;attempt++){
  try{
   const r=await fetch(base+'/healthz',{signal:AbortSignal.timeout(1500)});
   if(r.ok)return;
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,450));
 }
 throw Error('Sandbox Blender server did not become healthy');
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'&&req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 if(req.method==='POST'){
  let payload;
  try{
   const origin=req.headers.origin||'';
   const host=req.headers['x-forwarded-host']||req.headers.host||'';
   if(origin&&new URL(origin).host!==host)return res.status(403).json({error:'Cross-origin submission refused'});
   if(Buffer.byteLength(JSON.stringify(req.body||{}),'utf8')>4400000)
    return res.status(413).json({error:'Anatomy snapshot exceeds maximum payload size'});
   const submitted=typeof req.body==='string'?JSON.parse(req.body):req.body;
   const choice=submitted.selectedAnimation||'walk';
   if(!['idle','walk','jog','run','happy','sad','angry','laugh','fight'].includes(choice))throw Error('Unsupported animation selection');
   payload={...validateRequest(submitted),snapshot:validateSnapshot(submitted.snapshot),selectedAnimation:choice};
  }catch(error){return res.status(400).json({error:'Invalid anatomy specification: '+error.message.slice(0,180)})}
  const id=randomUUID(),name=sandboxName(id),token=randomBytes(32).toString('hex');
  let sandbox;
  try{
   sandbox=await Sandbox.fork({
    sourceSandbox:BASE,
    name,
    resources:{vcpus:2},
    timeout:JOB_TIMEOUT,
    ports:[PORT],
    persistent:false
   });
   const domain=sandbox.domain(PORT);
   await sandbox.writeFiles([{path:TOKEN_PATH,content:Buffer.from(token,'utf8')}]);
   await sandbox.runCommand({
    cmd:'node',
    args:['character-pipeline/manual-builder/server.mjs'],
    cwd:SOURCE,
    env:{
     WORKER_MODE:'1', PORT:String(PORT), BLENDER_WORKER_TOKEN:token,
     BLENDER_BIN:'/usr/bin/blender',
     ARTIFACT_DIR:SOURCE+'/artifacts/manual-human-builder'
    },
    detached:true
   });
   await readyAt(domain);
   const posted=await requestJSON(domain+'/api/rebuild',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(18000)
   });
   if(posted.status!==202||!new RegExp('^'+UUID+'$').test(posted.data.jobId||'')){
    throw Error(posted.data.error||'Blender worker refused the build');
   }
   return res.status(202).json({
    jobId:id+'.'+posted.data.jobId,status:'queued',
    expiresInMinutes:30
   });
  }catch(error){
   console.error('Sandbox Blender start failed:',error);
   if(sandbox)try{await sandbox.stop()}catch{}
   return res.status(502).json({error:'Could not launch the Blender Sandbox: '+String(error.message||error).slice(0,150)});
  }
 }
 const match=JOB_RE.exec(String(req.query?.job||''));
 if(!match)return res.status(400).json({error:'Invalid anatomy job identifier'});
 const [,outer,inner]=match;
 const requestedAsset=req.query?.asset;
 if(requestedAsset!==undefined&&requestedAsset!=='animated_character.glb')
  return res.status(400).json({error:'Only the generated rigged GLB can be imported into the game'});
 try{
  const sandbox=await Sandbox.get({name:sandboxName(outer)});
  const domain=sandbox.domain(PORT);
  const token=await tokenFromSandbox(sandbox);
  const result=await requestJSON(domain+'/api/jobs/'+inner,{
   headers:{Authorization:'Bearer '+token},
   signal:AbortSignal.timeout(12000)
  });
  if(result.status!==200)return res.status(result.status).json({error:result.data.error||'Job not found'});
  if(requestedAsset){
   if(result.data.status!=='complete')return res.status(409).json({error:'The Blender build is not finished'});
   const asset=await fetch(domain+'/outputs/'+inner+'/animated_character.glb',{
    headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)
   });
   if(!asset.ok)return res.status(502).json({error:'Completed Blender GLB is unavailable'});
   const declared=Number(asset.headers.get('content-length')||0);
   if(declared>8*1024*1024)return res.status(413).json({error:'GLB exceeds the playable avatar size limit'});
   const bytes=Buffer.from(await asset.arrayBuffer());
   if(bytes.length<20||bytes.length>8*1024*1024)return res.status(413).json({error:'Playable GLB has an invalid size'});
   if(bytes.readUInt32LE(0)!==0x46546c67)return res.status(502).json({error:'Invalid GLB returned by Blender worker'});
   res.setHeader('Content-Type','model/gltf-binary');
   res.setHeader('Content-Length',String(bytes.length));
   return res.status(200).send(bytes);
  }
  return res.status(200).json({
   ...result.data,
   id:outer+'.'+inner,
   workerJobId:inner,
   outputBaseUrl:domain,
   expiresInMinutes:30
  });
 }catch(error){
  console.error('Sandbox anatomy polling failed:',error);
  return res.status(410).json({error:'The Blender Sandbox is unavailable or the 30-minute download window expired. Submit again to rebuild.'});
 }
}
