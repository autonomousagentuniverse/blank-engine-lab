import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {validateSnapshot} from '../character-pipeline/manual-builder/snapshot-validation.mjs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {CONTROLS,DEFAULTS,SCHEMA,PRESET_ID,PRESET_NAME,PRESET_DESCRIPTION,defaultRequest,validateRequest} from '../character-pipeline/manual-builder/controls.mjs';
import {createBuilderServer} from '../character-pipeline/manual-builder/server.mjs';
const base=dirname(fileURLToPath(import.meta.url));
const SOURCE='makehumancommunity/mpfb2:3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf';
const baseMesh=JSON.parse(readFileSync(join(base,'../character-pipeline/manual-builder/basemesh.json'),'utf8'));
function canonicalFixture(){
 const height=1.72;
 return {schema:'blank.anatomy.snapshot.v1',source:SOURCE,geometry_space:'Y_UP_METERS',
  precision_m:.000001,vertex_count:13524,height_m:height,
  position_xyz:baseMesh.position_xyz.map((n,i)=>+(i%3===1?(n+8.1676)*height/16.6589:n*height/16.6589).toFixed(6)),
  body_indices:baseMesh.body_indices,eye_left_indices:baseMesh.eye_left_indices,
  eye_right_indices:baseMesh.eye_right_indices,
  hair_count:0,hair_matrices:[],
  hair_template:{position_xyz:Array(540).fill(0),indices:Array.from({length:306},(_,i)=>i%180)},
  eye_ornaments:{
    irises:[{position_xyz:[-.03,1.5,.14],scale_xyz:[.006,.006,.0013]},{position_xyz:[.03,1.5,.14],scale_xyz:[.006,.006,.0013]}],
    pupils:[{position_xyz:[-.03,1.5,.141],scale_xyz:[.003,.003,.0011]},{position_xyz:[.03,1.5,.141],scale_xyz:[.003,.003,.0011]}]
  },
  resolved_materials:{skin_color:'#482a20',skin_roughness:.56,
   sclera_color:'#dfd7cb',iris_color:'#281910',
   hair_color:'#171210',world_color:'#474951'}
 }
}


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
   headers:{'Content-Type':'application/json'},body:JSON.stringify({...defaults,snapshot:canonicalFixture()})});
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


