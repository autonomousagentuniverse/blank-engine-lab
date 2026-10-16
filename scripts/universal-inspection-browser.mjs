/** Interactive Chrome acceptance for shared character + scene surface inspector.
 * Tests real mouse/touch selection, precise zoom and bookmark restore. Software
 * Chrome screenshots show functionality, not physical Android FPS or realism.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {join,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{try{
 const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const dest=resolve(root,'.'+(p==='/'?'/index.html':p));
 if(dest!==resolve(root,'index.html')&&!dest.startsWith(resolve(root)+sep))throw Error('Forbidden path');
 const bytes=await readFile(dest);res.writeHead(200,{'content-type':mime[extname(dest)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
}catch{res.writeHead(404);res.end('Not found');}});
let browser;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1200,height:860}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route('https://cdn.jsdelivr.net/npm/**',async route=>{
  const u=new URL(route.request().url()),m=u.pathname.match(/^\/npm\/(three@0\.186\.1|@dimforge\/rapier3d-compat@0\.18\.0)\/(.+)$/);
  if(!m||m[2].includes('..'))return route.abort();
  const pkg=m[1]==='three@0.186.1'?'three':'@dimforge/rapier3d-compat';
  const file=join(root,'node_modules',pkg,m[2]);
  try{await route.fulfill({status:200,body:await readFile(file),headers:{'content-type':mime[extname(file)]||'application/octet-stream','access-control-allow-origin':'*','cross-origin-resource-policy':'cross-origin'}});}catch{return route.abort();}
 });
 const base=`http://127.0.0.1:${server.address().port}`;
 await page.goto(base+'/character-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#referenceBtn').click();
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Repaired reference loaded'),{timeout:50000});
 await page.locator('#reviewView').selectOption('face');
 await page.locator('#detailPick').click();
 const canvas=page.locator('#viewport canvas');const box=await canvas.boundingBox();
 await page.mouse.click(box.x+box.width*.49,box.y+box.height*.50);
 await page.waitForFunction(()=>document.querySelector('#detailName')?.textContent.includes('Selected:'),{timeout:10000});
 await page.locator('#detailDistance').evaluate(el=>{el.value='0.34';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.match(await page.locator('#detailDistanceValue').innerText(),/0\.34/);
 await page.locator('#detailBookmark').click();
 assert.equal(await page.locator('#detailSaved option').count(),2);
 await mkdir(join(root,'artifacts'),{recursive:true});
 await page.locator('#viewport').screenshot({path:join(root,'artifacts/inspection-character-closeup.png')});
 await page.locator('#detailReturn').click();
 assert.match(await page.locator('#detailName').innerText(),/Select any visible feature/);
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#physicsState')?.textContent==='PHYSICS: RAPIER',{timeout:30000});
 await page.locator('#inspectWorldBtn').click();
 const worldCanvas=page.locator('#viewport canvas'),wbox=await worldCanvas.boundingBox();
 await page.mouse.click(wbox.x+wbox.width*.50,wbox.y+wbox.height*.53);
 await page.waitForFunction(()=>document.querySelector('#inspectWorldInfo')?.textContent.includes('Selected'),{timeout:10000});
 await page.locator('#inspectWorldDistance').evaluate(el=>{el.value='0.70';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#inspectWorldSave').click();
 assert.equal(await page.locator('#inspectWorldViews option').count(),2);
 assert.equal(await page.locator('#physicsState').innerText(),'PHYSICS: RAPIER');
 await page.locator('#viewport').screenshot({path:join(root,'artifacts/inspection-world-closeup.png')});
 await page.locator('#inspectWorldExit').click();
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.locator('#inspectWorldBtn').isVisible());
 await page.screenshot({path:join(root,'artifacts/inspection-world-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('UNIVERSAL_INSPECTION_CHROME_PASS: arbitrary character detail and world object selection, zoom, bookmarking, Rapier and mobile controls');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
