import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compilePrompt,validateSpec} from '../core.mjs';
import {playableLayout,questPlan} from '../quest.mjs';

const original=validateSpec(JSON.parse(readFileSync(new URL('../examples/neon-frontier-night-market.json',import.meta.url),'utf8')));

test('make it daytime works from original Night Market (reported bug)',()=>{
 const result=compilePrompt('make it daytime',original);
 assert.equal(result.spec.time,'day');
 assert.equal(result.applied.length,1);
});
test('day/night toggle accepts daytime and nighttime forms',()=>{
 const daytime=compilePrompt('Make it daytime',original).spec;
 assert.equal(compilePrompt('Make it nighttime',daytime).spec.time,'night');
 assert.equal(compilePrompt('Switch to daylight',original).spec.time,'day');
 assert.equal(compilePrompt('Switch to night',daytime).spec.time,'night');
});
test('add 5 robots and make it daytime applies both changes in one transaction',()=>{
 const result=compilePrompt('Add 5 robots and make it daytime',original);
 assert.equal(result.spec.robots,9);
 assert.equal(result.spec.time,'day');
 assert.deepEqual(result.applied,['Set daytime','Added 5 robots']);
 const layout=playableLayout(result.spec);
 assert.equal(layout.robots.length,9);
 assert.equal(questPlan(result.spec,layout).robotCount,9);
 assert.equal(original.robots,4,'Original spec not mutated');
});
test('combined command works in reverse order too',()=>{
 const result=compilePrompt('Make it daytime then add 5 robots',original);
 assert.equal(result.spec.robots,9);
 assert.equal(result.spec.time,'day');
});
test('time instructions respect last requested state',()=>{
 assert.equal(compilePrompt('change night to daytime',original).spec.time,'day');
 assert.equal(compilePrompt('change day to nighttime',original).spec.time,'night');
});
test('mobile editor visibly reports the updated counts and lighting',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const editor=readFileSync(new URL('../editor.mjs',import.meta.url),'utf8');
 assert.match(html,/id="worldLiveSummary"/);
 assert.match(editor,/worldLiveSummary.*spec\.robots/);
 assert.match(editor,/\$\('runBtn'\)\.onclick=.*applyPrompt/);
 assert.match(editor,/\$\('dayBtn'\)\.onclick=.*applyPrompt/);
});
