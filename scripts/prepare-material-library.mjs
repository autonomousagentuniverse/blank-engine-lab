#!/usr/bin/env node
/** Reproducible CC0 material-library download. Build-time only; runtime offline.
 * Official Poly Haven API must receive a unique user-agent and source credit.
 * Downloads are checked for host, size and available upstream MD5 hashes.
 */
import {createHash} from 'node:crypto';
import {writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {CC0_CATALOG,catalogEntry,validatePackManifest} from '../materials/catalog.mjs';
const argv=process.argv.slice(2);
const arg=(flag,defaultValue)=>{const i=argv.indexOf(flag);return i<0?defaultValue:argv[i+1];};
const root=resolve(arg('--out','./public'));
const only=arg('--only','all');
const quality=arg('--resolution','1k');
if(!['1k','2k'].includes(quality))throw Error('Resolution must be 1k or 2k');
if(only!=='all'&&!catalogEntry(only))throw Error('Unknown CC0 catalog ID');
const selected=only==='all'?CC0_CATALOG:[catalogEntry(only)];
const userAgent='BlankEngine-OfflineAssetBuilder/0.6 (+https://github.com/autonomousagentuniverse/blank-engine-lab)';
const officialHost=host=>/(^|\.)(polyhaven\.com|polyhaven\.org)$/.test(host);
function extractVariant(record,resolution){
 const bySize=record?.[resolution];
 if(!bySize||typeof bySize!=='object')throw Error(`Asset has no ${resolution} map`);
 for(const ext of ['jpg','png']){
  const v=bySize[ext];
  if(v?.url&&Number.isInteger(v.size)&&v.size>0&&v.size<=5*1048576)return {...v,ext};
 }
 throw Error(`Missing budget-compliant JPG or PNG variant at ${resolution}`);
}
export function selectAssetMaps(payload,resolution='1k'){
 if(!payload||typeof payload!=='object')throw Error('Invalid Poly Haven asset metadata');
 const mapping={albedo:['Diffuse','diff','diffuse'],normal:['nor_gl','NormalGL','normal'],orm:['arm','ARM']};
 const selected={};
 for(const [slot,keys] of Object.entries(mapping)){
  const name=keys.find(k=>Object.hasOwn(payload,k));
  if(!name)throw Error(`Asset missing ${slot} PBR map`);
  selected[slot]=extractVariant(payload[name],resolution);
 }
 return selected;
}
async function officialFetch(url){
 const location=new URL(url);
 if(location.protocol!=='https:'||!officialHost(location.hostname))throw Error('Untrusted PBR download host');
 const result=await fetch(location,{headers:{'user-agent':userAgent,'accept':'application/json, image/jpeg, image/png, */*'}});
 if(!result.ok)throw Error(`Download ${location.pathname}: HTTP ${result.status}`);
 if(!officialHost(new URL(result.url).hostname))throw Error('Unsafe material download redirect');
 return result;
}
async function downloadMap(info,filename){
 const result=await officialFetch(info.url);
 const bytes=new Uint8Array(await result.arrayBuffer());
 if(bytes.length<100||bytes.length>5*1048576||bytes.length!==info.size)throw Error('Source file changed or exceeded 5 MiB');
 if(info.md5&&createHash('md5').update(bytes).digest('hex')!==info.md5)throw Error('Poly Haven source MD5 mismatch');
 const hash=createHash('sha256').update(bytes).digest('hex');
 await writeFile(filename,bytes);
 return {bytes:bytes.length,sha256:hash};
}
async function run(){
 await mkdir(join(root,'library'),{recursive:true});
 const entries=[];
 for(const c of selected){
  const response=await officialFetch(`https://api.polyhaven.com/files/${c.id}`);
  const upstream=await response.json();
  const sources=selectAssetMaps(upstream,quality),maps={};
  const directory=join(root,'library',c.id);
  await mkdir(directory,{recursive:true});
  try{
   for(const slot of ['albedo','normal','orm']){
    const source=sources[slot],name=`${slot}.${source.ext}`,path=`library/${c.id}/${name}`;
    const {bytes,sha256}=await downloadMap(source,join(directory,name));
    maps[slot]={path,bytes,sha256,upstreamMD5:source.md5??null};
   }
  }catch(e){await rm(directory,{recursive:true,force:true});throw e;}
  entries.push({id:c.id,license:'CC0-1.0',metersPerTile:c.metersPerTile,source:c.source,maps});
  console.log(`VERIFIED_CC0_MATERIAL ${c.id}: 3 maps from Poly Haven, ${Object.values(maps).reduce((n,m)=>n+m.bytes,0)} transfer bytes`);
 }
 const manifest={version:1,provider:'Poly Haven',license:'CC0-1.0',resolution:quality,materials:entries};
 validatePackManifest(manifest);
 const temp=join(root,'library','manifest.tmp.json');
 await writeFile(temp,JSON.stringify(manifest,null,2));
 await rename(temp,join(root,'library','manifest.json'));
 console.log(`CC0_MATERIAL_LIBRARY_PASS: ${entries.length} assets, ${entries.length*3} image maps; source license Poly Haven CC0`);
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname))run().catch(e=>{console.error('CC0_MATERIAL_LIBRARY_FAIL:',e.message);process.exitCode=1;});
