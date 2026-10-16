import test from 'node:test';
import assert from 'node:assert/strict';
import {repairHeroEyes,inspectHeroEyes} from '../character-lab/eyes.mjs';
function sample(){
 const doc={asset:{version:'2.0'},nodes:Array.from({length:57},(_,i)=>({name:i===38?'head':'Bone'+i})),
 meshes:['base','suit','shoe'].map(name=>({name,primitives:[]})),
 materials:['Human.body','Human.male_casualsuit01','Human.shoes01'].map(name=>({name,alphaMode:'OPAQUE'})),
 skins:[{joints:Array.from({length:53},(_,i)=>i)}],animations:[{},{},{},{}],buffers:[{byteLength:4}],bufferViews:[],accessors:[]};
 const raw=new TextEncoder().encode(JSON.stringify(doc)),n=(raw.length+3)&~3,out=new ArrayBuffer(12+8+n+8+4),v=new DataView(out),b=new Uint8Array(out);
 v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,out.byteLength,true);
 v.setUint32(12,n,true);v.setUint32(16,0x4e4f534a,true);b.set(raw,20);b.fill(32,20+raw.length,20+n);
 v.setUint32(20+n,4,true);v.setUint32(24+n,0x004e4942,true);b.set([1,2,3,4],28+n);
 return out;
}
function decode(buffer){const v=new DataView(buffer),n=v.getUint32(12,true),doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,n))),off=20+n;return {doc,bin:[...new Uint8Array(buffer,off+8,v.getUint32(off,true))]}}
test('eye repair adds 8 head-bone-attached nodes using 4 shared meshes',()=>{
 const result=repairHeroEyes(sample()),r=decode(result);
 assert.deepEqual(inspectHeroEyes(result),{nodes:8,meshes:4,materials:4,joints:53,clips:4});
 assert.equal(r.doc.nodes[38].children.length,8);
 assert.ok(r.doc.nodes.slice(57).every(n=>n.name.startsWith('Blank.Eye.')));
});
test('corrected eyes preserve original rig, animation and binary geometry',()=>{
 const old=decode(sample()),next=decode(repairHeroEyes(sample()));
 assert.deepEqual(next.bin.slice(0,old.bin.length),old.bin);
 assert.deepEqual(next.doc.skins,old.doc.skins);
 assert.deepEqual(next.doc.animations,old.doc.animations);
 assert.deepEqual(next.doc.meshes.slice(0,3),old.doc.meshes);
});
test('reject corrupt inputs and unrelated avatars',()=>{
 assert.throws(()=>repairHeroEyes(new ArrayBuffer(8)),/GLB/);
 assert.throws(()=>repairHeroEyes(repairHeroEyes(sample())),/pinned opaque/);
});

test('sclera is flatter and more recessed than the original round-eye prototype',()=>{
 const result=repairHeroEyes(sample()),r=decode(result),eye=r.doc.meshes.find(x=>x.name==='Blank.Eye.sclera');
 const a=r.doc.accessors[eye.primitives[0].attributes.POSITION];
 assert.ok(a.max[1]<.005 && a.min[1]>-.005,'eye vertically bounded within lids');
 assert.ok(a.max[2]<=.0101);
});
