import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),OUT=join(ROOT,'artifacts','human-01');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.glb':'model/gltf-binary'};
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');
 const file=resolve(ROOT,'.'+(decodeURIComponent(u.pathname).endsWith('/')?u.pathname+'index.html':u.pathname));
 if(!file.startsWith(resolve(ROOT)+sep))throw Error('Unsafe URL');
 const bytes=await readFile(file);res.writeHead(200,{'content-type':TYPES[extname(file)]||'application/octet-stream'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found')}});
let browser;
try{
 await mkdir(OUT,{recursive:true});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1000,height:920},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await page.goto('http://127.0.0.1:'+server.address().port+'/experiments/human-01/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.humanViewer?.load==='function');
 const data=await page.evaluate(()=>window.humanViewer.load());
 console.log('HUMAN01_REAL_THREEJS_GLTF',JSON.stringify(data).slice(0,2600));
 assert.equal(data.asset_id,'human-01');assert.ok(data.triangles>10000);
 assert.ok(data.mesh_count>=3,'Eyes, hair, clothes or body missing');
 assert.equal(data.source_einar_used,false);
 assert.equal(await page.evaluate(()=>!!document.querySelector('canvas')?.getContext('webgl2')),true);
 for(const view of ['negative_y','positive_y','three_quarter','face_front','face_three_quarter']){
   await page.evaluate(v=>window.humanViewer.show(v),view);
   await page.locator('canvas').screenshot({path:join(OUT,'human01-webgl-'+view+'.png'),timeout:30000});
   console.log('HUMAN01_WEBGL_VIEW_SAVED',view);
 }
 assert.deepEqual(errors,[]);
 await writeFile(join(OUT,'webgl-report.json'),JSON.stringify({...data,webgl_views:5,
  status:'NEW_HUMAN_REAL_WEBGL_IMAGES_CAPTURED_VISUAL_REVIEW_REQUIRED'},null,2)+'\n');
 console.log('HUMAN01_ACTUAL_BROWSER_RENDER_PASSED');
}finally{await browser?.close();await new Promise(ok=>server.close(ok));}
