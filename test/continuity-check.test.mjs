import test from 'node:test';
import assert from 'node:assert/strict';
import {validateContinuityDiff} from '../scripts/check-continuity.mjs';

const doc='docs/CONTINUITY.md',src='character-lab/lab.mjs';
const entry='+ - 2026-10-16 [PROPOSED] Geometry v3: measure lid depth; baseline only; Chrome acceptance pending.';
test('blocks source changes with no continuity update',()=>{
 assert.equal(validateContinuityDiff({paths:[src],patch:''}).ok,false);
});
test('rejects whitespace-only and non-ledger document changes',()=>{
 assert.equal(validateContinuityDiff({paths:[src,doc],patch:'+  \n+Changed formatting'}).ok,false);
});
test('allows substantive proposed change entry',()=>{
 assert.equal(validateContinuityDiff({paths:[src,doc],patch:entry}).ok,true);
});
test('allows substantive committed change entry',()=>{
 assert.equal(validateContinuityDiff({paths:[src,doc],patch:'+ - 2026-10-16 [COMMITTED] Geometry v3: 4/4 tests, Chrome pending.'}).ok,true);
});
test('rejects entry present only as removed line',()=>{
 assert.equal(validateContinuityDiff({paths:[src,doc],patch:'-'+entry.slice(1)}).ok,false);
});
test('allows continuity-only edits without demanding extra ledger line',()=>{
 assert.equal(validateContinuityDiff({paths:[doc],patch:'+ A typo fixed.'}).ok,true);
});
test('accepts an empty git diff',()=>{
 assert.equal(validateContinuityDiff({paths:[],patch:''}).ok,true);
});
test('rejects invalid or empty entries',()=>{
 assert.equal(validateContinuityDiff({paths:[src,doc],patch:'+ - 2026-10-16 [PROPOSED] x'}).ok,false);
});
