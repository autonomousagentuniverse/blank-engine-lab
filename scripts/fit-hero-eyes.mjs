/** Offline, reproducible facial geometry solve; never overwrites input source. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {applyEyeAssemblyFit} from '../geometry/eyelid-fit.mjs';
const [source,dest,artifact]=process.argv.slice(2);
if(!source||!dest||!artifact||resolve(source)===resolve(dest))throw Error('Usage: node geometry/fit-hero-eyes.mjs SOURCE.glb FITTED.glb ARTIFACT.json (distinct paths)');
const input=await readFile(source);
const result=applyEyeAssemblyFit(input,{assetSha256:createHash('sha256').update(input).digest('hex')});
await mkdir(dirname(resolve(dest)),{recursive:true});await mkdir(dirname(resolve(artifact)),{recursive:true});
await writeFile(dest,new Uint8Array(result.buffer));await writeFile(artifact,JSON.stringify(result.sidecar,null,2));
console.log('MEASURED_EYELIDS',JSON.stringify(Object.fromEntries(Object.entries(result.sidecar.measurement.eyelids).map(([side,a])=>[side,{vertices:a.vertices,duplicateUVLoops:a.duplicateUVLoops,width:a.width,height:a.height,center:a.center,fitFactor:a.ellipse.fitFactor,minimumClearance:a.ellipse.minimumClearance}]))));
console.log('EYE_ASSEMBLY_FIT_PASS: sidecar and reversible source-preserving fitted GLB; visual approval NOT granted');
