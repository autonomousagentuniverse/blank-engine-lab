/** Real Chrome architecture acceptance: screenshots, draw-call budget,
 * gameplay continuity, responsive layout, day/night lighting. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1');
  const dest=resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));
  if(dest!==resolve(root,'index.html')&&!dest.startsWith(resolve(root)+sep))throw Error('Forbidden path');
  const bytes=await readFile(dest);
  res.writeHead(200,{'content-type':mime[extname(dest)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
let browser;
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1320,height:850},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('requestfailed',r=>errors.push('REQUEST '+r.url()+' '+r.failure()?.errorText));
 await page.route('https://cdn.jsdelivr.net/npm/**',async route=>{
  const url=new URL(route.request().url());const found=url.pathname.match(/^\/npm\/(three@0\.186\.1|@dimforge\/rapier3d-compat@0\.18\.0)\/(.+)$/);
  if(!found||found[2].includes('..')||found[2].includes('\\'))return route.abort('failed');
  const pkg=found[1].startsWith('three')?'three':'@dimforge/rapier3d-compat';
  const file=join(root,'node_modules',pkg,found[2]);
  try {return route.fulfill({status:200,body:await readFile(file),headers:{'content-type':mime[extname(file)]||'application/octet-stream','access-control-allow-origin':'*','cross-origin-resource-policy':'cross-origin'}});}
  catch{return route.abort('failed');}
 });
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#physicsState')?.textContent==='PHYSICS: RAPIER',{timeout:30000});
 await page.waitForFunction(()=>Number.parseInt(document.querySelector('#drawCalls')?.textContent,10)>0,{timeout:15000});
 const quest=await page.locator('#questProgress').innerText();
 const canvas=page.locator('#viewport canvas');
 await canvas.evaluate(el=>el.dataset.architectureTest='retained');
 // Validate a lower bound too: a blank viewport could misleadingly pass a max-budget gate.
 const drawCalls=Number.parseInt(await page.locator('#drawCalls').innerText(),10);
 assert.ok(drawCalls>15&&drawCalls<=250,`Unexpected Night Market draw calls: ${drawCalls}`);
 assert.equal(await page.locator('#webglError').isVisible(),false);
 await mkdir(join(root,'artifacts'),{recursive:true});
 const day=join(root,'artifacts','alpha06-architecture-day.png');
 const night=join(root,'artifacts','alpha06-architecture-night.png');
 await page.locator('#dayBtn').click();
 await page.waitForFunction(()=>document.querySelector('#worldLiveSummary')?.textContent.includes('Daytime'));
 await page.screenshot({path:day,fullPage:false});
 await page.locator('#dayBtn').click();
 await page.waitForFunction(()=>document.querySelector('#worldLiveSummary')?.textContent.includes('Nighttime'));
 await page.screenshot({path:night,fullPage:false});
 assert.equal(await page.locator('#physicsState').innerText(),'PHYSICS: RAPIER');
 assert.equal(await page.locator('#questProgress').innerText(),quest);
 // Deliberately toggling light rebuilds scene, but must create one active canvas.
 assert.equal(await canvas.count(),1);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('#drawCalls').isVisible(),true);
 assert.equal(await page.locator('#dayBtn').isVisible(),true);
 assert.deepEqual(errors,[],'architecture renderer must not emit JS errors');
 const report={renderer:'Chromium SwiftShader (software, not physical GPU)',drawCalls,drawCallLimit:250,physics:'RAPIER',questPreserved:true,mobileViewport:'390x844',photos:['alpha06-architecture-day.png','alpha06-architecture-night.png']};
 await writeFile(join(root,'artifacts','alpha06-architecture-report.json'),JSON.stringify(report,null,2));
 console.log('REAL_ARCHITECTURE_CHROME_PASS '+JSON.stringify(report));
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
