/** Headless Chrome integration: actual Three.js, Rapier WASM and gameplay UI. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const dest=resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(dest!==resolve(root,'index.html')&&!dest.startsWith(resolve(root)+sep))throw Error('Not found');
  const body=await readFile(dest);
  res.writeHead(200,{'content-type':mime[extname(dest)]||'application/octet-stream','cache-control':'no-store'});
  res.end(body);
 }catch{res.writeHead(404);res.end('Not found')}
});
let browser;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1300,height:840},deviceScaleFactor:1});
 // Serve version-pinned, installed dependencies without relying on CDN availability.
 await page.route('https://cdn.jsdelivr.net/npm/**',async route=>{
  const url=new URL(route.request().url());
  const m=url.pathname.match(/^\/npm\/(three@0\.186\.1|@dimforge\/rapier3d-compat@0\.18\.0)\/(.+)$/);
  if(!m||m[2].includes('..')||m[2].includes('\\'))return route.abort();
  const pkg=m[1].startsWith('three')?'three':'@dimforge/rapier3d-compat';
  const dest=join(root,'node_modules',pkg,m[2]);
  try{
   const bytes=await readFile(dest);
   await route.fulfill({status:200,body:bytes,headers:{
    'content-type':mime[extname(dest)]||'application/octet-stream',
    'access-control-allow-origin':'*','cross-origin-resource-policy':'cross-origin'
   }});
  }catch(e){console.error('Unmapped dependency',url.pathname,e.code);await route.abort();}
 });
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('requestfailed',r=>errors.push('Request failed: '+r.url()));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#physicsState')?.textContent==='PHYSICS: RAPIER',null,{timeout:30000});
 await page.waitForFunction(()=>document.querySelector('#worldLiveSummary')?.textContent.includes('4 robots'),null,{timeout:15000});
 assert.equal(await page.locator('#viewport canvas').count(),1);
 assert.equal(await page.locator('#webglError').isVisible(),false);
 await page.locator('#dayBtn').click();
 await page.waitForFunction(()=>document.querySelector('#worldLiveSummary')?.textContent.includes('Daytime'));
 await page.locator('#prompt').fill('Add 5 robots and make it nighttime');
 await page.locator('#runBtn').click();
 await page.waitForFunction(()=>document.querySelector('#worldLiveSummary')?.textContent.includes('9 robots')&&document.querySelector('#worldLiveSummary')?.textContent.includes('Nighttime'));
 await page.waitForFunction(()=>document.querySelector('#physicsState')?.textContent==='PHYSICS: RAPIER',null,{timeout:30000});
 const initialSkin=await page.locator('#skinName').innerText();
 await page.locator('#skinBtn').click();
 assert.notEqual(await page.locator('#skinName').innerText(),initialSkin);
 await page.keyboard.down('w');await page.waitForTimeout(240);await page.keyboard.up('w');
 await page.keyboard.down('Space');await page.waitForTimeout(100);await page.keyboard.up('Space');
 await page.waitForTimeout(400);
 await page.waitForFunction(()=>Number.parseInt(document.querySelector('#fps').textContent)>0,null,{timeout:10000});
 assert.deepEqual(errors,[]);
 await mkdir(join(root,'artifacts'),{recursive:true});
 await page.screenshot({path:join(root,'artifacts/alpha06-ik-browser.png'),fullPage:true});
 console.log('ALPHA06 CHROME: PASS; WebGL, Rapier, scene edits, skin switching, keyboard movement');
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
