import test from 'node:test';
import assert from 'node:assert/strict';
import {measureSoleClearance} from '../character/calibration.mjs';
import {updateFootLock} from '../character/motion.mjs';
const p=(x,y,z)=>({x,y,z}),normal=p(0,1,0);
test('ankle-to-sole calibration survives different character proportions',()=>{
 assert.equal(measureSoleClearance(p(0,.16,0),0),.16);
 assert.equal(measureSoleClearance(p(0,.33,0),0),.33);
 assert.equal(measureSoleClearance(p(0,-.1,0),0),0);
 assert.equal(measureSoleClearance(p(0,5,0),0),.4);
 assert.throws(()=>measureSoleClearance(p(0,NaN,0),0),/calibration/);
 assert.throws(()=>measureSoleClearance(p(0,0,0),NaN),/calibration/);
});
test('a calibrated stance targets the ankle above the physical floor',()=>{
 for(const soleOffset of [.12,.27]){
  const foot=p(.28,soleOffset,0),hip=p(.28,1.55,0);
  const state=updateFootLock(null,{stance:true,foot,hip,contact:{y:0,normal},dt:.05,maxReach:2,soleOffset});
  assert(state.point,'valid contact should plant');
  assert(Math.abs(state.point.y-.035-soleOffset)<1e-7);
  assert(state.weight>0);
  const moved=updateFootLock(state,{stance:true,foot:p(.4,soleOffset,0),hip:p(.4,1.55,0),contact:{y:0,normal},dt:.05,maxReach:2,soleOffset});
  assert.deepEqual(moved.point,state.point,'ankle stays planted while avatar root moves');
 }
 assert.throws(()=>updateFootLock(null,{stance:true,foot:p(0,0,0),hip:p(0,1,0),contact:{y:0,normal},dt:.05,soleOffset:Infinity}),/Invalid/);
});
