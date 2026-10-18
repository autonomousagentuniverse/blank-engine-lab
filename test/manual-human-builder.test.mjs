import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {CONTROLS,DEFAULTS,SCHEMA,defaultRequest,validateRequest} from '../character-pipeline/manual-builder/controls.mjs';
import {createBuilderServer} from '../character-pipeline/manual-builder/server.mjs';
const base=dirname(fileURLToPath(import.meta.url));

test('Every head-to-toe control is unique, bounded and given a valid starting value',()=>{
 assert.ok(CONTROLS.length>=80);
 assert.equal(new Set(CONTROLS.map(c=>c.id)).size,CONTROLS.length);
 assert.ok(new Set(CONTROLS.map(c=>c.section)).size>=8);
 assert.equal(Object.keys(validateRequest(defaultRequest()).controls).length,CONTROLS.length);
 for(const c of CONTROLS)if(c.type==='n'){
  assert.ok(Number.isFinite(c.default)&&c.default>=c.min&&c.default<=c.max);
  assert.ok(c.max>c.min&&c.step>0);
 }
});

test('Changed hips, feet/toes, hair color, skin color and face remain independent user inputs',()=>{
 const req=defaultRequest();
 Object.assign(req.controls,{'body.hips':31,'body.waist':27,
  'feet.toe_length':6,'hands.fingers':9,'hair.style':'locs',
  'hair.color':'#231d19','skin.color':'#5e372c','face.jaw':12});
 const check=validateRequest(req).controls;
 assert.equal(check['body.hips'],31);
 assert.equal(check['feet.toe_length'],6);
 assert.equal(check['face.jaw'],12);
 assert.equal(check['skin.color'],'#5e372c');
 assert.equal(DEFAULTS['body.hips'],34);
 assert.equal(DEFAULTS['feet.toe_length'],4.5);
});

test('Malformed control sets, non-finite numbers, unknown IDs and unimplemented style are rejected',()=>{
 for(const bad of [
  {schema:'incorrect',controls:{...DEFAULTS}},
  {schema:SCHEMA,controls:{...DEFAULTS,'body.hips':-900}},
  {schema:SCHEMA,controls:{...DEFAULTS,'body.hips':Infinity}},
  {schema:SCHEMA,controls:{...DEFAULTS,'skin.color':'javascript:alert(1)'}},
  {schema:SCHEMA,controls:{...DEFAULTS,'hair.style':'invented'}},
  {schema:SCHEMA,controls:{...DEFAULTS,unknown_control:1}},
  {schema:SCHEMA,controls:{"body.height":172}},
 ])assert.throws(()=>validateRequest(bad));
});

test('Every user-facing parameter is referenced by the actual fresh Blender geometry generator',async()=>{
 const source=await readFile(join(base,'../character-pipeline/manual-builder/build_human.py'),'utf8');
 for(const c of CONTROLS){
  assert.ok(source.includes('p("'+c.id+'")'),'Not consumed by Blender: '+c.id);
 }
 assert.match(source,/bpy\.ops\.object\.voxel_remesh/);
 assert.match(source,/source_character_reused":False/);
 assert.doesNotMatch(source,/open_mainfile|import_scene\.gltf|source\/afro_mask_respected/i);
});

test('Local-only HTTP app accepts a complete rebuild spec and fails visibly if Blender executable fails',async()=>{
 const server=createBuilderServer({blenderBin:'/bin/false'});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 try{
  const port=server.address().port;
  const url='http://127.0.0.1:'+port;
  const defaults=await (await fetch(url+'/api/defaults')).json();
  assert.deepEqual(defaults,defaultRequest());
  const wrong=await fetch(url+'/api/rebuild',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify({schema:SCHEMA,controls:{'body.hips':40}})});
  assert.equal(wrong.status,400);
  const start=await fetch(url+'/api/rebuild',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify(defaults)});
  assert.equal(start.status,202);
  const job=await start.json();assert.match(job.jobId,/^[0-9a-f-]{36}$/);
  let result;
  for(let i=0;i<80;i++){
   result=await (await fetch(url+'/api/jobs/'+job.jobId)).json();
   if(result.status==='failed'||result.status==='complete')break;
   await new Promise(ok=>setTimeout(ok,50));
  }
  assert.equal(result.status,'failed');
  assert.match(result.error,/Blender/);
  const missing=await fetch(url+'/outputs/'+job.jobId+'/front.png');
  assert.equal(missing.status,404);
  const escaped=await fetch(url+'/outputs/'+job.jobId+'/..%2Fsettings.json');
  assert.equal(escaped.status,404);
 }finally{await new Promise(ok=>server.close(ok))}
});
