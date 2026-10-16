/** Real Chrome smoke: geometry selection -> constrain -> preview -> undo -> export.
 * This runs on GitHub Actions with a genuine rigged GLB, no network asset served
 * to players in production, and no Vercel deployment.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.png':'image/png','.glb':'model/gltf-binary'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');const path=decodeURIComponent(url.pathname);
  const file=resolve(root,'.'+(path==='/'?'/index.html':path));
  if(file!==resolve(root,'index.html')&&!file.startsWith(resolve(root)+sep))throw Error('Forbidden path');
  const contents=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(contents);
 }catch{res.writeHead(404);res.end('Not found');}
});
let browser;
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1100,height:850},acceptDownloads:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route('https://cdn.jsdelivr.net/npm/**',async route=>{
  const u=new URL(route.request().url()),m=u.pathname.match(/^\/npm\/(three@0\.186\.1)\/(.+)$/);
  if(!m||m[2].includes('..'))return route.abort('failed');
  const file=join(root,'node_modules','three',m[2]);
  try{await route.fulfill({status:200,body:await readFile(file),headers:{'content-type':mime[extname(file)]||'application/octet-stream','access-control-allow-origin':'*'}});}catch{return route.abort('failed');}
 });
 await page.goto(`http://127.0.0.1:${server.address().port}/character-lab/index.html`,{waitUntil:'domcontentloaded'});
 // The pinned original 6.7 MB reference was downloaded by the workflow.
 await page.locator('#avatarFile').setInputFiles(join(root,'.ci-assets','hero-v22.glb'));
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.startsWith('Loaded'),{timeout:30000});
 await page.locator('#neutralPoseBtn').click();await page.locator('#reviewView').selectOption('face');
 await page.locator('#detailPick').click();
 const canvas=page.locator('#viewport canvas'),bounds=await canvas.boundingBox();
 assert.ok(bounds,'WebGL viewport must exist');
 await page.mouse.click(bounds.x+bounds.width*.5,bounds.y+bounds.height*.49);
 await page.waitForFunction(()=>document.querySelector('#geoMake')?.disabled===false,{timeout:12000});
 await page.locator('#geoMake').click();
 assert.match(await page.locator('#geoStatus').innerText(),/Artifact geometry-|Artifact/);
 await page.locator('#geoZ').fill('-0.002');await page.locator('#geoSY').fill('0.9');
 await page.locator('#geoPreview').click();
 assert.match(await page.locator('#geoStatus').innerText(),/Preview (satisfied|projected)/);
 await page.locator('#geoUndo').click();assert.match(await page.locator('#geoStatus').innerText(),/restored/i);
 const download=page.waitForEvent('download');await page.locator('#geoExport').click();
 const saved=await download;assert.match(saved.suggestedFilename(),/\.geometry\.json$/);
 const file=await saved.path();const artifact=JSON.parse(await readFile(file,'utf8'));
 assert.equal(artifact.schema,'blank.geometry.v1');assert.equal(artifact.asset.sha256.length,64);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('#geoMake').isVisible(),true);
 assert.deepEqual(errors,[],'Character Lab must run without JavaScript console errors');
 await mkdir(join(root,'artifacts'),{recursive:true});await page.screenshot({path:join(root,'artifacts/geometry-artifact-character-lab.png'),fullPage:true});
 console.log('GEOMETRY_ARTIFACT_CHROME_PASS: real rigged GLB, pick, solve, preview, undo, portable JSON export, mobile UI');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
