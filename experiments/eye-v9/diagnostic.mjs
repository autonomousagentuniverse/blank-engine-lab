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
 front_detail:{position:[0,1.815,.52],target:[0,1.81,.12]},
 profile:{position:[.89,1.815,.10],target:[0,1.81,.05]},
 three_quarter:{position:[.67,1.815,.73],target:[0,1.81,.05]}
};
const ids=new Map(),rendered={};let root,face,rawFace,filteredFace,allMeshes=[],eyes=[],socketTriangles=0;
let originalIndexedGeometry, preciseContourGeometry, preciseSeedGeometry, preciseLoops=[],contourFaceIDs=[],seedFaceIDs=[];
function rgbCode(id){return [(id>>>16)&255,(id>>>8)&255,id&255];}
function linearColor(r,g,b){return new THREE.Color().setRGB(r/255,g/255,b/255,THREE.SRGBColorSpace);}
function paintTriangle(data,tri,id){
 const c=linearColor(...rgbCode(id));
 for(let j=0;j<3;j++){const v=3*(tri*3+j);data[v]=c.r;data[v+1]=c.g;data[v+2]=c.b;}
}
function setupFace(m){
 face=m;originalIndexedGeometry=m.geometry;
 const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();
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
 setupFace(base[0]);setupPreciseEyelids();let idx=0;for(const m of allMeshes)if(m!==face)setupOther(m,idx++);
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
  }else if(pass==='no-precise-contour'){face.geometry=preciseContourGeometry;}
 else if(pass==='no-upper-seeds'){face.geometry=preciseSeedGeometry;}
 else if(pass==='no-skin-texture'){
  const source=face.userData.v8.material,copy=source.clone();copy.map=null;copy.needsUpdate=true;face.material=copy;
 }else if(pass==='unlit-skin-atlas'){
  const source=face.userData.v8.material;
  face.material=new THREE.MeshBasicMaterial({map:source.map,color:source.color,side:source.side,depthTest:true,depthWrite:true,toneMapped:false});
 }else if(pass==='normals-only'){
  face.material=new THREE.MeshNormalMaterial({side:THREE.FrontSide,depthTest:true,depthWrite:true});
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

/** Topology-exact identification: source mesh boundary edges occur ONCE among
 * the original 15,500 triangles. Four 28-vertex eye loops (outer+inner per eye)
 * are independently verified; no broad UV/face rectangles are used for removal.
 */
function setupPreciseEyelids(){
 const src=originalIndexedGeometry,idx=src.index;
 if(!idx)throw Error('The source face requires an indexed primitive');
 const p=src.getAttribute('position'),uv=src.getAttribute('uv'),indices=idx.array;
 const borders=new Map(),neighbor=new Map();
 const key=(a,b)=>a<b?a+','+b:b+','+a;
 for(let t=0;t<FIRST;t++)for(let i=0;i<3;i++){
  const a=indices[t*3+i],b=indices[t*3+(i+1)%3],k=key(a,b);
  borders.set(k,(borders.get(k)||0)+1);
 }
 for(const [str,num] of borders){
  if(num!==1)continue;
  const [a,b]=str.split(',').map(Number);
  if(!neighbor.has(a))neighbor.set(a,new Set());
  if(!neighbor.has(b))neighbor.set(b,new Set());
  neighbor.get(a).add(b);neighbor.get(b).add(a);
 }
 const visited=new Set(),loops=[];
 for(const first of neighbor.keys()){
  if(visited.has(first))continue;
  const stack=[first],component=[];visited.add(first);
  while(stack.length){
   const v=stack.pop();component.push(v);
   for(const n of neighbor.get(v))if(!visited.has(n)){visited.add(n);stack.push(n);}
  }
  if(component.length!==28||component.some(v=>neighbor.get(v).size!==2))continue;
  const cx=component.reduce((v,i)=>v+p.getX(i),0)/28;
  const cy=component.reduce((v,i)=>v+p.getY(i),0)/28;
  const cu=component.reduce((v,i)=>v+uv.getX(i),0)/28;
  if(Math.abs(cx)<.07&&cy>1.77&&cy<1.87)
    loops.push({indices:component,eye:cx<0?'left':'right',uvIsland:cu>.7?'inner':'outer',center:[cx,cy],uvU:cu});
 }
 if(loops.length!==4||new Set(loops.map(x=>x.eye+'-'+x.uvIsland)).size!==4)
  throw Error('Expected exactly 4 unique 28-point source eye contours, got '+JSON.stringify(loops.map(x=>[x.eye,x.uvIsland])));
 preciseLoops=loops;
 const eyeVerts=new Set(loops.flatMap(q=>q.indices));
 const found=[],seeds=new Set([248,242,249,264,7999,7993,7998,8015]);
 const seedVerts=new Set([...seeds].flatMap(t=>[indices[t*3],indices[t*3+1],indices[t*3+2]]));
 const seedFaces=[];
 for(let t=0;t<FIRST;t++){
  const tri=[indices[t*3],indices[t*3+1],indices[t*3+2]];
  if(tri.some(i=>eyeVerts.has(i)))found.push(t);
  if(tri.some(i=>seedVerts.has(i)))seedFaces.push(t);
 }
 if(found.length!==224||seedFaces.length<8||seedFaces.length>120)throw Error('Precise mask size invalid: '+found.length+' / '+seedFaces.length);
 contourFaceIDs=found;seedFaceIDs=seedFaces;
 const copyWithout=excluded=>{
  const ex=new Set(excluded),g=face.userData.v8.geometry.clone(),keep=[];
  for(let t=0;t<g.getAttribute('position').count/3;t++){
   if(ex.has(t))continue;keep.push(t*3,t*3+1,t*3+2);
  }
  g.setIndex(keep);return g;
 };
 preciseContourGeometry=copyWithout(found);
 preciseSeedGeometry=copyWithout(seedFaces);
}
function preciseBox(view,eye){
 const def=views[view];camera.position.set(...def.position);camera.lookAt(...def.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 face.updateWorldMatrix(true,false);
 const p=originalIndexedGeometry.getAttribute('position'),v=new THREE.Vector3();
 const points=[];
 for(const loop of preciseLoops)if(loop.eye===eye){
  for(const idx of loop.indices){
   v.fromBufferAttribute(p,idx);
   if(typeof face.applyBoneTransform==='function')face.applyBoneTransform(idx,v);
   v.applyMatrix4(face.matrixWorld).project(camera);
   points.push([(1+v.x)*W/2,(1-v.y)*H/2]);
  }
 }
 if(points.length!==56)throw Error('Missing source eye contour points');
 const left=Math.min(...points.map(q=>q[0])),right=Math.max(...points.map(q=>q[0]));
 const top=Math.min(...points.map(q=>q[1])),bottom=Math.max(...points.map(q=>q[1]));
 const padX=view.startsWith('front')?27:34,padY=view.startsWith('front')?25:35;
 return {x1:Math.max(0,Math.floor(left-padX)),x2:Math.min(W,Math.ceil(right+padX)),
 y1:Math.max(0,Math.floor(top-padY)),y2:Math.min(H,Math.ceil(bottom+padY)),
 rawContourBounds:{left,right,top,bottom}};
}
function sourceTrianglesFor(idsList){
 const p=originalIndexedGeometry.getAttribute('position'),u=originalIndexedGeometry.getAttribute('uv'),nor=originalIndexedGeometry.getAttribute('normal'),idx=originalIndexedGeometry.index.array;
 return idsList.map(t=>{
  const indices=[idx[3*t],idx[3*t+1],idx[3*t+2]],centroid=[0,0,0],uv=[0,0],vn=[0,0,0];
  const verts=indices.map(i=>new THREE.Vector3().fromBufferAttribute(p,i));
  for(let j=0;j<3;j++){
   for(let k=0;k<3;k++)centroid[k]+=verts[j].getComponent(k)/3;
   uv[0]+=u.getX(indices[j])/3;uv[1]+=u.getY(indices[j])/3;
   vn[0]+=nor.getX(indices[j])/3;vn[1]+=nor.getY(indices[j])/3;vn[2]+=nor.getZ(indices[j])/3;
  }
  const gn=verts[1].clone().sub(verts[0]).cross(verts[2].clone().sub(verts[0])).normalize();
  const normals=new THREE.Vector3(...vn).normalize();
  return {triangle:t,centroid_m:centroid.map(x=>+x.toFixed(6)),uv_mean:uv.map(x=>+x.toFixed(6)),
   geometric_normal:gn.toArray().map(x=>+x.toFixed(4)),shading_normal:normals.toArray().map(x=>+x.toFixed(4)),
   normal_dot:+gn.dot(normals).toFixed(4)};
 });
}
function atlasSamples(points){
 const tex=face.userData.v8.material.map,im=tex?.image;
 if(!im||!im.width||!im.height)return {available:false};
 try{
  const canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
  const pix=ctx.getImageData(0,0,im.width,im.height).data;
  const sample=(u,v,flip)=>{const x=Math.min(im.width-1,Math.max(0,Math.floor(u*im.width)));
    const y=Math.min(im.height-1,Math.max(0,Math.floor((flip?1-v:v)*im.height)));const k=4*(y*im.width+x);
    return Array.from(pix.slice(k,k+3));};
  return {available:true,texture_name:tex.name,dimensions:[im.width,im.height],texture_flipY:tex.flipY,
   samples:points.map(p=>({triangle:p.triangle,uv:p.uv_mean,
    at_v_top_origin:sample(...p.uv_mean,false),at_inverted_v:sample(...p.uv_mean,true)}))};
 }catch(e){return {available:false,reason:String(e)};}
}
function reportV9(){
 const results=[];
 for(const view of Object.keys(rendered)){
  const a=rendered[view];if(!a.normal||!a.id)continue;
  for(const eye of ['left','right']){
   const box=preciseBox(view,eye),counts={},colored={},changes={},examples=[];let pixels=0,pinkCount=0,mapped=0;
   const variants=['no-precise-contour','no-upper-seeds','no-skin-texture','unlit-skin-atlas','normals-only'];
   for(let y=box.y1;y<box.y2;y++)for(let x=box.x1;x<box.x2;x++){
    const at=off(x,y),id=(a.id[at]<<16)|(a.id[at+1]<<8)|a.id[at+2],src=ids.get(id),group=src?.group||'unidentified';
    const r=a.normal[at],g=a.normal[at+1],b=a.normal[at+2];
    const pink=r>55&&r>g*1.3&&r>b*1.12;
    pixels++;counts[group]=(counts[group]||0)+1;if(src)mapped++;
    if(pink){
     pinkCount++;colored[group]=(colored[group]||0)+1;
     if(src&&examples.length<14)examples.push({pixel:[x,y],triangle:src.triangle,uv_original:src.uv_mean,group,rgb:[r,g,b]});
    }
    for(const v of variants){if(!a[v])continue;const q=a[v];
     if(Math.abs(r-q[at])>8||Math.abs(g-q[at+1])>8||Math.abs(b-q[at+2])>8)changes[v]=(changes[v]||0)+1;
    }
   }
   results.push({view,eye,roi:box,pixels,valid_id_coverage:mapped/pixels,
    visible_sources:counts,pinkish_heuristic:pinkCount,pinkish_owner:colored,
    changed_pixels:Object.fromEntries(variants.map(v=>[v,changes[v]||0])),sample_pixels:examples});
  }
 }
 const seeds=sourceTrianglesFor([248,242,249,264,7999,7993,7998,8015]);
 return {schema:'blank.eye.v9.exact-contour-attribution',status:'diagnostic_not_visual_approval',
  contour_loop_descriptors:preciseLoops.map(x=>({eye:x.eye,uvIsland:x.uvIsland,count:x.indices.length,center:x.center,meanU:x.uvU})),
  exact_contour_adjacent_triangles:contourFaceIDs.length,visible_upper_seed_neighborhood_triangles:seedFaceIDs.length,
  seed_triangles:seeds,source_atlas:atlasSamples(seeds),measurements:results,
  limitations:['Contours reconstructed from original 15,500 indexed source faces, no broad eye texture mask','Screen ROI uses projected source eye edges plus bounded padding; it includes some natural skin','RGB pinkish detection is a heuristic, not pink rim ground truth','Normal/color/texture variants are diagnostic counterfactual renders with unchanged geometry and source GLB','No production edits or aesthetic acceptance']};
}
window.eyeV8={
 init,
 reportV9,
 render(view,pass){
  const c=views[view];if(!c)throw Error('Unknown camera '+view);
  camera.position.set(...c.position);camera.lookAt(...c.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  setPass(pass);(rendered[view]??={})[pass]=capture();return {view,pass};
 },
 report(){return {schema:'blank.eye.v8.pixel-provenance',method:'depth-tested indexed triangle ID, UV pass and hidden geometry variants, skinned Three.js GLTFLoader',eyes:eyes.map(o=>o.name),
 views:Object.keys(rendered).map(attribution),
 caveats:['Pixel pinkish test is a color heuristic, not a source attribution by itself','ID pass uses depth-tested Basic material, not exact PBR alpha','UV pass encodes UV into RGB; sampling the texture atlas is a separate check','No source GLB mutation','No blink/gaze animation or photorealism acceptance']};
 }
};
