import {MAX_SET_PIXELS} from './authored.mjs';
/** Blank Engine: constrained generated PBR textures. No network requests or dynamic shaders. */
export const TEXTURE_SIZE=128,MAX_TEXTURE_BYTES=8*1024*1024;
export const TARGETS=Object.freeze(['buildings','ground','roads','robots','armor']);
export const PRESETS=Object.freeze({
 concrete:{color:0xb4bfca,metalness:.02,roughness:.88,relief:.32,grain:17},
 asphalt:{color:0x39434c,metalness:0,roughness:.93,relief:.50,grain:52},
 stone:{color:0xaaa394,metalness:0,roughness:.86,relief:.42,grain:13},
 sand:{color:0xb4a17a,metalness:0,roughness:.97,relief:.28,grain:27},
 'weathered-steel':{color:0x82909b,metalness:.82,roughness:.68,relief:.32,grain:31},
 'polished-steel':{color:0xc1d1d8,metalness:.93,roughness:.27,relief:.14,grain:41},
 leather:{color:0x91644b,metalness:0,roughness:.76,relief:.42,grain:21},
 fabric:{color:0x708c9b,metalness:0,roughness:.94,relief:.28,grain:47}
});
export const DEFAULT_MATERIALS=Object.freeze({buildings:'concrete',ground:'sand',roads:'asphalt',robots:'weathered-steel',armor:'fabric'});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const hash=(x,y,k)=>{let v=(Math.imul((x+1)|0,374761393)^Math.imul((y+1)|0,668265263)^Math.imul(k|0,2147483647))>>>0;v=Math.imul(v^(v>>>13),1274126177)>>>0;return ((v^(v>>>16))>>>0)/4294967295;};
export function validateMaterialProfiles(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid material profiles');
 if(Object.keys(input).some(key=>!TARGETS.includes(key)))throw Error('Unknown material target');
 const next={...DEFAULT_MATERIALS};
 for(const key of TARGETS){if(!Object.hasOwn(input,key))continue;
  if(!Object.hasOwn(PRESETS,input[key]))throw Error('Unsupported '+key+' material preset');
  next[key]=input[key];
 }
 return next;
}
const ALIASES=Object.freeze({
 'weathered-steel':['weathered steel','rusted steel','rusty metal','rusty steel','scratched steel'],
 'polished-steel':['polished steel','clean steel','shiny metal','chrome'],
 concrete:['concrete','cement'],asphalt:['asphalt','tarmac'],
 stone:['stone','cobblestone','brick'],sand:['sand','sandy'],
 leather:['leather'],fabric:['fabric','cloth','canvas']
});
const TARGET_ALIASES={buildings:/\b(buildings?|walls?|towers?|city)\b/,ground:/\b(ground|terrain|floor|soil)\b/,roads:/\b(roads?|paths?|streets?)\b/,robots:/\b(robots?|drones?|enemies?)\b/,armor:/\b(armor|armour|player|character|jacket|outfit)\b/};
/** Extract explicit material instructions without mistaking missions for edits. */
export function compileMaterialCommand(text,current=DEFAULT_MATERIALS){
 const normalized=validateMaterialProfiles(current);
 if(typeof text!=='string'||text.length>500)throw Error('Invalid material instruction');
 const input=text.toLowerCase().replace(/[-_]/g,' ').replace(/\s+/g,' ').trim();
 if(!/\b(texture|material|cover|coat|paint|give|make|set|use|apply|change|turn)\b/.test(input))return {profiles:normalized,applied:[]};
 const aliases=Object.entries(ALIASES).flatMap(([name,patterns])=>patterns.map(value=>({name,value}))).sort((a,b)=>b.value.length-a.value.length);
 const match=aliases.find(a=>new RegExp('\\b'+a.value.replace(/ /g,'\\s+')+'\\b').test(input));
 if(!match)return {profiles:normalized,applied:[]};
 const target=TARGETS.find(t=>TARGET_ALIASES[t].test(input));
 if(!target)return {profiles:normalized,applied:[]};
 normalized[target]=match.name;
 return {profiles:normalized,applied:['Textured '+target+': '+match.name]};
}
/** Repeatable grayscale albedo, tangent normal and linear R=AO,G=roughness,B=metalness. */
export function generateMaps(preset,size=TEXTURE_SIZE){
 if(!Object.hasOwn(PRESETS,preset))throw Error('Unknown material preset');
 if(!Number.isInteger(size)||size<16||size>128||(size&(size-1)))throw Error('Texture dimensions must be power of two between 16 and 128');
 const p=PRESETS[preset],data=new Uint8Array(size*size*4),normals=new Uint8Array(data.length),orm=new Uint8Array(data.length),height=new Float32Array(size*size);
 const idx=(x,y)=>((y+size)%size)*size+(x+size)%size;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const stone=preset==='stone'?((x%32<1||y%22<1)?-.36:0):0;
  const woven=preset==='fabric'?Math.sin(x*Math.PI/2)*Math.sin(y*Math.PI/2)*.15:0;
  height[idx(x,y)]=clamp((hash(x,y,p.grain)*2-1)*.5+Math.sin(x/size*Math.PI*8)*Math.cos(y/size*Math.PI*8)*.23+stone+woven,-1,1);
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=idx(x,y)*4,n=height[idx(x,y)],shade=clamp(218+n*48,105,255);
  data.set([shade,shade,shade,255],i);
  const dx=(height[idx(x+1,y)]-height[idx(x-1,y)])*p.relief,dy=(height[idx(x,y+1)]-height[idx(x,y-1)])*p.relief,mag=Math.hypot(dx,dy,1);
  normals.set([Math.round(127.5*(1-dx/mag)),Math.round(127.5*(1-dy/mag)),Math.round(127.5*(1+1/mag)),255],i);
  orm.set([255,Math.round(clamp(p.roughness+n*.1,.04,1)*255),Math.round(clamp(p.metalness+n*.04,0,1)*255),255],i);
 }
 return {albedo:data,normal:normals,orm,size,bytes:data.byteLength+normals.byteLength+orm.byteLength};
}
export function tileBoxGeometry(THREE,width,height,depth,meters=3){
 const geometry=new THREE.BoxGeometry(width,height,depth),uv=geometry.getAttribute('uv');
 const scales=[[depth,height],[depth,height],[width,depth],[width,depth],[width,height],[width,height]];
 for(let f=0;f<6;f++)for(let i=0;i<4;i++){const k=f*4+i;uv.setXY(k,uv.getX(k)*scales[f][0]/meters,uv.getY(k)*scales[f][1]/meters);}
 uv.needsUpdate=true;return geometry;
}
export function tilePlaneGeometry(THREE,width,height,meters=3){
 const geometry=new THREE.PlaneGeometry(width,height),uv=geometry.getAttribute('uv');
 for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*width/meters,uv.getY(i)*height/meters);
 uv.needsUpdate=true;return geometry;
}
export function createPBRLibrary(THREE,initial=DEFAULT_MATERIALS){
 const profiles=validateMaterialProfiles(initial),cache=new Map(),materials=new Map(),authored=new Map();let disposed=false;
 const own=()=>{if(disposed)throw Error('PBR library disposed');};
 function maps(preset){own();if(cache.has(preset))return cache.get(preset);
  const g=generateMaps(preset),entry={};
  for(const [slot,data] of [['map',g.albedo],['normalMap',g.normal],['orm',g.orm]]){
   const texture=new THREE.DataTexture(data,g.size,g.size,THREE.RGBAFormat,THREE.UnsignedByteType);
   texture.colorSpace=slot==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace;
   texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
   texture.generateMipmaps=true;texture.anisotropy=2;texture.needsUpdate=true;entry[slot]=texture;
  }
  cache.set(preset,entry);return entry;
 }
 function apply(target,mat){own();const p=PRESETS[profiles[target]],m=maps(profiles[target]);
  const a=authored.get(target)?.textures;
  mat.map=a?.albedo??m.map;mat.normalMap=a?.normal??m.normalMap;mat.roughnessMap=a?.orm??m.orm;mat.metalnessMap=a?.orm??m.orm;
  mat.color.setHex(a?.albedo?0xffffff:p.color);mat.roughness=1;mat.metalness=1;mat.normalScale?.set(.48,.48);mat.needsUpdate=true;return mat;
 }
 function materialFor(target){own();if(!TARGETS.includes(target))throw Error('Unknown material target');
  if(!materials.has(target)){const m=new THREE.MeshStandardMaterial();materials.set(target,m);apply(target,m);}return materials.get(target);
 }
 function update(target,preset){own();if(!TARGETS.includes(target)||!Object.hasOwn(PRESETS,preset))throw Error('Invalid material update');
  profiles[target]=preset;const old=authored.get(target);authored.delete(target);if(materials.has(target))apply(target,materials.get(target));old?.dispose();return preset;
 }
 return {materialFor,update,
  installAuthored(target,set){own();if(!TARGETS.includes(target)||!set?.textures?.albedo||!set?.budget||typeof set.dispose!=='function')throw Error('Invalid authored texture set');
   const otherPixels=[...authored].reduce((n,[key,value])=>n+(key===target?0:value.budget.pixels),0);
   if(otherPixels+set.budget.pixels>MAX_SET_PIXELS)throw Error('All authored surfaces together exceed the 32 MiB mobile texture budget');
   const old=authored.get(target);authored.set(target,set);if(materials.has(target))apply(target,materials.get(target));if(old!==set)old?.dispose();return set.budget;},
  hasAuthored:target=>authored.has(target),
  applyTo:(target,m)=>{if(!TARGETS.includes(target))throw Error('Unknown material target');return apply(target,m);},
  get profiles(){return {...profiles}},
  get budget(){return {width:TEXTURE_SIZE,height:TEXTURE_SIZE,uniquePresets:cache.size,mapCount:cache.size*3,cpuBytes:cache.size*3*TEXTURE_SIZE*TEXTURE_SIZE*4,maxBytes:MAX_TEXTURE_BYTES,authoredPixels:[...authored.values()].reduce((n,s)=>n+s.budget.pixels,0),authoredBytes:[...authored.values()].reduce((n,s)=>n+s.budget.decodedBytes,0)};},
  dispose(){if(disposed)return;disposed=true;for(const m of materials.values())m.dispose();for(const set of cache.values())for(const m of Object.values(set))m.dispose();for(const entry of authored.values())entry.dispose();authored.clear();materials.clear();cache.clear();}
 };
}
