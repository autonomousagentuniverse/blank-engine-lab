/** Narrow repair for the pinned MakeHuman suited GLB: it has pink sockets but no eyeballs.
 * Four shared meshes are attached to the existing animated head bone.
 * Original geometry, textures, skin weights, animation tracks remain untouched.
 * These measured socket coordinates MUST NOT be applied to unrelated avatars.
 */
const specs=[
 ['sclera',[.0145,.0065,.010],[.84,.82,.78,1],.36,.156],
 ['iris',[.0046,.00455,.00145],[.20,.105,.055,1],.38,.1662],
 ['pupil',[.0019,.002,.00065],[.014,.013,.010,1],.12,.168],
 ['catchlight',[.00072,.00075,.00032],[.92,.94,.94,1],.06,.1688]
];
function parse(input){
 if(!(input instanceof ArrayBuffer)||input.byteLength<28)throw Error('GLB required');
 const v=new DataView(input);
 if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==input.byteLength)throw Error('Invalid GLB header');
 let at=12,doc,bin;
 while(at<input.byteLength){
  if(at+8>input.byteLength)throw Error('Truncated GLB');
  const len=v.getUint32(at,true),type=v.getUint32(at+4,true);
  if(len%4||at+8+len>input.byteLength)throw Error('Corrupt GLB chunks');
  if(type===0x4e4f534a){if(doc)throw Error('Repeated JSON');doc=JSON.parse(new TextDecoder().decode(new Uint8Array(input,at+8,len)).trim());}
  else if(type===0x004e4942){if(bin)throw Error('Repeated BIN');bin=new Uint8Array(input.slice(at+8,at+8+len));}
  else throw Error('Unsupported GLB chunk');
  at+=8+len;
 }
 if(!doc||!bin||doc.asset?.version!=='2.0')throw Error('Incomplete glTF 2.0');
 return {doc,bin};
}
function sphere([rx,ry,rz]){
 const p=[],n=[],f=[],seg=16,rings=10;
 for(let j=0;j<=rings;j++)for(let i=0;i<=seg;i++){
  const a=Math.PI*j/rings,b=2*Math.PI*i/seg,x=Math.sin(a)*Math.cos(b),y=Math.cos(a),z=Math.sin(a)*Math.sin(b);
  p.push(x*rx,y*ry,z*rz);
  const nx=x/rx,ny=y/ry,nz=z/rz,l=Math.hypot(nx,ny,nz)||1;n.push(nx/l,ny/l,nz/l);
 }
 for(let j=0;j<rings;j++)for(let i=0;i<seg;i++){
  const a=j*(seg+1)+i,b=a+seg+1;
  // Outward triangles avoid the black-eye bug caused by inverted winding.
  f.push(a,a+1,b,b,a+1,b+1);
 }
 return [new Uint16Array(f),new Float32Array(p),new Float32Array(n)];
}
function put(doc,bin,values,type,component,target){
 const pad=(4-bin.byteLength%4)%4,out=new Uint8Array(bin.byteLength+pad+values.byteLength);
 out.set(bin);out.set(new Uint8Array(values.buffer),bin.byteLength+pad);
 const view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:bin.byteLength+pad,byteLength:values.byteLength,target});
 const ac={bufferView:view,componentType:component,count:values.length/(type==='VEC3'?3:1),type};
 if(type==='VEC3'){ac.min=[Infinity,Infinity,Infinity];ac.max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<values.length;i+=3)for(let k=0;k<3;k++){ac.min[k]=Math.min(ac.min[k],values[i+k]);ac.max[k]=Math.max(ac.max[k],values[i+k]);}
 }
 const id=doc.accessors.length;doc.accessors.push(ac);return [out,id];
}
function pack(doc,bin){
 const raw=new TextEncoder().encode(JSON.stringify(doc)),n=raw.length+(4-raw.length%4)%4,m=bin.length+(4-bin.length%4)%4;
 const a=new ArrayBuffer(12+8+n+8+m),v=new DataView(a),b=new Uint8Array(a);
 v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,a.byteLength,true);
 v.setUint32(12,n,true);v.setUint32(16,0x4e4f534a,true);b.set(raw,20);b.fill(32,20+raw.length,20+n);
 v.setUint32(20+n,m,true);v.setUint32(24+n,0x004e4942,true);b.set(bin,28+n);return a;
}
export function inspectHeroEyes(buffer){
 const {doc}=parse(buffer);
 return {nodes:doc.nodes.filter(x=>x.name?.startsWith('Blank.Eye.')).length,
 meshes:doc.meshes.filter(x=>x.name?.startsWith('Blank.Eye.')).length,
 materials:doc.materials.filter(x=>x.name?.startsWith('Blank.Eye.')).length,
 joints:doc.skins?.[0]?.joints?.length??0,clips:doc.animations?.length??0};
}
export function repairHeroEyes(buffer){
 let {doc,bin}=parse(buffer);
 const names=['Human.body','Human.male_casualsuit01','Human.shoes01'];
 if(doc.nodes?.length!==57||doc.nodes[38]?.name!=='head'||doc.meshes?.length!==3||doc.materials?.length!==3||
 doc.materials.some((m,i)=>m.name!==names[i]||(m.alphaMode||'OPAQUE')!=='OPAQUE')||
 doc.skins?.length!==1||doc.skins[0].joints?.length!==53||doc.animations?.length!==4||
 !Array.isArray(doc.accessors)||!Array.isArray(doc.bufferViews)||doc.buffers?.length!==1)
 throw Error('Eye correction only supports the pinned opaque MakeHuman hero');
 const first=doc.meshes.length,head=doc.nodes[38];
 for(const [part,rgbSize,color,rough,z] of specs){
  const [idx,pos,norm]=sphere(rgbSize);
  let index,p,n;[bin,index]=put(doc,bin,idx,'SCALAR',5123,34963);
  [bin,p]=put(doc,bin,pos,'VEC3',5126,34962);
  [bin,n]=put(doc,bin,norm,'VEC3',5126,34962);
  const material=doc.materials.length;doc.materials.push({name:'Blank.Eye.'+part,alphaMode:'OPAQUE',doubleSided:false,pbrMetallicRoughness:{baseColorFactor:color,roughnessFactor:rough,metallicFactor:0}});
  doc.meshes.push({name:'Blank.Eye.'+part,primitives:[{attributes:{POSITION:p,NORMAL:n},indices:index,material,mode:4}]});
 }
 // Inverse of the original head-rest transform, measured on the pinned asset.
 for(const [side,x] of [['L',-.0357],['R',.0357]])for(let i=0;i<specs.length;i++){
  const part=specs[i][0],z=specs[i][4],spot=part==='catchlight';
  const dy=1.810+(spot?.00165:0)-1.77560845,dz=z-.04753346;
  const xyz=[x+(spot?(side==='L'?-.00155:.00155):0),.99999072*dy-.00434717*dz,.00434717*dy+.99999072*dz];
  const id=doc.nodes.length;doc.nodes.push({name:'Blank.Eye.'+side+'.'+part,mesh:first+i,translation:xyz});
  if(!head.children)head.children=[];head.children.push(id);
 }
 doc.buffers[0].byteLength=bin.byteLength;return pack(doc,bin);
}
