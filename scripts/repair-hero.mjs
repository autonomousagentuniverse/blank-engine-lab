import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {dirname} from 'node:path';
import {HERO_REFERENCE} from '../character-lab/character-spec.mjs';
import {repairSuitedMaterials,inspectSuitedMaterials} from '../character-lab/repair.mjs';
const from=process.argv[2]||'character-lab/assets/hero.glb',to=process.argv[3]||'artifacts/blank-hero-suited-repaired.glb',raw=await readFile(from);
if(raw.length!==HERO_REFERENCE.bytes||createHash('sha256').update(raw).digest('hex')!==HERO_REFERENCE.sha256)throw Error('Pinned CC0 GLB mismatch');
const buf=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),out=new Uint8Array(repairSuitedMaterials(buf));
await mkdir(dirname(to),{recursive:true});await writeFile(to,out);
console.log('REPAIRED_HERO_GLB_PASS',JSON.stringify({bytes:out.length,sha256:createHash('sha256').update(out).digest('hex'),materials:inspectSuitedMaterials(out.buffer)}));
