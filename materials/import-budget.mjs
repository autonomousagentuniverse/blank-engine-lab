/** Bound decoded image memory, not merely uploaded GLB file bytes. */
export const MAX_IMPORTED_TEX_SIDE=2048,MAX_IMPORTED_TEX_PIXELS=8*1024*1024;
export function assertImportedTextureBudget(root){
 if(!root||typeof root.traverse!=='function')throw Error('Imported scene is invalid');
 const seen=new Set();let pixels=0;
 root.traverse(node=>{
  for(const material of (Array.isArray(node.material)?node.material:node.material?[node.material]:[])){
   for(const value of Object.values(material)){
    if(!value?.isTexture||seen.has(value))continue;seen.add(value);
    const image=value.image??value.source?.data,w=image?.width,h=image?.height;
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>MAX_IMPORTED_TEX_SIDE||h>MAX_IMPORTED_TEX_SIDE)throw Error('Imported GLB texture exceeds mobile resolution limits');
    pixels+=w*h;
    if(pixels>MAX_IMPORTED_TEX_PIXELS||seen.size>32)throw Error('Imported GLB textures exceed mobile memory budget');
   }
  }
 });
 return {textures:seen.size,pixels,approxBytes:pixels*4};
}
