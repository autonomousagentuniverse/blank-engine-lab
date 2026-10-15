/** Actual browser acceptance for KTX2 transcoding, material replacement and fallback. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const file=resolve(root,'.ci-assets/sample_uastc.ktx2');
const source=await readFile(file);assert(source.length>128);
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const dest=resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(dest!==resolve(root,'index.html')&&!dest.startsWith(resolve(root)+sep))throw Error('Not found');
  const body=await readFile(dest);res.writeHead(200,{'content-type':mime[extname(dest)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
});
let browser;
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1280,height:840}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#physicsState')?.textContent==='PHYSICS: RAPIER',{timeout:45000});
 const quest=await page.locator('#questProgress').innerText();
 await page.locator('#viewport canvas').evaluate(el=>el.dataset.ktxTest='true');
 await page.locator('#materialTarget').selectOption('buildings');
 await page.locator('#pbrAlbedo').setInputFiles({name:'sample_uastc.ktx2',mimeType:'image/ktx2',buffer:source});
 await page.locator('#pbrImport').click();
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('1 KTX2'),{timeout:45000});
 assert.match(await page.locator('#materialSummary').innerText(),/estimated GPU payload/i);
 assert.equal(await page.locator('#physicsState').innerText(),'PHYSICS: RAPIER');
 assert.equal(await page.locator('#questProgress').innerText(),quest);
 assert.equal(await page.locator('#viewport canvas').getAttribute('data-ktx-test'),'true');
 await mkdir(resolve(root,'artifacts'),{recursive:true});
 await page.screenshot({path:resolve(root,'artifacts/alpha06-ktx2-chrome.png')});
 await page.locator('#materialPreset').selectOption('concrete');await page.locator('#materialApply').click();
 assert.doesNotMatch(await page.locator('#materialSummary').innerText(),/imported PBR/i);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('#pbrImport').isVisible(),true);
 assert.deepEqual(errors,[]);
 console.log('REAL CHROME KTX2: PASS — basis transcoder, real WebGL texture, no-reset replacement, mobile UI, physics and quest');
}finally{await browser?.close();await new Promise(ok=>server.close(ok));}
