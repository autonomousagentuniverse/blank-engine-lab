#!/usr/bin/env node
/** Real Chromium integration for Blender-generated human passed via same-origin handoff.
 * Run: node scripts/anatomy-game-browser-smoke.mjs /tmp/generated/animated_character.glb
 * Starts a local-only stand-in for the deployment's authenticated GLB proxy.
 */
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep,join} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const file=process.argv[2];
if(!file||!existsSync(file))throw Error('Pass genuine Blender exported GLB');
const bytes=readFileSync(file);
const root=resolve('.');
const job='5afe1342-f621-45aa-8b12-347e09910101.a1429180-798f-4e40-83b2-215b8315a70b';
const mime={'.html':'text/html;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8','.wasm':'application/wasm','.png':'image/png','.glb':'model/gltf-binary'};
let gameImports=0;
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return}
 if(url.pathname==='/api/anatomy'){
   if(url.searchParams.get('job')!==job||url.searchParams.get('asset')!=='animated_character.glb'){res.writeHead(400);res.end('bad job');return}
   gameImports++;res.writeHead(200,{'Content-Type':'model/gltf-binary','Content-Length':bytes.length,'Cache-Control':'no-store'});res.end(bytes);return;
 }
 const pathname=decodeURIComponent(url.pathname);
 const dest=resolve(root,'.'+pathname);
 if(!dest.startsWith(root+sep)||!existsSync(dest)){res.writeHead(404);res.end('not found');return}
 const data=readFileSync(dest);
 res.writeHead(200,{'Content-Type':mime[extname(dest)]||'application/octet-stream'});
 res.end(data);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
try{
 browser=await chromium.launch({headless:process.env.ANATOMY_HEADFUL!=='1',...(process.env.ANATOMY_BROWSER_PATH?{executablePath:process.env.ANATOMY_BROWSER_PATH}:{}),
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1200,height:840},deviceScaleFactor:1});
 const errors=[];const requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('requestfailed',req=>requests.push(req.url()+' '+req.failure()?.errorText));
 page.on('response',response=>{if(response.status()>=400)requests.push('HTTP '+response.status()+' '+response.url())});
 page.on('console',message=>{if(message.type()==='error')errors.push('console: '+message.text().slice(0,400))});
 const target='http://127.0.0.1:'+server.address().port+'/index.html?anatomyJob='+encodeURIComponent(job);
 await page.goto(target,{waitUntil:'domcontentloaded',timeout:40000});
 try{
 await page.waitForFunction(()=>document.querySelector('#avatarStatus')?.textContent.includes('BLENDER PLAYTEST'),null,{timeout:45000});
 }catch(e){
  console.log('GAME_BROWSER_DIAGNOSTICS',JSON.stringify({avatar:await page.locator('#avatarStatus').innerText(),status:await page.locator('#status').innerText(),errors,requests,body:await page.locator('#webglError').innerText().catch(()=>''),imports:gameImports}));
  await page.screenshot({path:'/tmp/blank-engine-game-diagnostic.png'});
  throw e;
 }
 const avatarStatus=await page.locator('#avatarStatus').innerText();
 assert.match(avatarStatus,/Walk: authored/);
 assert.match(avatarStatus,/Run: authored/);
 assert.equal(gameImports,1);
 assert.equal(await page.locator('#webglError').isVisible(),false);
 assert.equal(await page.locator('canvas').count()>0,true);
 const before=await page.locator('#status').innerText();
 await page.keyboard.down('KeyW');await page.waitForTimeout(550);await page.keyboard.up('KeyW');
 await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyW');await page.waitForTimeout(400);
 await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
 await page.waitForTimeout(500);
 const screenshot='/tmp/blank-engine-human-playable.png';
 await page.screenshot({path:screenshot});
 const canvas=await page.locator('canvas').first().evaluate(el=>({width:el.width,height:el.height}));
 assert.ok(canvas.width>0&&canvas.height>0);
 assert.equal(errors.filter(e=>!e.includes('favicon')).length,0,'page errors '+JSON.stringify(errors));
 console.log('REAL_BROWSER_BLENDER_GAME_PLAYTEST_PASS',JSON.stringify({avatarStatus,before,canvas,gameImports,screenshot,errors}));
 await page.close();
}finally{await browser?.close();await new Promise(done=>server.close(done))}

