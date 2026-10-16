/** Real Three.js/WebGL Character Builder v2.1 acceptance and static portrait captures. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {join,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary'};
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),path=pathname.endsWith('/')?pathname+'index.html':pathname,file=resolve(root,'.'+(path==='/index.html'?'/character-lab/index.html':path));if(!file.startsWith(resolve(root)+sep))throw Error('Invalid path');const bytes=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end('Not found');}});
let browser;
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:950},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push('JS '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route('https://cdn.jsdelivr.net/npm/**',async route=>{
  const url=new URL(route.request().url()),match=url.pathname.match(/^\/npm\/three@0\.186\.1\/(.+)$/);
  if(!match||match[1].includes('..'))return route.abort();
  const file=join(root,'node_modules','three',match[1]);
  try{await route.fulfill({status:200,body:await readFile(file),headers:{'content-type':'text/javascript','access-control-allow-origin':'*','cross-origin-resource-policy':'cross-origin'}})}catch{return route.abort()}
 });
 await page.goto(`http://127.0.0.1:${server.address().port}/character-lab/`,{waitUntil:'domcontentloaded'});
 await page.locator('#referenceBtn').click();
 await page.waitForFunction(()=>document.querySelector('#modelTitle')?.textContent.includes('PBR-finished')&&document.querySelector('#downloadRepairedBtn')?.disabled===false,{timeout:45000});
 // Check neutral pose is frozen and no automatic running/walking.
 assert.equal(await page.locator('#pauseBtn').innerText(),'Resume');
 assert.equal((await page.locator('#clipSelect option:checked').innerText()).toLowerCase(),'idle');
 assert.match(await page.locator('#status').innerText(),/tuned PBR/i);
 const views=['front','threeQuarter','side','back','face'];
 await mkdir(join(root,'artifacts'),{recursive:true});
 for(const view of views){
  await page.locator('#reviewView').selectOption(view);
  await page.waitForTimeout(500);
  const filename=join(root,'artifacts',`hero-v21-${view}.png`);
  await page.locator('#viewport').screenshot({path:filename});
  assert.equal(await page.locator('#pauseBtn').innerText(),'Resume');
 }
 await page.locator('#reviewLighting').selectOption('neutral');
 assert.equal(await page.locator('#lightBtn').innerText(),'Lighting: neutral');
 await page.locator('#reviewLighting').selectOption('portrait');
 await page.locator('#reviewView').selectOption('face');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);
 assert.ok(await page.locator('#neutralPoseBtn').isVisible());
 assert.ok(await page.locator('#reviewLighting').isVisible());
 await page.screenshot({path:join(root,'artifacts','hero-v21-mobile.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:950});
 await page.locator('#clipSelect').selectOption({label:'walk'});
 await page.waitForTimeout(220);await page.locator('#neutralPoseBtn').click();
 assert.equal((await page.locator('#clipSelect option:checked').innerText()).toLowerCase(),'idle');
 assert.equal(await page.locator('#pauseBtn').innerText(),'Resume');
 assert.deepEqual(errors,[],'Three.js/WebGL must not raise browser errors');
 console.log('CHARACTER_HERO_V21_CHROME_PASS: real CC0 GLB, neutral idle, five isolated camera angles, portrait/neutral lighting, mobile controls; visual realism still requires human review');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
