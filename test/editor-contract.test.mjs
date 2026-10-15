import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const editor=readFileSync(new URL('../editor.mjs',import.meta.url),'utf8');
test('HTML exposes all runtime bindings expected by editor',()=>{
 for(const [,id] of editor.matchAll(/\$\('([a-zA-Z0-9]+)'\)/g))assert.match(html,new RegExp(`\\bid="${id}"`),`Missing element id ${id}`);
});
test('NVIDIA/PG secrets never appear in browser source',()=>{
 for(const content of [editor,html,readFileSync(new URL('../quest.mjs',import.meta.url),'utf8')]){
  assert.doesNotMatch(content,/NVIDIA_API_KEY|BLANK_PG_URL|process\.env|api\.nvidia\.com/i);
 }
});
test('editor imports deterministic quest reducer and real demo asset',()=>{
 assert.match(editor,/from '\.\/quest\.mjs'/);
 assert.match(editor,/fetch\('\.\/examples\/neon-frontier-night-market\.json'/);
 assert.match(html,/id="interactBtn"/);
 assert.match(html,/id="restartQuestBtn"/);
});