test('live preview reads connected CC0 anatomy rather than a synthetic procedural mannequin', async()=>{
 const {readFileSync}=await import('node:fs');
 const here=new URL('../character-pipeline/manual-builder/',import.meta.url);
 const source=readFileSync(new URL('preview.mjs',here),'utf8');
 const app=readFileSync(new URL('app.mjs',here),'utf8');
 const html=readFileSync(new URL('index.html',here),'utf8');
 const game=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const asset=JSON.parse(readFileSync(new URL('basemesh.json',here),'utf8'));
 assert.match(source,/export async function mountClayPreview/);
 assert.match(source,/fetch\(new URL\('\.\/basemesh\.json',import\.meta\.url\)\)/);
 assert.match(source,/geometry\.computeVertexNormals/);
 assert.doesNotMatch(source,/function torso\(|function surfaceHorizontal\(/);
 assert.equal(asset.source_license,'CC0');
 assert.equal(asset.body_indices.length/3,26756);
 assert.match(app,/queuePreview\(\)/);
 assert.match(app,/previewUpdater\(values\)/);
 assert.match(app,/const API_REBUILD=HOSTED\?'\/api\/anatomy'/);
 assert.match(app,/response=await fetch\(API_REBUILD/);
 assert.doesNotMatch(app,/if\(HOSTED\)\{\s*exportSpecification\(payload/);
 assert.match(html,/id="clayViewport"/);
 assert.doesNotMatch(html,/id="empty"/);
 assert.match(game,/Human Anatomy Builder/);
});


test('Original target human preset loads as actual validated 93-control defaults',async()=>{
 assert.equal(CONTROLS.length,93);
 assert.match(PRESET_ID,/original-figure/);
 assert.match(PRESET_NAME,/Afro/);
 assert.match(PRESET_DESCRIPTION,/head mesh is not loaded/);
 const c=validateRequest(defaultRequest()).controls;
 assert.equal(c['body.gender'],'feminine');
 assert.equal(c['appearance.population'],'african');
 assert.equal(c['body.height'],172);
 assert.equal(c['body.shoulders'],40);
 assert.equal(c['body.waist'],27.5);
 assert.equal(c['body.hips'],34);
 assert.equal(c['legs.thigh'],16.6);
 assert.ok(c['body.hips']<c['body.shoulders']);
 assert.ok(c['body.hips']/c['body.waist']<1.3);
 assert.equal(c['hair.style'],'afro');
 assert.equal(c['hair.curl'],0.84);
 assert.equal(c['skin.color'],'#482a20');
 assert.equal(c['render.clay'],'false');
 assert.equal(c['face.cheeks'],.61);
 const source=await readFile(join(base,'../character-pipeline/manual-builder/app.mjs'),'utf8');
 const html=await readFile(join(base,'../character-pipeline/manual-builder/index.html'),'utf8');
 assert.match(source,/blank-human-builder:v3:/);
 assert.match(source,/PRESET_ID/);
 assert.match(source,/values=\{\.\.\.DEFAULTS\};sync\(\)/);
 assert.match(html,/id="presetName"/);
 assert.match(html,/id="presetDescription"/);
 assert.match(html,/Restore figure/);
});

test('Replica requires authentic immutable topology and has complete gender-independent Blender pipeline',async()=>{
 const snapshot=canonicalFixture();
 assert.equal(validateSnapshot(snapshot).vertex_count,13524);
 assert.throws(()=>validateSnapshot({...snapshot,body_indices:[...snapshot.body_indices].reverse()}),/topology/);
 assert.throws(()=>validateSnapshot({...snapshot,height_m:1.99}),/stature/);
 assert.throws(()=>validateSnapshot({...snapshot,position_xyz:[Infinity,...snapshot.position_xyz.slice(1)]}),/Non-finite/);
 const script=await readFile(join(base,'../character-pipeline/manual-builder/build_replica.py'),'utf8');
 assert.match(script,/CANONICAL-CC0-MakeHuman-Body/);
 assert.match(script,/max_blender_vertex_deviation_m/);
 assert.match(script,/scene\['control_specification'\]/);
 assert.doesNotMatch(script,/gender != \"feminine\"|population != \"african\"/);
 const server=await readFile(join(base,'../character-pipeline/manual-builder/server.mjs'),'utf8');
 assert.match(server,/validateSnapshot\(submitted.snapshot\)/);
 assert.match(server,/build_replica.py/);
});


test('Measured eye geometry, six view renderer and shared curved follicle template remain connected',async()=>{
 const preview=await readFile(join(base,'../character-pipeline/manual-builder/preview.mjs'),'utf8');
 const blender=await readFile(join(base,'../character-pipeline/manual-builder/build_replica.py'),'utf8');
 const server=await readFile(join(base,'../character-pipeline/manual-builder/server.mjs'),'utf8');
 const html=await readFile(join(base,'../character-pipeline/manual-builder/index.html'),'utf8');
 assert.match(preview,/requestedEyeDiameter=CM/);
 assert.match(preview,/eye_ornaments:/);
 assert.match(preview,/hair_template:/);
 assert.match(preview,/hairTemplate\(3\.25\)/);
 assert.match(blender,/snapshot\.get\('hair_template'\)/);
 assert.match(blender,/snap\.get\('eye_ornaments'/);
 assert.match(blender,/mesh_topology_metrics/);
 assert.match(blender,/eye_diameter_metrics/);
 for(const view of ['face_macro','hand_macro','feet_macro']){
   assert.match(blender,new RegExp(view));
   assert.match(html,new RegExp('id="'+view+'"'));
   assert.match(server,new RegExp(view+'.png'));
 }
 assert.match(server,/raw\.renders\.length!==6/);
});


test('Hosted build cannot falsely export JSON and worker requires token before costly execution',async()=>{
 const {createBuilderServer}=await import('../character-pipeline/manual-builder/server.mjs');
 assert.throws(()=>createBuilderServer({workerMode:true,workerToken:'short'}),/BLENDER_WORKER_TOKEN/);
 const secret='secure-token-'+('a'.repeat(60));
 const server=createBuilderServer({workerMode:true,workerToken:secret,blenderBin:'definitely-no-blender'});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url='http://127.0.0.1:'+server.address().port;
 try{
  const health=await fetch(url+'/healthz');assert.equal(health.status,200);
  const anon=await fetch(url+'/api/rebuild',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(defaultRequest())});
  assert.equal(anon.status,401);
  const status=await fetch(url+'/api/jobs/11111111-1111-1111-1111-111111111111');assert.equal(status.status,401);
  const authorized=await fetch(url+'/api/rebuild',{method:'POST',headers:{authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify({...defaultRequest(),snapshot:canonicalFixture()})});
  assert.equal(authorized.status,202);
 }finally{await new Promise(ok=>server.close(ok))}
 const endpoint=await readFile(join(base,'../api/anatomy.js'),'utf8');
 assert.match(endpoint,/Sandbox\.fork\(/);
 assert.match(endpoint,/Sandbox\.get\(/);
 assert.match(endpoint,/blank-anatomy-blender-base/);
 assert.match(endpoint,/randomBytes\(32\)/);
 assert.match(endpoint,/tokenFromSandbox/);
 assert.match(endpoint,/outputBaseUrl:domain/);
 assert.match(endpoint,/maxDuration:60/);
 assert.doesNotMatch(endpoint,/BLENDER_WORKER_URL|ANATOMY_JOB_SECRET/);
 const manifest=JSON.parse(await readFile(join(base,'../package.json'),'utf8'));
 assert.ok(manifest.dependencies['@vercel/sandbox']);
 const app=await readFile(join(base,'../character-pipeline/manual-builder/app.mjs'),'utf8');
 assert.match(app,/job\.workerJobId\|\|job\.id/);
});


test('Mobile Blender evidence renders real line breaks and follows anatomy-framed detail cameras',async()=>{
 const app=await readFile(join(base,'../character-pipeline/manual-builder/app.mjs'),'utf8');
 const blender=await readFile(join(base,'../character-pipeline/manual-builder/build_replica.py'),'utf8');
 const preview=await readFile(join(base,'../character-pipeline/manual-builder/preview.mjs'),'utf8');
 assert.ok(app.includes("].join('\\n');"),'Evidence should use actual JS newline escape');
 assert.ok(!app.includes("].join('\\\\n');"),'Literal slash+n would display on mobile');
 assert.match(app,/full provenance in report.json/);
 assert.match(blender,/def anatomical_detail_targets\(vertices,height\):/);
 assert.match(blender,/hand_target,foot_target=anatomical_detail_targets\(vertices,height\)/);
 assert.match(blender,/foot_look=\(foot_target\[0\],foot_target\[1\]/);
 assert.match(preview,/const y=coiled\?\(\.09\*t\+\.72\*arc\):t/);
 assert.match(preview,/positions.push\(x\+radius\*Math.cos\(a\),y,z/);
});


test('Animation outputs include editable rig, native GLB skin and actual H264 video clips',async()=>{
 const rig=await readFile(join(base,'../character-pipeline/manual-builder/animation_rig.py'),'utf8');
 const blender=await readFile(join(base,'../character-pipeline/manual-builder/build_replica.py'),'utf8');
 const server=await readFile(join(base,'../character-pipeline/manual-builder/server.mjs'),'utf8');
 const html=await readFile(join(base,'../character-pipeline/manual-builder/index.html'),'utf8');
 const app=await readFile(join(base,'../character-pipeline/manual-builder/app.mjs'),'utf8');
 assert.match(rig,/BONES=\('Root','Pelvis'/);
 assert.match(rig,/Idle_Breath/);
 assert.match(rig,/Walk_InPlace/);
 assert.match(rig,/export_animation_mode='NLA_TRACKS'/);
 assert.match(rig,/ffmpeg/);
 assert.match(rig,/assign_weights/);
 assert.match(blender,/animation_videos=render_animation_previews/);
 assert.match(blender,/rig=make_armature\(height\)/);
 assert.match(blender,/bone_counts=assign_weights/);
 assert.match(server,/animated_character.glb/);
 assert.match(server,/walk_preview.mp4/);
 assert.match(server,/idle_preview.mp4/);
 assert.match(server,/raw.animation\?\.bones!==22/);
 assert.match(server,/\[a-z0-9_.\]/);
 assert.match(html,/id="activeAnimationVideo"/);
 assert.match(html,/data-action="walk"/);
 assert.match(app,/video\.src=prefix/);
 assert.match(app,/animated_character.glb/);
});


test('Nine persistent Animation Studio controls map to real rig/NLA and face shape key clips',async()=>{
 const html=await readFile(join(base,'../character-pipeline/manual-builder/index.html'),'utf8');
 const app=await readFile(join(base,'../character-pipeline/manual-builder/app.mjs'),'utf8');
 const rig=await readFile(join(base,'../character-pipeline/manual-builder/animation_rig.py'),'utf8');
 const blender=await readFile(join(base,'../character-pipeline/manual-builder/build_replica.py'),'utf8');
 const server=await readFile(join(base,'../character-pipeline/manual-builder/server.mjs'),'utf8');
 for(const action of ['idle','walk','jog','run','happy','sad','angry','laugh','fight']){
  assert.match(html,new RegExp('data-action="'+action+'"'));
  assert.match(app,new RegExp(action+":'"));
  assert.match(server,new RegExp(action+'_preview.mp4'));
 }
 for(const clip of ['Jog_InPlace','Run_InPlace','Happy_Face','Sad_Face','Angry_Face','Laugh','Fight_Combo']){
  assert.match(rig,new RegExp(clip));
 }
 assert.match(html,/id="animationStudio"/);
 assert.match(html,/aria-label="Facial expression choices"/);
 assert.match(app,/showAnimationChoice/);
 assert.match(app,/renderedJob/);
 assert.match(server,/raw\.animation\?\.clips\?\.length!==9/);
 assert.match(server,/raw\.animation\?\.previews\?\.length!==9/);
 assert.match(rig,/shape_key_add/);
 assert.match(rig,/face_key_track/);
 assert.match(blender,/make_face_shape_keys\(human,height\)/);
});
