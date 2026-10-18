/** Research: calibrate rect AREA power on an *independent neutral Lambertian*
 * Blender DISK reference ONLY, then apply unchanged scale to held-out human
 * front and three-quarter scenes. No pixel/face/image-fitting permitted.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const base=join(root,'artifacts/afro-neutral-light-calibration');
const mimes={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png'};
const html=[
'<!doctype html><html><head><meta charset="utf-8"><title>BLANK Neutral Patch Light Calibration</title>',
'<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>',
'<style>body{margin:0;background:black}canvas{display:block}</style></head><body><script type="module">',
'import * as THREE from "three";',
'import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";',
'import {RectAreaLightUniformsLib} from "three/addons/lights/RectAreaLightUniformsLib.js";',
'try {',
' const spec=await (await fetch("/artifacts/afro-neutral-light-calibration/blender-neutral-patch.json")).json();',
' const gltf=await new GLTFLoader().loadAsync("/artifacts/afro-neutral-light-calibration/input.glb");',
' const renderer=new THREE.WebGLRenderer({preserveDrawingBuffer:true,antialias:true});',
' renderer.setSize(720,960);renderer.setPixelRatio(1);',
' renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;',
' const scene=new THREE.Scene();scene.background=new THREE.Color(0);document.body.appendChild(renderer.domElement);',
' const c=spec.camera;',
' const camera=new THREE.OrthographicCamera(c.frame.left,c.frame.right,c.frame.top,c.frame.bottom,c.near,c.far);',
' const mat=new THREE.Matrix4().fromArray(c.world_gltf_yup_matrix);',
' mat.decompose(camera.position,camera.quaternion,camera.scale);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);',
' const sphere=new THREE.Mesh(new THREE.SphereGeometry(spec.patch.radius_m,128,64),',
'   new THREE.MeshStandardMaterial({color:new THREE.Color().setRGB(.18,.18,.18),roughness:1,metalness:0}));',
' const q=spec.patch.center_blender;sphere.position.set(q[0],q[2],-q[1]);scene.add(sphere);',
' RectAreaLightUniformsLib.init();',
' const lamps=[];',
' for(const l of spec.lights){',
'   const area=Math.PI*Math.pow(l.diameter_m/2,2);',
'   const intensityUnit=l.watts/(Math.PI*area);',
'   const o=new THREE.RectAreaLight(new THREE.Color(...l.color_linear),intensityUnit*.01,l.diameter_m,l.diameter_m);',
'   const lm=new THREE.Matrix4().fromArray(l.matrix_yup);lm.decompose(o.position,o.quaternion,o.scale);',
'   scene.add(o);lamps.push({object:o,unitIntensity:intensityUnit,name:l.name});',
' }',
' const model=gltf.scene;model.visible=false;scene.add(model);',
' const ctx=renderer.getContext();',
' const srgbLinear=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)};',
' const sample=()=>{',
'   const pixels=new Uint8Array(40*40*4);ctx.readPixels(340,460,40,40,ctx.RGBA,ctx.UNSIGNED_BYTE,pixels);',
'   const channels=[[],[],[]];',
'   for(let i=0;i<pixels.length;i+=4){for(let j=0;j<3;j++)channels[j].push(pixels[i+j]);}',
'   const median=channels.map(a=>{a.sort((x,y)=>x-y);return (a[799]+a[800])/2});',
'   return {median,displayLinear:median.map(srgbLinear).reduce((a,b)=>a+b,0)/3};',
' };',
' renderer.render(scene,camera);',
' const unitPatch=sample();',
' window.LIGHT_PROBE={THREE,renderer,scene,camera,sphere,model,lamps,spec,sample,unitPatch};',
' window.LIGHT_READY={error:null,webgl2:renderer.capabilities.isWebGL2,model_loaded:true,',
'   test_scale:.01,patch_center_rgb:unitPatch.median,patch_center_display_linear:unitPatch.displayLinear,',
'   target:spec.sampling.median_display_linear_mean,area_lights:lamps.length};',
'}catch(e){window.LIGHT_READY={error:e.stack||String(e)}}',
'</script></body></html>'
].join('\n');
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(pathname==='/'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}
  const f=resolve(root,'.'+decodeURIComponent(pathname));
  if(!f.startsWith(resolve(root)+sep))throw Error('Traversal');
  const b=await readFile(f);
  res.writeHead(200,{'content-type':mimes[extname(f)]||'application/octet-stream'});res.end(b);
 }catch(e){res.writeHead(404);res.end('Not found');}
});
let browser;
try{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 browser=await chromium.launch({channel:'chrome',headless:true,
   args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:720,height:960},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.LIGHT_READY,{timeout:150000});
 const ready=await page.evaluate(()=>window.LIGHT_READY);
 console.log('SOURCE_NEUTRAL_PATCH_CHROME',JSON.stringify(ready));
 assert.equal(ready.error,null);assert.equal(ready.webgl2,true);
 assert.ok(ready.patch_center_display_linear>.000001&&ready.patch_center_display_linear<.95,
   'Must have nonblack unsaturated neutral test before calibration');
 assert.equal(ready.area_lights,3);assert.deepEqual(errors,[]);
 await page.locator('canvas').screenshot({path:join(base,'chrome-neutral-uncalibrated.png')});
 const calibrate=await page.evaluate(()=>{
  const p=window.LIGHT_PROBE;
  const reference=p.spec.sampling.median_display_linear_mean,measured=p.unitPatch.displayLinear;
  const factor=reference/measured;
  const scalar=.01*factor;
  if(!(scalar>.000001&&scalar<10))throw Error('INVALID_NEUTRAL_CALIBRATION_SCALE:'+scalar);
  for(const l of p.lamps){l.object.intensity=l.unitIntensity*scalar;}
  p.renderer.render(p.scene,p.camera);
  const after=p.sample();
  return {reference_display_linear:reference,initial_display_linear:measured,
    scalar,patch_after:after,patch_relative_error:Math.abs(after.displayLinear-reference)/reference,
    assumption:'Single central diffuse-sphere patch; linearized sRGB display signal; not physical watts-to-nits'};
 });
 console.log('INDEPENDENT_NEUTRAL_PATCH_LIGHT_SCALE',JSON.stringify(calibrate));
 await page.locator('canvas').screenshot({path:join(base,'chrome-neutral-calibrated.png')});
 // Hold out BOTH subject views; do not update power, exposure or materials
 // based on any human pixels.
 const views=await page.evaluate(()=>{
  const p=window.LIGHT_PROBE;
  p.sphere.visible=false;p.model.visible=true;
  const out=[];
  for(const cameraView of p.spec.heldout_character_views){
    const m=new p.THREE.Matrix4().fromArray(cameraView.matrix_yup);
    m.decompose(p.camera.position,p.camera.quaternion,p.camera.scale);
    p.camera.updateMatrixWorld(true);p.camera.updateProjectionMatrix();
    p.renderer.render(p.scene,p.camera);
    out.push({name:cameraView.name,angle_degrees:cameraView.angle_degrees,
      lamp_scalar_unchanged:true});
  }
  return out;
 });
 // Capture each held-out view by rendering it with the pinned cal once.
 for(const v of views){
  await page.evaluate(name=>{
    const p=window.LIGHT_PROBE;
    const view=p.spec.heldout_character_views.find(x=>x.name===name);
    const m=new p.THREE.Matrix4().fromArray(view.matrix_yup);
    m.decompose(p.camera.position,p.camera.quaternion,p.camera.scale);
    p.camera.updateMatrixWorld(true);p.camera.updateProjectionMatrix();
    p.renderer.render(p.scene,p.camera);
  },v.name);
  await page.locator('canvas').screenshot({path:join(base,'chrome-character-'+v.name+'.png')});
  await page.evaluate(()=>{
    const p=window.LIGHT_PROBE;
    p.currentDefaults=[];
    const pure=new p.THREE.MeshBasicMaterial({color:0xffffff,side:p.THREE.DoubleSide});
    p.model.traverse(o=>{if(o.isMesh){p.currentDefaults.push([o,o.material]);o.material=pure;}});
    p.renderer.render(p.scene,p.camera);
  });
  await page.locator('canvas').screenshot({path:join(base,'chrome-silhouette-'+v.name+'.png')});
  await page.evaluate(()=>{
    const p=window.LIGHT_PROBE;
    for(const [o,m] of p.currentDefaults)o.material=m;
    p.renderer.render(p.scene,p.camera);
  });
 }
 assert.deepEqual(errors,[]);
 const report={schema:'blank.engine.chrome.patch-calibration.v1',
  original_glb_sha256:'1040b6330559865801b67ac57c293ddc07b94328cc735476ff4da47464c3399d',
  neutral_only_calibration:calibrate,initial_probe:ready,held_out_views:views,
  light_shapes_approximate_rectangles:true,source_blender_lights_are_disks:true,
  calibration_is_display_referred_empirical_not_physical:true,
  calibration_is_physical_radiometry:false,photorealism_approved:false,
  no_subject_pixel_fitting:true,production_deployed:false};
 await writeFile(join(base,'chrome-neutral-calibration.json'),JSON.stringify(report,null,2)+'\n');
 console.log('REAL_CHROME_NEUTRAL_HELDOUT_LIGHT_CALIBRATION_COMPLETE');
}catch(e){console.error('CHROME_NEUTRAL_LIGHT_TEST_FAILED',e.stack||e);process.exitCode=1}
finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
