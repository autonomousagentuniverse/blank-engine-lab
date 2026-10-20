import {chromium} from 'playwright';
import {writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createBuilderServer} from '../character-pipeline/manual-builder/server.mjs';
import {validateRequest} from '../character-pipeline/manual-builder/controls.mjs';
import {validateSnapshot} from '../character-pipeline/manual-builder/snapshot-validation.mjs';
import {resolve,join,extname,sep} from 'node:path';
import {readFileSync,existsSync} from 'node:fs';
const root=resolve('.');
const work=await mkdtemp(join(tmpdir(),'blank-anatomy-real-skin-'));
const server=createBuilderServer({blenderBin:'/usr/bin/blender'});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:850,height:890},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.jsdelivr.net/npm/**',async route=>{
  const url=new URL(route.request().url());
  const m=url.pathname.match(/^\/npm\/(three@0\.186\.1)\/(.+)$/);
  if(!m)return route.abort();
  const path=resolve(root,'node_modules/three',m[2]);
  if(!path.startsWith(resolve(root,'node_modules/three')+sep)||!existsSync(path))return route.abort();
  await route.fulfill({status:200,body:readFileSync(path),headers:{'content-type':'.mjs,.js'.includes(extname(path))?'text/javascript':'application/octet-stream','access-control-allow-origin':'*'}});
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/?qa=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>!!window.__blankQA,null,{timeout:80000});
 const cases=[
  {name:'default-afro',changes:{}},
  {name:'masculine',changes:{'body.gender':'masculine','appearance.population':'european','hair.style':'straight'}},
  {name:'wide-hips',changes:{'body.hips':46,'body.waist':20,'body.shoulders':30,'body.height':172,'body.fat':1}},
  {name:'short',changes:{'body.height':145,'body.gender':'androgynous'}},
  {name:'tall',changes:{'body.height':205,'body.shoulders':52,'body.hips':26}}
 ];
 for(const {name,changes} of cases){
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__blankQA,null,{timeout:80000});
  const got=await page.evaluate(changes=>{
   for(const [k,v] of Object.entries(changes))window.__blankQA.update(k,v);
   return {values:window.__blankQA.values(),snapshot:window.__blankQA.snapshot()};
  },changes);
  const request={...validateRequest({schema:'blank.manual-human-builder.v2',controls:got.values}),snapshot:validateSnapshot(got.snapshot),selectedAnimation:'walk'};
  const inputPath=join(work,name+'.json');
  await writeFile(inputPath,JSON.stringify(request));
  const blender=spawnSync(process.env.BLENDER_BIN||'blender',[
   '-b','--factory-startup','-t','2','--python',
   join(root,'test/anatomy-browser-skin-probe.py'),'--',inputPath],{
   cwd:root,encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024
  });
  if(blender.status!==0)throw Error('Actual Blender morphology '+name+
   ' failed (exit '+blender.status+'):\n'+(blender.stdout||'').slice(-900)+'\n'+(blender.stderr||'').slice(-500));
  const marker=(blender.stdout||'').split('\n').find(line=>line.startsWith('REAL_BROWSER_MORPH_BLENDER_PASS '));
  if(!marker)throw Error('Missing actual Blender skin-strain evidence for '+name);
  const metrics=JSON.parse(marker.slice('REAL_BROWSER_MORPH_BLENDER_PASS '.length));
  console.log('REAL_BROWSER_MORPH_BLENDER_PASS',name,JSON.stringify(metrics.worst_skin_strain));
  console.log('BROWSER_ANATOMY_SNAPSHOT_PASS',name,JSON.stringify({stature:request.snapshot.height_m,hair:request.snapshot.hair_count,gender:request.controls['body.gender'],bytes:JSON.stringify(request).length}));
 }
 if(errors.length)throw Error('Browser page errors: '+JSON.stringify(errors));
}finally{await browser?.close();await new Promise(ok=>server.close(ok));await rm(work,{recursive:true,force:true});}

