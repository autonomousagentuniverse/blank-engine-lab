import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectAvatarGlb,MAX_AVATAR_BYTES} from '../character/gltf.mjs';
import {mapHumanoidBones,normalizeBoneName,assertHumanoidMap,retargetRotationClip} from '../character/retarget.mjs';
import {readFileSync} from 'node:fs';
const rootUrl=new URL('../',import.meta.url);
function glb(manifest,bin=new Uint8Array(4)){
  const raw=Buffer.from(JSON.stringify(manifest));
  const padded=(raw.length+3)&~3,bytes=20+padded+8+bin.length;
  const buffer=new ArrayBuffer(bytes),dv=new DataView(buffer);
  dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,bytes,true);
  dv.setUint32(12,padded,true);dv.setUint32(16,0x4e4f534a,true);
  const target=new Uint8Array(buffer);target.set(raw,20);target.fill(0x20,20+raw.length,20+padded);
  dv.setUint32(20+padded,bin.length,true);dv.setUint32(24+padded,0x004e4942,true);target.set(bin,28+padded);
  return buffer;
}
const base={asset:{version:'2.0'},nodes:[{name:'Hips'}],skins:[{joints:[0]}],buffers:[{byteLength:4}],meshes:[]};
test('valid self-contained glTF2 GLB accepted without network access',()=>assert.equal(inspectAvatarGlb(glb(base)).asset.version,'2.0'));
test('reject malformed headers, wrong size and payload budget',()=>{
  const input=glb(base);const invalid=input.slice(0);new DataView(invalid).setUint32(4,1,true);
  assert.throws(()=>inspectAvatarGlb(invalid),/header/);
  assert.throws(()=>inspectAvatarGlb(new ArrayBuffer(MAX_AVATAR_BYTES+1)),/8 MB/);
  const truncated=input.slice(0);new DataView(truncated).setUint32(12,8000,true);
  assert.throws(()=>inspectAvatarGlb(truncated),/length/);
});
test('no external bin, image, or required decoder extensions',()=>{
  assert.throws(()=>inspectAvatarGlb(glb({...base,buffers:[{uri:'https://example.com/model.bin'}]})),/External/);
  assert.throws(()=>inspectAvatarGlb(glb({...base,images:[{uri:'../../secret.png'}]})),/External/);
  assert.throws(()=>inspectAvatarGlb(glb({...base,extensionsRequired:['KHR_draco_mesh_compression']})),/extended/);
});
test('reject excessive bone, node, and animation budgets',()=>{
  assert.throws(()=>inspectAvatarGlb(glb({...base,skins:[{joints:Array(129).fill(0)}]})),/limits/);
  assert.throws(()=>inspectAvatarGlb(glb({...base,nodes:Array(401).fill({})})),/limits/);
  assert.throws(()=>inspectAvatarGlb(glb({...base,animations:Array(33).fill({})})),/limits/);
});
function skeleton(names){const bones=names.map(name=>({isBone:true,name}));return {traverse(fn){bones.forEach(fn)},bones};}
const mixamorig=['mixamorigHips','mixamorigSpine','mixamorigHead','mixamorigLeftArm','mixamorigRightArm','mixamorigLeftUpLeg','mixamorigRightUpLeg'];
test('map canonical roles across Mixamo names and Blender naming',()=>{
  const src=assertHumanoidMap(mapHumanoidBones(skeleton(mixamorig)));
  const dst=assertHumanoidMap(mapHumanoidBones(skeleton(['Hips','Spine','Head','UpperArm.L','UpperArm.R','Thigh.L','Thigh.R'])));
  assert.equal(src.leftUpperArm.name,'mixamorigLeftArm');assert.equal(dst.leftUpperLeg.name,'Thigh.L');
  assert.equal(normalizeBoneName('Armature|mixamorig:LeftArm'),'leftarm');
  assert.throws(()=>assertHumanoidMap(mapHumanoidBones(skeleton(['Spine','Head']))),/missing/);
});
class Q {
  constructor(x=0,y=0,z=0,w=1){Object.assign(this,{x,y,z,w});}
  clone(){return new Q(this.x,this.y,this.z,this.w)}
  invert(){this.x=-this.x;this.y=-this.y;this.z=-this.z;return this}
  lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}
  normalize(){const l=Math.sqrt(this.lengthSq());this.x/=l;this.y/=l;this.z/=l;this.w/=l;return this}
  multiply(q){const a=this.clone();this.x=a.w*q.x+a.x*q.w+a.y*q.z-a.z*q.y;this.y=a.w*q.y-a.x*q.z+a.y*q.w+a.z*q.x;this.z=a.w*q.z+a.x*q.y-a.y*q.x+a.z*q.w;this.w=a.w*q.w-a.x*q.x-a.y*q.y-a.z*q.z;return this}
  premultiply(q){const temp=q.clone().multiply(this);Object.assign(this,temp);return this}
}
class Track{constructor(name,times,values){Object.assign(this,{name,times,values})}}
class Clip{constructor(name,duration,tracks){Object.assign(this,{name,duration,tracks})}}
const MockThree={Quaternion:Q,QuaternionKeyframeTrack:Track,AnimationClip:Clip};
test('rotation-only retargets to target bone names, never root motion',()=>{
  const src=skeleton(mixamorig),dst=skeleton(['Hips','Spine','Head','UpperArm.L','UpperArm.R','Thigh.L','Thigh.R']);
  src.bones.forEach(b=>b.quaternion=new Q());dst.bones.forEach(b=>b.quaternion=new Q());
  const clip=new Clip('Walk',1,[new Track('mixamorigLeftArm.quaternion',[0,1],[0,0,0,1,.1,0,0,.995]),new Track('mixamorigHips.position',[0,1],[0,0,0,20,0,0])]);
  const out=retargetRotationClip(MockThree,clip,src,dst);
  assert.equal(out.tracks.length,1);assert.equal(out.tracks[0].name,'UpperArm.L.quaternion');
  assert(Math.abs(out.tracks[0].values[4]-.1)<.001);
  assert.throws(()=>retargetRotationClip(MockThree,new Clip('bad',1,[new Track('mixamorigLeftArm.position',[0],[0,0,0])]),src,dst),/No supported/);
});
test('retarget rejects invalid keyframe data',()=>{
  const src=skeleton(mixamorig),dst=skeleton(['Hips','Spine','Head','UpperArm.L','UpperArm.R','Thigh.L','Thigh.R']);
  src.bones.forEach(b=>b.quaternion=new Q());dst.bones.forEach(b=>b.quaternion=new Q());
  assert.throws(()=>retargetRotationClip(MockThree,new Clip('bad',1,[new Track('mixamorigLeftArm.quaternion',[1,0],[0,0,0,1,0,0,0,1])]),src,dst),/keyframes/);
});
test('browser has an import-map for pinned GLTFLoader and import controls',()=>{
 const html=readFileSync(new URL('index.html',rootUrl),'utf8'),editor=readFileSync(new URL('editor.mjs',rootUrl),'utf8');
 assert.match(html,/type="importmap"/);assert.match(html,/id="avatarInput"/);assert.match(html,/id="avatarStatus"/);assert.match(html,/id="motionInput"/);
 assert.match(editor,/loadGlbAvatar/);assert.match(editor,/loadMotionBytes/);assert.match(editor,/restoring:true/);
 assert.doesNotMatch(editor,/NVIDIA_API_KEY|BLANK_PG_URL/);
});
