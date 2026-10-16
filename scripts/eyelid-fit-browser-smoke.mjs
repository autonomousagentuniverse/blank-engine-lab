/** Real Chrome visual QA for topology-measured, coupled eye-geometry correction.
 * Tests the Character Lab's preview/undo/export against a real rigged reference,
 * but never auto-approves a face merely because functional tests pass.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {join,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary'};
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1'),path=resolve(root,'.'+((url.pathname==='/'||url.pathname==='/character-lab/')?'/character-lab/index.html':decodeURIComponent(url.pathname)));
 if(!path.startsWith(resolve(root)+sep))throw Error('Forbidden');
 const body=await readFile(path);res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'});res.end(body);
}catch{res.writeHead(404);res.end('Not found')}});
let browser;
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1250,height:870},acceptDownloads:true});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route('https://cdn.jsdelivr.net/npm/**',async route=>{
  const path=new URL(route.request().url()).pathname,m=path.match(/^\/npm\/three@0\.186\.1\/(.+)$/);
  if(!m||m[1].includes('..'))return route.abort('failed');
  try{await route.fulfill({status:200,body:await readFile(join(root,'node_modules','three',m[1])),headers:{'content-type':'text/javascript','access-control-allow-origin':'*'}})}catch{return route.abort('failed')}
 });
 await page.goto(`http://127.0.0.1:${server.address().port}/character-lab/`,{waitUntil:'domcontentloaded'});
 await page.locator('#avatarFile').setInputFiles(join(root,'.ci-assets','hero-v22.glb'));
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.startsWith('Loaded'),{timeout:25000});
 await page.locator('#neutralPoseBtn').click();await page.locator('#reviewLighting').selectOption('neutral');await page.locator('#reviewView').selectOption('face');
 await page.waitForTimeout(280);await mkdir(join(root,'artifacts'),{recursive:true});
 await page.locator('#viewport').screenshot({path:join(root,'artifacts','hero-eye-fit-before.png')});
 await page.locator('#eyeFitMeasure').click();
 await page.waitForFunction(()=>document.querySelector('#eyeFitReport')?.textContent.includes('28 vertices per aperture'),{timeout:30000});
 assert.match(await page.locator('#eyeFitReport').innerText(),/visual review required/i);
 assert.match(await page.locator('#status').innerText(),/Measured eye fit/);
 await page.locator('#viewport').screenshot({path:join(root,'artifacts','hero-eye-fit-after.png')});
 const download=page.waitForEvent('download');await page.locator('#eyeFitExport').click();const d=await download;
 assert.match(d.suggestedFilename(),/\.geometry\.json$/);const artifact=JSON.parse(await readFile(await d.path(),'utf8'));
 assert.equal(artifact.schema,'blank.geometry.eye-fit.v2');assert.equal(artifact.measurement.eyelids.L.vertices,28);
 assert.equal(artifact.measurement.eyelids.R.vertices,28);assert.equal(Object.keys(artifact.proposal.transforms).length,8);
 assert.equal(artifact.quality.status,'requires-visual-review');
 await page.locator('#reviewView').selectOption('side');await page.waitForTimeout(200);
 await page.locator('#viewport').screenshot({path:join(root,'artifacts','hero-eye-fit-side.png')});
 await page.locator('#eyeFitUndo').click();
 await page.waitForFunction(()=>document.querySelector('#eyeFitReport')?.textContent.includes('Original hero restored'),{timeout:25000});
 await page.locator('#reviewView').selectOption('face');await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('#eyeFitMeasure').isVisible(),true);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:join(root,'artifacts','hero-eye-fit-mobile.png'),fullPage:true});
 console.log('EYELID_FIT_CHROME_PASS: measured real contours, eight-node coupled assembly, source-preserving preview/undo, JSON export, mobile controls; visual certification blocked');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
