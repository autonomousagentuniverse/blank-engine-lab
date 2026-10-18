/** Standalone controlled browser test of all eleven shape keys and body/neck rig.
 *
 * Uses verified MASK-respected GLB, no content editing or production deployment.
 * Each morph is compared at its strongest actually exported vertex, not by
 * screenshots alone. "Complete" means exercised, not naturally expressive.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'artifacts/afro-morph-body');
await mkdir(out,{recursive:true});
const mimetypes={'.js':'text/javascript','.mjs':'text/javascript','.glb':'model/gltf-binary'};
const html=[
'<!doctype html><html><head><meta charset="utf-8"><title>BLANK MASKED MORPH TEST</title>',
'<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>',
'<style>body{margin:0;background:#22272e;color:white;font:13px system-ui}canvas{display:block}#caption{position:absolute;top:8px;left:8px;background:#0008;padding:5px;}</style>',
'</head><body><div id="caption">Research-only: geometry &amp; morph verification; photo realism not approved</div>',
'<script type="module">',
'import * as THREE from "three";import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";',
'try {',
' const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(800,950);renderer.outputColorSpace=THREE.SRGBColorSpace;',
' document.body.appendChild(renderer.domElement);',
' const scene=new THREE.Scene();scene.background=new THREE.Color(0x35383d);',
' scene.add(new THREE.HemisphereLight(0xffffff,0x888888,2.2));',
' const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(-2,4,3);scene.add(sun);',
' const gltf=await new GLTFLoader().loadAsync("/artifacts/afro-morph-body/input.glb");',
' const model=gltf.scene;scene.add(model);model.updateMatrixWorld(true);',
' const skin=[];model.traverse(o=>{if(o.isSkinnedMesh)skin.push(o);});',
' const body=skin.filter(o=>o.morphTargetInfluences?.length===11);',
' const skeletons=skin.flatMap(o=>o.skeleton?.bones||[]);',
' const byName=n=>skeletons.find(o=>o.name===n)||null;',
' const box=new THREE.Box3().setFromObject(model),sz=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());',
' const camera=new THREE.PerspectiveCamera(34,800/950,.01,100);',
' camera.position.set(center.x,center.y+.07,center.z+Math.max(2.7,sz.y*1.55));camera.lookAt(center.x,box.max.y-sz.y*.22,center.z);',
' renderer.render(scene,camera);',
' window.PROBE={THREE,renderer,scene,camera,model,skin,body,byName};',
' window.PROBE_READY={error:null,gl_version:renderer.capabilities.isWebGL2?2:1,all_skins:skin.length,body_parts:body.length,',
'  body_names:body.map(o=>o.name),morph_count:body[0]?.morphTargetInfluences?.length||0,',
'  target_names:Object.keys(body[0]?.morphTargetDictionary||{}),has_head:!!byName("head"),',
'  torso_bones:["spine_01","spine_02","spine_03"].filter(n=>!!byName(n))};',
'}catch(e){window.PROBE_READY={error:String(e.stack||e)}}',
'</script></body></html>'
].join('\n');
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(pathname==='/'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}
  const p=resolve(root,'.'+decodeURIComponent(pathname));
  if(!p.startsWith(resolve(root)+sep))throw Error('Traversal');
  const b=await readFile(p);res.writeHead(200,{'content-type':mimetypes[extname(p)]||'application/octet-stream'});res.end(b);
 }catch(err){res.writeHead(404);res.end('Not found')}
});
let browser;
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:800,height:975},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.PROBE_READY,{timeout:150000});
 const init=await page.evaluate(()=>window.PROBE_READY);
 console.log('MORPH_MODEL_LOADED',JSON.stringify(init));
 assert.equal(init.error,null);
 assert.equal(init.gl_version,2);
 assert.equal(init.morph_count,11);
 assert.ok(init.body_parts>=1&&init.has_head&&init.torso_bones.length>0);
 assert.deepEqual(errors,[]);
 await page.locator('canvas').screenshot({path:join(out,'neutral.png')});
 // Find the maximum nonzero morph offset for each target across original
 // geometry data. Then measure actual skinned, morphed vertex movement in
 // world space; restore weights after each test to avoid cumulating changes.
 const morphs=await page.evaluate(()=>{
  const s=window.PROBE;
  window.MORPH_DEFAULTS=s.body.map(o=>Array.from(o.morphTargetInfluences));
  const ans=[];
  const p=new s.THREE.Vector3(),before=new s.THREE.Vector3(),after=new s.THREE.Vector3();
  for(let t=0;t<11;t++){
   let best=null;
   for(const o of s.body){
    const a=o.geometry.morphAttributes.position?.[t];
    if(!a)continue;
    // full iteration for each target, so no bias toward arbitrary vertices.
    for(let i=0;i<a.count;i++){
      const x=a.getX(i),y=a.getY(i),z=a.getZ(i);
      const mag=x*x+y*y+z*z;
      if(!best||mag>best.mag)best={o,i,mag};
    }
   }
   if(!best||best.mag<=0){ans.push({index:t,has_data:false,pass:false});continue;}
   const o=best.o;
   const original=o.morphTargetInfluences[t];
   const next=original<.5?1:0;
   const motion=()=>{
    o.getVertexPosition(best.i,p);
    return o.localToWorld(p.clone());
   };
   before.copy(motion());
   // All exported primitives from this one source Blender object have the
   // same shape weight. Apply simultaneously for physical consistency.
   const olds=s.body.map(b=>b.morphTargetInfluences[t]);
   for(const part of s.body)part.morphTargetInfluences[t]=next;
   s.model.updateMatrixWorld(true);
   after.copy(motion());
   const displacement=before.distanceTo(after);
   s.body.forEach((b,i)=>b.morphTargetInfluences[t]=olds[i]);
   const dict=Object.entries(o.morphTargetDictionary||{}).find(([name,index])=>index===t);
   ans.push({index:t,name:dict?.[0]||'unnamed_'+t,source_delta_max_m:Math.sqrt(best.mag),
     baseline_weight:original,probe_weight:next,world_displacement_m:displacement,
     moved_in_webgl:displacement>1e-6});
  }
  s.renderer.render(s.scene,s.camera);
  return ans;
 });
 console.log('REAL_CHROME_ELEVEN_MORPH_TEST',JSON.stringify(morphs));
 assert.equal(morphs.length,11);
 const failures=morphs.filter(x=>!x.moved_in_webgl);
 // Do not fake all-pass if any target has zero visible influence.
 // Capture a controlled morphed state for inspection using strongest sampled
 // non-clothing morph, chosen by actual measured nonzero displacement.
 const candidates=morphs.filter(x=>x.moved_in_webgl);
 if(candidates.length){
  const chosen=candidates.reduce((x,y)=>x.world_displacement_m>y.world_displacement_m?x:y);
  await page.evaluate(index=>{
   const s=window.PROBE;
   for(const o of s.body)o.morphTargetInfluences[index]=o.morphTargetInfluences[index]<.5?1:0;
   s.renderer.render(s.scene,s.camera);
  },chosen.index);
  await page.locator('canvas').screenshot({path:join(out,'morph-extreme.png')});
  await page.evaluate(()=>{
   const s=window.PROBE;
   s.body.forEach((part,i)=>part.morphTargetInfluences.set(window.MORPH_DEFAULTS[i]));
   s.renderer.render(s.scene,s.camera);
  });
 }
 // Bone deformation: pick high-weight vertex of original skin mesh, find
 // specific body joint bone, rotate and read the actual skinned vertex.
 const bodyTests=await page.evaluate(()=>{
  const s=window.PROBE,positions=[];
  const tests=[['head',.24],['spine_02',.20],['spine_01',.15]].filter(([name])=>!!s.byName(name));
  for(const [name,angle] of tests){
   let best=null;
   for(const mesh of s.body){
    const bone=mesh.skeleton.bones.findIndex(b=>b.name===name);
    if(bone<0)continue;
    const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
    for(let i=0;i<indices.count;i++){
     let w=0;
     for(let k=0;k<4;k++)if(indices.getComponent(i,k)===bone)w+=weights.getComponent(i,k);
     if(w>(best?.weight||0))best={mesh,i,weight:w};
    }
   }
   if(!best){positions.push({name,error:'NO_BONE_INFLUENCE',pass:false});continue;}
   const bone=s.byName(name);
   const get=()=>{
    const v=new s.THREE.Vector3();
    best.mesh.getVertexPosition(best.i,v);
    return best.mesh.localToWorld(v);
   };
   const prior=bone.rotation.y;
   const before=get();
   bone.rotation.y=prior+angle;bone.updateMatrixWorld(true);s.model.updateMatrixWorld(true);
   const after=get(),gap=before.distanceTo(after);
   bone.rotation.y=prior;bone.updateMatrixWorld(true);s.model.updateMatrixWorld(true);
   positions.push({name,rad:angle,source_skin_weight:best.weight,displacement_m:gap,pass:gap>.0005});
  }
  s.renderer.render(s.scene,s.camera);
  return positions;
 });
 console.log('REAL_CHROME_BODY_SKINNING_TEST',JSON.stringify(bodyTests));
 assert.ok(bodyTests.length>=2);
 assert.ok(bodyTests.every(x=>x.pass));
 assert.equal(errors.length,0);
 // Final pose: rotate head only, retain calibrated neutral morph weights
 await page.evaluate(()=>{
  const s=window.PROBE;const h=s.byName('head');
  h.rotation.y+=.3;h.updateMatrixWorld(true);s.model.updateMatrixWorld(true);
  s.renderer.render(s.scene,s.camera);
 });
 await page.locator('canvas').screenshot({path:join(out,'head-rotation.png')});
 const record={schema:'blank.engine.chrome.morph-body-v1',source:'SHA-pinned MASK-corrected GLB',
   model:init,morphs,body_skinning:bodyTests,all_11_morphs_react:failures.length===0,
   source_name_experimental:true,actual_chrome_webgl:true,
   skinning_technical_pass:true,matched_blender_camera:false,
   photorealism_approved:false,release_allowed:false,failures};
 await writeFile(join(out,'morph-body-report.json'),JSON.stringify(record,null,2)+'\n');
 assert.equal(failures.length,0,'One or more morph targets have no measurable visible geometry change');
 console.log('BLANK_REAL_CHROME_ALL_11_MORPH_AND_BODY_TESTS_PASS');
}catch(e){console.error('BLANK_MORPH_BODY_TEST_FAILED',e.stack||e);process.exitCode=1}
finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
