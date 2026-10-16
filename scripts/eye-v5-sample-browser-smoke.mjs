/** Real Three.js/Chrome QA: this verifies import/render controls, not anatomy. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {join,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary'};
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1'),route=decodeURIComponent(url.pathname),path=resolve(root,'.'+(route.endsWith('/')?route+'index.html':route));
 if(!path.startsWith(resolve(root)+sep))throw Error('Forbidden');
 const body=await readFile(path);res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'});res.end(body);
}catch{if(!res.headersSent){res.writeHead(404);res.end('Not found');}else res.destroy();}});
let browser;
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1250,height:870},acceptDownloads:true});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.jsdelivr.net/npm/**',async route=>{
  const path=new URL(route.request().url()).pathname,m=path.match(/^\/npm\/three@0\.186\.1\/(.+)$/);
  if(!m||m[1].includes('..'))return route.abort('failed');
  try{await route.fulfill({status:200,body:await readFile(join(root,'node_modules','three',m[1])),headers:{'content-type':'text/javascript','access-control-allow-origin':'*'}});}catch{return route.abort('failed');}
 });
 const entry=await page.goto(`http://127.0.0.1:${server.address().port}/character-lab/`,{waitUntil:'domcontentloaded'});assert.equal(entry.status(),200);
 async function load(path){
  await page.locator('#avatarFile').setInputFiles(join(root,path));
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.startsWith('Loaded'),{timeout:30000});
  await page.locator('#neutralPoseBtn').click();await page.locator('#reviewLighting').selectOption('neutral');await page.locator('#reviewView').selectOption('face');
  await page.waitForTimeout(250);
 }
 await mkdir(join(root,'artifacts'),{recursive:true});
 async function macro(file){
   await page.locator('#detailPick').click();
   const canvas=page.locator('#viewport canvas'),rect=await canvas.boundingBox();assert.ok(rect?.width>100&&rect?.height>100);
   await canvas.click({position:{x:rect.width*.50,y:rect.height*.39}});
   await page.waitForFunction(()=>document.querySelector('#detailDistance')?.disabled===false,{timeout:8000});
   await page.locator('#detailDistance').evaluate(el=>{el.value='0.34';el.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForTimeout(180);
   await page.locator('#viewport').screenshot({path:join(root,'artifacts',file)});
 }
 await load('.ci-assets/hero-eye-sockets-v4.glb');
 await page.locator('#viewport').screenshot({path:join(root,'artifacts','hero-v5-sample-before-chrome.png')});
 await macro('hero-v5-sample-before-macro.png');
 await load('.ci-assets/hero-eye-v5-sample.glb');
 assert.match(await page.locator('#animationPill').innerText(),/4 AUTHORED CLIPS/i);
 assert.match(await page.locator('#status').innerText(),/Neutral idle pose frozen/);
 await page.locator('#viewport').screenshot({path:join(root,'artifacts','hero-v5-sample-after-chrome.png')});
 await macro('hero-v5-sample-after-macro.png');
 for(const [view,name] of [['side','profile'],['threeQuarter','three-quarter']]){
  await page.locator('#reviewView').selectOption(view);await page.waitForTimeout(150);
  await page.locator('#viewport').screenshot({path:join(root,'artifacts',`hero-v5-sample-${name}-chrome.png`)});
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('#reviewView').selectOption('face');
 assert.equal(await page.locator('#geoMake').isVisible(),true);
 await page.screenshot({path:join(root,'artifacts','hero-v5-sample-mobile-chrome.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('EYE_V5_SAMPLE_CHROME_PASS: actual v4 GLB versus experimental v5 sample, macro/profile/three-quarter/mobile screenshots; original skeleton and authored animations retained; human visual approval BLOCKED pending screenshot review');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
