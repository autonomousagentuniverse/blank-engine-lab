/** Geometry Artifact v4: edit an existing skinned face primitive, rather than
 * covering it with unattached eyelid overlays. This source-pinned experiment
 * remains subject to visual approval. Does not alter original animation data.
 */
import {createHash} from 'node:crypto';
export const SCHEMA='blank.geometry.eye-socket.v4';
const comp={5121:1,5123:2,5125:4,5126:4},dims={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function decode(input){
 const bytes=new Uint8Array(input.buffer??input,input.byteOffset??0,input.byteLength);
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.length<80||bytes.length>32e6||v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==bytes.length)throw Error('Invalid GLB');
 const n=v.getUint32(12,true);if(n+28>bytes.length||v.getUint32(16,true)!==0x4e4f534a)throw Error('Bad glTF JSON');
 const doc=JSON.parse(new TextDecoder().decode(bytes.slice(20,20+n)).trim());const off=20+n,bl=v.getUint32(off,true);
 if(v.getUint32(off+4,true)!==0x004e4942||off+8+bl>bytes.length||doc.asset?.version!=='2.0')throw Error('Bad glTF BIN');
 return {doc,bin:bytes.slice(off+8,off+8+bl)};
}
function read(doc,bin,index){
 const a=doc.accessors[index],b=doc.bufferViews[a.bufferView],size=comp[a.componentType],arity=dims[a.type];
 if(!size||!arity||a.sparse||b.buffer!==0||!Number.isInteger(a.count)||a.count<1||a.count>1e6)throw Error('Unsupported accessor');
 const stride=b.byteStride||size*arity,off=(b.byteOffset||0)+(a.byteOffset||0),end=off+(a.count-1)*stride+arity*size;
 if(off<0||stride<arity*size||end>bin.byteLength)throw Error('Accessor out of range');
 const view=new DataView(bin.buffer,bin.byteOffset,bin.byteLength),out=[];
 for(let i=0;i<a.count;i++){let row=[];for(let j=0;j<arity;j++){
  const p=off+i*stride+j*size;
  row.push(a.componentType===5126?view.getFloat32(p,true):a.componentType===5121?view.getUint8(p):a.componentType===5123?view.getUint16(p,true):view.getUint32(p,true));
 }out.push(row);}
 return out;
}
function typed(rows,kind){const C=kind===5121?Uint8Array:kind===5123?Uint16Array:kind===5125?Uint32Array:Float32Array;return new C(rows.flat());}
function addAccessor(doc,bin,rows,componentType,type,target){
 const array=typed(rows,componentType),pad=(4-bin.length%4)%4,at=bin.length+pad,next=new Uint8Array(at+array.byteLength);next.set(bin);next.set(new Uint8Array(array.buffer),at);
 const view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:at,byteLength:array.byteLength,target});
 const a={bufferView:view,componentType,count:rows.length,type};
 if(type==='VEC3'){a.min=[0,1,2].map(k=>Math.min(...rows.map(r=>r[k])));a.max=[0,1,2].map(k=>Math.max(...rows.map(r=>r[k])));}
 const index=doc.accessors.length;doc.accessors.push(a);return {bin:next,index};
}
function pack(doc,bin){
 doc.buffers[0].byteLength=bin.length;
 const json=new TextEncoder().encode(JSON.stringify(doc)),jn=(json.length+3)&~3,bn=(bin.length+3)&~3;
 const out=new Uint8Array(28+jn+bn),v=new DataView(out.buffer);
 v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,out.length,true);
 v.setUint32(12,jn,true);v.setUint32(16,0x4e4f534a,true);out.set(json,20);out.fill(32,20+json.length,20+jn);
 v.setUint32(20+jn,bn,true);v.setUint32(24+jn,0x004e4942,true);out.set(bin,28+jn);return out;
}
function boundaries(pos,indices){
 const counts=new Map(),adj=new Map();
 for(let k=0;k<indices.length;k+=3)for(let j=0;j<3;j++){
  const a=indices[k+j],b=indices[k+(j+1)%3];if(a===b)throw Error('Degenerate source face');
  const key=Math.min(a,b)+':'+Math.max(a,b);counts.set(key,(counts.get(key)||0)+1);
 }
 for(const [key,c] of counts){if(c!==1)continue;const [a,b]=key.split(':').map(Number);for(const [x,y] of [[a,b],[b,a]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push(y);}}
 const seen=new Set(),loops=[];
 for(const start of adj.keys()){
  if(seen.has(start))continue;const stack=[start],members=[];seen.add(start);
  while(stack.length){const x=stack.pop();members.push(x);for(const y of adj.get(x)||[])if(!seen.has(y)){seen.add(y);stack.push(y);}}
  if(members.some(x=>adj.get(x).length!==2)||members.length<12)continue;
  const loop=[start],used=new Set(loop);let prev=-1,cur=start;
  while(loop.length<members.length){const next=adj.get(cur).find(x=>x!==prev&&!used.has(x));if(next===undefined)break;loop.push(next);used.add(next);prev=cur;cur=next;}
  if(loop.length===members.length)loops.push(loop);
 }
 return loops;
}
function classify(loops,pos,uv){
 const result={};
 for(const side of ['L','R']){
  const eligible=loops.map(loop=>{const mid=[0,1,2].map(k=>loop.reduce((s,i)=>s+pos[i][k],0)/loop.length);return {loop,mid,u:loop.reduce((s,i)=>s+uv[i][0],0)/loop.length};})
   .filter(x=>x.loop.length===28&&x.mid[1]>1.79&&x.mid[1]<1.84&&Math.abs(x.mid[0])>.02&&Math.abs(x.mid[0])<.05&&(side==='L'?x.mid[0]<0:x.mid[0]>0));
  if(eligible.length!==2)throw Error('Expected exactly two 28-vertex eye seam contours for '+side);
  eligible.sort((a,b)=>a.u-b.u);const outer=eligible[0],inner=eligible[1];
  if(!(outer.u<.2&&inner.u>.75&&inner.u<.92))throw Error('Unexpected eye texture seam ownership');
  const sourceWidths=[...outer.loop.map(i=>pos[i][0])],ys=outer.loop.map(i=>pos[i][1]);
  result[side]={outer:outer.loop,inner:inner.loop,center:outer.mid,uvOutside:outer.u,width:Math.max(...sourceWidths)-Math.min(...sourceWidths),height:Math.max(...ys)-Math.min(...ys)};
 }
 return result;
}
const nearly=(a,b,eps=2e-5)=>a.every((v,i)=>Math.abs(v-b[i])<eps);
const bound=(x,min,max)=>Math.max(min,Math.min(max,x));
/** A reversible geometry candidate. Source GLB is neither mutated nor replaced.
 * A v4 artifact records exact source hash, changed accessor identities, and edit
 * counts. Realistic material continuity and blink support require visual review.
 */
export function remeshEyeSockets(input,{sourceSha256,recessM=.0027,ringInset=.22,eyeRecessM=.0012}={}){
 const source=new Uint8Array(input.buffer??input,input.byteOffset??0,input.byteLength);
 const actual=createHash('sha256').update(source).digest('hex');
 if(sourceSha256!==actual)throw Error('Source GLB SHA-256 required and must match');
 if(![recessM,ringInset,eyeRecessM].every(Number.isFinite)||recessM<.001||recessM>.004||ringInset<.08||ringInset>.35||eyeRecessM<0||eyeRecessM>.0025)throw Error('Unsafe geometry parameters');
 const {doc,bin:originalBin}=decode(source);
 if(doc.meshes?.[0]?.name!=='base'||doc.skins?.[0]?.joints?.length!==53||doc.animations?.length!==4||doc.nodes.filter(n=>n.name?.startsWith('Blank.Eye.')).length!==8||doc.meshes.some(m=>m.name?.startsWith('Blank.Lid.'))||doc.meshes[0].primitives.length!==1)throw Error('Expected exactly the fitted CC0 hero, without v3 additive lids');
 const p=doc.meshes[0].primitives[0];
 const names=['POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0'];
 for(const name of names)if(p.attributes[name]===undefined)throw Error('Missing skinned face '+name);
 const old={};for(const name of names)old[name]=read(doc,originalBin,p.attributes[name]);
 const idx=read(doc,originalBin,p.indices).flat();
 if(old.POSITION.length!==8456||idx.length!==46500)throw Error('Unexpected face topology: abort rather than damaging an unknown model');
 const eye=classify(boundaries(old.POSITION,idx),old.POSITION,old.TEXCOORD_0);
 const values=Object.fromEntries(names.map(name=>[name,old[name].map(r=>[...r])]));
 const indices=[...idx],edits=[];
 // Existing inner-socket tissue is recessed with smooth radial falloff.
 // The outer skin vertices and all original UVs/weights stay untouched.
 for(const side of ['L','R']){
  const c=eye[side].center;let affected=0,maxShift=0;
  for(let i=0;i<old.POSITION.length;i++){
   const p0=old.POSITION[i],uv=old.TEXCOORD_0[i];
   if(!(uv[0]>.77&&uv[0]<.9&&p0[2]>.105&&p0[2]<.17&&Math.abs(p0[0]-c[0])<.025&&Math.abs(p0[1]-c[1])<.022))continue;
   const r=Math.hypot((p0[0]-c[0])/.022,(p0[1]-c[1])/.014);
   const shift=recessM*bound((1.5-r)/1.2,0,1);
   if(shift>1e-6){values.POSITION[i][2]-=shift;affected++;maxShift=Math.max(maxShift,shift);}
  }
  if(affected<25)throw Error('Too few original socket vertices matched');
  // Two curved rings per eyelid, in the *existing skinned face primitive*.
  // They inherit existing face skin weights and UVs. We do not create any new
  // rigid head-only surfaces or disconnected floating eye attachments.
  const contour=eye[side].outer,cx=c[0],cy=c[1],n=contour.length;
  const rings=[];
  for(let ring=1;ring<=2;ring++){
   const seq=[];
   for(const original of contour){const pos=old.POSITION[original],normal=old.NORMAL[original];
    const factor=1-ring*ringInset*.5;
    const xyz=[cx+(pos[0]-cx)*factor,cy+(pos[1]-cy)*factor,pos[2]+ring*.00028];
    const next=values.POSITION.length;
    values.POSITION.push(xyz);
    values.NORMAL.push([...normal]); // Tangent-matching base vertex normals, not planar decals
    values.TEXCOORD_0.push([...old.TEXCOORD_0[original]]);
    values.JOINTS_0.push([...old.JOINTS_0[original]]);
    values.WEIGHTS_0.push([...old.WEIGHTS_0[original]]);
    seq.push(next);
   }
   rings.push(seq);
  }
  const sequences=[contour,...rings];let addTris=0;
  for(let r=0;r<2;r++)for(let j=0;j<n;j++){
   const a=sequences[r][j],b=sequences[r][(j+1)%n],c1=sequences[r+1][j],d1=sequences[r+1][(j+1)%n];
   let triangles=[[a,b,c1],[b,d1,c1]];
   // Consistent front-facing winding even when the source seam is reversed.
   for(const tri of triangles){const [pa,pb,pc]=tri.map(i=>values.POSITION[i]);
    const nz=(pb[0]-pa[0])*(pc[1]-pa[1])-(pb[1]-pa[1])*(pc[0]-pa[0]);
    if(Math.abs(nz)<1e-12)throw Error('Degenerate lid triangle');
    if(nz<0)[tri[1],tri[2]]=[tri[2],tri[1]];
    indices.push(...tri);addTris++;
   }
  }
  edits.push({side,outerBoundaryVertices:n,innerBoundaryVertices:eye[side].inner.length,originalSocketVerticesDisplaced:affected,maxDisplacementM:maxShift,newFaceVertices:n*2,addedFaceTriangles:addTris,apertureWidthM:eye[side].width,apertureHeightM:eye[side].height,textureSeam:{outerMeanU:eye[side].uvOutside,innerMeanU:old.TEXCOORD_0[eye[side].inner[0]][0]}});
 }
 if(!edits.every(e=>e.originalSocketVerticesDisplaced>=25))throw Error('Unbalanced socket deformation');
 let bin=originalBin;const fields={...p.attributes};
 for(const name of names){const component=doc.accessors[p.attributes[name]].componentType;
  const type=doc.accessors[p.attributes[name]].type;
  const out=addAccessor(doc,bin,values[name],component,type,34962);bin=out.bin;fields[name]=out.index;
 }
 let output=addAccessor(doc,bin,indices.map(v=>[v]),5123,'SCALAR',34963);bin=output.bin;
 p.attributes=fields;p.indices=output.index;
 const eyeNodes=doc.nodes.filter(n=>n.name?.startsWith('Blank.Eye.'));
 for(const node of eyeNodes)node.translation[2]-=eyeRecessM;
 const glb=pack(doc,bin);
 const artifact={schema:SCHEMA,id:'hero-skin-weighted-eye-socket-v4',builder:'character',source:{sha256:actual,bytes:source.length},
  measurement:{method:'two original 28-vertex topology loops per eye + UV seam ownership',eyes:edits},
  operations:{skinnedPrimitive:'base',originalVertices:old.POSITION.length,originalTriangles:idx.length/3,originalSkinningPrefixUnchanged:true,newVertices:values.POSITION.length-old.POSITION.length,newTriangles:indices.length/3-idx.length/3,originalFaceIndicesPrefixUnchanged:true,material:'original textured skin',sourceAnimationClips:4,sourceSkeletonJoints:53,eyeNodesRecessed:eyeNodes.length,eyeballDepthOffsetM:-eyeRecessM,originalBinaryPreservedAsPrefix:true,parameters:{recessM,ringInset,eyeRecessM}},
  review:{status:'requires-visual-approval',knownLimitations:['Geometry fits skinned face, but open inner aperture is not watertight','Facial atlas may still have pink eye pixels','No blink/gaze rig','Clipping and skin-material match must be checked from 3 angles and on device']}};
 return {buffer:glb.buffer,artifact};
}
