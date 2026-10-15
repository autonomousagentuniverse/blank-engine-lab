/**
 * Full curated CC0 pack smoke test with mobile-size rendering measurements.
 * Uses real Three.js + Rapier in Chrome; Chrome on CI is software-rendered,
 * NOT equivalent to physical Android GPU, thermal or memory testing.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, join, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {CC0_CATALOG, validatePackManifest} from '../materials/catalog.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.wasm':'application/wasm'};
const serve=async(req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const dest=resolve(root,'.'+(p==='/'?'/index.html':p));
  if(dest!==resolve(root,'index.html')&&!dest.startsWith(resolve(root)+sep))throw Error('Forbidden path');
  const body=await readFile(dest);
  res.writeHead(200,{'content-type':mime[extname(dest)]||'application/octet-stream','cache-control':'no-store'});
  res.end(body);
 }catch{res.writeHead(404);res.end('Not found')}
};
const server=createServer((req,res)=>void serve(req,res));
const manifest=JSON.parse(await readFile(join(root,'library','manifest.json'),'utf8'));
const validated=validatePackManifest(manifest);
assert.equal(validated.length,CC0_CATALOG.length,'Pack must include every curated CC0 material');
const saved=Object.fromEntries(validated.map(v=>[v.id,v]));
for(const asset of CC0_CATALOG){
 const entry=saved[asset.id];assert.ok(entry,'No prepared material: '+asset.id);
 for(const map of Object.values(entry.maps)){
  const bytes=await readFile(join(root,map.path));
  const crypto=await import('node:crypto');
  assert.equal(bytes.length,map.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),map.sha256);
 }
}

let browser;
const report={
 kind:'headless-Chrome-software-WebGL-development-proxy',
 disclaimers:[
  'Chromium software rendering/SwiftShader is not an Android GPU benchmark',
  'requestAnimationFrame cadence is a browser-loop proxy, not GPU frame time',
  'JavaScript heap is not decoded texture VRAM',
  'No physical-device FPS, GPU memory, battery, or thermal conclusions'
 ],
 source:'Poly Haven CC0, offline 1k, verified SHA256',
 viewport:{width:390,height:844,deviceScaleFactor:1},
 materials:[]
};

async function sampleFrames(page,count=90){
 return page.evaluate(async(n)=>{
  const intervals=[];let prev=null;
  await new Promise(resolve=>{
   const frame=ts=>{
    if(prev!==null)intervals.push(ts-prev);
    prev=ts;
    if(intervals.length>=n)resolve(); else requestAnimationFrame(frame);
   };
   requestAnimationFrame(frame);
  });
  const v=intervals.filter(x=>Number.isFinite(x)&&x>0).sort((a,b)=>a-b);
  const pct=q=>v[Math.min(v.length-1,Math.floor((v.length-1)*q))];
  return {sampleFrames:v.length,p50FrameMs:Number(pct(.5).toFixed(2)),p95FrameMs:Number(pct(.95).toFixed(2)),
   proxyFPS:Number((1000/pct(.5)).toFixed(1)),jsHeapMiB:performance.memory?Number((performance.memory.usedJSHeapSize/1048576).toFixed(1)):null,
   hudFPS:document.getElementById('fps')?.textContent??null};
 },count);
}

try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const port=server.address().port;
 await mkdir(join(root,'artifacts'),{recursive:true});
 for(const asset of CC0_CATALOG){
  const page=await browser.newPage({viewport:report.viewport,deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  page.on('requestfailed',request=>errors.push('REQUEST '+request.url()+' '+request.failure()?.errorText));
  await page.route('https://cdn.jsdelivr.net/npm/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   const match=path.match(/^\/npm\/(three@0\.186\.1|@dimforge\/rapier3d-compat@0\.18\.0)\/(.+)$/);
   if(!match||match[2].includes('..')||match[2].includes('\\'))return route.abort('failed');
   const pkg=match[1].startsWith('three')?'three':'@dimforge/rapier3d-compat';
   const file=join(root,'node_modules',pkg,match[2]);
   try{const body=await readFile(file);await route.fulfill({status:200,body,headers:{'content-type':mime[extname(file)]||'application/octet-stream','access-control-allow-origin':'*','cross-origin-resource-policy':'cross-origin'}})}
   catch{return route.abort('failed')}
  });
  try{
   await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#physicsState')?.textContent==='PHYSICS: RAPIER',{timeout:35000});
   assert.equal(await page.locator('#webglError').isVisible(),false);
   assert.equal(await page.locator('#cc0Apply').isVisible(),true,'Mobile editor accessible');
   await page.waitForTimeout(500);
   const before=await sampleFrames(page,75);
   const questBefore=await page.locator('#questProgress').innerText();
   const canvas=page.locator('#viewport canvas');
   await canvas.evaluate(el=>el.dataset.catalogIntegrity='same-canvas');
   await page.locator('#materialTarget').selectOption(asset.category);
   await page.locator('#cc0Material').selectOption(asset.id);
   await page.locator('#cc0Apply').click();
   await page.waitForFunction((name)=>document.querySelector('#status')?.textContent.includes('Poly Haven CC0 '+name),asset.name,{timeout:30000});
   const status=await page.locator('#status').innerText();
   assert.match(status,/physics and quest preserved/i);
   assert.match(await page.locator('#materialSummary').innerText(),/imported PBR/i);
   assert.equal(await page.locator('#physicsState').innerText(),'PHYSICS: RAPIER');
   assert.equal(await canvas.getAttribute('data-catalog-integrity'),'same-canvas');
   assert.equal(await page.locator('#questProgress').innerText(),questBefore);
   await page.waitForTimeout(500);
   const after=await sampleFrames(page,75);
   await page.locator('#dayBtn').click();
   await page.waitForFunction(()=>document.querySelector('#worldLiveSummary')?.textContent.includes('Daytime'),{timeout:20000});
   await page.waitForFunction(()=>document.querySelector('#materialSummary')?.textContent.includes('imported PBR'),{timeout:30000});
   assert.equal(await page.locator('#physicsState').innerText(),'PHYSICS: RAPIER');
   assert.deepEqual(errors,[],'No Chrome JS errors for '+asset.id);
   const screenshot=join(root,'artifacts',`alpha06-${asset.id}-mobile.png`);
   await page.screenshot({path:screenshot,fullPage:false});
   const record={id:asset.id,target:asset.category,source:asset.source,preview:screenshot.split('/').at(-1),
    maps:Object.fromEntries(Object.entries(saved[asset.id].maps).map(([name,m])=>[name,{bytes:m.bytes,sha256:m.sha256}])),
    before,after,questPreserved:true,physicsPreserved:true,webglOk:true,dayNightOk:true,mobileEditorVisible:true};
   report.materials.push(record);
   console.log(`REAL_CC0_CATALOG_PASS ${asset.id}: 3 validated maps, Chrome mobile viewport, Rapier, quest, day/night; median RAF proxy ${after.proxyFPS}fps (software browser, NOT Android)`);
  } finally{await page.close();}
 }
 await writeFile(join(root,'artifacts','alpha06-mobile-proxy-report.json'),JSON.stringify(report,null,2));
 console.log(`CC0_COMPLETE_CATALOG_PASS: ${report.materials.length} CC0 textures, ${report.materials.length*3} maps, all passed Chrome + mobile viewport`);
} finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
