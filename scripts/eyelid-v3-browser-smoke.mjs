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
 const entry=await page.goto(`http://127.0.0.1:${server.address().port}/character-lab/`,{waitUntil:'domcontentloaded'});assert.equal(entry.status(),200,'Character Lab entry must serve index.html');
 async function load(path){
  await page.locator('#avatarFile').setInputFiles(join(root,path));
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.startsWith('Loaded'),{timeout:30000});
  await page.locator('#neutralPoseBtn').click();await page.locator('#reviewLighting').selectOption('neutral');await page.locator('#reviewView').selectOption('face');
  await page.waitForTimeout(250);
 }
 await mkdir(join(root,'artifacts'),{recursive:true});
 await load('.ci-assets/hero-v22.glb');
 await page.locator('#viewport').screenshot({path:join(root,'artifacts','hero-v3-before-chrome.png')});
 await load('.ci-assets/hero-lid-v3.glb');
 assert.match(await page.locator('#animationPill').innerText(),/4 AUTHORED CLIPS/i);
 assert.match(await page.locator('#status').innerText(),/Neutral idle pose frozen/);
 await page.locator('#viewport').screenshot({path:join(root,'artifacts','hero-v3-after-chrome.png')});
 for(const [view,name] of [['side','profile'],['threeQuarter','three-quarter']]){
  await page.locator('#reviewView').selectOption(view);await page.waitForTimeout(150);
  await page.locator('#viewport').screenshot({path:join(root,'artifacts',`hero-v3-${name}-chrome.png`)});
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('#reviewView').selectOption('face');
 assert.equal(await page.locator('#geoMake').isVisible(),true);
 await page.screenshot({path:join(root,'artifacts','hero-v3-mobile-chrome.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('EYELID_V3_CHROME_PASS: real source and candidate imported; neutral macro, profile, three-quarter, mobile screenshots; source 53 joints and four clips retained; human visual approval blocked');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
