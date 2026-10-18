/** Phase 13: same-camera WebGL unlit material test and SOURCE-SIZE area-light
 * hypothesis. Preserve the original GLB, no pixel fitting or tuned exposure.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const target=join(root,'artifacts/afro-light-isolation');
const mime={'.js':'text/javascript','.mjs':'text/javascript','.glb':'model/gltf-binary','.json':'application/json','.png':'image/png'};
const html=[
'<!doctype html><html><head><meta charset="utf-8"><title>BLANK Light Isolation</title>',
'<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>',
'<style>body{margin:0;background:black;}canvas{display:block}</style>',
'</head><body><script type="module">',
'import * as THREE from "three";',
'import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";',
'import {RectAreaLightUniformsLib} from "three/addons/lights/RectAreaLightUniformsLib.js";',
'try {',
' const spec=await (await fetch("/artifacts/afro-light-isolation/blender-unlit-reference.json")).json();',
' const gltf=await new GLTFLoader().loadAsync("/artifacts/afro-light-isolation/input.glb");',
' const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});',
' renderer.setPixelRatio(1);renderer.setSize(720,960);renderer.outputColorSpace=THREE.SRGBColorSpace;',
' renderer.toneMapping=THREE.NoToneMapping;document.body.appendChild(renderer.domElement);',
' const scene=new THREE.Scene();scene.background=new THREE.Color(0x000000);',
' const model=gltf.scene;scene.add(model);model.updateMatrixWorld(true);',
' const c=spec.camera,frame=c.orthographic_frame;',
' const camera=new THREE.OrthographicCamera(frame.left,frame.right,frame.top,frame.bottom,c.near,c.far);',
' new THREE.Matrix4().fromArray(c.matrix_yup_colmajor).decompose(camera.position,camera.quaternion,camera.scale);',
' camera.updateMatrixWorld(true);camera.updateProjectionMatrix();',
' const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o)});',
' const defaults=meshes.map(o=>o.material);',
' const textures=[];',
' const basic=defaults.map(mat=>{',
'  const old=Array.isArray(mat)?mat[0]:mat;',
'  const m=new THREE.MeshBasicMaterial({map:old.map||null,',
'    color:old.color?.clone()||new THREE.Color(0xffffff),side:old.side,',
'    opacity:old.opacity,transparent:old.transparent,alphaTest:old.alphaTest||0,',
'    vertexColors:old.vertexColors});',
'  if(m.map)textures.push({colorSpace:m.map.colorSpace,channels:m.map.channel,flipY:m.map.flipY});',
'  return m;',
' });',
' for(let i=0;i<meshes.length;i++)meshes[i].material=basic[i];',
' renderer.render(scene,camera);',
' window.COLOR_PROBE={THREE,renderer,scene,model,camera,meshes,defaults,basic,spec,RectAreaLightUniformsLib};',
' window.COLOR_READY={error:null,webgl2:renderer.capabilities.isWebGL2,mesh_count:meshes.length,',
'  skinned_mesh_count:meshes.filter(o=>o.isSkinnedMesh).length,',
'  texture_infos:textures,material_count:spec.material_count,',
'  camera_name:"CAM_face_closeup",pass:"unlit"};',
'}catch(e){window.COLOR_READY={error:e?.stack||String(e)}}',
'</script></body></html>'
].join('\n');
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  if(path==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(path==='/'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}
  const q=resolve(root,'.'+decodeURIComponent(path));if(!q.startsWith(resolve(root)+sep))throw Error('Traversal');
  const bytes=await readFile(q);res.writeHead(200,{'content-type':mime[extname(q)]||'application/octet-stream'});res.end(bytes);
 }catch(err){res.writeHead(404);res.end('Not found');}
});
let browser;
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await chromium.launch({channel:'chrome',headless:true,
 args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:720,height:960},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.COLOR_READY,{timeout:140000});
 const first=await page.evaluate(()=>window.COLOR_READY);
 console.log('GLTF_UNLIT_BASECOLOR_LOADED',JSON.stringify(first));
 assert.equal(first.error,null);assert.equal(first.webgl2,true);
 assert.ok(first.skinned_mesh_count>=10);assert.ok(first.texture_infos.length>=1);
 assert.deepEqual(errors,[]);
 await page.locator('canvas').screenshot({path:join(target,'chrome-unlit-basecolor.png')});
 const lights=await page.evaluate(()=>{
  const p=window.COLOR_PROBE;
  for(let i=0;i<p.meshes.length;i++)p.meshes[i].material=p.defaults[i];
  const THREE=p.THREE,scene=p.scene;
  p.RectAreaLightUniformsLib.init();
  const out=[];
  for(const light of p.spec.authored_lights){
   if(light.type!=="AREA"||!light.area)continue;
   const mat=new THREE.Matrix4().fromArray(light.matrix_yup_colmajor);
   const pos=new THREE.Vector3(),rot=new THREE.Quaternion(),scale=new THREE.Vector3();
   mat.decompose(pos,rot,scale);
   const wh=light.area;
   // A physical radiance *proxy* without fitting any pixels. Blender records
   // watts and Three.js intensity describes brightness in different units;
   // energy/(pi area) is only dimensional area normalization, NOT valid
   // radiometric/nit conversion without light SPD and colorimetric calibration.
   const intensity=light.energy_watts_blender/(Math.PI*wh.area_m2);
   const r=new THREE.RectAreaLight(new THREE.Color(...light.color_linear),intensity,wh.w,wh.h);
   r.position.copy(pos);
   // Source Blender area emits along -Z; Three RectArea emits toward +Z.
   r.quaternion.copy(rot).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));
   r.updateMatrixWorld(true);
   scene.add(r);
   p.areaLights??=[];p.areaLights.push({object:r,sourceQuaternion:rot.clone(),name:light.name});
   out.push({name:light.name,shape:light.shape,source_energy_w:light.energy_watts_blender,
      width_m:wh.w,height_m:wh.h,area_m2:wh.area_m2,
      three_intensity:intensity,assumption:'W/(pi*source-area); NOT a certified nit conversion'});
  }
  p.renderer.render(scene,p.camera);
  return out;
 });
 console.log('THREE_RECTAREA_SOURCE_LIGHTS_NO_FITTING',JSON.stringify(lights));
 assert.equal(lights.length,3,'Expected 3 authored Blender area sources');
 await page.locator('canvas').screenshot({path:join(target,'chrome-source-area-proxy.png')});
 // Orientation-only A/B: preserve ALL textures, the source-shape area proxy,
 // intensity, camera and tone map. Remove previous additional local Pi
 // rotation; THREE RectAreaLight likely emits along local -Z like Blender.
 const unflipped=await page.evaluate(()=>{
  const p=window.COLOR_PROBE;
  for(const l of p.areaLights){l.object.quaternion.copy(l.sourceQuaternion);l.object.updateMatrixWorld(true);}
  p.renderer.render(p.scene,p.camera);
  return {source_orientation_used:true,lights:p.areaLights.length,
    intensity_untouched:true,original_area_shape:"Blender DISK approximated as THREE rectangle"};
 });
 console.log('RECTAREA_SOURCE_ORIENTATION_AUDIT',JSON.stringify(unflipped));
 await page.locator('canvas').screenshot({path:join(target,'chrome-area-unflipped-source.png')});
 assert.deepEqual(errors,[]);
 const report={schema:'blank.engine.webgl.unlit-area-source.v1',source_glb_sha256:'1040b6330559865801b67ac57c293ddc07b94328cc735476ff4da47464c3399d',
    browser:first,source_lights:lights,unflipped_orientation_test:unflipped,
    camera_from_original_blender:true,
    unlit_exported_materials_rendered:true,
    area_lights_source_dimensions_used:true,
    radiometrically_matched_to_cycles:false,
    no_exposure_or_intensity_fitting:true,
    photorealism_approved:false,production_deployed:false};
 await writeFile(join(target,'chrome-light-isolation.json'),JSON.stringify(report,null,2)+'\n');
 console.log('CHROME_UNLIT_AND_SOURCE_AREA_PROXIES_COMPLETE');
}catch(err){console.error('LIGHT_ISOLATION_CHROME_FAILURE',err.stack||err);process.exitCode=1}
finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
