import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectKTX2,estimateTextureBytes,recommendedTextureSide,loadCompressedAuthoredSet,createKTX2Adapter,KTX2_IDENTIFIER} from '../materials/compression.mjs';
import {encodeArguments} from '../scripts/encode-ktx2.mjs';
import {createPBRLibrary} from '../materials/pbr.mjs';
function header({width=128,height=128,levels=1,format=0,depth=0,layers=0,faces=1}={}) {
 const data=new Uint8Array(80);data.set(KTX2_IDENTIFIER);
 const v=new DataView(data.buffer);v.setUint32(12,format,true);v.setUint32(20,width,true);v.setUint32(24,height,true);v.setUint32(28,depth,true);v.setUint32(32,layers,true);v.setUint32(36,faces,true);v.setUint32(40,levels,true);return data;
}
function mockFile(bytes,name='test.ktx2',type='application/octet-stream'){
 const b=new Blob([bytes],{type});return {name,type,size:b.size,slice:(...args)=>b.slice(...args)};
}
class Tex {constructor(image={width:128,height:128},compressed=false){this.image=image;this.isCompressedTexture=compressed;this.mipmaps=compressed?[{data:new Uint8Array(512)}]:[];this.disposed=false;this.normalScale={set(){}};this.color={setHex(){}}}dispose(){this.disposed=true}}
const THREE={Texture:Tex,SRGBColorSpace:'srgb',NoColorSpace:'linear',RepeatWrapping:'repeat',MeshStandardMaterial:class {dispose(){}},DataTexture:Tex,RGBAFormat:1,UnsignedByteType:1};
test('KTX2 header parses standard Basis 2D, bounds resolution and formats',()=>{
 assert.deepEqual(inspectKTX2(header()),{width:128,height:128,levels:1});
 for(const variant of [{width:4096},{height:0},{faces:6},{depth:1},{layers:3},{levels:12},{format:37}])assert.throws(()=>inspectKTX2(header(variant)));
 assert.throws(()=>inspectKTX2(new Uint8Array(80)));
});
test('GPU estimates use actual compressed mip bytes and conservative raster mip budget',()=>{
 assert.equal(estimateTextureBytes(new Tex(undefined,true),128,128),512);
 assert.equal(estimateTextureBytes(new Tex(),128,128),Math.ceil(128*128*4*4/3));
 assert.equal(recommendedTextureSide({mobile:true}),1024);
 assert.equal(recommendedTextureSide({deviceMemory:2}),1024);
 assert.equal(recommendedTextureSide({deviceMemory:8}),2048);
});
test('KTX2 adapter probes renderer and revokes blob URLs on successful transcode',async()=>{
 const initial=globalThis.URL.createObjectURL,revoke=globalThis.URL.revokeObjectURL;
 globalThis.URL.createObjectURL=()=> 'blob:test';let count=0;globalThis.URL.revokeObjectURL=()=>count++;
 class Loader{setTranscoderPath(p){this.path=p;return this}setWorkerLimit(n){this.workers=n;return this}detectSupport(r){this.renderer=r;return this}async loadAsync(u){assert.equal(u,'blob:test');return new Tex(undefined,true)}dispose(){this.disposed=true}}
 try{const adapter=createKTX2Adapter(Loader,{capability:true});await adapter.load(new Blob([header()]));adapter.dispose();assert.equal(count,1);await assert.rejects(adapter.load(new Blob()),/disposed/);}finally{globalThis.URL.createObjectURL=initial;globalThis.URL.revokeObjectURL=revoke;}
});
test('Compressed albedo + raster ORM import respects color spaces and GPU payload',async()=>{
 const input=mockFile(header(),'color.ktx2');
 const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0,0,0,0,0]);
 const bitmap={width:64,height:64,close(){this.closed=true}};
 const result=await loadCompressedAuthoredSet(THREE,{albedo:input,orm:mockFile(png,'orm.png','image/png')},{transcoder:{load:async()=>new Tex(undefined,true)},decode:async()=>bitmap});
 assert.equal(result.budget.compressedSlots,1);assert.equal(result.budget.gpuEstimatedBytes,512+Math.ceil(64*64*4*4/3));
 assert.equal(result.textures.albedo.colorSpace,'srgb');assert.equal(result.textures.orm.colorSpace,'linear');
 result.dispose();assert.equal(bitmap.closed,true);assert.equal(result.textures.albedo.disposed,true);
});
test('Missing device transcode support is explicit and rejects previously invalid files',async()=>{
 await assert.rejects(loadCompressedAuthoredSet(THREE,{albedo:mockFile(header())}),/unavailable/);
 await assert.rejects(loadCompressedAuthoredSet(THREE,{albedo:mockFile(header({width:4096}))},{transcoder:{load(){}}}),/2048/);
});
test('Transcode failure falls back to local raster instead of losing the material',async()=>{
 const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0,0,0,0,0]);
 const fallback=mockFile(png,'fallback.png','image/png');
 const out=await loadCompressedAuthoredSet(THREE,{albedo:mockFile(header())},{transcoder:{load:async()=>{throw Error('unsupported GPU')}},fallbacks:{albedo:fallback},decode:async()=>({width:128,height:128,close(){}})});
 assert.equal(out.budget.compressedSlots,0);assert.equal(out.budget.fallbackSlots,1);out.dispose();
 await assert.rejects(loadCompressedAuthoredSet(THREE,{albedo:mockFile(header())},{transcoder:{load:async()=>{throw Error('unsupported GPU')}}}),/unsupported GPU/);
});
test('Mismatched transcoded header is rejected and GPU texture disposed',async()=>{
 let tex;await assert.rejects(loadCompressedAuthoredSet(THREE,{albedo:mockFile(header())},{transcoder:{load:async()=>(tex=new Tex({width:255,height:128},true))}}),/incompatible/);assert.equal(tex.disposed,true);
});
test('Budget failure disposes earlier texture allocations',async()=>{
 let previous;const a=mockFile(header({width:2048,height:2048}),'a.ktx2');const b=mockFile(header({width:2048,height:2048}),'b.ktx2');
 await assert.rejects(loadCompressedAuthoredSet(THREE,{albedo:a,normal:b,orm:b},{transcoder:{load:async()=>{const x=new Tex({width:2048,height:2048},true);x.mipmaps=[{data:new Uint8Array(12*1024*1024)}];previous??=x;return x}}}),/budget/);
 assert.equal(previous.disposed,true);
});
test('Offline converter keeps sRGB albedo and linear normal/ORM',()=>{
 const a=encodeArguments('c.png','c.ktx2');assert(a.includes('R8G8B8A8_SRGB'));assert(a.includes('basis-lz'));
 const b=encodeArguments('normal.png','normal.ktx2',{slot:'normal',quality:'high'});assert(b.includes('R8G8B8A8_UNORM'));assert(b.includes('uastc-ldr-4x4'));assert(b.includes('--zstd'));
 assert.throws(()=>encodeArguments('x.jpg','y.ktx2'));
});
