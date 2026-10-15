import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectAuthoredImage,validateAuthoredSet,loadAuthoredSet,MAX_SET_PIXELS} from '../materials/authored.mjs';
import {createPBRLibrary} from '../materials/pbr.mjs';
const png=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0,0,0,0,0]);
const jpeg=Uint8Array.from([255,216,255,224,0,16,74,70,73,70,0,0,0,0,0,0]);
const file=(header=png,mime='image/png')=>({size:header.length,type:mime,slice:()=>({arrayBuffer:async()=>header.buffer.slice(header.byteOffset,header.byteOffset+header.byteLength)})});
let closed=0;
const THREE={Texture:class{dispose(){this.disposed=true}},MeshStandardMaterial:class{constructor(){this.color={setHex:()=>{}};this.normalScale={set:()=>{}};}dispose(){}},DataTexture:class{dispose(){}},SRGBColorSpace:'srgb',NoColorSpace:'linear',RepeatWrapping:1,LinearFilter:2,LinearMipmapLinearFilter:3,RGBAFormat:4,UnsignedByteType:5};
const decode=async()=>({width:1024,height:1024,close(){closed++;}});
test('reject external and spoofed texture resources, accept PNG/JPEG signatures',()=>{
 assert.equal(inspectAuthoredImage(png),true);assert.equal(inspectAuthoredImage(jpeg,'image/jpeg'),true);
 assert.throws(()=>inspectAuthoredImage(new TextEncoder().encode('<svg/>')),/PNG/);
 assert.throws(()=>inspectAuthoredImage(png,'image/svg+xml'),/Unsupported/);
});
test('require color map and cap decoded image size, aggregate pixels and compressed bytes',()=>{
 assert.throws(()=>validateAuthoredSet({normal:{width:128,height:128,bytes:99}}),/albedo/);
 assert.throws(()=>validateAuthoredSet({albedo:{width:4096,height:1024,bytes:10}}),/2048/);
 assert.throws(()=>validateAuthoredSet({albedo:{width:1024,height:1024,bytes:6*1024*1024}}),/5 MiB/);
 assert.throws(()=>validateAuthoredSet({albedo:{width:2048,height:2048,bytes:100},normal:{width:2048,height:2048,bytes:100},orm:{width:128,height:128,bytes:100}}),/32 MiB/);
 assert.equal(MAX_SET_PIXELS,8*1024*1024);
});
test('textures have correct color-space channel assignment and ownership',async()=>{
 closed=0;const a=await loadAuthoredSet(THREE,{albedo:file(),normal:file(jpeg,'image/jpeg'),orm:file()},{decode});
 assert.equal(a.budget.maps,3);assert.equal(a.budget.decodedBytes,12*1024*1024);
 assert.equal(a.textures.albedo.colorSpace,'srgb');assert.equal(a.textures.normal.colorSpace,'linear');assert.equal(a.textures.orm.colorSpace,'linear');
 a.dispose();a.dispose();assert.equal(closed,3);
});
test('invalid upload does not disturb imported maps and releases decoded image data',async()=>{
 closed=0;await assert.rejects(()=>loadAuthoredSet(THREE,{albedo:file(),normal:file(png,'image/svg+xml')},{decode}),/Unsupported/);
 assert.equal(closed,1);
});
test('authored maps update shared material in place, presets restore fallback, aggregate budget bounded',async()=>{
 const lib=createPBRLibrary(THREE),mat=lib.materialFor('buildings');
 const authored=await loadAuthoredSet(THREE,{albedo:file()},{decode});lib.installAuthored('buildings',authored);
 assert.equal(mat,lib.materialFor('buildings'));assert.equal(mat.map,authored.textures.albedo);
 assert.equal(lib.budget.authoredBytes,4*1024*1024);
 lib.update('buildings','stone');assert.ok(!lib.hasAuthored('buildings'));assert.equal(authored.textures.albedo.disposed,true);
 const a=await loadAuthoredSet(THREE,{albedo:file()},{decode});lib.installAuthored('buildings',a);
 const b=await loadAuthoredSet(THREE,{albedo:file()},{decode});lib.installAuthored('robots',b);
 assert.equal(lib.budget.authoredBytes,8*1024*1024);
 const c=await loadAuthoredSet(THREE,{albedo:file()},{decode});
 assert.throws(()=>lib.installAuthored('roads',{...c,budget:{pixels:MAX_SET_PIXELS,decodedBytes:32*1024*1024}}),/32 MiB/);
 c.dispose();lib.dispose();assert.ok(b.textures.albedo.disposed);
});
