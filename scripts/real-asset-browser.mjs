/** Alpha 0.6 browser integration: real Chrome, Three.js, Rapier WASM, procedural IK. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm'};
const serve=async(req,res)=>{
  try{
    const clean=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const dest=resolve(root,'.'+(clean==='/'?'/index.html':clean));
    if(dest!==resolve(root,'index.html')&&!dest.startsWith(resolve(root)+sep))throw Error('Forbidden path');
    const body=await readFile(dest);
    res.writeHead(200,{'content-type':mime[extname(dest)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found')}
};
const server=createServer((req,res)=>void serve(req,res));
let browser;
try {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
  const page=await browser.newPage({viewport:{width:1300,height:840},deviceScaleFactor:1});
  const moduleRoute=async route=>{
    const url=route.request().url();
    const u=new URL(url);
    const match=u.pathname.match(/^\/npm\/(three@0\.186\.1|@dimforge\/rapier3d-compat@0\.18\.0)\/(.+)$/);
    if(!match)return route.abort('failed');
    const pkg=match[1].startsWith('three')?'three':'@dimforge/rapier3d-compat';
    const sub=match[2];
    if(sub.includes('..')||sub.includes('\\'))return route.abort('failed');
    const file=join(root,'node_modules',pkg,sub);
    try {const body=await readFile(file);await route.fulfill({status:200,body,headers:{'content-type':mime[extname(file)]||'application/octet-stream','access-control-allow-origin':'*','cross-origin-resource-policy':'cross-origin'}})}
    catch(err){console.error('Unmapped package asset:',u.pathname,String(err.code));await route.abort('failed');}
  };
  await page.route('https://cdn.jsdelivr.net/npm/**',moduleRoute);
  const runtimeErrors=[];
  page.on('pageerror',e=>runtimeErrors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')runtimeErrors.push(m.text())});
  page.on('requestfailed',r=>runtimeErrors.push('REQUEST '+r.url()+' '+r.failure()?.errorText));
  await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#physicsState')?.textContent==='PHYSICS: RAPIER',{timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#worldLiveSummary')?.textContent.includes('4 robots'),{timeout:15000});
  assert.equal(await page.locator('#webglError').isVisible(),false,'WebGL renderer must initialize');
  assert.equal(await page.locator('#viewport canvas').count(),1,'Three must render one canvas');
  await page.locator('#dayBtn').click();
  await page.waitForFunction(()=>document.querySelector('#worldLiveSummary')?.textContent.includes('Daytime'));
  await page.locator('#prompt').fill('Add 5 robots and make it nighttime');
  await page.locator('#runBtn').click();
  await page.waitForFunction(()=>document.querySelector('#worldLiveSummary')?.textContent.includes('9 robots')&&document.querySelector('#worldLiveSummary')?.textContent.includes('Nighttime'));
  await page.waitForFunction(()=>document.querySelector('#physicsState')?.textContent==='PHYSICS: RAPIER',{timeout:30000});
  // Independently authored CC0 source GLB through actual user file-picker.
  if(!process.argv[2])throw Error('Provide downloaded licensed GLB path');
  await page.locator('#avatarInput').setInputFiles(process.argv[2]);
  await page.waitForFunction(()=>/rigged GLB|Avatar import rejected/.test(document.querySelector('#avatarStatus')?.textContent??''),{timeout:40000});
  const imported=await page.locator('#avatarStatus').innerText();
  console.log('REAL_ASSET_IMPORT_STATUS:',imported);
  assert.match(imported,/rigged GLB/,'real third-party rig accepted');
  assert.match(imported,/Walk: authored/,'actual authored Walking clip is used');
  assert.match(imported,/Run: authored/,'actual authored Running clip is used');
  await page.keyboard.down('KeyW');await page.waitForTimeout(350);await page.keyboard.up('KeyW');
  await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyW');await page.waitForTimeout(350);await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
  await page.keyboard.down('Space');await page.waitForTimeout(100);await page.keyboard.up('Space');
  assert.equal(await page.locator('#webglError').isVisible(),false);
  await page.locator('#skinBtn').click();
  await page.waitForFunction(()=>document.querySelector('#avatarStatus')?.textContent.includes('procedural rig restored'));
  const skinBefore=await page.locator('#skinName').innerText();
  await page.locator('#skinBtn').click();
  const skinAfter=await page.locator('#skinName').innerText();
  assert.notEqual(skinBefore,skinAfter,'skin switch must operate');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(240);
  await page.keyboard.up('KeyW');
  await page.keyboard.down('Space');
  await page.waitForTimeout(100);
  await page.keyboard.up('Space');
  await page.waitForTimeout(500);
  await page.waitForFunction(()=>Number.parseInt(document.querySelector('#fps').textContent)>0,{timeout:10000});
  assert.deepEqual(runtimeErrors,[],'no browser runtime/module/network errors');
  await mkdir(join(root,'artifacts'),{recursive:true});
  const screenshot=join(root,'artifacts/alpha06-authored-browser.png');
  await page.screenshot({path:screenshot,fullPage:true});
  console.log('REAL CHROME ALPHA 0.6: PASS — licensed authored GLB imported, authored locomotion and Rapier physics');
  console.log('SCREENSHOT: '+screenshot);
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
