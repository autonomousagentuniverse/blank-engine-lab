/** Alpha 0.6 browser integration: real Chrome, Three.js, Rapier WASM, procedural IK. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {makeCalibrationGlb} from './generate-avatar-fixtures.mjs';
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
  // Texture-only edits preserve the mounted WebGL canvas, quest and Rapier world.
  const questBefore=await page.locator('#questProgress').innerText();
  await page.locator('#viewport canvas').evaluate(el=>el.dataset.textureTest='retained');
  await page.locator('#materialTarget').selectOption('robots');
  await page.locator('#materialPreset').selectOption('polished-steel');
  await page.locator('#materialApply').click();
  assert.match(await page.locator('#status').innerText(),/physics preserved/i);
  assert.match(await page.locator('#materialSummary').innerText(),/polished-steel/);
  assert.equal(await page.locator('#questProgress').innerText(),questBefore);
  assert.equal(await page.locator('#physicsState').innerText(),'PHYSICS: RAPIER');
  assert.equal(await page.locator('#viewport canvas').getAttribute('data-texture-test'),'retained');
  await page.locator('#prompt').fill('Paint the roads with cobblestone');
  await page.locator('#runBtn').click();
  assert.match(await page.locator('#status').innerText(),/Textured roads: stone/);
  await page.locator('#materialTarget').selectOption('roads');
  assert.equal(await page.locator('#materialPreset').inputValue(),'stone');
  assert.equal(await page.locator('#questProgress').innerText(),questBefore);
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.locator('#materialApply').isVisible(),'mobile material edit must remain reachable');
  await page.setViewportSize({width:1300,height:840});
  await page.locator('#dayBtn').click();
  await page.waitForFunction(()=>document.querySelector('#worldLiveSummary')?.textContent.includes('Daytime'));
  await page.locator('#prompt').fill('Add 5 robots and make it nighttime');
  await page.locator('#runBtn').click();
  await page.waitForFunction(()=>document.querySelector('#worldLiveSummary')?.textContent.includes('9 robots')&&document.querySelector('#worldLiveSummary')?.textContent.includes('Nighttime'));
  await page.waitForFunction(()=>document.querySelector('#physicsState')?.textContent==='PHYSICS: RAPIER',{timeout:30000});
  // Import two genuinely different binary GLB avatars via the same file input as players.
  for(const variant of ['tall','compact']){
    const bytes=Buffer.from(await makeCalibrationGlb(variant));
    await page.locator('#avatarInput').setInputFiles({name:`${variant}.glb`,mimeType:'model/gltf-binary',buffer:bytes});
    await page.waitForFunction(()=>document.querySelector('#avatarStatus')?.textContent.includes('calibrated feet'),{timeout:25000});
    const imported=await page.locator('#avatarStatus').innerText();
    assert.match(imported,/calibrated feet L=0\.\d+m R=0\.\d+m/);
    await page.keyboard.down('KeyW');await page.waitForTimeout(200);await page.keyboard.up('KeyW');
    await page.keyboard.down('Space');await page.waitForTimeout(100);await page.keyboard.up('Space');
    assert.equal(await page.locator('#webglError').isVisible(),false);
    await page.locator('#skinBtn').click();
    await page.waitForFunction(()=>document.querySelector('#avatarStatus')?.textContent.includes('procedural rig restored'));
  }
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
  const screenshot=join(root,'artifacts/alpha06-ik-browser.png');
  await page.screenshot({path:screenshot,fullPage:true});
  console.log('REAL CHROME ALPHA 0.6: PASS — texture edits without physics/quest reset, mobile controls, imported GLBs, Rapier, WebGL and animation');
  console.log('SCREENSHOT: '+screenshot);
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
