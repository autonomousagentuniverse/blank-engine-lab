/** Hand-curated, independently authored CC0 PBR assets. Asset IDs are verified
 * against Poly Haven's public asset pages. Only locally prepared maps are loaded
 * at game runtime; no remote texture lookup or API calls on player devices.
 */
export const CC0_PROVIDER = Object.freeze({name:'Poly Haven',license:'CC0-1.0',url:'https://polyhaven.com/license'});
export const CC0_CATALOG=Object.freeze([
  Object.freeze({id:'concrete_wall_004',name:'Worn Concrete',category:'buildings',metersPerTile:2,source:'https://polyhaven.com/a/concrete_wall_004'}),
  Object.freeze({id:'asphalt_02',name:'Weathered Asphalt',category:'roads',metersPerTile:3,source:'https://polyhaven.com/a/asphalt_02'}),
  Object.freeze({id:'wood_planks_grey',name:'Grey Wood Planks',category:'ground',metersPerTile:1.5,source:'https://polyhaven.com/a/wood_planks_grey'}),
  Object.freeze({id:'rusty_metal_03',name:'Rusted Metal',category:'robots',metersPerTile:1.5,source:'https://polyhaven.com/a/rusty_metal_03'}),
  Object.freeze({id:'fabric_leather_02',name:'Worn Leather',category:'armor',metersPerTile:0.5,source:'https://polyhaven.com/a/fabric_leather_02'})
]);
const ids=new Set(CC0_CATALOG.map(a=>a.id));
export function catalogEntry(id){return CC0_CATALOG.find(x=>x.id===id)??null;}
export function safePackPath(path){return typeof path==='string'&&/^library\/[a-z0-9_]+\/(?:albedo|normal|orm)\.(?:jpg|jpeg|png|webp|ktx2)$/.test(path)&&!path.includes('..');}
export function validatePackManifest(manifest){
 if(!manifest||manifest.version!==1||manifest.provider!=='Poly Haven'||!Array.isArray(manifest.materials)||manifest.materials.length>CC0_CATALOG.length)throw Error('Invalid CC0 material pack');
 const seen=new Set();
 return manifest.materials.map(entry=>{
  if(!ids.has(entry.id)||seen.has(entry.id)||entry.license!=='CC0-1.0'||!entry.maps||typeof entry.maps!=='object')throw Error('Invalid licensed material entry');
  if(entry.metersPerTile!==catalogEntry(entry.id).metersPerTile)throw Error('Invalid material scale');
  if(Object.keys(entry.maps).sort().join(',')!=='albedo,normal,orm')throw Error('Material pack must include three PBR maps');
  for(const slot of ['albedo','normal','orm']){
   const m=entry.maps[slot];
   if(!m||!safePackPath(m.path)||!m.path.startsWith(`library/${entry.id}/${slot}.`)||!Number.isInteger(m.bytes)||m.bytes<1||m.bytes>5*1048576||!/^([a-f0-9]{64})$/.test(m.sha256))throw Error('Invalid map provenance or budget');
  }
  seen.add(entry.id);
  return {...catalogEntry(entry.id),maps:entry.maps,license:'CC0-1.0'};
 });
}
/** Resolve canonical, same-origin local map files. Fetchers are injected for tests. */
export async function readPreparedMaterial(id,{fetcher=fetch,base='/'}={}){
 if(!catalogEntry(id))throw Error('Unknown catalog asset');
 const baseURL=new URL(base,'http://blank.local/');
 if(baseURL.pathname!=='/'||baseURL.search||baseURL.hash)throw Error('Material pack must be served from the site root');
 const manifestResponse=await fetcher('/library/manifest.json');
 if(!manifestResponse?.ok)throw Error('CC0 material pack not installed; run npm run materials:prepare');
 const entries=validatePackManifest(await manifestResponse.json());
 const entry=entries.find(x=>x.id===id);
 if(!entry)throw Error('Selected CC0 material is not included in this pack');
 const files={};
 for(const slot of ['albedo','normal','orm']){
  const m=entry.maps[slot];
  const response=await fetcher('/'+m.path);
  if(!response?.ok)throw Error(`Missing local ${slot} map`);
  const blob=await response.blob();
  if(blob.size!==m.bytes)throw Error(`Corrupt local ${slot} map size`);
  if(!globalThis.crypto?.subtle)throw Error('Material integrity verification unavailable');
  const digest=await globalThis.crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
  const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  if(hash!==m.sha256)throw Error(`Corrupt local ${slot} map hash`);
  const ext=m.path.split('.').pop();
  const mime=ext==='png'?'image/png':ext==='webp'?'image/webp':ext==='ktx2'?'image/ktx2':'image/jpeg';
  files[slot]=new File([blob],`${id}_${slot}.${ext}`,{type:mime});
 }
 return {entry,files};
}
