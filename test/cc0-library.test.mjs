import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CC0_CATALOG,validatePackManifest,readPreparedMaterial} from '../materials/catalog.mjs';
import {selectAssetMaps} from '../scripts/prepare-material-library.mjs';
const hash=createHash('sha256').update(Buffer.from([1,2,3])).digest('hex');
const fakeEntry=id=>({id,metersPerTile:CC0_CATALOG.find(x=>x.id===id).metersPerTile,license:'CC0-1.0',maps:Object.fromEntries(['albedo','normal','orm'].map(s=>[s,{path:`library/${id}/${s}.jpg`,bytes:3,sha256:hash}]))});
test('curated CC0 library has verified-looking ids, source attribution, bounded selection',()=>{
 assert.equal(CC0_CATALOG.length,5);
 assert.equal(new Set(CC0_CATALOG.map(x=>x.id)).size,5);
 for(const c of CC0_CATALOG){assert.match(c.source,/^https:\/\/polyhaven\.com\/a\/[a-z0-9_]+$/);assert.ok(c.metersPerTile>.1);}
});
test('pack manifest validates CC0 provenance and same-origin paths',()=>{
 const manifest={version:1,provider:'Poly Haven',materials:[fakeEntry('asphalt_02')]};
 assert.equal(validatePackManifest(manifest).length,1);
 assert.throws(()=>validatePackManifest({...manifest,materials:[manifest.materials[0],manifest.materials[0]]}),/licensed/);
 const evil=structuredClone(manifest);evil.materials[0].maps.normal.path='https://evil.invalid/normal.jpg';
 assert.throws(()=>validatePackManifest(evil),/provenance/);
 const wrong=structuredClone(manifest);wrong.materials[0].license='Unknown';
 assert.throws(()=>validatePackManifest(wrong),/licensed/);
});
test('download metadata requires glTF ARM, OpenGL normal, and official source variants',()=>{
 const map={Diffuse:{'1k':{jpg:{url:'https://dl.polyhaven.org/a.jpg',size:320,md5:'f'.repeat(32)}}},nor_gl:{'1k':{jpg:{url:'https://dl.polyhaven.org/b.jpg',size:320}}},arm:{'1k':{png:{url:'https://dl.polyhaven.org/c.png',size:320}}}};
 const chosen=selectAssetMaps(map);assert.equal(chosen.orm.ext,'png');assert.equal(chosen.normal.ext,'jpg');
 assert.throws(()=>selectAssetMaps({Diffuse:map.Diffuse,arm:map.arm}),/normal/);
 assert.throws(()=>selectAssetMaps(map,'8k'),/8k/);
});
test('prepared runtime loader never accepts arbitrary URLs and detects changed bytes',async()=>{
 const entry=fakeEntry('asphalt_02');const manifest={version:1,provider:'Poly Haven',materials:[entry]};
 const f=async p=>p.endsWith('manifest.json')?{ok:true,json:async()=>manifest}:{ok:true,blob:async()=>new Blob([new Uint8Array([1,2,3])],{type:'image/jpeg'})};
 const loaded=await readPreparedMaterial('asphalt_02',{fetcher:f});
 assert.equal(loaded.files.normal.name,'asphalt_02_normal.jpg');
 await assert.rejects(()=>readPreparedMaterial('invalid',{fetcher:f}),/Unknown/);
 await assert.rejects(()=>readPreparedMaterial('asphalt_02',{fetcher:async p=>p.includes('normal.jpg')?{ok:true,blob:async()=>new Blob([new Uint8Array([1])])}:f(p)}),/size/);
});
