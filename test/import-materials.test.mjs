import test from 'node:test';
import assert from 'node:assert/strict';
import {assertImportedTextureBudget,MAX_IMPORTED_TEX_SIDE,MAX_IMPORTED_TEX_PIXELS} from '../materials/import-budget.mjs';
const scene=array=>({traverse(fn){for(const material of array)fn({material})}});
const texture=(width,height)=>({isTexture:true,image:{width,height}});
test('imported authored texture maps are counted once across shared materials',()=>{
 const a=texture(1024,1024),b=texture(512,512);
 const report=assertImportedTextureBudget(scene([{map:a,normalMap:b},{map:a,roughnessMap:b}]));
 assert.equal(report.textures,2);assert.equal(report.pixels,1024*1024+512*512);
 assert.equal(report.approxBytes,(1024*1024+512*512)*4);
});
test('oversize or decompression-bomb image textures are rejected after decoding',()=>{
 assert.throws(()=>assertImportedTextureBudget(scene([{map:texture(MAX_IMPORTED_TEX_SIDE+1,1)}])),/resolution/);
 assert.throws(()=>assertImportedTextureBudget(scene([{map:texture(0,128)}])),/resolution/);
 assert.throws(()=>assertImportedTextureBudget(scene(Array.from({length:8},()=>({map:texture(1200,1200)})))),/memory budget/);
 assert.equal(MAX_IMPORTED_TEX_PIXELS,8*1024*1024);
});
