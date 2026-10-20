import http from 'node:http';
import {readFile, mkdir, writeFile, stat, rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomUUID, timingSafeEqual} from 'node:crypto';
import {dirname, resolve, join, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defaultRequest,validateRequest} from './controls.mjs';
import {validateSnapshot} from './snapshot-validation.mjs';

const BASE=dirname(fileURLToPath(import.meta.url));
const ARTIFACTS=process.env.ARTIFACT_DIR ? resolve(process.env.ARTIFACT_DIR) : resolve(BASE,'../../artifacts/manual-human-builder');
const TTL_MS=60*60*1000;
function bearerAccepted(req,expected){
 const header=req.headers.authorization||'';
 if(typeof expected!=='string'||expected.length<32||!header.startsWith('Bearer '))return false;
 const actual=Buffer.from(header.slice(7));const token=Buffer.from(expected);
 return actual.length===token.length&&timingSafeEqual(actual,token);
}
function pruneJobs(){
 for(const [id,job] of JOBS){
  if((job.status==='complete'||job.status==='failed')&&Date.now()-job.createdMs>TTL_MS){
   JOBS.delete(id);void rm(job.output,{recursive:true,force:true}).catch(()=>{});
  }
 }
}
const RENDER_FILES=new Set(['front.png','three_quarter.png','profile.png','face_macro.png','hand_macro.png','feet_macro.png','report.json','anatomical_character.blend','animated_character.glb','idle_preview.mp4','walk_preview.mp4','jog_preview.mp4','run_preview.mp4','happy_preview.mp4','sad_preview.mp4','angry_preview.mp4','laugh_preview.mp4','fight_preview.mp4']);
const TYPES={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json','.blend':'application/octet-stream','.glb':'model/gltf-binary','.mp4':'video/mp4'};
const JOBS=new Map();
const PREVIEWS=['idle','walk','jog','run','happy','sad','angry','laugh','fight'];
let busy=false;
const queue=[];
const json=(res,status,body)=>respond(res,status,JSON.stringify(body),'.json');
function respond(res,status,body,extension){
 res.writeHead(status,{'Content-Type':TYPES[extension]||'application/octet-stream',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
  'Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net; media-src 'self' https://*.vercel.run; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
 res.end(body);
}
async function limitedJson(req){
 let data='';for await(const part of req){
  data+=part.toString('utf8');
  if(data.length>4500000)throw Error('Request too large');
 }
 try{return JSON.parse(data)}catch{throw Error('Invalid JSON')}
}
async function runOne(job,blenderBin){
 busy=true;job.status='running';job.startedAt=new Date().toISOString();
 job.renderFrames=0;job.seenFrames=new Set();job.lastProgressAt=Date.now();job.phase='Preparing Blender anatomy and rig';
 try{
  await mkdir(job.output,{recursive:true});
  const settings=join(job.output,'settings.json');
  await writeFile(settings,JSON.stringify(job.spec,null,2)+'\n',{flag:'wx'});
  const args=['--background','--factory-startup','--python',join(BASE,'build_replica.py'),'--',settings,job.output];
  await new Promise((ok,fail)=>{
   const child=spawn(blenderBin,args,{cwd:BASE,stdio:['ignore','pipe','pipe'],env:{...process.env,PYTHONUNBUFFERED:'1'}});
   let done=false,timedOut=false;
   let lineTail='';
   const append=data=>{
    const chunk=data.toString();
    job.log=(job.log+chunk).slice(-12000);
    const combined=lineTail+chunk;
    for(const match of combined.matchAll(/frames_([a-z]+)\/frame_(\d{4})\.png/g)){
     const key=match[1]+'/'+match[2];
     if(!job.seenFrames.has(key)){
      job.seenFrames.add(key);job.renderFrames++;
      job.phase='Rendering '+match[1]+' animation';
      job.lastProgressAt=Date.now();
     }
    }
    lineTail=combined.slice(-90);
   };
   child.stdout.on('data',append);child.stderr.on('data',append);
   const timeout=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},26*60*1000);
   child.on('error',err=>{if(!done){done=true;clearTimeout(timeout);fail(err)}});
   child.on('close',(code,signal)=>{
    if(done)return;done=true;clearTimeout(timeout);
    if(code===0)ok();else{
     // Preserve a concise, sanitized Blender traceback. Generic exit 1
     // previously hid a morph-dependent skinning/QA failure from the user.
     const diagnostic=job.log.split(/\r?\n/).reverse()
       .map(line=>line.trim())
       .find(line=>/^(?:RuntimeError|ValueError|KeyError|TypeError|AssertionError|ANATOMY_REPLICA_FAILED):/.test(line));
     const explanation=diagnostic?': '+diagnostic.slice(0,260):'';
     fail(Error(timedOut?'Blender exceeded the 26-minute rendering limit. Try lower Cycles samples or image resolution.':
       'Blender '+(signal||'exit '+code)+explanation));
    }
   });
  });
  const raw=JSON.parse(await readFile(join(job.output,'report.json'),'utf8'));
  if(raw.schema!=='blank.anatomy-rebuild-report.v1'||raw.controls_applied!==Object.keys(job.spec.controls).length
       ||!Array.isArray(raw.renders)||raw.renders.length!==6
       ||raw.animation?.bones!==22||raw.animation?.clips?.length!==9
       ||raw.animation?.previews?.length!==9)throw Error('Rigged Blender evidence contract failed');
  for(const name of ['front.png','three_quarter.png','profile.png','face_macro.png','hand_macro.png','feet_macro.png','anatomical_character.blend','animated_character.glb','idle_preview.mp4','walk_preview.mp4','jog_preview.mp4','run_preview.mp4','happy_preview.mp4','sad_preview.mp4','angry_preview.mp4','laugh_preview.mp4','fight_preview.mp4']){
   if((await stat(join(job.output,name))).size<7000)throw Error('Missing output '+name);
  }
  job.report=raw;job.status='complete';job.completedAt=new Date().toISOString();
 }catch(err){job.status='failed';job.error=err.message;job.completedAt=new Date().toISOString()}
 busy=false;const next=queue.shift();if(next)void runOne(next,blenderBin);
}
export function createBuilderServer({blenderBin=process.env.BLENDER_BIN||'blender',workerMode=process.env.WORKER_MODE==='1',workerToken=process.env.BLENDER_WORKER_TOKEN}={}){
 if(workerMode&&(!workerToken||workerToken.length<32))throw Error('Secure BLENDER_WORKER_TOKEN is required for hosted Blender worker');
 return http.createServer(async(req,res)=>{
  try{
   pruneJobs();
   const url=new URL(req.url||'/', 'http://localhost');
   if(req.method==='GET'&&url.pathname==='/healthz')
     return json(res,200,{ok:true,service:workerMode?'blank-blender-worker':'local-anatomy-builder',blenderEnabled:true});
   if(workerMode&&url.pathname.startsWith('/api/')&&
      !bearerAccepted(req,workerToken))return json(res,401,{error:'Worker authorization required'});
   if(req.method==='GET' && url.pathname==='/api/defaults')return json(res,200,defaultRequest());
   if(req.method==='POST'&&url.pathname==='/api/rebuild'){
    const submitted=await limitedJson(req);
    const choice=submitted.selectedAnimation||'walk';
    if(!PREVIEWS.includes(choice))return json(res,400,{error:'Unsupported animation selection'});
    const spec={...validateRequest(submitted),snapshot:validateSnapshot(submitted.snapshot),selectedAnimation:choice};
    if(queue.length>=3)return json(res,429,{error:'Rebuild queue is full'});
    const id=randomUUID();const job={id,status:'queued',submittedAt:new Date().toISOString(),spec,
      output:join(ARTIFACTS,id),createdMs:Date.now(),log:'',report:null,error:null};
    JOBS.set(id,job);
    if(!busy)void runOne(job,blenderBin);else queue.push(job);
    return json(res,202,{jobId:id,status:job.status});
   }
   const jobMatch=url.pathname.match(/^\/api\/jobs\/([0-9a-f-]{36})$/);
   if(req.method==='GET'&&jobMatch){
    const j=JOBS.get(jobMatch[1]);if(!j)return json(res,404,{error:'Unknown job'});
    const availablePreviews=[];
    for(const kind of PREVIEWS){
     const name=kind+'_preview.mp4';
     try{if((await stat(join(j.output,name))).size>=6000)availablePreviews.push(kind)}catch{}
    }
    const frames=j.renderFrames||0;
    const elapsedMs=j.startedAt?Date.now()-Date.parse(j.startedAt):0;
    const etaSeconds=frames>=8&&j.status==='running'
     ?Math.min(29*60,Math.round(elapsedMs/frames*(153-frames)/1000)):null;
    const progress={phase:j.phase||(j.status==='queued'?'Waiting for Blender worker':j.status),
      renderedFrames:frames,totalFrames:153,
      renderedPercent:j.status==='complete'?100:Math.min(99,Math.round(frames/153*100)),
      availablePreviews,elapsedSeconds:Math.round(elapsedMs/1000),
      lastProgressSeconds:Math.round((Date.now()-(j.lastProgressAt||j.createdMs))/1000),
      estimatedRemainingSeconds:etaSeconds};
    return json(res,200,{id:j.id,status:j.status,submittedAt:j.submittedAt,startedAt:j.startedAt,
      completedAt:j.completedAt,error:j.error,progress,log:j.log.slice(-1700),
      report:j.status==='complete'?j.report:null});
   }
   const fileMatch=url.pathname.match(/^\/outputs\/([0-9a-f-]{36})\/([a-z0-9_.]+)$/);
   if(req.method==='GET'&&fileMatch){
    const [,id,name]=fileMatch;const job=JOBS.get(id);
    if(!job||!['complete','running'].includes(job.status)||!RENDER_FILES.has(name))return json(res,404,{error:'Output not available'});
    const bytes=await readFile(join(job.output,name));if(bytes.length<6000)return json(res,404,{error:'Output still rendering'});return respond(res,200,bytes,extname(name));
   }
   const asset={'/':'index.html','/index.html':'index.html','/app.mjs':'app.mjs',
                '/controls.mjs':'controls.mjs','/preview.mjs':'preview.mjs','/style.css':'style.css','/basemesh.json':'basemesh.json','/morph-engine.mjs':'morph-engine.mjs'}[url.pathname];
   if(req.method==='GET'&&asset&&!workerMode)return respond(res,200,await readFile(join(BASE,asset)),extname(asset));
   return json(res,404,{error:'Not found'});
  }catch(err){return json(res,400,{error:err.message})}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||4388);
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local port');
 const server=createBuilderServer();
 const host=process.env.WORKER_MODE==='1'?'0.0.0.0':'127.0.0.1';
 server.listen(port,host,()=>console.log('Blank anatomical Blender '+(process.env.WORKER_MODE==='1'?'worker':'local builder')+' listening on '+host+':'+port));
}
