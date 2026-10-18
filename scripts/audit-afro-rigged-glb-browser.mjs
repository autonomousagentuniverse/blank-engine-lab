/** Real Chromium browser WebGL proof for Blender's rigged Afro GLB.
 * Tests skinning under head motion and creates before/after screenshots.
 * Distinct from (unproven) exact pixel fidelity or photorealism.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'artifacts','afro-browser');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.glb':'model/gltf-binary','.json':'application/json','.png':'image/png'};
const html=[
'<!doctype html><html><head><meta charset="utf-8"><title>Blank Afro GLB Inspection</title>',
'<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>',
'<style>body{margin:0;background:#20242a;color:white;font:14px system-ui;}canvas{display:block;}#label{position:absolute;top:5px;left:5px;background:#0009;padding:6px;}</style>',
'</head><body><div id="label">EXPERIMENT - Photorealism not approved</div><script type="module">',
'import * as THREE from "three";',
'import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";',
'try {',
' const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});',
' renderer.setSize(900,960);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;',
' document.body.appendChild(renderer.domElement);',
' const scene=new THREE.Scene();scene.background=new THREE.Color(0x33363c);',
' scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2.8));',
' const sunlight=new THREE.DirectionalLight(0xffffff,2.5);sunlight.position.set(-2,3,4);scene.add(sunlight);',
' const asset=await new GLTFLoader().loadAsync("/artifacts/afro-visual-glb/afro_skinbound_rigged.glb");',
' const model=asset.scene;scene.add(model);model.updateMatrixWorld(true);',
' const meshes=[],skinned=[],hair=[];',
' model.traverse(o=>{if(o.isMesh)meshes.push(o);if(o.isSkinnedMesh)skinned.push(o);if(o.name.startsWith("BLANK_RIGGED_AFRO_LAYER_"))hair.push(o);});',
' const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),mid=box.getCenter(new THREE.Vector3());',
' const camera=new THREE.PerspectiveCamera(35,900/960,.01,100);',
' camera.position.set(mid.x,mid.y+.1,mid.z+Math.max(2.7,size.y*1.65));',
' camera.lookAt(mid.x,box.max.y-size.y*.17,mid.z);',
' renderer.render(scene,camera);',
' const head=skinned.flatMap(s=>s.skeleton.bones).find(b=>b.name==="head")||null;',
' const hairData=hair.map(o=>({name:o.name,skinned:!!o.isSkinnedMesh,vertices:o.geometry?.attributes?.position?.count||0,hasJoints:!!o.geometry?.attributes?.skinIndex,hasWeights:!!o.geometry?.attributes?.skinWeight}));',
' const gl=renderer.getContext();',
' window.BLANK_GLTF={renderer,scene,camera,head,hair,model,THREE};',
' window.BLANK_RESULT={error:null,webgl_version:gl instanceof WebGL2RenderingContext?2:1,',
'  skinned_mesh_count:skinned.length,mesh_count:meshes.length,head_bone_found:!!head,',
'  max_bones:Math.max(...skinned.map(s=>s.skeleton.bones.length)),',
'  hair:hairData,bounding_size:{x:size.x,y:size.y,z:size.z}};',
'} catch(e){ window.BLANK_RESULT={error:String(e.message||e)}; }',
'</script></body></html>'
].join('\n');
const server=createServer(async(req,res)=>{
 try{
  const uri=new URL(req.url,'http://127.0.0.1');
  if(uri.pathname==='/'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}
  const filename=resolve(root,'.'+decodeURIComponent(uri.pathname));
  if(!filename.startsWith(resolve(root)+sep))throw Error('Traversal');
  const data=await readFile(filename);
  res.writeHead(200,{'content-type':mime[extname(filename)]||'application/octet-stream','cache-control':'no-store'});
  res.end(data);
 }catch(err){res.writeHead(404);res.end('Not found');}
});
let browser;
try {
 await mkdir(out,{recursive:true});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await chromium.launch({channel:'chrome',headless:true,
   args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:900,height:980},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.BLANK_RESULT,{timeout:150000});
 const result=await page.evaluate(()=>window.BLANK_RESULT);
 console.log('REAL_CHROME_GLTF_SUMMARY',JSON.stringify(result));
 assert.equal(result.error,null);
 assert.ok(result.webgl_version>=1);
 assert.equal(result.hair.length,3);
 assert.ok(result.hair.every(x=>x.skinned&&x.vertices>50000&&x.hasJoints&&x.hasWeights));
 assert.ok(result.skinned_mesh_count>=3&&result.max_bones>=10&&result.head_bone_found);
 assert.ok(result.bounding_size.y>1&&result.bounding_size.y<3);
 assert.deepEqual(errors,[]);
 await page.locator('canvas').screenshot({path:join(out,'afro-webgl-neutral.png')});
 const move=await page.evaluate(()=>{
  const s=window.BLANK_GLTF;
  const samples=s.hair.map(o=>{
   const v=new s.THREE.Vector3();o.getVertexPosition(0,v);return o.localToWorld(v);
  });
  s.head.rotation.y+=.38;
  s.head.updateMatrixWorld(true);s.model.updateMatrixWorld(true);
  const offsets=s.hair.map((o,i)=>{
   const v=new s.THREE.Vector3();o.getVertexPosition(0,v);return o.localToWorld(v).distanceTo(samples[i]);
  });
  s.renderer.render(s.scene,s.camera);
  return offsets;
 });
 console.log('REAL_WEBGL_HEAD_BONE_ROOT_MOVEMENT_M',JSON.stringify(move));
 assert.ok(move.some(v=>v>.001),'Hair mesh must respond to head bone rotation');
 await page.locator('canvas').screenshot({path:join(out,'afro-webgl-head-y.png')});
 const saved={...result,head_rotation_movement_m:move,chrome_webgl_pass:true,
   cycles_webgl_pixel_parity_verified:false,photorealism_approved:false,release_allowed:false};
 await writeFile(join(out,'webgl-report.json'),JSON.stringify(saved,null,2)+'\n');
 console.log('BLANK_EXPERIMENTAL_AFRO_WEBGL_RIGGED_SUCCESS');
}catch(e){console.error('BLANK_AFRO_BROWSER_TEST_FAILED',e);process.exitCode=1}
finally{if(browser)await browser.close();await new Promise(done=>server.close(done));}
