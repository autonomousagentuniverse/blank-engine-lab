/* Eye v8: experimental *pixel provenance*, no source asset or engine modifications.
   Real GLTFLoader skinned geometry, unchanged depth test/write, side, and scene.
   Each base-face triangle gets an RGB ID; procedural eye meshes get object IDs. */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const W=960,H=760,FIRST=15500,ADDED_A=224,ADDED_B=224;
const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(W,H);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
document.body.appendChild(renderer.domElement);
const framebuffer=new THREE.WebGLRenderTarget(W,H,{depthBuffer:true,stencilBuffer:false});
framebuffer.texture.colorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x575a5f);
scene.add(new THREE.HemisphereLight(0xdbeeff,0x384052,1.2));
const key=new THREE.DirectionalLight(0xfff1e0,2.45);key.position.set(-3,7,4);scene.add(key);
const fill=new THREE.DirectionalLight(0xc3deff,.9);fill.position.set(3,2,5);scene.add(fill);
const rim=new THREE.DirectionalLight(0x85b7fc,.65);rim.position.set(4,5,-4);scene.add(rim);
const camera=new THREE.PerspectiveCamera(39,W/H,.04,100);
const views={
 front_macro:{position:[0,1.815,.78],target:[0,1.81,.05]},
 profile:{position:[.89,1.815,.10],target:[0,1.81,.05]},
 three_quarter:{position:[.67,1.815,.73],target:[0,1.81,.05]}
};
const ids=new Map(),rendered={};let root,face,rawFace,filteredFace,allMeshes=[],eyes=[],socketTriangles=0;
function rgbCode(id){return [(id>>>16)&255,(id>>>8)&255,id&255];}
function linearColor(r,g,b){return new THREE.Color().setRGB(r/255,g/255,b/255,THREE.SRGBColorSpace);}
function paintTriangle(data,tri,id){
 const c=linearColor(...rgbCode(id));
 for(let j=0;j<3;j++){const v=3*(tri*3+j);data[v]=c.r;data[v+1]=c.g;data[v+2]=c.b;}
}
function setupFace(m){
 face=m;const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();
 const p=g.getAttribute('position'),uv=g.getAttribute('uv'),total=p.count/3;
 if(total!==FIRST+ADDED_A+ADDED_B)throw Error('Incorrect experimental v7 face: '+total);
 const painted=new Float32Array(p.count*3),uvpaint=new Float32Array(p.count*3),keep=[];
 for(let tri=0;tri<total;tri++){
  paintTriangle(painted,tri,tri+1);
  let x=0,y=0,z=0;const uvPoints=[];
  for(let j=0;j<3;j++){
   const v=tri*3+j,u=uv.getX(v),vv=uv.getY(v);uvPoints.push([u,vv]);
   const c=linearColor(Math.round(255*Math.min(1,Math.max(0,u))),Math.round(255*Math.min(1,Math.max(0,vv))),0);
   uvpaint[v*3]=c.r;uvpaint[v*3+1]=c.g;uvpaint[v*3+2]=c.b;
   x+=p.getX(v);y+=p.getY(v);z+=p.getZ(v);
  }
  const socket=tri<FIRST&&uvPoints.filter(v=>v[0]>.75&&v[0]<.93).length>=2
       &&Math.abs(x/3)<.060&&y/3>1.76&&y/3<1.88&&z/3>.085&&z/3<.20;
  if(socket)socketTriangles++;else keep.push(tri*3,tri*3+1,tri*3+2);
  const group=socket?'original-socket':tri<FIRST?'original-face':tri<FIRST+ADDED_A?'v4/v5-lip':'v6-bridge';
  ids.set(tri+1,{group,triangle:tri,mesh:m.name,uv_mean:uvPoints.reduce((a,v)=>[a[0]+v[0]/3,a[1]+v[1]/3],[0,0]).map(v=>+v.toFixed(4))});
 }
 const idColor=new THREE.Float32BufferAttribute(painted,3),uvColor=new THREE.Float32BufferAttribute(uvpaint,3);
 g.setAttribute('color',idColor);m.geometry=g;
 filteredFace=g.clone();filteredFace.setIndex(keep);
 m.userData.v8={geometry:g,material:m.material,idColor,uvColor};
}
function setupOther(m,i){
 const orig=m.material,g=m.geometry.clone(),id=100000+i;
 const c=linearColor(...rgbCode(id));
 const painted=new Float32Array(g.getAttribute('position').count*3);
 for(let j=0;j<painted.length;j+=3){painted[j]=c.r;painted[j+1]=c.g;painted[j+2]=c.b;}
 const attr=new THREE.Float32BufferAttribute(painted,3);g.setAttribute('color',attr);
 m.geometry=g;const group=/Blank.?Eye/i.test(m.name)?'procedural-eye':/suit|cloth/i.test(m.name)?'clothing':'other';
 ids.set(id,{group,mesh:m.name,triangle:null});
 m.userData.v8={geometry:g,material:orig,idColor:attr,uvColor:attr};
 if(group==='procedural-eye')eyes.push(m);
}
async function init(path){
 const g=await new GLTFLoader().loadAsync(path);root=g.scene;scene.add(root);
 allMeshes=[];root.traverse(o=>{if(o.isMesh)allMeshes.push(o)});
 const base=allMeshes.filter(m=>m.isSkinnedMesh&&m.geometry.getAttribute('position').count===8680);
 if(base.length!==1)throw Error('Expected exactly one skinned base mesh, got '+base.length);
 setupFace(base[0]);let idx=0;for(const m of allMeshes)if(m!==face)setupOther(m,idx++);
 if(socketTriangles<15)throw Error('Inner socket atlas/source triangle classification invalid: '+socketTriangles);
 document.getElementById('status').textContent='Loaded '+path+'; '+socketTriangles+' source socket triangles';
 return {faceTriangles:face.geometry.getAttribute('position').count/3,joints:face.skeleton.bones.length,socketTriangles,eyeObjects:eyes.length,allMeshes:allMeshes.length};
}
const debugMat=()=>new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false,side:THREE.FrontSide,depthTest:true,depthWrite:true});
function reset(){
 for(const m of allMeshes){
  m.visible=true;m.geometry=m.userData.v8.geometry;m.material=m.userData.v8.material;
  m.geometry.setAttribute('color',m.userData.v8.idColor);
 }
 face.geometry.setDrawRange(0,Infinity);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
}
function setPass(pass){
 reset();
 if(pass==='id'||pass==='uv'){
  renderer.toneMapping=THREE.NoToneMapping;
  for(const m of allMeshes){const info=m.userData.v8;
   m.geometry.setAttribute('color',pass==='id'?info.idColor:info.uvColor);
   m.material=debugMat();
  }
 }else if(pass==='no-added'){face.geometry.setDrawRange(0,FIRST*3);}
 else if(pass==='no-socket'){face.geometry=filteredFace;}
 else if(pass==='no-eyes'){for(const m of eyes)m.visible=false;}
 else if(pass==='double-sided'){
  for(const m of allMeshes){
   const original=m.userData.v8.material,clone=Array.isArray(original)?original.map(q=>q.clone()):original.clone();
   for(const mat of Array.isArray(clone)?clone:[clone])mat.side=THREE.DoubleSide;
   m.material=clone;
  }
 }else if(pass!=='normal')throw Error('Unexpected pass '+pass);
}
function capture(){
 renderer.setRenderTarget(framebuffer);renderer.render(scene,camera);
 const bytes=new Uint8Array(W*H*4);renderer.readRenderTargetPixels(framebuffer,0,0,W,H,bytes);
 renderer.setRenderTarget(null);renderer.render(scene,camera);
 return bytes;
}
function bounding(){
 const v=new THREE.Vector3(0,1.813,.17).project(camera);
 const x=Math.round((v.x+1)*W/2),y=Math.round((1-v.y)*H/2);
 return {x1:Math.max(0,x-225),x2:Math.min(W,x+225),y1:Math.max(0,y-125),y2:Math.min(H,y+125),center:[x,y]};
}
const off=(x,y)=>((H-1-y)*W+x)*4;
function attribution(view){
 const c=views[view];camera.position.set(...c.position);camera.lookAt(...c.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 const a=rendered[view],roi=bounding(),stats={view,roi,source_socket_triangle_candidates:socketTriangles,
  pixel_count:0,mapped_id_pixels:0,pinkish_pixels:0,groups:{},pink_by_group:{},changed_pixels:{},examples:[]};
 for(let y=roi.y1;y<roi.y2;y++)for(let x=roi.x1;x<roi.x2;x++){
  const p=off(x,y),code=(a.id[p]<<16)|(a.id[p+1]<<8)|a.id[p+2];
  const item=ids.get(code),group=item?.group||'unidentified';
  const r=a.normal[p],g=a.normal[p+1],b=a.normal[p+2],pink=r>55&&r>g*1.3&&r>b*1.12;
  stats.pixel_count++;if(item)stats.mapped_id_pixels++;
  stats.groups[group]=(stats.groups[group]||0)+1;
  if(pink){stats.pinkish_pixels++;stats.pink_by_group[group]=(stats.pink_by_group[group]||0)+1;
   if(item&&stats.examples.length<25)stats.examples.push({pixel:[x,y],rgb:[r,g,b],source:item,uv_encoded:[a.uv[p],a.uv[p+1]]});
  }
  for(const mode of ['no-added','no-socket','no-eyes','double-sided']){
   const q=a[mode];if(Math.abs(q[p]-r)>8||Math.abs(q[p+1]-g)>8||Math.abs(q[p+2]-b)>8)
    stats.changed_pixels[mode]=(stats.changed_pixels[mode]||0)+1;
  }
 }
 stats.valid_id_coverage=stats.mapped_id_pixels/stats.pixel_count;
 for(const mode of ['no-added','no-socket','no-eyes','double-sided'])
  stats.changed_pixels[mode]??=0;
 return stats;
}
window.eyeV8={
 init,
 render(view,pass){
  const c=views[view];if(!c)throw Error('Unknown camera '+view);
  camera.position.set(...c.position);camera.lookAt(...c.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  setPass(pass);(rendered[view]??={})[pass]=capture();return {view,pass};
 },
 report(){return {schema:'blank.eye.v8.pixel-provenance',method:'depth-tested indexed triangle ID, UV pass and hidden geometry variants, skinned Three.js GLTFLoader',eyes:eyes.map(o=>o.name),
 views:Object.keys(rendered).map(attribution),
 caveats:['Pixel pinkish test is a color heuristic, not a source attribution by itself','ID pass uses depth-tested Basic material, not exact PBR alpha','UV pass encodes UV into RGB; sampling the texture atlas is a separate check','No source GLB mutation','No blink/gaze animation or photorealism acceptance']}};
};
