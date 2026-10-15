#!/usr/bin/env node
/** Real Three.js GLTFExporter -> GLTFLoader -> avatar animation integration smoke.
 * Produces synthetic, self-contained GLB in memory; no external assets or secrets.
 */
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {inspectAvatarGlb,loadGlbAvatar,loadMotionGlb,disposeMotionGlb} from '../character/gltf.mjs';
import {retargetRotationClip,mapHumanoidBones} from '../character/retarget.mjs';
// GLTFExporter expects browser FileReader for Blob-backed buffers.
if(!globalThis.FileReader){globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.({target:this});}).catch(e=>this.onerror?.(e));}
  readAsDataURL(blob){blob.arrayBuffer().then(a=>{this.result=`data:${blob.type||'application/octet-stream'};base64,${Buffer.from(a).toString('base64')}`;this.onloadend?.({target:this});}).catch(e=>this.onerror?.(e));}
};}
const names=['mixamorigHips','mixamorigSpine','mixamorigHead','mixamorigLeftArm','mixamorigRightArm','mixamorigLeftUpLeg','mixamorigRightUpLeg'];
const bones=names.map(name=>{const bone=new THREE.Bone();bone.name=name;return bone;});
bones[0].position.y=1.45;
bones[0].add(bones[1],bones[5],bones[6]);
bones[1].position.y=.43;bones[1].add(bones[2],bones[3],bones[4]);
bones[2].position.y=.5;
bones[3].position.set(-.55,.05,0);bones[4].position.set(.55,.05,0);
bones[5].position.set(-.24,-.75,0);bones[6].position.set(.24,-.75,0);
const geometry=new THREE.BoxGeometry(.9,2.8,.5);
const n=geometry.getAttribute('position').count;
const index=[],weight=[];
for(let i=0;i<n;i++){index.push(0,0,0,0);weight.push(1,0,0,0);}
geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(index,4));
geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weight,4));
const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial({color:0x84c5d7}));
mesh.name='HumanoidBody';mesh.add(bones[0]);mesh.bind(new THREE.Skeleton(bones));
const source=new THREE.Group();source.add(mesh);
const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.42);
const clip=new THREE.AnimationClip('Walk',1,[
 new THREE.QuaternionKeyframeTrack(`${names[5]}.quaternion`,[0,.5,1],[0,0,0,1,...rotation.toArray(),0,0,0,1]),
 new THREE.VectorKeyframeTrack(`${names[0]}.position`,[0,1],[0,1.45,0,100,1.45,0])
]);
const exported=await new Promise((resolve,reject)=>new GLTFExporter().parse(source,resolve,reject,{binary:true,animations:[clip]}));
const ab=exported instanceof ArrayBuffer?exported:exported.buffer.slice(exported.byteOffset,exported.byteOffset+exported.byteLength);
const manifest=inspectAvatarGlb(ab);
assert(manifest.skins.length>=1);
const imported=await new Promise((resolve,reject)=>new GLTFLoader().parse(ab,'',resolve,reject));
const avatar=await loadGlbAvatar(THREE,GLTFLoader,ab);
assert(avatar.skinnedCount>0);assert(avatar.boneCount>=5);
const before=avatar.root.position.y;
avatar.update({motion:'walk',y:0,vx:2,vz:0},.3);
assert.equal(avatar.animation,'walk');
avatar.update({motion:'jump',y:1.26,vx:0,vz:0},.12);
assert.equal(avatar.animation,'jump');
assert.equal(avatar.root.position.y,1.26);
avatar.update({motion:'fall',y:.6,vx:0,vz:0},.12);
assert.equal(avatar.root.position.y,.6);
const src=mapHumanoidBones(imported.scene);
const target=new THREE.Group();
for(const role of ['hips','leftUpperArm','rightUpperArm','leftUpperLeg','rightUpperLeg']){
 const b=new THREE.Bone();b.name={hips:'Hips',leftUpperArm:'UpperArm.L',rightUpperArm:'UpperArm.R',leftUpperLeg:'Thigh.L',rightUpperLeg:'Thigh.R'}[role];target.add(b);
}
const retargeted=retargetRotationClip(THREE,imported.animations.find(c=>c.name==='Walk'),imported.scene,target);
assert(retargeted.tracks.some(t=>t.name==='Thigh.L.quaternion'));
assert(retargeted.tracks.every(t=>!t.name.endsWith('.position')));
// A second animation-donor GLB uses Blender bone labels, not Mixamo labels.
// Verify that the live imported Mixamo avatar accepts retargeted donor movement.
const blenderNames=['Hips','Spine','Head','UpperArm.L','UpperArm.R','Thigh.L','Thigh.R'];
bones.forEach((b,i)=>{b.name=blenderNames[i]});
const donorClip=new THREE.AnimationClip('Run',1,[
 new THREE.QuaternionKeyframeTrack('Thigh.L.quaternion',[0,.5,1],[0,0,0,1,...rotation.toArray(),0,0,0,1]),
 new THREE.VectorKeyframeTrack('Hips.position',[0,1],[0,1.45,0,50,1.45,0])
]);
const donorOutput=await new Promise((resolve,reject)=>new GLTFExporter().parse(source,resolve,reject,{binary:true,animations:[donorClip]}));
const donorAb=donorOutput instanceof ArrayBuffer?donorOutput:donorOutput.buffer.slice(donorOutput.byteOffset,donorOutput.byteOffset+donorOutput.byteLength);
const donor=await loadMotionGlb(THREE,GLTFLoader,donorAb);
const importedStates=avatar.installRetargetedClips(donor);
assert.equal(importedStates,1);
assert.equal(donor.animations[0].name,'Run');
disposeMotionGlb(donor);
avatar.update({motion:'run',y:0,vx:5,vz:0},.2);
assert.equal(avatar.animation,'run');
assert.equal(avatar.root.position.y,0);
avatar.dispose();
console.log(`REAL_AVATAR_SMOKE: PASS; glbBytes=${ab.byteLength}; mappedBones=${avatar.boneCount}; states=walk,jump,fall; retargetedTracks=${retargeted.tracks.length}; donorStates=${importedStates}; physicsY=1.26`);
