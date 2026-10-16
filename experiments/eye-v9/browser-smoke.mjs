/* Run v8 surface attribution against source-pinned experimental v7 in Chromium. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../../',import.meta.url));
const folder=join(root,'artifacts','eye-v9');
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.glb':'model/gltf-binary','.json':'application/json'};
const server=createServer(async(req,res)=>{try{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const target=resolve(root,'.'+(route.endsWith('/')?route+'index.html':route));
 if(!target.startsWith(resolve(root)+sep))throw Error('Forbidden');
 const buf=await readFile(target);res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream'});res.end(buf);
}catch{res.writeHead(404);res.end('Not found');}});
let browser;
try{
 await mkdir(folder,{recursive:true});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1000,height:850}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',msg=>{if(msg.type()==='error')console.error('BROWSER_CONSOLE_ERROR',msg.text().slice(0,800));});
 page.on('requestfailed',req=>console.error('BROWSER_REQUEST_FAILED',req.url().slice(0,240),req.failure()?.errorText));
 await page.route('https://cdn.jsdelivr.net/npm/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const m=path.match(/^\/npm\/three@0\.186\.1\/(.+)$/);
  if(!m||m[1].includes('..'))return route.abort('failed');
  try{await route.fulfill({status:200,body:await readFile(join(root,'node_modules','three',m[1])),headers:{'content-type':'text/javascript','access-control-allow-origin':'*'}});}
  catch{return route.abort('failed');}
 });
 const url='http://127.0.0.1:'+server.address().port+'/experiments/eye-v9/';
 const p=await page.goto(url,{waitUntil:'domcontentloaded'});
 assert.equal(p.status(),200);
 try{await page.waitForFunction(()=>typeof window.eyeV8?.init==='function',null,{timeout:15000});}
 catch(e){throw new Error('Diagnostic JS failed to register: '+JSON.stringify(errors)+'; '+e.message)}
 const metadata=await page.evaluate(()=>window.eyeV8.init('/.ci-assets/hero-eye-v7-facing.glb'));
 assert.equal(metadata.faceTriangles,15948);
 assert.equal(metadata.joints,53);
 console.log('EYE_V9_SOURCE',JSON.stringify(metadata));
 const views=['front_macro','front_detail','profile','three_quarter'];
 for(const view of views){
  for(const pass of ['normal','id','uv','no-precise-contour','no-upper-seeds','no-skin-texture','unlit-skin-atlas','normals-only']){
   await page.evaluate(x=>window.eyeV8.render(x.view,x.pass),{view,pass});
   if(true)
    await page.locator('canvas').screenshot({path:join(folder,view+'-'+pass+'.png')});
  }
  console.log('EYE_V9_CAPTURED '+view);
 }
 const report=await page.evaluate(()=>window.eyeV8.reportV9());
 assert.equal(report.measurements.length,8);
 assert.equal(report.contour_loop_descriptors.length,4);
 assert.equal(report.exact_contour_adjacent_triangles,224);
 assert.ok(report.visible_upper_seed_neighborhood_triangles>=8);
 assert.ok(report.visible_upper_seed_neighborhood_triangles<=120);
 for(const entry of report.measurements){
  assert.ok(entry.pixels>500,'Insufficient eye ROI pixels: '+entry.view+'/'+entry.eye);
  assert.ok(entry.valid_id_coverage>.55,'ID pass unreliable: '+entry.view+'/'+entry.eye+' '+entry.valid_id_coverage);
  console.log('EYE_V9_EXACT_ATTRIBUTION',JSON.stringify({view:entry.view,eye:entry.eye,
   roi:entry.roi,pixels:entry.pixels,pinkish:entry.pinkish_heuristic,
   owners:entry.visible_sources,pinkOwners:entry.pinkish_owner,
   changed:entry.changed_pixels}));
 }
 console.log('EYE_V9_ATLAS_SAMPLES',JSON.stringify(report.source_atlas));

 assert.deepEqual(errors,[]);
 await writeFile(join(folder,'attribution.json'),JSON.stringify(report,null,2)+'\n');

 const v10=await page.evaluate(()=>window.eyeV8.applyV10());console.log('EYE_V10_PATCH',JSON.stringify(v10));
 assert.equal(v10.geometryChanged,false);assert.ok(v10.replacedAtlasTexels>=50);
 for(const view of views){
  await page.evaluate(v=>window.eyeV8.render(v,'v10-patch'),view);
  await page.locator('canvas').screenshot({path:join(folder,view+'-v10-atlas-patch.png')});
 }
 const v10Audit=await page.evaluate(()=>window.eyeV8.auditV10());console.log('EYE_V10_SCREEN_AUDIT',JSON.stringify(v10Audit));
 assert.ok(v10Audit.eyeChangedPixels>25,'v10 patch not visible inside eye ROI');
 assert.ok(v10Audit.outsideEyeChangedPixels<15000,'v10 patch bleeds outside eye ROI');
 await writeFile(join(folder,'v10-patch-audit.json'),JSON.stringify({v10,v10Audit},null,2)+'\n');
 console.log('EYE_V9_EXACT_CONTOUR_DIAGNOSTIC_PASS; EYE_V10_EXPERIMENT_PASS photorealism BLOCKED');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
