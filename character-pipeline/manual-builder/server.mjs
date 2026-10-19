import http from 'node:http';
import {readFile, mkdir, writeFile, stat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {dirname, resolve, join, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defaultRequest,validateRequest} from './controls.mjs';
import {validateSnapshot} from './snapshot-validation.mjs';

const BASE=dirname(fileURLToPath(import.meta.url));
const ARTIFACTS=resolve(BASE,'../../artifacts/manual-human-builder');
const RENDER_FILES=new Set(['front.png','three_quarter.png','profile.png','report.json','anatomical_character.blend']);
const TYPES={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json','.blend':'application/octet-stream'};
const JOBS=new Map();
let busy=false;
const queue=[];
const json=(res,status,body)=>respond(res,status,JSON.stringify(body),'.json');
function respond(res,status,body,extension){
 res.writeHead(status,{'Content-Type':TYPES[extension]||'application/octet-stream',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
  'Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
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
 try{
  await mkdir(job.output,{recursive:true});
  const settings=join(job.output,'settings.json');
  await writeFile(settings,JSON.stringify(job.spec,null,2)+'\n',{flag:'wx'});
  const args=['--background','--factory-startup','--python',join(BASE,'build_replica.py'),'--',settings,job.output];
  await new Promise((ok,fail)=>{
   const child=spawn(blenderBin,args,{cwd:BASE,stdio:['ignore','pipe','pipe'],env:{...process.env,PYTHONUNBUFFERED:'1'}});
   let done=false;
   const append=data=>{job.log=(job.log+data.toString()).slice(-12000)};
   child.stdout.on('data',append);child.stderr.on('data',append);
   const timeout=setTimeout(()=>{child.kill('SIGKILL')},15*60*1000);
   child.on('error',err=>{if(!done){done=true;clearTimeout(timeout);fail(err)}});
   child.on('close',(code,signal)=>{
    if(done)return;done=true;clearTimeout(timeout);
    if(code===0)ok();else fail(Error('Blender '+(signal||'exit '+code)));
   });
  });
  const raw=JSON.parse(await readFile(join(job.output,'report.json'),'utf8'));
  if(raw.schema!=='blank.anatomy-rebuild-report.v1'||raw.controls_applied!==Object.keys(job.spec.controls).length
       ||!Array.isArray(raw.renders)||raw.renders.length!==3)throw Error('Blender evidence contract failed');
  for(const name of ['front.png','three_quarter.png','profile.png','anatomical_character.blend']){
   if((await stat(join(job.output,name))).size<7000)throw Error('Missing output '+name);
  }
  job.report=raw;job.status='complete';job.completedAt=new Date().toISOString();
 }catch(err){job.status='failed';job.error=err.message;job.completedAt=new Date().toISOString()}
 busy=false;const next=queue.shift();if(next)void runOne(next,blenderBin);
}
export function createBuilderServer({blenderBin=process.env.BLENDER_BIN||'blender'}={}){
 return http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url||'/', 'http://localhost');
   if(req.method==='GET' && url.pathname==='/api/defaults')return json(res,200,defaultRequest());
   if(req.method==='POST'&&url.pathname==='/api/rebuild'){
    const submitted=await limitedJson(req);
    const spec={...validateRequest(submitted),snapshot:validateSnapshot(submitted.snapshot)};
    if(queue.length>=3)return json(res,429,{error:'Rebuild queue is full'});
    const id=randomUUID();const job={id,status:'queued',submittedAt:new Date().toISOString(),spec,
      output:join(ARTIFACTS,id),log:'',report:null,error:null};
    JOBS.set(id,job);
    if(!busy)void runOne(job,blenderBin);else queue.push(job);
    return json(res,202,{jobId:id,status:job.status});
   }
   const jobMatch=url.pathname.match(/^\/api\/jobs\/([0-9a-f-]{36})$/);
   if(req.method==='GET'&&jobMatch){
    const j=JOBS.get(jobMatch[1]);if(!j)return json(res,404,{error:'Unknown job'});
    return json(res,200,{id:j.id,status:j.status,submittedAt:j.submittedAt,startedAt:j.startedAt,
      completedAt:j.completedAt,error:j.error,log:j.log.slice(-1700),
      report:j.status==='complete'?j.report:null});
   }
   const fileMatch=url.pathname.match(/^\/outputs\/([0-9a-f-]{36})\/([a-z_.]+)$/);
   if(req.method==='GET'&&fileMatch){
    const [,id,name]=fileMatch;const job=JOBS.get(id);
    if(!job||job.status!=='complete'||!RENDER_FILES.has(name))return json(res,404,{error:'Output not available'});
    const bytes=await readFile(join(job.output,name));return respond(res,200,bytes,extname(name));
   }
   const asset={'/':'index.html','/index.html':'index.html','/app.mjs':'app.mjs',
                '/controls.mjs':'controls.mjs','/preview.mjs':'preview.mjs','/style.css':'style.css','/basemesh.json':'basemesh.json','/morph-engine.mjs':'morph-engine.mjs'}[url.pathname];
   if(req.method==='GET'&&asset)return respond(res,200,await readFile(join(BASE,asset)),extname(asset));
   return json(res,404,{error:'Not found'});
  }catch(err){return json(res,400,{error:err.message})}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||4388);
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local port');
 const server=createBuilderServer();
 server.listen(port,'127.0.0.1',()=>console.log('Blank manual human builder: http://127.0.0.1:'+port));
}
