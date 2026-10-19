// Deterministic WebGL anatomy topology smoke: lightweight fake Three runtime. No Blender/visual approval.
const fs=require('fs'); const vm=require('vm');
const src=fs.readFileSync(require('path').resolve(__dirname, '../character-pipeline/manual-builder/preview.mjs'),'utf8').replace(/^import .*?;\s*$/m,'').replace('export function mountClayPreview','function mountClayPreview');
let errors=[],meshes=[],geos=0;
class Vec {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z} set(x,y,z){Object.assign(this,{x,y,z});return this} setScalar(x){this.x=this.y=this.z=x;return this}}
class C {constructor(color){this.color=color}set(x){this.color=x;return this}multiplyScalar(x){return this}lerp(c,t){return this}clone(){return new C(this.color)}}
class Geo{constructor(){this.a=[];this.ind=[];geos++}setAttribute(k,v){this.a=v.items;return this}setIndex(i){this.ind=i;return this}computeVertexNormals(){const p=this.a; if(p.some(x=>!Number.isFinite(x)))errors.push('nonfinite positions');if(!p.length)errors.push('empty geometry')}dispose(){}}
class BA{constructor(items){this.items=items}}
class Obj{constructor(){this.children=[];this.position=new Vec();this.rotation=new Vec();this.scale=new Vec(1,1,1);this.material={color:new C('grey')};this.isInstancedMesh=false}add(o){this.children.push(o)}remove(o){this.children.splice(this.children.indexOf(o),1)}}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;meshes.push(this)}}
class Scene extends Obj{}
class Renderer{constructor(){this.domElement={style:{},setAttribute(){},addEventListener(){},setPointerCapture(){}}}setPixelRatio(){}setSize(){}render(){}dispose(){}}
class PerspectiveCamera{constructor(){this.position=new Vec()}lookAt(){}updateProjectionMatrix(){}}
class Light extends Obj{constructor(){super()}}
class Mat{constructor(o){this.color=o.color instanceof C?o.color:new C(o.color)}dispose(){}}
class InstancedMesh extends Mesh{constructor(g,m,count){super(g,m);this.instanceMatrix={};this.isInstancedMesh=true;this.count=count}setMatrixAt(){}computeBoundingSphere(){}dispose(){}}
class Marker{constructor(){this.position=new Vec();this.scale=new Vec();this.rotation=new Vec();this.matrix={}}updateMatrix(){}}
const THREE={Scene,WebGLRenderer:Renderer,PerspectiveCamera,Group:Obj,HemisphereLight:Light,DirectionalLight:Light,Mesh,CircleGeometry:Geo,SphereGeometry:Geo,MeshStandardMaterial:Mat,Color:C,BufferGeometry:Geo,Float32BufferAttribute:BA,InstancedMesh,Object3D:Marker,SRGBColorSpace:1,ACESFilmicToneMapping:1};
const settings={
'body.height':172,'body.shoulders':40,'body.chest':31,'body.chest_depth':21,'body.bust':2.6,'body.bust_spacing':18,'body.waist':27.5,'body.waist_depth':19.5,'body.hips':34,'body.hip_depth':23,'body.glutes':1,'body.abdomen':.8,'body.torso_ratio':.31,'body.neck_width':11.5,'body.neck_length':8,'body.shoulder_slope':3,'body.posture':0,'body.fat':.44,'body.muscle':.27,
'arms.length':60,'arms.upper_ratio':.52,'arms.upper_width':9,'arms.forearm_width':7.4,'arms.elbow_width':6.2,'arms.wrist_width':5.2,'arms.relax':9,'arms.forward':1,
'hands.length':10,'hands.width':7.8,'hands.depth':2.7,'hands.fingers':7.6,'hands.finger_width':1.7,'hands.spread':9,'hands.thumb':5.5,'hands.nails':.65,
'legs.stance':19,'legs.length_ratio':.475,'legs.thigh':16.6,'legs.knee':11.1,'legs.calf':12.1,'legs.ankle':7.4,'legs.knee_in':.8,'legs.calf_curve':1.2,'legs.muscle':.31,
'feet.length':25,'feet.width':9.5,'feet.heel':6.2,'feet.instep':6,'feet.arch':1.5,'feet.toe_length':4.5,'feet.toe_splay':.7,'feet.big_toe':.5,
'face.head_width':15.4,'face.head_depth':18.4,'face.head_length':22.8,'face.jaw':11.6,'face.chin':7.8,'face.cheeks':.61,'face.eye_spacing':6.2,'face.eye_size':2.4,'face.iris':1.15,'face.eye_tilt':.5,'face.nose_width':4.1,'face.nose_length':4.9,'face.nose_depth':2.5,'face.lips':1.6,'face.mouth':5.3,'face.ears':5.6,'face.ear_projection':1.3,'face.brows':.6,'face.brow_width':.55,
'hair.style':'afro','hair.length':11,'hair.volume':1.14,'hair.density':220,'hair.curl':.84,'hair.hairline':.4,'hair.asymmetry':.04,'hair.color':'#171210',
'skin.color':'#482a20','skin.roughness':.56,'skin.subsurface':.14,'skin.variation':.17,'skin.specular':.28,'eye.iris_color':'#281910','eye.sclera_tint':'#dfd7cb',
'render.samples':24,'render.resolution':960,'render.background':'#474951','render.light':1,'render.clay':'false'
};
const frame={clientWidth:420,clientHeight:600,replaceChildren(){}};
const glob={THREE,window:{devicePixelRatio:1},ResizeObserver:class{observe(){}disconnect(){}},console};
vm.createContext(glob);
try{
 const fn=vm.runInContext(src+'\nmountClayPreview;',glob);
 const preview=fn(frame,settings);
 if(meshes.length<40)errors.push('too few meshes '+meshes.length);
 let totalVertices=meshes.reduce((n,m)=>n+(m.geometry.a?.length||0)/3,0);
 for (let i=0;i<16;i++){settings['body.hips']=26+i; settings['hair.length']=3+i*.5; preview.update(settings)}
 if(errors.length)throw new Error(errors.join(', '));
 console.log(JSON.stringify({ok:true,meshes:meshes.length,geometryObjects:geos,initialVertexCount:totalVertices,updates:16,previewFunctions:Object.keys(preview)}));
 preview.dispose();
}catch(e){console.error(e.stack);process.exitCode=1}