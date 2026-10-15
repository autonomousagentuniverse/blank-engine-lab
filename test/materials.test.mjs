import test from 'node:test';
import assert from 'node:assert/strict';
import {TEXTURE_SIZE,MAX_TEXTURE_BYTES,TARGETS,PRESETS,DEFAULT_MATERIALS,validateMaterialProfiles,compileMaterialCommand,generateMaps,createPBRLibrary,tileBoxGeometry,tilePlaneGeometry} from '../materials/pbr.mjs';
test('bounded preset library and safe persistent state',()=>{
 assert.equal(TARGETS.length,5);assert.equal(Object.keys(PRESETS).length,8);
 assert.deepEqual(validateMaterialProfiles({roads:'stone'}),{...DEFAULT_MATERIALS,roads:'stone'});
 assert.throws(()=>validateMaterialProfiles({roads:'https://example.com/texture.jpg'}),/Unsupported/);
 assert.throws(()=>validateMaterialProfiles({foo:'stone'}),/Unknown material target/);
 assert.throws(()=>validateMaterialProfiles([]),/Invalid/);
 assert.ok(Object.keys(PRESETS).length*3*TEXTURE_SIZE*TEXTURE_SIZE*4<MAX_TEXTURE_BYTES);
});
test('deterministic PBR RGBA albedo, normal and packed roughness/metal',()=>{
 const a=generateMaps('weathered-steel'),b=generateMaps('weathered-steel');
 assert.equal(a.size,128);assert.equal(a.bytes,3*128*128*4);
 assert.deepEqual(a.albedo,b.albedo);assert.deepEqual(a.orm,b.orm);
 for(let i=0;i<a.orm.length;i+=4){
  assert.equal(a.albedo[i],a.albedo[i+1]);assert.equal(a.albedo[i],a.albedo[i+2]);assert.equal(a.albedo[i+3],255);
  assert.equal(a.orm[i],255);assert.ok(a.orm[i+1]>0);assert.ok(a.orm[i+2]>0);assert.ok(a.normal[i+2]>=127);
 }
 assert.notDeepEqual(generateMaps('fabric').orm,a.orm);
 assert.throws(()=>generateMaps('wood'),/Unknown material/);
 for(const size of [15,17,129,256])assert.throws(()=>generateMaps('asphalt',size),/Texture dimensions/);
});
test('material text instructions are explicit and do not alter regular world commands',()=>{
 assert.deepEqual(compileMaterialCommand('Give robots weathered steel armor').applied,['Textured robots: weathered-steel']);
 assert.equal(compileMaterialCommand('Paint the roads with cobblestone').profiles.roads,'stone');
 assert.equal(compileMaterialCommand('Set player armor to leather').profiles.armor,'leather');
 assert.equal(compileMaterialCommand('Change buildings to concrete').profiles.buildings,'concrete');
 assert.equal(compileMaterialCommand('Make the terrain sandy').profiles.ground,'sand');
 assert.deepEqual(compileMaterialCommand('Add 5 robots and make it daytime').applied,[]);
 assert.deepEqual(compileMaterialCommand('Create a stone tower in mission').applied,[]);
 assert.deepEqual(compileMaterialCommand('Make a leather jacket').applied,['Textured armor: leather']);
});
class UV {constructor(count=24){this.count=count;this.arr=Array.from({length:count},()=>[1,1]);}getX(i){return this.arr[i][0]}getY(i){return this.arr[i][1]}setXY(i,x,y){this.arr[i]=[x,y];}}
class Geometry{constructor(){this.uv=new UV()}getAttribute(n){return n==='uv'?this.uv:null}}
class Texture{constructor(data,w,h){this.data=data;this.width=w;this.height=h;this.disposed=false}dispose(){this.disposed=true}}
class Material{constructor(){this.color={setHex:n=>{this.tint=n}};this.normalScale={set:(x,y)=>{this.normal=[x,y]}};this.disposed=false}dispose(){this.disposed=true}}
const THREE={BoxGeometry:Geometry,PlaneGeometry:Geometry,DataTexture:Texture,MeshStandardMaterial:Material,RGBAFormat:1,UnsignedByteType:2,SRGBColorSpace:'srgb',NoColorSpace:'linear',RepeatWrapping:100,LinearFilter:101,LinearMipmapLinearFilter:102};
test('building and ground UV coordinates tile according to real world dimensions',()=>{
 const tower=tileBoxGeometry(THREE,6,24,9,3).getAttribute('uv');
 assert.deepEqual(tower.arr[0],[3,8]);assert.deepEqual(tower.arr[8],[2,3]);assert.deepEqual(tower.arr[16],[2,8]);
 const ground=tilePlaneGeometry(THREE,150,150,3).getAttribute('uv');
 assert.deepEqual(ground.arr[0],[50,50]);
});
test('textures reuse maps, set color spaces, update without rebuild and dispose cleanly',()=>{
 const lib=createPBRLibrary(THREE,DEFAULT_MATERIALS);
 const robot=lib.materialFor('robots'),armor=lib.materialFor('armor');
 assert.equal(robot.map.colorSpace,'srgb');assert.equal(robot.normalMap.colorSpace,'linear');
 assert.equal(robot.roughnessMap,robot.metalnessMap);assert.equal(robot.map.wrapS,100);
 assert.equal(lib.budget.uniquePresets,2);
 lib.update('robots','leather');assert.equal(lib.materialFor('robots'),robot);
 assert.notEqual(robot.map,armor.map);
 const copy=new Material();lib.applyTo('robots',copy);assert.equal(copy.map,robot.map);
 for(const preset of Object.keys(PRESETS))lib.update('buildings',preset);
 assert.ok(lib.budget.cpuBytes<=MAX_TEXTURE_BYTES);
 const last=robot.map;lib.dispose();assert.ok(robot.disposed);assert.ok(last.disposed);
 lib.dispose();assert.throws(()=>lib.materialFor('roads'),/disposed/);
});
