/** Actual NEW Aster Blender geometry -> Blank Engine WebGL visual proof. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const OUT=join(ROOT,'artifacts','aster-01');
const MIMES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.glb':'model/gltf-binary','.png':'image/png','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(ROOT,'.'+(path.endsWith('/')?path+'index.html':path));
  if(!file.startsWith(resolve(ROOT)+sep))throw new Error('Unsafe path');
  const buffer=await readFile(file);
  res.writeHead(200,{'content-type':MIMES[extname(file)]||'application/octet-stream'});
  res.end(buffer);
 }catch(e){res.writeHead(404);res.end('Not found');}
});
let browser;
try{
 await mkdir(OUT,{recursive:true});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1120,height:990},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push('page:'+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text().slice(0,500));});
 const url='http://127.0.0.1:'+server.address().port+'/experiments/aster-01/';
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>!!window.asterViewer?.load,null,{timeout:30000});
 const m=await page.evaluate(()=>window.asterViewer.load());
 assert.equal(m.asset_id,'aster-01');
 assert.equal(m.reuses_einar_meshes,false);
 assert.ok(m.mesh_count>=80);
 assert.ok(m.triangles>10000);
 assert.ok(m.material_count>=6);
 assert.ok(m.animation_clips>=1);
 assert.ok(await page.evaluate(()=>!!document.querySelector('canvas')?.getContext('webgl2')));
 const views=['front','three_quarter','profile','face_macro'];
 for(const view of views){
  const info=await page.evaluate(v=>window.asterViewer.show(v),view);
  assert.equal(info.asset_id,'aster-01');
  await page.locator('canvas').screenshot({path:join(OUT,'aster-real-webgl-'+view+'.png'),timeout:25000});
  console.log('NEW_ASTER_ASSET_WEBGL_IMAGE',view,JSON.stringify({meshes:info.mesh_count,triangles:info.triangles}));
 }
 await page.evaluate(()=>window.asterViewer.show('face_macro'));
 await page.evaluate(()=>window.asterViewer.pose(.53));
 await page.locator('canvas').screenshot({path:join(OUT,'aster-real-webgl-head-animation.png'),timeout:25000});
 assert.deepEqual(errors,[],'WebGL runtime errors');
 const report={...m,status:'NEW_PROCEDURALLY_AUTHORED_ASSET_REAL_WEBGL_PASS',
  views:[...views,'head_animation'],webgl2:true,manual_asset_modeling_required:false,
  source_glb_is_Einar:false,source_images_reposted:false,
  human_photorealism_approved:false,publication:false,
  description:'New original mechanical android; this does not prove photorealistic human generation'};
 await writeFile(join(OUT,'runtime-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('ASTER_REAL_BLANK_ENGINE_WEBGL_PASS',JSON.stringify(report));
}finally{await browser?.close();await new Promise(done=>server.close(done));}
