/** Proves a real CC0-authored PBR pack works in the browser without scene resets. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const file=resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(file!==resolve(root,'index.html')&&!file.startsWith(resolve(root)+sep))throw Error('Forbidden');
  const data=await readFile(file);
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end('Missing');}
});
let browser;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1260,height:820}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route('https://cdn.jsdelivr.net/npm/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  const matched=pathname.match(/^\/npm\/(three@0\.186\.1|@dimforge\/rapier3d-compat@0\.18\.0)\/(.+)$/);
  if(!matched)return route.abort('failed');
  const pkg=matched[1].startsWith('three')?'three':'@dimforge/rapier3d-compat';
  if(matched[2].includes('..'))return route.abort('failed');
  const name=join(root,'node_modules',pkg,matched[2]);
  try{const body=await readFile(name);return route.fulfill({status:200,body,headers:{'content-type':mime[extname(name)]||'application/octet-stream','access-control-allow-origin':'*','cross-origin-resource-policy':'cross-origin'}});}catch{return route.abort('failed');}
 });
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#physicsState')?.textContent==='PHYSICS: RAPIER',{timeout:30000});
 await page.locator('#materialTarget').selectOption('roads');
 await page.locator('#cc0Material').selectOption('asphalt_02');
 const questBefore=await page.locator('#questProgress').innerText();
 const canvas=page.locator('#viewport canvas');
 await canvas.evaluate(el=>el.dataset.cc0='original');
 await page.locator('#cc0Apply').click();
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Poly Haven CC0 Weathered Asphalt'),{timeout:25000});
 assert.match(await page.locator('#status').innerText(),/physics and quest preserved/);
 assert.equal(await page.locator('#questProgress').innerText(),questBefore);
 assert.equal(await page.locator('#physicsState').innerText(),'PHYSICS: RAPIER');
 assert.equal(await canvas.getAttribute('data-cc0'),'original');
 await page.locator('#dayBtn').click();
 await page.waitForFunction(()=>document.querySelector('#worldLiveSummary')?.textContent.includes('Daytime'));
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Poly Haven CC0')||document.querySelector('#materialSummary')?.textContent.includes('imported PBR'),{timeout:20000});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('#cc0Apply').isVisible(),true);
 await page.setViewportSize({width:1260,height:820});
 assert.deepEqual(errors,[],'renderer must not emit JS errors');
 const screenshot=join(root,'artifacts','alpha06-polyhaven-material.png');
 await mkdir(join(root,'artifacts'),{recursive:true});await page.screenshot({path:screenshot,fullPage:true});
 console.log('REAL_CC0_CHROME_PASS: Poly Haven authored maps + normal/ORM, WebGL and Rapier; no quest/physics reset; mobile controls visible');
 console.log('SCREENSHOT: '+screenshot);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
