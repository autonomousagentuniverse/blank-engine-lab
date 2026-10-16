/** Real Chrome/WebGL2 proof of Einar's source-pinned copied GLB in Blank Engine.
 * Rendered in browser via Three.js GLTFLoader — NOT Blender preview screenshots.
 * Eye texture/mesh and embedded PBR materials are structural/visual gates.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const OUT=join(ROOT,'artifacts','hero-v5-einar');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.glb':'model/gltf-binary',
 '.png':'image/png','.json':'application/json','.jpg':'image/jpeg'};
const server=createServer(async(req,res)=>{try{
 const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=resolve(ROOT,'.'+(p.endsWith('/')?p+'index.html':p));
 if(!file.startsWith(resolve(ROOT)+sep))throw Error('Invalid path');
 const bytes=await readFile(file);
 res.writeHead(200,{'content-type':TYPES[extname(file)]||'application/octet-stream'});res.end(bytes);
 }catch(e){res.writeHead(404);res.end('Not found');}});
let browser;
try{
 await mkdir(OUT,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1020,height:900},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push('page:'+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text().slice(0,800));});
 const url='http://127.0.0.1:'+server.address().port+'/experiments/hero-v5/';
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(response.status(),200,'Blank Engine experimental renderer HTML must load');
 await page.waitForFunction(()=>typeof window.blankHeroV5?.load==='function',null,{timeout:35000});
 const metrics=await page.evaluate(()=>window.blankHeroV5.load());
 console.log('BLANK_ENGINE_REAL_WEBGL_GLTF_LOADED',JSON.stringify(metrics).slice(0,8000));
 assert.ok(metrics.mesh_count>=7,'Source Einar eye/face geometry missing');
 assert.ok(metrics.face_textured,'PBR skin baseColorTexture missing');
 assert.ok(metrics.eye_textured,'PBR iris/eye baseColorTexture missing');
 assert.ok(metrics.cornea_separate,'Anatomical corneas missing');
 assert.ok(metrics.triangles>10000,'Source real triangle count unexpectedly low');
 assert.equal(metrics.static_only,true,'Blink not implemented: static honesty gate');
 assert.equal(metrics.blink_playing,false);
 const context=await page.evaluate(()=>!!document.querySelector('canvas')?.getContext('webgl2'));
 assert.ok(context,'WebGL2 context not created');
 for(const view of ['front','three_quarter','profile','eyes_macro','eyes_three_quarter']){
  const proof=await page.evaluate(v=>window.blankHeroV5.show(v),view);
  assert.equal(proof.face_textured,true);
  await page.locator('canvas').screenshot({path:join(OUT,'blank-webgl-'+view+'.png'),timeout:25000});
  console.log('BLANK_ENGINE_WEBGL_SAVED',view,JSON.stringify(proof));
 }
 assert.deepEqual(errors,[],'Console/JS failures in experimental renderer');
 const report={schema:'blank.hero-v5.real-webgl2-runtime.v1',status:'FIVE_REAL_CHROME_WEBGL_VIEWS_COMPLETE',
  source:'licensed Einar static copy in runtime-generated glTF, rendered by Three.js/Blank Engine experimental Character Lab',
  ...metrics,views:['front','three_quarter','profile','eyes_macro','eyes_three_quarter'],
  webgl2:true,source_rendered_by_blender:false,production_release:false,visual_approval:'BLOCKED',
  missing:['authored blink runtime and tested morph motion','full Cycles film materials and hair conversion',
   'actual Android performance and thermal validation','human subjective photo-realism acceptance']};
 await writeFile(join(OUT,'webgl-runtime-audit.json'),JSON.stringify(report,null,2)+'\n');
 console.log('BLANK_ENGINE_WEBGL_REAL_RENDER_TECHNICAL_PASS_HUMAN_QA_BLOCKED');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
