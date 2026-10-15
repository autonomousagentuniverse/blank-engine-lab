import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
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
  res.writeHead(200,{'content-type':mime[extname(dest)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
});
let browser;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1280,height:840},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#physicsState')?.textContent==='PHYSICS: RAPIER',{timeout:45000});
 assert.equal(await page.locator('#webglError').isVisible(),false);
 const quest=await page.locator('#questProgress').innerText();
 await page.locator('#viewport canvas').evaluate(el=>el.dataset.pbr='retained');
 const pixels=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=c.height=1024;
  const ctx=c.getContext('2d');ctx.fillStyle='#b99875';ctx.fillRect(0,0,1024,1024);
  for(let y=0;y<1024;y+=64)for(let x=0;x<1024;x+=128){
   ctx.fillStyle=(x+y)%3===0?'#e8bf88':'#80614a';ctx.fillRect(x+(y%128?42:0),y,126,62);
  }
  return c.toDataURL('image/png').split(',')[1];
 });
 const image={name:'test-pbr-color.png',mimeType:'image/png',buffer:Buffer.from(pixels,'base64')};
 await page.locator('#materialTarget').selectOption('buildings');
 await page.locator('#pbrAlbedo').setInputFiles(image);
 await page.locator('#pbrImport').click();
 await page.waitForFunction(()=>document.querySelector('#materialSummary')?.textContent.includes('imported images'),{timeout:20000});
 assert.equal(await page.locator('#questProgress').innerText(),quest);
 assert.equal(await page.locator('#physicsState').innerText(),'PHYSICS: RAPIER');
 assert.equal(await page.locator('#viewport canvas').getAttribute('data-pbr'),'retained');
 await page.locator('#pbrAlbedo').setInputFiles({name:'unsafe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});
 await page.locator('#pbrImport').click();
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('PBR import rejected'));
 assert.match(await page.locator('#materialSummary').innerText(),/imported images/);
 await page.locator('#materialPreset').selectOption('concrete');await page.locator('#materialApply').click();
 assert.doesNotMatch(await page.locator('#materialSummary').innerText(),/imported images/);
 await page.locator('#pbrAlbedo').setInputFiles(image);await page.locator('#pbrImport').click();
 await page.waitForFunction(()=>document.querySelector('#materialSummary')?.textContent.includes('imported images'));
 await page.locator('#dayBtn').click();
 await page.waitForFunction(()=>document.querySelector('#worldLiveSummary')?.textContent.includes('Daytime'));
 await page.waitForFunction(()=>document.querySelector('#physicsState')?.textContent==='PHYSICS: RAPIER');
 await page.waitForFunction(()=>document.querySelector('#materialSummary')?.textContent.includes('imported images'));
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.locator('#pbrImport').isVisible());
 await mkdir(resolve(root,'artifacts'),{recursive:true});
 await page.screenshot({path:resolve(root,'artifacts/alpha06-authored-textures.png')});
 assert.deepEqual(errors,[]);
 console.log('REAL CHROME AUTHOR PBR: PASS — 1024px image, fallback, rejection, preserved scene and mobile controls');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
