import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {constructEyelidRibbons,reconstructHeroEyelids,LID_SCHEMA} from '../geometry/eyelid-reconstruction.mjs';
const real=process.env.BLANK_EYE_GLTF_FIXTURE;
function raw(){const b=readFileSync(real);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}
function decode(b){const u=new Uint8Array(b),v=new DataView(b),len=v.getUint32(12,true),doc=JSON.parse(new TextDecoder().decode(u.slice(20,20+len)));return {doc,bin:u.slice(28+len,28+len+new DataView(b).getUint32(20+len,true))}}
function outline(){return Array.from({length:28},(_,i)=>{const t=i*Math.PI*2/28;return [Math.cos(t)*.012,Math.sin(t)*.004,.15+Math.sin(t)*.002]})}
test('eyelid strips use measured contours and generate positive area and finite normals',()=>{
 const p=outline(),r=constructEyelidRibbons(p,[0,0,.15]);
 assert.equal(r.boundary.vertices,28);assert.ok(r.upper.vertices>10);assert.ok(r.lower.triangles>12);
 for(const s of [r.upper,r.lower]){
  assert.ok(s.positions.every(Number.isFinite));assert.ok(s.normals.every(Number.isFinite));
  assert.equal(s.indices.length,s.triangles*3);
  assert.ok(s.indices.every(i=>i<s.vertices));
  for(let i=0;i<s.normals.length;i+=3)assert.ok(Math.abs(Math.hypot(...s.normals.slice(i,i+3))-1)<1e-5);
 }
});
test('reject self-crossing and invalid geometry parameters',()=>{
 const p=outline();const q=p.slice();[q[2],q[15]]=[q[15],q[2]];
 assert.throws(()=>constructEyelidRibbons(q,[0,0,.15]),/intersect|Degenerate/);
 assert.throws(()=>constructEyelidRibbons(p,[0,0,.15],{roundover:-1}),/constraints/);
});
test('measure source-pinned v3 without changing existing GLB nodes, UVs, skins or clips',{skip:!real},()=>{
 const b=raw(),before=decode(b),sha=createHash('sha256').update(new Uint8Array(b)).digest('hex');
 const {buffer,artifact}=reconstructHeroEyelids(b,{assetSha256:sha});const after=decode(buffer);
 assert.equal(artifact.schema,LID_SCHEMA);assert.equal(artifact.review.status,'requires-visual-approval');
 assert.equal(artifact.output.addedMeshes,4);assert.equal(artifact.output.addedNodes,4);assert.ok(artifact.output.addedTriangles>100);
 assert.deepEqual(after.doc.meshes.slice(0,before.doc.meshes.length),before.doc.meshes);
 assert.deepEqual(after.doc.nodes.slice(0,38),before.doc.nodes.slice(0,38));
 assert.deepEqual(after.doc.skins,before.doc.skins);assert.deepEqual(after.doc.animations,before.doc.animations);
 assert.deepEqual(after.doc.accessors.slice(0,before.doc.accessors.length),before.doc.accessors);
 assert.deepEqual([...after.bin.slice(0,before.bin.length)],[...before.bin]);
 for(const node of after.doc.nodes.slice(before.doc.nodes.length))assert.match(node.name,/^Blank.Lid.[LR].(upper|lower)$/);
 assert.equal(after.doc.nodes[38].children.length,before.doc.nodes[38].children.length+4);
 assert.equal(artifact.output.rigJoints,53);assert.equal(artifact.output.animationClips,4);
 assert.ok(after.doc.materials.at(-1).name.includes('preview'));
});
test('source invalid hash and repeated v3 edits are rejected',{skip:!real},()=>{
 const b=raw(),sha=createHash('sha256').update(new Uint8Array(b)).digest('hex');
 assert.throws(()=>reconstructHeroEyelids(b,{assetSha256:'bad'}),/pinned/);
 const {buffer}=reconstructHeroEyelids(b,{assetSha256:sha});const hash=createHash('sha256').update(new Uint8Array(buffer)).digest('hex');
 assert.throws(()=>reconstructHeroEyelids(buffer,{assetSha256:hash}),/pinned|already reconstructed/);
});
