/** Browser-local authored PBR image sets: no remote URL, shader, or scripts. */
export const AUTHORED_SLOTS=Object.freeze(['albedo','normal','orm']);
export const MAX_IMAGE_SIDE=2048;
export const MAX_SET_PIXELS=8*1024*1024;
export const MAX_FILE_BYTES=5*1024*1024;
export const MAX_SET_FILE_BYTES=10*1024*1024;
function isImage(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(b.length<12)return false;
 const png=[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);
 const jpeg=b[0]===255&&b[1]===216&&b[2]===255;
 const webp=String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
 return png||jpeg||webp;
}
export function inspectAuthoredImage(header,mime=''){
 const b=header instanceof Uint8Array?header:new Uint8Array(header);
 if(!isImage(b))throw Error('PBR map must contain PNG, JPEG or WebP image data');
 if(mime&&!['image/png','image/jpeg','image/webp'].includes(mime))throw Error('Unsupported PBR image type');
 return true;
}
export function validateAuthoredSet(entries){
 if(!entries||typeof entries!=='object'||Array.isArray(entries)||!entries.albedo)throw Error('An albedo image is required');
 const names=Object.keys(entries);
 if(names.length>3||names.some(n=>!AUTHORED_SLOTS.includes(n)))throw Error('Unsupported PBR texture slot');
 let pixels=0,compressedBytes=0;
 for(const [slot,entry] of Object.entries(entries)){
  const {width,height,bytes}=entry??{};
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>MAX_IMAGE_SIDE||height>MAX_IMAGE_SIDE)throw Error(`${slot} exceeds 2048px resolution limit`);
  if(!Number.isInteger(bytes)||bytes<1||bytes>MAX_FILE_BYTES)throw Error(`${slot} exceeds 5 MiB file limit`);
  pixels+=width*height;compressedBytes+=bytes;
  if(pixels>MAX_SET_PIXELS)throw Error('PBR textures exceed 32 MiB decoded GPU budget');
  if(compressedBytes>MAX_SET_FILE_BYTES)throw Error('PBR files exceed 10 MiB transfer budget');
 }
 return {maps:names.length,pixels,compressedBytes,decodedBytes:pixels*4};
}
export async function loadAuthoredSet(THREE,files,{decode}={}){
 if(!files?.albedo)throw Error('Select an albedo image before importing');
 const names=Object.keys(files);
 if(names.length>3||names.some(n=>!AUTHORED_SLOTS.includes(n)))throw Error('Unsupported PBR texture slot');
 const imageDecode=decode??(file=>createImageBitmap(file,{imageOrientation:'flipY',premultiplyAlpha:'none',colorSpaceConversion:'none'}));
 const bitmaps={},meta={};const textures={};
 try{
  for(const slot of AUTHORED_SLOTS){
   const file=files[slot];if(!file)continue;
   if(!Number.isInteger(file.size)||file.size<1||file.size>MAX_FILE_BYTES)throw Error(`${slot} exceeds 5 MiB file limit`);
   inspectAuthoredImage(new Uint8Array(await file.slice(0,16).arrayBuffer()),file.type);
   const bitmap=await imageDecode(file);
   if(!bitmap||!Number.isInteger(bitmap.width)||!Number.isInteger(bitmap.height))throw Error('Image decoding failed');
   bitmaps[slot]=bitmap;meta[slot]={width:bitmap.width,height:bitmap.height,bytes:file.size};
   validateAuthoredSet({...meta,albedo:meta.albedo??{width:1,height:1,bytes:1}});
  }
  const budget=validateAuthoredSet(meta);
  for(const slot of AUTHORED_SLOTS){
   const bitmap=bitmaps[slot];if(!bitmap)continue;
   const tex=new THREE.Texture(bitmap);
   tex.colorSpace=slot==='albedo'?THREE.SRGBColorSpace:THREE.NoColorSpace;
   tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
   tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;
   tex.generateMipmaps=true;tex.anisotropy=2;tex.flipY=false;tex.needsUpdate=true;
   textures[slot]=tex;
  }
  let disposed=false;
  return {textures,budget,dispose(){if(disposed)return;disposed=true;for(const tex of Object.values(textures))tex.dispose();for(const bitmap of Object.values(bitmaps))bitmap.close?.();}};
 }catch(e){for(const tex of Object.values(textures))tex.dispose();for(const bitmap of Object.values(bitmaps))bitmap.close?.();throw e;}
}
