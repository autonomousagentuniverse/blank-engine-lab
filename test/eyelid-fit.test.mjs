import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {meshBoundaryLoops,pointInsideAperture,solveApertureEllipse,measureAndSolveEyeAssembly,applyEyeAssemblyFit,EYE_FIT_SCHEMA} from '../geometry/eyelid-fit.mjs';
const ring=()=>{
 const p=[],tris=[],n=20;
 for(let r=0;r<2;r++)for(let i=0;i<n;i++){
  const a=2*Math.PI*i/n; p.push([(.015+(r===0?.02:.012)*Math.cos(a)),.02+(r===0?.012:.008)*Math.sin(a),.10]);
 }
 for(let i=0;i<n;i++){
  const k=(i+1)%n;tris.push([i,k,n+i],[k,n+k,n+i]);
 }
 return {p,tris};
};
test('extracts ordered closed loops from indexed mesh topology, not projected screenshots',()=>{
 const {p,tris}=ring(),loops=meshBoundaryLoops(p,tris);
 assert.equal(loops.length,2);
 assert.ok(loops.every(x=>x.length===20));
});
test('rejects invalid and nontriangular geometry',()=>{
 const {p}=ring();assert.throws(()=>meshBoundaryLoops(p,[[0,1,999]]),/triangle indices/);
 assert.throws(()=>meshBoundaryLoops(p,[[0,1]]),/Nontriangle/);
});
test('polygon inclusion rejects points outside contoured eye opening',()=>{
 const contour=[[0,0,0],[2,0,0],[2,1,0],[0,1,0]];
 assert.equal(pointInsideAperture([1,.5],contour),true);
 assert.equal(pointInsideAperture([4,.5],contour),false);
});
test('fits sclera projection with explicit margin inside measured aperture',()=>{
 const n=40,contour=Array.from({length:n},(_,i)=>{const a=2*Math.PI*i/n;return [.012*Math.cos(a),.004*Math.sin(a),.15];});
 const aperture={center:[0,0,.15],bounds:{min:[-.012,-.004,.15],max:[.012,.004,.15]},contour};
 const r=solveApertureEllipse(aperture,{minimumClearance:.0004});
 assert.ok(r.fitFactor>.3&&r.fitFactor<.9);
 assert.ok(r.minimumClearance>=.0004-1e-12);
 assert.throws(()=>solveApertureEllipse({...aperture,center:[.1,0,.15]}),/feasible/);
});
test('real-world hero aperture artifact is a measured source, with explicit visual-review gate',async()=>{
 const j=JSON.parse(await readFile(new URL('../geometry/artifacts/hero-eye-assembly.geometry.json',import.meta.url),'utf8'));
 assert.equal(j.schema,EYE_FIT_SCHEMA);
 assert.equal(j.quality.status,'requires-visual-review');
 assert.equal(j.measurement.eyelids.L.vertices,28);assert.equal(j.measurement.eyelids.R.vertices,28);
 assert.ok(Math.abs(j.measurement.eyelids.L.width-.024611)<.00001);
 assert.ok(Math.abs(j.measurement.eyelids.R.height-.008014)<.00001);
 assert.equal(Object.keys(j.proposal.transforms).length,8);
 assert.deepEqual(j.proposal.eyelids,'retained unchanged');
});
// A real GLB acceptance test is separately run in GitHub Actions; it should
// not silently skip missing fixture bytes and pretend that a real model passed.
const source=process.env.BLANK_EYE_GLTF_FIXTURE;
if(source)test('actual hero GLB preserves body mesh, rig and animation data',async()=>{
 const before=new Uint8Array(await readFile(source)),options={assetSha256:createHash('sha256').update(before).digest('hex')};const {doc,bin,sidecar}=measureAndSolveEyeAssembly(before,options);
 const output=applyEyeAssemblyFit(before,options);
 assert.equal(sidecar.measurement.eyelids.L.vertices,28);
 assert.equal(sidecar.measurement.eyelids.R.vertices,28);
 assert.equal(output.sidecar.quality.status,'requires-visual-review');
 const bytes=new Uint8Array(output.buffer);assert.ok(bytes.length>=before.length);
 const fitted=measureAndSolveEyeAssembly(bytes,{assetSha256:createHash('sha256').update(bytes).digest('hex')});
 assert.equal(fitted.doc.animations.length,doc.animations.length);
 assert.deepEqual(fitted.doc.meshes,doc.meshes);
 assert.deepEqual([...fitted.bin], [...bin]);
 for(const side of ['L','R']){
  const aperture=sidecar.measurement.eyelids[side];assert.ok(aperture.ellipse.minimumClearance>=.00035-1e-12);
 }
});
