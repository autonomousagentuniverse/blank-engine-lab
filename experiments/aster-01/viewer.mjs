import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const canvas=document.getElementById('mount');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:false});
renderer.setSize(1024,840);renderer.setPixelRatio(1);
renderer.setClearColor(0x101820);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
canvas.appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x17212d);
scene.fog=new THREE.FogExp2(0x17212d,.029);
const hemi=new THREE.HemisphereLight(0xcfe8ff,0x181b25,3.0);scene.add(hemi);
function lamp(x,y,z,color,power){const l=new THREE.DirectionalLight(color,power);l.position.set(x,y,z);scene.add(l);}
lamp(-4,8,8,0xffecdc,4.8);lamp(4,3,2,0x70d7ff,3.3);lamp(2,6,-5,0xffbb73,2.6);
const floor=new THREE.Mesh(new THREE.CircleGeometry(3.3,80),new THREE.MeshStandardMaterial({color:0x101821,metalness:.4,roughness:.62}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.008;scene.add(floor);
const grid=new THREE.GridHelper(9,24,0x2d6275,0x233e4b);grid.position.y=-.01;scene.add(grid);
const camera=new THREE.PerspectiveCamera(34,1024/840,.01,60);
let model=null,animations=[],mixer=null,metrics=null;
async function load(){
 if(model)return metrics;
 const data=await new GLTFLoader().loadAsync('/artifacts/aster-01/aster-01.glb');
 model=data.scene;scene.add(model);
 model.updateWorldMatrix(true,true);
 const names=[];const mats=new Set();
 let nodes=0,polygons=0,emissive=0;
 model.traverse(o=>{if(!o.isMesh)return;nodes++;names.push(o.name);
  polygons+=o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3;
  (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m){
    mats.add(m);if(m.emissiveIntensity>0&&m.emissive.getHex()!==0)emissive++;
  }});
 });
 if(nodes<80||!names.some(n=>n.includes('ASTER_Cranium'))||names.some(n=>n.toLowerCase().includes('einar')))
  throw new Error('Not the independent freshly authored android geometry');
 if(data.animations.length<1)throw new Error('Authored Aster head animation not exported');
 const animCount=data.animations.length;
 animations=data.animations;mixer=new THREE.AnimationMixer(model);
 metrics={schema:'blank.aster01.real-webgl.v1',origin:'original_blender_bpy_geometry',
  asset_id:'aster-01',mesh_count:nodes,triangles:Math.round(polygons),
  material_count:mats.size,emissive_mesh_count:emissive,animation_clips:animCount,
  original_animations_present:true,reuses_einar_meshes:false,
  output:'REAL Three.js/Blank Engine Chrome WebGL canvas, not old Einar picture',
  human_photorealism_approved:false};
 document.getElementById('status').textContent='ASTER-01 · Original 3D Android · WebGL';
 return metrics;
}
function show(view='three_quarter'){
 if(!model)throw new Error('Must load new asset');
 if(mixer)mixer.setTime(0);
 const points={
 front:{pos:[0,1.82,8.8],target:[0,1.62,0],fov:30},
 three_quarter:{pos:[5.5,2.75,7.8],target:[0,1.62,0],fov:32},
 profile:{pos:[9.2,2.1,0],target:[0,1.64,0],fov:32},
 face_macro:{pos:[0,2.82,3.4],target:[0,2.67,0],fov:34}
 };
 const p=points[view];if(!p)throw Error('Unknown camera');
 camera.fov=p.fov;camera.position.set(...p.pos);camera.lookAt(...p.target);camera.updateProjectionMatrix();
 renderer.render(scene,camera);
 return {...metrics,view};
}
function pose(seconds){
 if(!mixer)throw new Error('No authored animation');
 mixer.setTime(seconds);renderer.render(scene,camera);
 return {seconds,animation_clips:animations.length};
}
window.asterViewer={load,show,pose,metrics:()=>metrics};
document.getElementById('status').textContent='Waiting for real original 3D GLB…';
