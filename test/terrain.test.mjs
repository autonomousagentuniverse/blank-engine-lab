import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTerrainFeatures,TERRAIN_SLOPE_RAD} from '../physics/terrain.mjs';
import {playableLayout,isWalkable} from '../quest.mjs';
import {DEFAULT_SPEC} from '../core.mjs';
test('terrain is deterministic and away from game objectives',()=>{
 for(let seed=10;seed<=22;seed++){
  const layout=playableLayout({...DEFAULT_SPEC,seed,robots:4,buildings:12});
  const features=buildTerrainFeatures(layout);
  assert.deepEqual(features,buildTerrainFeatures(layout));
  assert.equal(features.length,1);
  const ramp=features[0];
  assert.equal(ramp.type,'static-ramp');
  assert(Math.abs(ramp.slopeRadians-TERRAIN_SLOPE_RAD)<1e-9);
  assert(isWalkable(layout,ramp.position.x,ramp.position.z,5));
  assert([layout.spawn,layout.gate,layout.lantern,...layout.robots]
   .every(p=>Math.hypot(p.x-ramp.position.x,p.z-ramp.position.z)>3.7));
 }
});
test('invalid terrain layout is safely rejected',()=>assert.throws(()=>buildTerrainFeatures(null)));
