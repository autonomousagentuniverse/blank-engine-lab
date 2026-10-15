/** KTX2/Basis Universal authored texture path. All inputs are local Files; no user-supplied URLs.
 * The transcoder is injected, allowing tests without a GPU and a pinned Three.js browser adapter.
 */
import {AUTHORED_SLOTS, MAX_IMAGE_SIDE, MAX_SET_PIXELS, MAX_FILE_BYTES, MAX_SET_FILE_BYTES, inspectAuthoredImage} from './authored.mjs';

export const KTX2_IDENTIFIER=Object.freeze([0xab,0x4b,0x54,0x58,0x20,0x32,0x30,0xbb,0x0d,0x0a,0x1a,0x0a]);
export const GPU_BUDGET_BYTES=32*1024*1024;
export const TRANSCODER_PATH='https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/libs/basis/';
const asBytes=x=>x instanceof Uint8Array?x:new Uint8Array(x);
const mipBytes=(width,height,bytesPerPixel=4)=>Math.ceil(width*height*bytesPerPixel*4/3);

export function inspectKTX2(header){
 const bytes=asBytes(header);
 if(bytes.byteLength<68||!KTX2_IDENTIFIER.every((b,i)=>bytes[i]===b))throw Error('Invalid KTX2 file header');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const width=view.getUint32(20,true),height=view.getUint32(24,true),depth=view.getUint32(28,true);
 const layers=view.getUint32(32,true),faces=view.getUint32(36,true),levels=view.getUint32(40,true);
 const vkFormat=view.getUint32(12,true);
 if(!width||!height||width>MAX_IMAGE_SIDE||height>MAX_IMAGE_SIDE)throw Error('KTX2 exceeds 2048px image limit');
 if(depth!==0||layers>1||faces!==1)throw Error('Only 2D non-array KTX2 materials are supported');
 if(!levels||levels>Math.floor(Math.log2(Math.max(width,height)))+1)throw Error('Invalid KTX2 mip level count');
 // Basis Universal formats use vkFormat = VK_FORMAT_UNDEFINED. Other KTX2 formats
 // aren't supported by Three.js KTX2Loader's universal transcode pathway.
 if(vkFormat!==0)throw Error('KTX2 must contain Basis Universal (ETC1S or UASTC) data');
 return {width,height,levels};
}
export function estimateTextureBytes(texture,width,height){
 // Actual transcoded blocks are available on CompressedTexture.mipmaps; this is an
 // estimate of texture payload, not a measurement of driver GPU allocations.
 const mipmaps=texture?.mipmaps;
 if(texture?.isCompressedTexture&&Array.isArray(mipmaps)&&mipmaps.length&&mipmaps.every(m=>m.data?.byteLength>0))return mipmaps.reduce((sum,m)=>sum+m.data.byteLength,0);
 return mipBytes(width,height,4);
}
export function recommendedTextureSide({mobile=false,deviceMemory=null,desired=2048}={}){
 if(!Number.isInteger(desired)||desired<1)throw Error('Invalid requested texture resolution');
 const limit=mobile || (Number.isFinite(deviceMemory)&&deviceMemory<=4) ? 1024 : 2048;
 return Math.min(limit,desired);
}
/** Make an adapter once per renderer. Call dispose only when the renderer is done. */
export function createKTX2Adapter(KTX2Loader,renderer,{transcoderPath=TRANSCODER_PATH}={}){
 if(!renderer)throw Error('A WebGL renderer is required for KTX2 format detection');
 const loader=new KTX2Loader().setTranscoderPath(transcoderPath).setWorkerLimit(2);
 loader.detectSupport(renderer);
 let disposed=false;
 return {
  async load(file){
   if(disposed)throw Error('Texture transcoder has been disposed');
   const url=URL.createObjectURL(file);
   try{return await loader.loadAsync(url);}finally{URL.revokeObjectURL(url);}
  },
  dispose(){if(!disposed){disposed=true;loader.dispose();}}
 };
}

/** Transactional set replacement; mixed .ktx2 and raster slots are supported.
 * A bad transcode uses an explicitly supplied raster fallback, never an unsafe URL.
 * Keeps the previous material alive until the caller installs this entire result.
 */
