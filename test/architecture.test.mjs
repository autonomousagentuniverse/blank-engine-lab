import test from 'node:test';
import assert from 'node:assert/strict';
import {facadePlan,MAX_FACADE_WINDOWS} from '../geometry/architecture.mjs';
const sample={width:5.8,depth:4.4,height:24,index:3,seed:42};
test('architecture plan is stable for same GameSpec seed and footprint',()=>{
 assert.deepEqual(facadePlan(sample),facadePlan(sample));
 assert.notDeepEqual(facadePlan({...sample,index:4}),facadePlan(sample));
});
test('geometry details fit original collider footprint and keep entrances clear',()=>{
 for(let seed=0;seed<40;seed++)for(let index=0;index<20;index++){
  const p=facadePlan({...sample,seed,index});
  assert.ok(p.windows.length<=MAX_FACADE_WINDOWS);
  assert.ok(p.windows.every(w=>w.y>=2.6&&w.y+.5<p.height));
  assert.ok(p.windows.every(w=>Math.abs(w.x)<=p.width/2+.03&&Math.abs(w.z)<=p.depth/2+.03));
  assert.ok(p.door.y>0&&p.door.y<2);
  assert.ok(p.drawCallBudget<=11);
 }
});
test('small low-rise buildings fit mobile window budget',()=>{
 const p=facadePlan({width:2.5,depth:1.9,height:6,index:0,seed:2});
 assert.ok(p.windows.length<=MAX_FACADE_WINDOWS);
});
test('reject malformed footprints and unsupported quality settings',()=>{
 for(const x of [{...sample,width:0},{...sample,height:Infinity},{...sample,seed:1.5},{...sample,detail:'ultra'}]){
  assert.throws(()=>facadePlan(x));
 }
});
