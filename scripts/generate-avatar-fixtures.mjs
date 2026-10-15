/** Synthetic GLBs representing distinct humanoid proportions and naming conventions.
 * Generated locally in CI: deterministic test assets, no downloads or usage rights.
 */
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {inspectAvatarGlb} from '../character/gltf.mjs';
if(!globalThis.FileReader)globalThis.FileReader=class {
 readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.({target:this})}).catch(e=>this.onerror?.(e))}
 readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result=`data:${blob.type||'application/octet-stream'};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.({target:this})}).catch(e=>this.onerror?.(e))}
};
const alternate={hips:'Hips',spine:'Spine',head:'Head',leftUpperLeg:'Thigh.L',rightUpperLeg:'Thigh.R',leftLowerLeg:'Shin.L',rightLowerLeg:'Shin.R',leftFoot:'Foot.L',rightFoot:'Foot.R',leftUpperArm:'UpperArm.L',rightUpperArm:'UpperArm.R',leftLowerArm:'Forearm.L',rightLowerArm:'Forearm.R',leftHand:'Hand.L',rightHand:'Hand.R'};
const mixamo={hips:'mixamorigHips',spine:'mixamorigSpine',head:'mixamorigHead',leftUpperLeg:'mixamorigLeftUpLeg',rightUpperLeg:'mixamorigRightUpLeg',leftLowerLeg:'mixamorigLeftLeg',rightLowerLeg:'mixamorigRightLeg',leftFoot:'mixamorigLeftFoot',rightFoot:'mixamorigRightFoot',leftUpperArm:'mixamorigLeftArm',rightUpperArm:'mixamorigRightArm',leftLowerArm:'mixamorigLeftForeArm',rightLowerArm:'mixamorigRightForeArm',leftHand:'mixamorigLeftHand',rightHand:'mixamorigRightHand'};
export async function makeCalibrationGlb(variant='tall'){
 if(!['tall','compact'].includes(variant))throw Error('Unknown calibration fixture');
 const tall=variant==='tall',names=tall?mixamo:alternate;
 const bones=Object.fromEntries(Object.entries(names).map(([role,name])=>{const b=new THREE.Bone();b.name=name;return [role,b]}));
 const hips=bones.hips;hips.position.y=tall?1.82:1.33;
 hips.add(bones.spine,bones.leftUpperLeg,bones.rightUpperLeg);
 bones.spine.position.y=tall?.39:.31;
 bones.spine.add(bones.head,bones.leftUpperArm,bones.rightUpperArm);
 bones.head.position.y=tall?.57:.44;
 for(const [side,sign] of [['left',-1],['right',1]]){
  bones[`${side}UpperLeg`].position.set(sign*(tall?.28:.21),-(tall?.27:.20),0);
  bones[`${side}UpperLeg`].add(bones[`${side}LowerLeg`]);
  bones[`${side}LowerLeg`].position.y=-(tall?.72:.50);
  bones[`${side}LowerLeg`].add(bones[`${side}Foot`]);
  bones[`${side}Foot`].position.y=-(tall?.65:.47);
  bones[`${side}UpperArm`].position.set(sign*(tall?.57:.44),0,0);
  bones[`${side}UpperArm`].add(bones[`${side}LowerArm`]);
  bones[`${side}LowerArm`].position.set(sign*(tall?.42:.34),-.19,0);
  bones[`${side}LowerArm`].add(bones[`${side}Hand`]);
  bones[`${side}Hand`].position.set(sign*(tall?.37:.29),-.12,0);
 }
 const height=tall?3.05:2.18;
 const geometry=new THREE.BoxGeometry(tall?.96:.79,height,.45);
 geometry.translate(0,height/2,0);
 const n=geometry.getAttribute('position').count;
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(Array.from({length:n},()=>[0,0,0,0]).flat(),4));
 geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(Array.from({length:n},()=>[1,0,0,0]).flat(),4));
 const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial({color:tall?0x35c7e1:0xf29a67}));
 mesh.name='CalibratedTestBody';mesh.add(hips);mesh.bind(new THREE.Skeleton(Object.values(bones)));
 const scene=new THREE.Group();scene.add(mesh);
 const exported=await new Promise((resolve,reject)=>new GLTFExporter().parse(scene,resolve,reject,{binary:true}));
 const buffer=exported instanceof ArrayBuffer?exported:exported.buffer.slice(exported.byteOffset,exported.byteOffset+exported.byteLength);
 inspectAvatarGlb(buffer);
 return buffer;
}
