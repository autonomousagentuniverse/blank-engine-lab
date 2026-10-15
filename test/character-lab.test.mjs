import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HERO_REFERENCE,inspectLabGlb,auditLoadedCharacter,createCharacterPackage} from '../character-lab/character-spec.mjs';
const fakeGLB=(m)=>{const txt=JSON.stringify(m),len=Math.ceil(Buffer.byteLength(txt)/4)*4;const b=new ArrayBuffer(12+8+len),v=new DataView(b);v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,b.byteLength,true);v.setUint32(12,len,true);v.setUint32(16,0x4e4f534a,true);const u=new Uint8Array(b,20);u.set(Buffer.from(txt));for(let i=Buffer.byteLength(txt);i<len;i++)u[i]=32;return b};
const standard={asset:{version:'2.0'},nodes:[{name:'hips'}],skins:[{joints:[0]}],meshes:[{}],materials:[{}],animations:[{name:'Idle'}],buffers:[{byteLength:0}]};
test('CharacterSpec real reference is pinned to an immutable upstream blob and explicit CC0 provenance',()=>{
 assert.match(HERO_REFERENCE.download,/3f97faf85e46d2f9a122b0a8b8d3ccc0af598f91/);
 assert.match(HERO_REFERENCE.pinnedBlob,/^[a-f0-9]{40}$/);
 assert.equal(HERO_REFERENCE.license,'CC0-1.0');
 assert.ok(HERO_REFERENCE.bytes>1000000&&HERO_REFERENCE.bytes<32*1048576);
});
test('GLB preflight counts actual skinned mesh, bones, materials and animation names',()=>{
 const p=inspectLabGlb(fakeGLB(standard));assert.equal(p.skins,1);assert.equal(p.bones,1);assert.deepEqual(p.animationNames,['Idle']);
});
test('reject malformed or unsafe GLBs and unbounded rigs',()=>{
 assert.throws(()=>inspectLabGlb(new ArrayBuffer(12)));
 assert.throws(()=>inspectLabGlb(fakeGLB({...standard,skins:[]})),/skin/i);
 assert.throws(()=>inspectLabGlb(fakeGLB({...standard,buffers:[{uri:'https://evil.example/sidecar.bin'}]})),/sidecar/i);
 assert.throws(()=>inspectLabGlb(fakeGLB({...standard,animations:Array(65).fill({name:'clip'})})),/budget/i);
 assert.throws(()=>inspectLabGlb(fakeGLB({...standard,extensionsRequired:['KHR_draco_mesh_compression']})),/extension/i);
});
test('structural character audit requires skinned meshes and does not invent texture realism',()=>{
 const geom={getAttribute:()=>({count:300}),index:{count:300}},material={map:{isTexture:true,image:{width:128,height:128}}};
 const fake={traverse(fn){fn({isMesh:true,isSkinnedMesh:true,name:'suit',geometry:geom,material});fn({isBone:true,name:'hips'});}};
 const r=auditLoadedCharacter(fake,[{name:'idle'}]);assert.equal(r.vertices,300);assert.equal(r.textures,1);assert.equal(r.bones,1);assert.equal(r.triangles,100);
});
test('package references exact GLB hash; photorealism is never self-certified',()=>{
 const audit={bones:53,skinnedMeshes:3,vertices:22000,triangles:26000,materials:3,textures:3,decodedTextureBytes:12500000,clips:['idle','walk'],warnings:[]};
 const p=createCharacterPackage({assetName:'hero.glb',assetBytes:4000000,assetHash:'a'.repeat(64),license:'CC0-1.0',audit});
 assert.equal(p.schema,'blank-character-v1');assert.equal(p.quality.status,'requires-visual-review');assert.equal(p.physics.rootMotion,'physics-authoritative');
 assert.throws(()=>createCharacterPackage({assetName:'x.glb',assetBytes:100,assetHash:'foo',audit}),/SHA-256/);
});
test('isolated Character Lab includes viewer, clip inspector and material audit, not marketplace',()=>{
 const html=readFileSync(new URL('../character-lab/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../character-lab/lab.mjs',import.meta.url),'utf8');
 for(const tag of ['referenceBtn','avatarFile','clipSelect','materialSelect','roughness','metalness','skeletonBtn','exportBtn','viewport','quality'])assert.match(html,new RegExp(`id="${tag}"`));
 assert.doesNotMatch(html,/Neon Frontier|Barter with 4 robots/);
 assert.match(js,/AnimationMixer/);assert.match(js,/GLTFLoader/);assert.match(js,/createCharacterPackage/);
 assert.doesNotMatch(js,/NVIDIA_API_KEY|BLANK_PG_URL|process\.env/);
});
