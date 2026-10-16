import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {repairSuitedMaterials} from '../character-lab/repair.mjs';
import {finishHeroPBR,inspectHeroFinish} from '../character-lab/hero-finish.mjs';
const input=process.argv[2],output=process.argv[3];if(!input||!output)throw Error('Usage: node scripts/finish-hero.mjs INPUT.glb OUTPUT.glb');
const raw=await readFile(input),finished=finishHeroPBR(repairSuitedMaterials(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)));
await mkdir(dirname(resolve(output)),{recursive:true});await writeFile(output,new Uint8Array(finished));
console.log('HERO_PBR_FINISH_PASS',JSON.stringify({bytes:finished.byteLength,materials:inspectHeroFinish(finished)}));
