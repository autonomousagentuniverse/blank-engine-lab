/** Deterministic offline repair. Never overwrites the pinned original GLB. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {repairSuitedMaterials} from '../character-lab/repair.mjs';
import {finishHeroPBR} from '../character-lab/hero-finish.mjs';
import {repairHeroEyes,inspectHeroEyes} from '../character-lab/eyes.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/hero-eyes-build.mjs INPUT.glb OUTPUT.glb');
const bytes=await readFile(input),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const result=repairHeroEyes(finishHeroPBR(repairSuitedMaterials(buffer)));
await mkdir(dirname(resolve(output)),{recursive:true});
await writeFile(output,new Uint8Array(result));
console.log('HERO_EYES_REPAIR_PASS',JSON.stringify(inspectHeroEyes(result)));
