import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../character-pipeline/manual-builder/preview.mjs',import.meta.url),'utf8');
const stripped=source.replace(/^import \* as THREE .*?;\s*$/m,'const THREE=globalThis.__THREE;').replace("new URL('./basemesh.json',import.meta.url)","'./basemesh.json'");
const oldFetch=globalThis.fetch,oldResizeObserver=globalThis.ResizeObserver,oldWindow=globalThis.window,oldDevicePixelRatio=globalThis.devicePixelRatio;
class Geo{setAttribute(_,attr){this.positions=attr;return this}setIndex(indices){this.indices=indices;return this}computeVertexNormals(){assert.ok(this.positions?.array.every(Number.isFinite));}dispose(){}}
class Attr{constructor(array){this.array=array}setUsage(){return this}}
class Vec3{set(x,y,z){this.x=x;this.y=y;this.z=z}}
class Obj{constructor(){this.position=new Vec3();this.scale={set(){},setScalar(){}};this.rotation={set(){}};this.children=[]}add(...xs){this.children.push(...xs)}setMatrix(){}updateMatrix(){this.matrix={}}lookAt(){}replaceChildren(){}set(){}dispose(){}}
class Color{constructor(v){this.value=v}lerp(){return this}copy(){return this}set(v){this.value=v;return this}multiplyScalar(){return this}}
class Material{constructor(v){this.color=new Color(v?.color);this.roughness=v?.roughness||1}dispose(){}}
class Mesh extends Obj{constructor(geometry,material){super();this.geometry=geometry;this.material=material} }
class InstancedMesh extends Mesh{constructor(...args){super(...args);this.instanceMatrix={setUsage(){},needsUpdate:false}}setMatrixAt(_,matrix){}computeBoundingSphere(){}dispose(){}}
class Renderer{constructor(){this.domElement={style:{},setAttribute(){},addEventListener(){},setPointerCapture(){}}}setPixelRatio(){}setSize(){}render(){}dispose(){}}
class Perspective extends Obj{updateProjectionMatrix(){} }
class Light extends Obj{constructor(){super();this.color=new Color()}}
const fake={WebGLRenderer:Renderer,PerspectiveCamera:Perspective,Scene:Obj,Group:Obj,HemisphereLight:Light,DirectionalLight:Light,
 CircleGeometry:Geo,SphereGeometry:Geo,IcosahedronGeometry:Geo,MeshStandardMaterial:Material,BufferGeometry:Geo,Float32BufferAttribute:Attr,BufferAttribute:Attr,Mesh,InstancedMesh,Object3D:Obj,Color,
 SRGBColorSpace:'srgb',ACESFilmicToneMapping:'aces',DoubleSide:2,DynamicDrawUsage:3};
// Fabricated topology matching the authenticated source contract: tests lifecycle, not appearance.
const pos=[];for(let i=0;i<14000;i++){const y=-8.1676+(i%200)/199*16.6589;pos.push(Math.sin(i*.22)*.8,y,y>7?.8:1.1)}
const idx=[];for(let i=0;i<27000;i++)idx.push(i%14000,(i+1)%14000,(i+2)%14000);
const asset={schema:'blank.cc0.anatomy.base.v1',source_license:'CC0',position_xyz:pos,body_indices:idx,eye_left_indices:[0,1,2],eye_right_indices:[3,4,5]};
globalThis.__THREE=fake;globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.devicePixelRatio=1;
globalThis.fetch=async()=>({ok:true,json:async()=>asset});
function values(){return {'body.height':172,'body.shoulders':40,'body.hips':34,'body.waist':27.5,'body.chest':31,'body.chest_depth':21,'body.hip_depth':23,'body.bust':2.6,'body.bust_spacing':18,'body.glutes':1,'body.abdomen':.8,'body.posture':0,'body.neck_width':11.5,'body.fat':.44,'body.muscle':.27,'arms.length':60,'arms.relax':9,'arms.upper_width':9,'arms.forward':1,'legs.thigh':16.6,'legs.calf':12.1,'legs.length_ratio':.475,'legs.stance':19,'legs.knee_in':.8,'face.head_width':15.4,'face.head_depth':18.4,'face.head_length':22.8,'face.jaw':11.6,'face.cheeks':.61,'face.nose_width':4.1,'face.nose_depth':2.5,'face.lips':1.6,'face.eye_size':2.4,'face.eye_spacing':6.2,'skin.color':'#482a20','skin.roughness':.56,'skin.specular':.28,'render.background':'#474951','render.light':1,'render.clay':'false','eye.sclera_tint':'#dfd7cb','eye.iris_color':'#281910','hair.color':'#171210','hair.style':'afro','hair.density':220,'hair.length':11,'hair.volume':1.14,'hair.curl':.84}}
test('MakeHuman live body updates without breaking topology or producing invalid vertices',async()=>{
 try{
  const uri='data:text/javascript;base64,'+Buffer.from(stripped).toString('base64');
  const {mountClayPreview}=await import(uri);
  const host={clientWidth:400,clientHeight:700,replaceChildren(){}};
  const figure=await mountClayPreview(host,values());
  assert.equal(figure.source.vertices,14000);
  for(let k=0;k<16;k++){
   const v=values();v['body.hips']=26+k;v['hair.length']=5+k;v['face.nose_depth']=1.3+k*.15;
   figure.update(v);
  }
  figure.dispose();
 }finally{globalThis.fetch=oldFetch;globalThis.ResizeObserver=oldResizeObserver;globalThis.window=oldWindow;globalThis.devicePixelRatio=oldDevicePixelRatio}
});

test('Pinned MakeHuman CC0 source is a connected human body without helper-tights meshes',async()=>{
 const data=JSON.parse(await readFile(new URL('../character-pipeline/manual-builder/basemesh.json',import.meta.url),'utf8'));
 assert.equal(data.schema,'blank.cc0.anatomy.base.v1');
 assert.equal(data.source_license,'CC0');
 assert.equal(data.source_commit,'3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf');
 assert.deepEqual(data.source_groups,['body','helper-l-eye','helper-r-eye']);
 assert.equal(data.body_indices.length/3,26756);
 assert.equal(data.eye_left_indices.length/3,140);
 assert.equal(data.eye_right_indices.length/3,140);
 assert.ok(data.position_xyz.length/3>=13500);
 const n=data.position_xyz.length/3;
 for(const i of [...data.body_indices,...data.eye_left_indices,...data.eye_right_indices]){
  assert.ok(Number.isInteger(i)&&i>=0&&i<n);
 }
});
