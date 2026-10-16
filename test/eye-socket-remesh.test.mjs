import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {remeshEyeSockets,SCHEMA} from '../geometry/eye-socket-remesh.mjs';
const path=process.env.BLANK_EYE_V4_FIXTURE;
const data=path?readFileSync(path):null;
const sha=data?createHash('sha256').update(data).digest('hex'):null;
function parse(input){const b=new Uint8Array(input.buffer??input,input.byteOffset??0,input.byteLength);const v=new DataView(b.buffer,b.byteOffset,b.byteLength),n=v.getUint32(12,true),doc=JSON.parse(new TextDecoder().decode(b.slice(20,20+n))),off=20+n;return {doc,bin:b.slice(off+8,off+8+v.getUint32(off,true))};}
function accessor(d,b,i){const a=d.accessors[i],v=d.bufferViews[a.bufferView],size={5121:1,5123:2,5125:4,5126:4}[a.componentType],count={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],offset=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||size*count,view=new DataView(b.buffer,b.byteOffset,b.byteLength);return Array.from({length:a.count},(_,j)=>Array.from({length:count},(_,k)=>{const off=offset+j*stride+k*size;return a.componentType===5126?view.getFloat32(off,true):a.componentType===5121?view.getUint8(off):a.componentType===5123?view.getUint16(off,true):view.getUint32(off,true)}));}
test('v4 source file is only accepted when its actual SHA is supplied',()=>{
 if(!data)return;assert.throws(()=>remeshEyeSockets(data,{sourceSha256:'0'.repeat(64)}),/SHA-256/);
});
test('v4 requires positive bounded offsets',()=>{
 if(!data)return;for(const x of [{recessM:-1},{ringInset:1},{eyeRecessM:1}])assert.throws(()=>remeshEyeSockets(data,{sourceSha256:sha,...x}),/Unsafe/);
});
test('v4 rejects truncated or unrelated input',()=>{
 assert.throws(()=>remeshEyeSockets(new Uint8Array([1,2,3]),{sourceSha256:createHash('sha256').update(Buffer.from([1,2,3])).digest('hex')}),/Invalid GLB/);
});
test('skin topology is expanded in original primitive, not additive floating mesh',()=>{
 if(!data)return;const {buffer,artifact}=remeshEyeSockets(data,{sourceSha256:sha});const {doc}=parse(buffer),old=parse(data).doc;
 assert.equal(artifact.schema,SCHEMA);assert.equal(doc.meshes.length,old.meshes.length);
 assert.equal(doc.meshes[0].primitives.length,1);assert.equal(doc.nodes.length,old.nodes.length);
 assert.equal(doc.accessors[doc.meshes[0].primitives[0].attributes.POSITION].count,8456+112);
 assert.equal(doc.accessors[doc.meshes[0].primitives[0].indices].count,46500+224*3);
 assert.equal(artifact.operations.newTriangles,224);assert.equal(artifact.operations.newVertices,112);
});
test('body joints, weights, material, original triangle indices and four authored clips survive',()=>{
 if(!data)return;const a=parse(data),b=parse(remeshEyeSockets(data,{sourceSha256:sha}).buffer),p0=a.doc.meshes[0].primitives[0],p1=b.doc.meshes[0].primitives[0];
 assert.deepEqual(b.doc.skins,a.doc.skins);assert.deepEqual(b.doc.animations,a.doc.animations);
 assert.equal(p1.material,p0.material);assert.equal(b.doc.materials.length,a.doc.materials.length);
 const oldIndices=accessor(a.doc,a.bin,p0.indices).flat(),nextIndices=accessor(b.doc,b.bin,p1.indices).flat();assert.deepEqual(nextIndices.slice(0,oldIndices.length),oldIndices);
 for(const name of ['JOINTS_0','WEIGHTS_0','TEXCOORD_0']){
  const src=accessor(a.doc,a.bin,p0.attributes[name]),dst=accessor(b.doc,b.bin,p1.attributes[name]);assert.deepEqual(dst.slice(0,src.length),src);
 }
});
test('new geometry inherits normalized valid skin weights and 53-bone joint indices',()=>{
 if(!data)return;const {buffer}=remeshEyeSockets(data,{sourceSha256:sha}),{doc,bin}=parse(buffer),p=doc.meshes[0].primitives[0];
 const j=accessor(doc,bin,p.attributes.JOINTS_0).slice(8456),w=accessor(doc,bin,p.attributes.WEIGHTS_0).slice(8456);
 assert.equal(j.length,112);for(let i=0;i<j.length;i++){assert.ok(j[i].every(x=>Number.isInteger(x)&&x>=0&&x<53));assert.ok(w[i].every(Number.isFinite));assert.ok(Math.abs(w[i].reduce((x,y)=>x+y,0)-1)<.01);}
});
test('original source glTF binary remains byte-for-byte as candidate BIN prefix',()=>{
 if(!data)return;const src=parse(data),end=parse(remeshEyeSockets(data,{sourceSha256:sha}).buffer);
 assert.deepEqual([...end.bin.slice(0,src.bin.length)],[...src.bin]);
});
test('only original eye socket vertices near measured eye region are displaced',()=>{
 if(!data)return;const orig=parse(data),fitted=parse(remeshEyeSockets(data,{sourceSha256:sha}).buffer),p0=orig.doc.meshes[0].primitives[0],p1=fitted.doc.meshes[0].primitives[0];
 const before=accessor(orig.doc,orig.bin,p0.attributes.POSITION),after=accessor(fitted.doc,fitted.bin,p1.attributes.POSITION).slice(0,before.length);
 let touched=0;for(let i=0;i<before.length;i++)if(before[i].some((x,k)=>x!==after[i][k])){
  touched++;assert.ok(Math.abs(before[i][0])<.061&&before[i][1]>1.79&&before[i][1]<1.84&&before[i][2]>.105);assert.ok(Math.abs(after[i][2]-before[i][2])<=.003);
 }assert.ok(touched>=80&&touched<=850);
});
test('existing eye elements are recessed together without changing their authored parentage',()=>{
 if(!data)return;const a=parse(data).doc,b=parse(remeshEyeSockets(data,{sourceSha256:sha}).buffer).doc;
 let n=0;for(let i=0;i<a.nodes.length;i++)if(a.nodes[i].name?.startsWith('Blank.Eye.')){
  assert.equal(b.nodes[i].translation[2],a.nodes[i].translation[2]-.0012);assert.deepEqual(b.nodes[i].mesh,a.nodes[i].mesh);n++;
 }assert.equal(n,8);
});
