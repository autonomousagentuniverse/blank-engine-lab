import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const W=960,H=820,renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
document.getElementById('mount').append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x38414a);
scene.add(new THREE.HemisphereLight(0xdfedff,0x575053,2.15));
for(const [p,color,energy] of [[[-3,6,-4],0xffe7d7,3.2],[[3,4,-2],0xe0edff,2.2],[[1,4,4],0xfff6de,2.2]]){
 const light=new THREE.DirectionalLight(color,energy);light.position.set(...p);scene.add(light);
}
const camera=new THREE.PerspectiveCamera(35,W/H,.01,1000);
let model=null, report={},center=new THREE.Vector3(),height=1.7;
async function load(){
 const data=await new GLTFLoader().loadAsync('/artifacts/human-01/human-01.glb');
 model=data.scene;scene.add(model);model.updateWorldMatrix(true,true);
 const bounds=new THREE.Box3().setFromObject(model);
 bounds.getCenter(center);height=bounds.getSize(new THREE.Vector3()).y;
 const names=[];const mats=new Set();let faces=0,meshCount=0,textured=0,skins=0,bones=0;
 model.traverse(o=>{if(o.isMesh){meshCount++;names.push(o.name);
  faces+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;
  if(o.isSkinnedMesh)skins++;
  const arr=Array.isArray(o.material)?o.material:[o.material];
  arr.forEach(m=>{if(m){mats.add(m.name);if(m.map)textured++;}});
 }if(o.isBone)bones++;});
 if(meshCount<3||faces<10000||!names.some(x=>x.includes('HUMAN01_NewPerson_Body')||x.toLowerCase().includes('base')))throw Error('No credible newly parameterized human body in source GLB');
 report={schema:'blank.human01.webgl.v1',asset_id:'human-01',origin:'New MPFB2 parametric human from CC0 assets',
  mesh_count:meshCount,triangles:Math.round(faces),material_count:mats.size,
  textured_material_instances:textured,skin_meshes:skins,rig_bones_in_runtime:bones,
  runtime_threejs_webgl:true,source_einar_used:false,source_aster_used:false,
  images_from_blender_cycles:false,face_photorealism_approved:false,
  node_names:names.slice(0,60),body_height:height};
 document.getElementById('status').textContent='New human loaded from automated MPFB generation; visual quality unapproved.';
 return report;
}
function show(view){
 if(!model)throw Error('Human must be loaded first');
 const cams={
  negative_y:{dir:[0,0,-1],anchor:.55,dist:2.55},
  positive_y:{dir:[0,0,1],anchor:.55,dist:2.55},
  three_quarter:{dir:[.52,.14,-.84],anchor:.55,dist:2.4},
  face_front:{dir:[0,0,-1],anchor:.89,dist:.86},
  face_three_quarter:{dir:[.45,0,-.89],anchor:.89,dist:.87}
 };
 const p=cams[view];if(!p)throw Error('Bad view '+view);
 const bounds=new THREE.Box3().setFromObject(model),min=bounds.min;
 const target=new THREE.Vector3(center.x,min.y+height*p.anchor,center.z);
 const d=new THREE.Vector3(...p.dir).normalize();
 camera.position.copy(target).addScaledVector(d,height*p.dist);
 camera.up.set(0,1,0);camera.lookAt(target);camera.fov=view.startsWith('face')?30:30;
 camera.near=.01;camera.far=1000;camera.updateProjectionMatrix();
 renderer.render(scene,camera);
 return {view,...report};
}
window.humanViewer={load,show,report:()=>report};
document.getElementById('status').textContent='Loading independently generated human…';
