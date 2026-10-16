/* Run v8 surface attribution against source-pinned experimental v7 in Chromium. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../../',import.meta.url));
const folder=join(root,'artifacts','eye-v8');
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
 const url='http://127.0.0.1:'+server.address().port+'/experiments/eye-v8/';
 const p=await page.goto(url,{waitUntil:'domcontentloaded'});
 assert.equal(p.status(),200);
 try{await page.waitForFunction(()=>typeof window.eyeV8?.init==='function',null,{timeout:15000});}
 catch(e){throw new Error('Diagnostic JS failed to register: '+JSON.stringify(errors)+'; '+e.message)}
 const metadata=await page.evaluate(()=>window.eyeV8.init('/.ci-assets/hero-eye-v7-facing.glb'));
 assert.equal(metadata.faceTriangles,15948);
 assert.equal(metadata.joints,53);
 console.log('EYE_V8_SOURCE',JSON.stringify(metadata));
 const views=['front_macro','profile','three_quarter'];
 for(const view of views){
  for(const pass of ['normal','id','uv','no-added','no-socket','no-eyes','double-sided']){
   await page.evaluate(x=>window.eyeV8.render(x.view,x.pass),{view,pass});
   if(pass!=='no-eyes')
    await page.locator('canvas').screenshot({path:join(folder,view+'-'+pass+'.png')});
  }
  console.log('EYE_V8_CAPTURED '+view);
 }
 const report=await page.evaluate(()=>window.eyeV8.report());
 assert.equal(report.views.length,3);
 for(const v of report.views){
  assert.ok(v.source_socket_triangle_candidates>15,'No source socket triangle classification');
  assert.ok(v.pixel_count>1000,'No eye ROI pixels');
  assert.ok(v.valid_id_coverage>.30,'ID decode not reliable: '+v.view+' '+v.valid_id_coverage);
  console.log('EYE_V8_ATTRIBUTION',JSON.stringify({view:v.view,groups:v.groups,pink_by_group:v.pink_by_group,changed:v.changed_pixels,valid_id_coverage:v.valid_id_coverage}));
 }
 assert.deepEqual(errors,[]);
 await writeFile(join(folder,'attribution.json'),JSON.stringify(report,null,2)+'\n');
 console.log('EYE_V8_ATTRIBUTION_TECHNICAL_PASS visual acceptance remains BLOCKED');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
