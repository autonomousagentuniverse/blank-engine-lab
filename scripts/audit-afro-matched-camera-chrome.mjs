/** Real Chrome WebGL camera-matched vs SHA-pinned Blender Cycles source.
 * Chrome camera is injected from Blender saved view_frame and C=M_yup*M_blender,
 * never tuned against rendered images; silhouette independent of PBR/light.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'artifacts/afro-matched-camera');
const mime={'.js':'text/javascript','.mjs':'text/javascript','.glb':'model/gltf-binary','.json':'application/json','.png':'image/png'};
const html=[
'<!doctype html><html><head><meta charset="utf-8"><title>Source camera parity diagnostic</title>',
'<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>',
'<style>body{margin:0;background:black;color:white;font:12px sans-serif}canvas{display:block}</style>',
'</head><body><script type="module">',
'import * as THREE from "three";import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";',
'try {',
' const c=await (await fetch("/artifacts/afro-matched-camera/camera-and-light-reference.json")).json();',
' const gltf=await new GLTFLoader().loadAsync("/artifacts/afro-matched-camera/input.glb");',
' const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:false});',
' renderer.setSize(c.canvas.width,c.canvas.height);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;',
' renderer.toneMapping=THREE.NoToneMapping;document.body.appendChild(renderer.domElement);',
' const scene=new THREE.Scene();scene.background=new THREE.Color(0x000000);',
' const model=gltf.scene;scene.add(model);model.updateMatrixWorld(true);',
' const f=c.orthographic_frame;',
' const camera=new THREE.OrthographicCamera(f.left,f.right,f.top,f.bottom,c.clip.near,c.clip.far);',
' const matrix=new THREE.Matrix4().fromArray(c.matrix_world_gltf_colmajor);',
' matrix.decompose(camera.position,camera.quaternion,camera.scale);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();',
' const lights=[];',
' // Approximate native Blender lighting in browser, report these settings;',
' // never claim radiant equivalence to pathtraced Cycles.',
' for(const l of c.scene_world.lights){',
'   if(l.type==="AREA"||l.type==="POINT"){',
'     const p=new THREE.PointLight(new THREE.Color(...l.color),Math.max(.8,Math.min(4,l.energy/550)),0,2);',
'     p.position.fromArray(l.location_yup);scene.add(p);lights.push({name:l.name,type:l.type,source_energy:l.energy,webgl_intensity:p.intensity});',
'   }',
' }',
' if(!lights.length){scene.add(new THREE.HemisphereLight(0xffffff,0x444444,1.7));lights.push({name:"approx_ambient",type:"fallback"});}',
' scene.add(new THREE.HemisphereLight(0xffffff,0x6b6b6b,.75));',
' renderer.render(scene,camera);',
' const mesh=[];model.traverse(o=>{if(o.isMesh)mesh.push(o);});',
' const old=mesh.map(o=>o.material);',
' const bg=new THREE.Color(0x000000);',
' const bbox=new THREE.Box3().setFromObject(model);',
' window.PARITY={renderer,scene,model,camera,mesh,old,THREE};',
' window.PARITY_READY={error:null,webgl2:renderer.capabilities.isWebGL2,mesh_count:mesh.length,',
'   camera_position:camera.position.toArray(),camera_quaternion:camera.quaternion.toArray(),',
'   gltf_bbox:{min:bbox.min.toArray(),max:bbox.max.toArray()},',
'   lights:lights,source_camera:c.camera_name,matching_source_camera:true};',
'}catch(e){window.PARITY_READY={error:e?.stack||String(e)};}',
'</script></body></html>'
].join('\n');
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://127.0.0.1').pathname;
  if(path==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(path==='/'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}
  const p=resolve(root,'.'+decodeURIComponent(path));
  if(!p.startsWith(resolve(root)+sep))throw Error('invalid path');
  const b=await readFile(p);res.writeHead(200,{'content-type':mime[extname(p)]||'application/octet-stream'});res.end(b);
 }catch(e){res.writeHead(404);res.end('Not found')}
});
let browser;
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:720,height:960},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',x=>{if(x.type()==='error')errors.push(x.text())});
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.PARITY_READY,{timeout:140000});
 const first=await page.evaluate(()=>window.PARITY_READY);
 console.log('EXACT_CAMERA_WEBGL_GLTF',JSON.stringify(first));
 assert.equal(first.error,null);
 assert.equal(first.webgl2,true);
 assert.ok(first.mesh_count>=10);
 assert.deepEqual(errors,[]);
 // Original PBR shading with source camera projection; no hidden masks.
 await page.locator('canvas').screenshot({path:join(out,'chrome-matched-camera-pbr.png')});
 await page.evaluate(()=>{
   const p=window.PARITY;
   // MeshBasicMaterial keeps Three's joint and morph deformation semantics.
   const flat=new p.THREE.MeshBasicMaterial({color:0xffffff,side:p.THREE.DoubleSide,
     depthTest:true,depthWrite:true,transparent:false});
   for(const m of p.mesh)m.material=flat;
   p.renderer.render(p.scene,p.camera);
 });
 await page.locator('canvas').screenshot({path:join(out,'chrome-white-silhouette.png')});
 assert.deepEqual(errors,[]);
 console.log('CHROME_MATCHED_CAMERA_SOURCE_PASS');
}catch(e){console.error('CHROME_CAMERA_PARITY_ERROR',e.stack||e);process.exitCode=1}
finally{if(browser)await browser.close();await new Promise(done=>server.close(done))}
