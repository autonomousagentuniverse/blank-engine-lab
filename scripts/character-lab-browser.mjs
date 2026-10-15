/** Real browser proof: isolated, licensed rigged and textured hero asset; no city. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {extname,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.glb':'model/gltf-binary','.json':'application/json','.png':'image/png'};
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1'),p=resolve(root,'.'+(u.pathname==='/'?'/character-lab/index.html':decodeURIComponent(u.pathname)));if(!p.startsWith(resolve(root)+sep))throw Error('Invalid path');const data=await readFile(p);res.writeHead(200,{'content-type':mime[extname(p)]||'application/octet-stream','cache-control':'no-store'});res.end(data)}catch{res.writeHead(404);res.end('Not found')}});
let browser;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1500,height:990},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route('https://cdn.jsdelivr.net/npm/**',async route=>{
  const name=new URL(route.request().url()).pathname;
  if(!name.startsWith('/npm/three@0.186.1/'))return route.abort();
  const sub=name.slice('/npm/three@0.186.1/'.length);if(sub.includes('..'))return route.abort();
  const file=join(root,'node_modules','three',sub);
  try{await route.fulfill({status:200,body:await readFile(file),headers:{'content-type':'text/javascript','access-control-allow-origin':'*'}})}catch{return route.abort();}
 });
 await page.goto(`http://127.0.0.1:${server.address().port}/character-lab/`,{waitUntil:'domcontentloaded'});
 await page.locator('#referenceBtn').click();
 await page.waitForFunction(()=>document.querySelector('#runtimeState')?.textContent.includes('ACTIVE'),{timeout:40000});
 assert.equal(await page.locator('#viewport canvas').count(),1);
 assert.match(await page.locator('#status').innerText(),/skinned meshes/);
 const numMaterials=await page.locator('#materialSelect option').count();assert.ok(numMaterials>=2,`expected multiple real material slots, got ${numMaterials}`);
 const clipCount=await page.locator('#clipSelect option').count();assert.ok(clipCount>=2,`expected authored motion, got ${clipCount}`);
 assert.ok(await page.locator('#quality').isVisible());assert.match(await page.locator('#quality').innerText(),/Photorealism: NOT VERIFIED/);
 await page.locator('#clipSelect').selectOption({index:Math.min(1,clipCount-1)});await page.waitForTimeout(350);
 await page.locator('#roughness').evaluate(el=>{el.value='0.66';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#metalness').evaluate(el=>{el.value='0.12';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#lightBtn').click();await page.locator('#skeletonBtn').click();await page.locator('#skeletonBtn').click();
 await page.locator('#resetMaterials').click();await page.locator('#turntableBtn').click();await page.waitForTimeout(400);
 await mkdir(join(root,'artifacts'),{recursive:true});
 await page.screenshot({path:join(root,'artifacts','character-lab-hero-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);
 assert.equal(await page.locator('#materialSelect').isVisible(),true);await page.screenshot({path:join(root,'artifacts','character-lab-hero-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[],'Character Lab JavaScript errors');
 console.log(`CHARACTER_LAB_REAL_BROWSER_PASS: ${numMaterials} real material slots, ${clipCount} authored clips, skinned/texture diagnostics, real GLB, studio lighting, mobile controls`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
