import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {HERO_REFERENCE,inspectLabGlb} from '../character-lab/character-spec.mjs';
import {repairSuitedMaterials,inspectSuitedMaterials,NAMES} from '../character-lab/repair.mjs';
test('non-suited GLBs are never patched',()=>assert.throws(()=>repairSuitedMaterials(new ArrayBuffer(28))));
const raw=await readFile('character-lab/assets/hero.glb').catch(()=>null);
if(raw){
 const before=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
 test('source GLB identity is pinned',()=>assert.equal(createHash('sha256').update(raw).digest('hex'),HERO_REFERENCE.sha256));
 test('three source materials are corrected from BLEND to OPAQUE',()=>{
  assert.ok(inspectSuitedMaterials(before).every(m=>m.alphaMode==='BLEND'&&m.doubleSided));
  const m=inspectSuitedMaterials(repairSuitedMaterials(before));assert.deepEqual(m.map(x=>x.name),NAMES);assert.ok(m.every(x=>x.alphaMode==='OPAQUE'&&!x.doubleSided));
 });
 test('repair preserves animations, skeleton, UVs, geometries, textures and is idempotent',()=>{
  const fixed=repairSuitedMaterials(before),a=inspectLabGlb(before).manifest,b=inspectLabGlb(fixed).manifest;
  for(const name of ['meshes','skins','nodes','accessors','bufferViews','images','textures','animations'])assert.deepEqual(b[name],a[name]);
  assert.deepEqual(new Uint8Array(fixed),new Uint8Array(repairSuitedMaterials(fixed)));
 });
}
