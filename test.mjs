import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SPEC,validateSpec,compilePrompt,worldLayout} from './core.mjs';
test('default GameSpec valid',()=>assert.equal(validateSpec(DEFAULT_SPEC).version,1));
test('reject malicious or malformed spec',()=>{
 assert.throws(()=>validateSpec({...DEFAULT_SPEC,robots:300}));
 assert.throws(()=>validateSpec({...DEFAULT_SPEC,theme:'eval()'}));
 assert.throws(()=>validateSpec({...DEFAULT_SPEC,version:2}));
});
test('spawn robot command',()=>assert.equal(compilePrompt('Add 5 robots',DEFAULT_SPEC).spec.robots,12));
test('theme and time in one command',()=>{
 const s=compilePrompt('Create 10 buildings and use violet lighting in the day',DEFAULT_SPEC).spec;
 assert.equal(s.buildings,28);assert.equal(s.theme,'violet');assert.equal(s.time,'day');
});
test('remove all command',()=>assert.equal(compilePrompt('Remove all robots',DEFAULT_SPEC).spec.robots,0));
test('clamp generated entities',()=>assert.equal(compilePrompt('Add 200 robots',DEFAULT_SPEC).spec.robots,80));
test('unknown command makes no change',()=>assert.deepEqual(compilePrompt('Make a submarine',DEFAULT_SPEC).spec,validateSpec(DEFAULT_SPEC)));
test('deterministic generation and bounded count',()=>{
 assert.deepEqual(worldLayout(DEFAULT_SPEC),worldLayout(DEFAULT_SPEC));
 assert.equal(worldLayout(DEFAULT_SPEC).buildings.length,18);
 assert.equal(worldLayout(DEFAULT_SPEC).robots.length,7);
});
