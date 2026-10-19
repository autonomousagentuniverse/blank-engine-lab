import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEFAULTS,CONTROLS} from '../character-pipeline/manual-builder/controls.mjs';
import {targetAt,secondaryVertex,populationWeights,sexBlend,MORPH_FILES} from '../character-pipeline/manual-builder/morph-engine.mjs';

test('source remains genuine MakeHuman anatomy, with gender and population macros pinned',async()=>{
 const asset=JSON.parse(await readFile(new URL('../character-pipeline/manual-builder/basemesh.json',import.meta.url),'utf8'));
 assert.equal(asset.source_license,'CC0');
 assert.equal(asset.source_commit,'3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf');
 assert.equal(asset.body_indices.length/3,26756);
 assert.equal(asset.position_xyz.length/3,13524);
 assert.equal(MORPH_FILES.length,6);
 assert.ok(MORPH_FILES.includes('african-male-young'));
 assert.ok(MORPH_FILES.includes('asian-female-young'));
 assert.ok(MORPH_FILES.includes('caucasian-male-young'));
});

test('feminine/masculine and African/East Asian/European/mixed are morph interpolations, not skin recolors',()=>{
 const macros=Array.from({length:6},(_,i)=>new Float32Array([i*2+1,i+1,-i]));
 let value={...DEFAULTS,'body.gender':'feminine','appearance.population':'african'};
 assert.deepEqual(targetAt(macros,0,value),[1,1,0]);
 value['body.gender']='masculine';assert.deepEqual(targetAt(macros,0,value),[3,2,-1]);
 value['body.gender']='androgynous';assert.deepEqual(targetAt(macros,0,value),[2,1.5,-.5]);
 value['appearance.population']='east-asian';assert.deepEqual(targetAt(macros,0,value),[6,3.5,-2.5]);
 value['appearance.population']='european';assert.deepEqual(targetAt(macros,0,value),[10,5.5,-4.5]);
 value['appearance.population']='mixed';assert.deepEqual(populationWeights('mixed').map(x=>Math.round(x*3)),[1,1,1]);
 assert.equal(sexBlend('masculine'),1);
 assert.throws(()=>sexBlend('unknown'));
});

test('93 controls have preview bindings or are explicitly Blender-only',async()=>{
 assert.equal(CONTROLS.length,93);
 const preview=await readFile(new URL('../character-pipeline/manual-builder/preview.mjs',import.meta.url),'utf8');
 const engine=await readFile(new URL('../character-pipeline/manual-builder/morph-engine.mjs',import.meta.url),'utf8');
 const app=await readFile(new URL('../character-pipeline/manual-builder/app.mjs',import.meta.url),'utf8');
 const missing=CONTROLS.map(x=>x.id).filter(id=>!preview.includes("'"+id+"'")&&!engine.includes("'"+id+"'")&&!app.includes("'"+id+"'"));
 assert.deepEqual(missing,[],`controls with no live or explicit Blender-only wiring: ${missing.join(', ')}`);
 assert.match(app,/render\.samples.*Blender only/);
});

test('regional anatomies are deformable at body, finger, foot, face and lower limb coordinates',()=>{
 const positions=[
  {ox:0,oy:1,oz:1,x:0,y:.9,z:.09,py:.55,front:.5,coreW:1},
  {ox:1.5,oy:4.9,oz:1.3,x:.15,y:1.35,z:.13,py:.785,front:.95,coreW:.6},
  {ox:3.7,oy:2.4,oz:1,x:.37,y:1.1,z:.10,py:.635,front:.8,coreW:0},
  {ox:4.9,oy:1.9,oz:2.1,x:.49,y:1,z:.21,py:.60,front:1,coreW:0},
  {ox:1.2,oy:-7.6,oz:1.62,x:.12,y:.05,z:.16,py:.035,front:1,coreW:0},
  {ox:1.1,oy:-3.0,oz:.4,x:.11,y:.52,z:.04,py:.315,front:.2,coreW:.0},
  {ox:.3,oy:6.5,oz:1.3,x:.03,y:1.5,z:.13,py:.88,front:1,coreW:1},
  {ox:.72,oy:7.2,oz:1.2,x:.072,y:1.6,z:.12,py:.93,front:1,coreW:1},
 ];
 const keys=['hands.width','hands.finger_width','hands.spread','hands.nails','feet.length','feet.toe_length','feet.toe_splay','legs.knee','face.ears','face.brows','body.waist_depth'];
 for(const id of keys){
  const baseline=positions.map(pos=>secondaryVertex(DEFAULTS,{...pos,scale:.1}));
  const c=CONTROLS.find(x=>x.id===id);
  const change={...DEFAULTS,[id]:c.max};
  const updated=positions.map(pos=>secondaryVertex(change,{...pos,scale:.1}));
  assert.ok(updated.some((row,i)=>row.some((v,k)=>Math.abs(v-baseline[i][k])>1e-7)),`${id} has no regional effect`);
 }
});