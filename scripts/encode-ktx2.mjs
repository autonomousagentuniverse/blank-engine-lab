/** Offline Khronos KTX-Software converter. Requires `ktx` CLI installed locally.
 * No remote services or automatic downloads. Safe spawn argument arrays (no shell).
 */
import {spawnSync} from 'node:child_process';
import {statSync} from 'node:fs';
import {extname} from 'node:path';
export function encodeArguments(input,output,{slot='albedo',quality='balanced'}={}){
 if(!['albedo','normal','orm'].includes(slot))throw Error('Slot must be albedo, normal or orm');
 if(!['balanced','high'].includes(quality))throw Error('Quality must be balanced or high');
 if(!/\.png$/i.test(input)||!/\.ktx2$/i.test(output))throw Error('Expected PNG input and KTX2 output');
 const format=slot==='albedo'?'R8G8B8A8_SRGB':'R8G8B8A8_UNORM';
 const codec=quality==='high'?'uastc-ldr-4x4':'basis-lz';
 return ['create','--format',format,'--generate-mipmap','--encode',codec,...(quality==='high'?['--zstd','15']:[]),input,output];
}
if(process.argv[1]?.endsWith('encode-ktx2.mjs')){
 const args=process.argv.slice(2),dryRun=args.includes('--dry-run');
 const options={slot:args.includes('--normal')?'normal':args.includes('--orm')?'orm':'albedo',quality:args.includes('--high')?'high':'balanced'};
 const paths=args.filter(x=>!x.startsWith('--'));
 try {
  if(paths.length!==2)throw Error('Usage: node scripts/encode-ktx2.mjs input.png output.ktx2 [--normal|--orm] [--high] [--dry-run]');
  const argv=encodeArguments(paths[0],paths[1],options);
  if(dryRun){console.log('ktx',JSON.stringify(argv));}
  else {
   if(!statSync(paths[0]).isFile())throw Error('Input is not a file');
   const result=spawnSync('ktx',argv,{stdio:'inherit',shell:false,timeout:180000});
   if(result.error)throw new Error(`Install the Khronos KTX-Software CLI (ktx): ${result.error.message}`);
   if(result.status!==0)throw Error(`KTX conversion failed (exit ${result.status})`);
   console.log('Created',paths[1]);
  }
 }catch(e){console.error(e.message);process.exitCode=1;}
}
