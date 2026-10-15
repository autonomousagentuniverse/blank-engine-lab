/** Scoped GLB material correction: repairs only the known CC0 suited avatar. */
export const NAMES=['Human.body','Human.male_casualsuit01','Human.shoes01'];
function decode(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<28)throw Error('GLB required');
 const v=new DataView(buffer);if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==buffer.byteLength)throw Error('Bad GLB header');
 let pos=12;const chunks=[];
 while(pos<buffer.byteLength){const size=v.getUint32(pos,true),type=v.getUint32(pos+4,true);if(size%4||pos+size+8>buffer.byteLength)throw Error('Bad chunk');chunks.push([type,new Uint8Array(buffer,pos+8,size)]);pos+=size+8;}
 if(chunks.length!==2||chunks[0][0]!==0x4e4f534a||chunks[1][0]!==0x004e4942)throw Error('GLB chunks must be JSON and BIN');
 return {gltf:JSON.parse(new TextDecoder().decode(chunks[0][1]).trim()),bin:chunks[1][1]};
}
export function inspectSuitedMaterials(buffer){return decode(buffer).gltf.materials.map(m=>({name:m.name,alphaMode:m.alphaMode??'OPAQUE',doubleSided:!!m.doubleSided}));}
export function repairSuitedMaterials(buffer){
 const {gltf,bin}=decode(buffer);
 if(gltf.meshes?.length!==3||gltf.skins?.length!==1||gltf.animations?.length!==4||gltf.materials?.length!==3||gltf.materials.some((m,i)=>m.name!==NAMES[i]||!Number.isInteger(m.pbrMetallicRoughness?.baseColorTexture?.index)))throw Error('Unexpected suited avatar structure');
 if(gltf.materials.every(m=>(m.alphaMode??'OPAQUE')==='OPAQUE'&&!m.doubleSided))return buffer.slice(0);
 for(const m of gltf.materials){if(!['BLEND','OPAQUE'].includes(m.alphaMode??'OPAQUE'))throw Error('Unsupported alpha mode');m.alphaMode='OPAQUE';m.doubleSided=false;}
 const json=new TextEncoder().encode(JSON.stringify(gltf));const len=json.length+(4-json.length%4)%4;
 const out=new ArrayBuffer(12+8+len+8+bin.length),bytes=new Uint8Array(out),view=new DataView(out);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,out.byteLength,true);
 view.setUint32(12,len,true);view.setUint32(16,0x4e4f534a,true);bytes.set(json,20);bytes.fill(32,20+json.length,20+len);
 const at=20+len;view.setUint32(at,bin.length,true);view.setUint32(at+4,0x004e4942,true);bytes.set(bin,at+8);
 return out;
}
