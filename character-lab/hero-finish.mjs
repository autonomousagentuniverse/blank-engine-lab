/** Non-destructive PBR finishing of the pinned MakeHuman suited hero.
 * Only material shading factors change. Meshes, buffers, textures, skinning,
 * joints and animations are left byte-for-byte intact in the binary chunk.
 */
const decoder=new TextDecoder('utf-8',{fatal:true}),encoder=new TextEncoder();
const NAMES=['Human.body','Human.male_casualsuit01','Human.shoes01'];
export const HERO_FINISH=Object.freeze({skinRoughness:.72,clothRoughness:.93,shoeRoughness:.72});
function unpack(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<28)throw Error('GLB required');
 const v=new DataView(buffer);if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==buffer.byteLength)throw Error('Invalid GLB');
 let i=12,json=null,bin=null;
 while(i<buffer.byteLength){if(i+8>buffer.byteLength)throw Error('Truncated chunk');const len=v.getUint32(i,true),type=v.getUint32(i+4,true);if(len%4||i+8+len>buffer.byteLength)throw Error('Bad GLB chunks');
  if(type===0x4e4f534a){if(json)throw Error('Duplicate JSON');json=JSON.parse(decoder.decode(new Uint8Array(buffer,i+8,len)).trim());}
  else if(type===0x004e4942){if(bin)throw Error('Duplicate binary');bin=new Uint8Array(buffer,i+8,len);}
  else throw Error('Unsupported chunk');i+=8+len;
 }
 if(!json||!bin||json.asset?.version!=='2.0')throw Error('Missing glTF data');
 return {json,bin};
}
function pack(json,bin){const raw=encoder.encode(JSON.stringify(json)),sz=(raw.length+3)&~3;const buf=new ArrayBuffer(12+8+sz+8+bin.length),v=new DataView(buf),out=new Uint8Array(buf);
 v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,buf.byteLength,true);
 v.setUint32(12,sz,true);v.setUint32(16,0x4e4f534a,true);out.set(raw,20);out.fill(32,20+raw.length,20+sz);
 const off=20+sz;v.setUint32(off,bin.length,true);v.setUint32(off+4,0x004e4942,true);out.set(bin,off+8);return buf;
}
export function inspectHeroFinish(buffer){const {json}=unpack(buffer);return (json.materials||[]).map(x=>({name:x.name,roughness:x.pbrMetallicRoughness?.roughnessFactor,metalness:x.pbrMetallicRoughness?.metallicFactor,alphaMode:x.alphaMode}));}
export function finishHeroPBR(buffer){
 const {json,bin}=unpack(buffer);if(json.materials?.length!==3||json.materials.some((m,i)=>m.name!==NAMES[i]||(m.alphaMode??'OPAQUE')!=='OPAQUE')||json.meshes?.length!==3||json.animations?.length!==4||json.skins?.length!==1)throw Error('Finishing is valid only for the repaired suited reference');
 const values=[HERO_FINISH.skinRoughness,HERO_FINISH.clothRoughness,HERO_FINISH.shoeRoughness];
 json.materials.forEach((mat,i)=>{mat.pbrMetallicRoughness.roughnessFactor=values[i];mat.pbrMetallicRoughness.metallicFactor=0;mat.alphaMode='OPAQUE';mat.doubleSided=false;});
 // Deliberately avoid fake hair and speculative shader extensions. Existing
 // fabric normals, authored albedo, and the intact original skin UVs remain.
 return pack(json,bin);
}