export async function loadCompressedAuthoredSet(THREE,files,{transcoder,decode,fallbacks={}}={}){
 if(!files?.albedo)throw Error('Select an albedo texture before importing');
 const names=Object.keys(files);
 if(names.length>AUTHORED_SLOTS.length||names.some(x=>!AUTHORED_SLOTS.includes(x)))throw Error('Unsupported PBR texture slot');
 const imageDecode=decode??(file=>createImageBitmap(file,{imageOrientation:'flipY',premultiplyAlpha:'none',colorSpaceConversion:'none'}));
 const textures={},bitmaps=[],meta={};let totalPixels=0,totalTransfer=0,totalGPU=0,compressedSlots=0,ktx2Slots=0,rgbaFallbackSlots=0,fallbackSlots=0;
 const dispose=()=>{for(const t of Object.values(textures))t.dispose?.();for(const b of bitmaps)b.close?.();};
 try{
  for(const slot of AUTHORED_SLOTS){
   let file=files[slot];if(!file)continue;
   if(!Number.isInteger(file.size)||file.size<1||file.size>MAX_FILE_BYTES)throw Error(`${slot} exceeds 5 MiB file limit`);
   let compressed=/\.ktx2$/i.test(file.name)||file.type==='image/ktx2'||file.type==='application/ktx2';
   let texture,width,height,usedFallback=false;
   if(compressed){
    const header=inspectKTX2(await file.slice(0,80).arrayBuffer());
    ({width,height}=header);
    if(!transcoder?.load)throw Error('KTX2 transcoder is unavailable on this device');
    try{texture=await transcoder.load(file);}catch(e){
     if(!fallbacks[slot])throw Error(`KTX2 ${slot} could not be decoded: ${e.message}`);
     file=fallbacks[slot];usedFallback=true;compressed=false;
     if(!Number.isInteger(file.size)||file.size<1||file.size>MAX_FILE_BYTES)throw Error('Fallback image exceeds file budget');
    }
    if(texture&&(!(texture.isCompressedTexture||texture.isDataTexture)||texture.image?.width!==width||texture.image?.height!==height)){
     texture.dispose?.();throw Error('KTX2 decoder returned incompatible texture dimensions');
    }
   }
   if(!compressed){
    inspectAuthoredImage(await file.slice(0,16).arrayBuffer(),file.type);
    const bitmap=await imageDecode(file);
    if(!Number.isInteger(bitmap?.width)||!Number.isInteger(bitmap?.height))throw Error('Image decoding failed');
    bitmaps.push(bitmap);width=bitmap.width;height=bitmap.height;
    texture=new THREE.Texture(bitmap);
    texture.generateMipmaps=true;texture.flipY=false;
   }
   if(width<1||height<1||width>MAX_IMAGE_SIDE||height>MAX_IMAGE_SIDE){texture?.dispose?.();throw Error(`${slot} exceeds 2048px resolution limit`);}
   totalPixels+=width*height;totalTransfer+=file.size;
   const gpu=estimateTextureBytes(texture,width,height);
   totalGPU+=gpu;
   if(totalPixels>MAX_SET_PIXELS||totalGPU>GPU_BUDGET_BYTES||totalTransfer>MAX_SET_FILE_BYTES){texture?.dispose?.();throw Error('Texture set exceeds mobile transfer or GPU memory budget');}
   texture.colorSpace=slot==='albedo'?THREE.SRGBColorSpace:THREE.NoColorSpace;
   texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
   texture.anisotropy=2;
   texture.needsUpdate=true;
   textures[slot]=texture;
   meta[slot]={width,height,gpuBytes:gpu,compressed};
   if(compressed){ktx2Slots++;if(texture.isCompressedTexture)compressedSlots++;else rgbaFallbackSlots++;}
   if(usedFallback)fallbackSlots++;
  }
  let released=false;
  const budget={maps:names.length,pixels:totalPixels,compressedBytes:totalTransfer,decodedBytes:totalPixels*4,gpuEstimatedBytes:totalGPU,compressedSlots,ktx2Slots,rgbaFallbackSlots,fallbackSlots,slots:meta};
  return {textures,budget,dispose(){if(!released){released=true;dispose();}}};
 }catch(e){dispose();throw e;}
}
