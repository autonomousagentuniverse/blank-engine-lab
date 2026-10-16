/** Geometry Artifact v3: measured, source-locked, reversible eyelid lip overlay.
 * Coordinates come from the actual indexed face aperture contours, not screenshots.
 * Four new surface primitives parent to the animated HEAD bone, so there are no
 * changes to facial mesh UVs/skin weights, animation tracks or the source BIN.
 * These are bounded ROUND-OVER candidates, not a claim of blinking or realism.
 */
import {measureAndSolveEyeAssembly,EYE_FIT_SCHEMA} from './eyelid-fit.mjs';
export const LID_SCHEMA='blank.geometry.eyelid-reconstruction.v3';
export const PINNED_HERO_SHA256='207ba42634bf144f3c43aa72e93673fb1607f39a7e0d259a5d9e4293213ef384';
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const scale=(a,f)=>a.map(v=>v*f);
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const n=Math.hypot(...a);if(n<1e-10)throw Error('Degenerate eyelid geometry');return scale(a,1/n);};
const d2=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function orient(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function intersects(a,b,c,d){return orient(a,b,c)*orient(a,b,d)<-1e-16 &&orient(c,d,a)*orient(c,d,b)<-1e-16;}
function validateContour(contour){
 if(!Array.isArray(contour)||contour.length<12||contour.length>100)throw Error('Measured eye contour required');
 if(contour.some(p=>!Array.isArray(p)||p.length!==3||p.some(v=>!Number.isFinite(v))))throw Error('Nonfinite contour coordinates');
 const n=contour.length;let area=0;
 for(let i=0;i<n;i++){
  const p=contour[i],q=contour[(i+1)%n];if(d2(p,q)<1e-6)throw Error('Collapsed eyelid boundary segment');
  area+=p[0]*q[1]-q[0]*p[1];
  for(let j=i+2;j<n;j++){if(i===0&&j===n-1)continue;
   if(intersects(p,q,contour[j],contour[(j+1)%n]))throw Error('Self-intersecting eyelid boundary');}
 }
 if(Math.abs(area)<1e-8)throw Error('Zero-area eyelid boundary');
 return {signedArea:area*.5,clockwise:area<0,vertices:n};
}
const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const qrot=(q,p)=>qmul(qmul(q,[...p,0]),[-q[0],-q[1],-q[2],q[3]]).slice(0,3);
function headSpace(doc){
 const heads=doc.nodes.flatMap((n,i)=>n.name==='head'?[i]:[]);
 if(heads.length!==1)throw Error('One unique head joint required');
 const parent=new Map();doc.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>{if(parent.has(c))throw Error('Multiple node parents');parent.set(c,i);}));
 const ancestors=[];let i=heads[0];while(i!==undefined){ancestors.unshift(i);i=parent.get(i);if(ancestors.length>120)throw Error('Cyclic skeleton');}
 let p=[0,0,0],q=[0,0,0,1],s=[1,1,1];
 for(const id of ancestors){const n=doc.nodes[id];const t=n.translation||[0,0,0],r=n.rotation||[0,0,0,1],z=n.scale||[1,1,1];
   p=add(p,qrot(q,t.map((v,k)=>v*s[k])));q=qmul(q,r);s=s.map((v,k)=>v*z[k]);}
 return {index:heads[0],toLocal:v=>qrot([-q[0],-q[1],-q[2],q[3]],sub(v,p)).map((x,k)=>x/s[k])};
}
function pushArray(bin,doc,array,componentType,type,target){
 const length=array.byteLength,pad=(4-bin.length%4)%4;
 const next=new Uint8Array(bin.length+pad+length);next.set(bin);next.set(new Uint8Array(array.buffer,array.byteOffset,length),bin.length+pad);
 doc.bufferViews.push({buffer:0,byteOffset:bin.length+pad,byteLength:length,target});
 const count=array.length/(type==='VEC3'?3:type==='VEC2'?2:1);
 const entry={bufferView:doc.bufferViews.length-1,componentType,count,type};
 if(type==='VEC3'){
  entry.min=[Infinity,Infinity,Infinity];entry.max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<array.length;i+=3)for(let j=0;j<3;j++){
   entry.min[j]=Math.min(entry.min[j],array[i+j]);entry.max[j]=Math.max(entry.max[j],array[i+j]);}
 }
 doc.accessors.push(entry);return {bin:next,index:doc.accessors.length-1};
}
function pack(doc,bin){
 doc.buffers[0].byteLength=bin.length;
 const json=new TextEncoder().encode(JSON.stringify(doc));const jl=(json.length+3)&~3,bl=(bin.length+3)&~3;
 const out=new Uint8Array(12+8+jl+8+bl),v=new DataView(out.buffer);
 v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,out.length,true);
 v.setUint32(12,jl,true);v.setUint32(16,0x4e4f534a,true);out.set(json,20);out.fill(32,20+json.length,20+jl);
 v.setUint32(20+jl,bl,true);v.setUint32(24+jl,0x004e4942,true);out.set(bin,28+jl);
 return out.buffer;
}
/** Return a pair of open but nondegenerate, curved skin surfaces. These do NOT
 * seal the eye hole into a watertight face mesh or provide full blink morphs.
 * Geometry is emitted as two contiguous half-loops per eyelid side to allow
 * later separately controlled upper/lower lids. No source-face topology edits.
 */
export function constructEyelidRibbons(contour,center,{outerFraction=.10,innerFractionUpper=.58,innerFractionLower=.25,roundover=.00165,recess=.0003}={}){
 const topo=validateContour(contour);
 if(![outerFraction,innerFractionUpper,innerFractionLower,roundover,recess].every(Number.isFinite)||outerFraction<.01||outerFraction>.18||innerFractionUpper<.1||innerFractionUpper>.78||innerFractionLower<.05||innerFractionLower>.52||roundover<0||roundover>.0035||recess<0||recess>.002)throw Error('Eyelid parameter constraints exceeded');
 const n=contour.length;const top=[],bottom=[];
 // Pick nasal and temporal corners at x-extrema. Distinct segments avoid
 // assigning the eyelid's thin horizontal corner triangles to both halves.
 const left=contour.reduce((k,p,i)=>p[0]<contour[k][0]?i:k,0);
 const right=contour.reduce((k,p,i)=>p[0]>contour[k][0]?i:k,0);
 const path=(step)=>{let indices=[left],idx=left;while(idx!==right&&indices.length<=n){idx=(idx+step+n)%n;indices.push(idx);}return indices;};
 const forward=path(1),reverse=path(-1);
 if(forward.length+reverse.length!==n+2)throw Error('Broken upper/lower boundary ordering');
 const upper=forward.slice(1,-1).reduce((s,i)=>s+contour[i][1],0)/Math.max(1,forward.length-2)>reverse.slice(1,-1).reduce((s,i)=>s+contour[i][1],0)/Math.max(1,reverse.length-2)?forward:reverse;
 const lower=upper===forward?reverse:forward;
 function make(indices,role){
   const vertices=[],normals=[],uv=[],triangles=[];const m=indices.length;
   const layer=[1+outerFraction,1,1-(role==='upper'?innerFractionUpper:innerFractionLower)];
   for(let k=0;k<3;k++)for(const index of indices){
     const p=contour[index],v=add(center,scale(sub(p,center),layer[k]));
     // Follow measured 3D contour Z. Raised crest creates genuine curvature;
     // inner lip retreats toward the eyeball, avoiding flat paint/decal tricks.
     v[2]=p[2]+[roundover*.55,roundover,-recess][k];
     vertices.push(...v);
     // Small UV footprint from neighboring skin, never the source pink lip.
     uv.push(.5+v[0]*.001,.5+v[1]*.001);
   }
   for(let k=0;k<2;k++)for(let j=0;j<m-1;j++){
     const a=k*m+j,b=a+1,c=a+m,d=c+1;
     if(role==='upper')triangles.push(a,c,b,b,c,d);
     else triangles.push(a,b,c,b,d,c);
   }
   for(let i=0;i<vertices.length/3;i++)normals.push(0,0,0);
   for(let k=0;k<triangles.length;k+=3){const ids=triangles.slice(k,k+3),a=vertices.slice(ids[0]*3,ids[0]*3+3),b=vertices.slice(ids[1]*3,ids[1]*3+3),c=vertices.slice(ids[2]*3,ids[2]*3+3);
     const nrm=cross(sub(b,a),sub(c,a));if(Math.hypot(...nrm)<1e-11)throw Error('Degenerate eyelid lip triangle');
     for(const id of ids)for(let x=0;x<3;x++)normals[id*3+x]+=nrm[x];
   }
   for(let i=0;i<normals.length;i+=3){const nrm=norm(normals.slice(i,i+3));normals.splice(i,3,...nrm);}
   // Enforce forward-facing surface normals after winding based on contour.
   const z=normals.reduce((s,v,i)=>i%3===2?s+v:s,0);
   if(z<0){for(let i=0;i<triangles.length;i+=3){const t=triangles[i+1];triangles[i+1]=triangles[i+2];triangles[i+2]=t;}for(let i=0;i<normals.length;i++)normals[i]*=-1;}
   return {role,positions:vertices,normals,indices:triangles,uv,triangles:triangles.length/3,vertices:vertices.length/3};
 }
 top.push(make(upper,'upper'));bottom.push(make(lower,'lower'));
 return {upper:top[0],lower:bottom[0],boundary:topo};
}
export function reconstructHeroEyelids(buffer,{assetSha256,parameters={}}={}){
 if(assetSha256!==PINNED_HERO_SHA256)throw Error('Source GLB hash does not match the pinned, eye-corrected CC0 hero');
 const {sidecar:measured,doc,bin:originalBin}=measureAndSolveEyeAssembly(buffer,{assetSha256});
 if(measured.schema!==EYE_FIT_SCHEMA||doc.nodes.filter(x=>x.name?.startsWith('Blank.Lid.')).length)throw Error('Unsupported or already reconstructed source');
 const originalMeshCount=doc.meshes.length,originalNodeCount=doc.nodes.length,oldBinLength=originalBin.length;
 const head=headSpace(doc);let bin=originalBin;const results={};
 const skinMaterial=doc.materials[0];if(skinMaterial?.name!=='Human.body'||!skinMaterial.pbrMetallicRoughness?.baseColorTexture)throw Error('Expected textured skin material');
 // Dedicated skin-toned opaque material; do NOT sample pink eyelid UV atlas.
 // Material match and artist approval remain blocked until visual inspection.
 const material=doc.materials.length;
 doc.materials.push({name:'Blank.Lid.skin-preview',alphaMode:'OPAQUE',doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[.69,.48,.35,1],metallicFactor:0,roughnessFactor:.75}});
 for(const side of ['L','R']){
  const aperture=measured.measurement.eyelids[side];
  const generated=constructEyelidRibbons(aperture.contour,aperture.center,parameters);
  results[side]={contourVertices:aperture.vertices,depthRangeM:aperture.depth,lipTriangles:0,meshes:[],boundary:generated.boundary};
  for(const role of ['upper','lower']){
   const surface=generated[role];
   const position=new Float32Array(surface.positions.length);
   for(let i=0;i<surface.positions.length;i+=3){const local=head.toLocal(surface.positions.slice(i,i+3));position.set(local,i);}
   const normals=new Float32Array(surface.normals.length);
   // Transform normals to head space using finite-difference basis of a point.
   const origin=head.toLocal([0,0,0]);
   for(let i=0;i<surface.normals.length;i+=3){const local=head.toLocal(surface.normals.slice(i,i+3));const n=norm(sub(local,origin));normals.set(n,i);}
   let id,attrIndex;({bin,index:id}=pushArray(bin,doc,new Uint16Array(surface.indices),5123,'SCALAR',34963));
   ({bin,index:attrIndex}=pushArray(bin,doc,position,5126,'VEC3',34962));const posIndex=attrIndex;
   ({bin,index:attrIndex}=pushArray(bin,doc,normals,5126,'VEC3',34962));const normalIndex=attrIndex;
   ({bin,index:attrIndex}=pushArray(bin,doc,new Float32Array(surface.uv),5126,'VEC2',34962));const uvIndex=attrIndex;
   const name=`Blank.Lid.${side}.${role}`;const mesh=doc.meshes.length;
   doc.meshes.push({name,primitives:[{attributes:{POSITION:posIndex,NORMAL:normalIndex,TEXCOORD_0:uvIndex},indices:id,material,mode:4}]});
   const node=doc.nodes.length;doc.nodes.push({name,mesh});doc.nodes[head.index].children.push(node);
   results[side].meshes.push(name);results[side].lipTriangles+=surface.triangles;
  }
 }
 const v3={schema:LID_SCHEMA,id:'hero-measured-lid-reconstruction-01',builder:'character',
   source:{sha256:assetSha256,geometry:'original GLB face unchanged',sourceBytes:buffer.byteLength},
   measurements:{...results,method:'28-point actual indexed face boundary, 3D depth and profile'},
   parameters:{outerFraction:parameters.outerFraction??.10,innerFractionUpper:parameters.innerFractionUpper??.58,innerFractionLower:parameters.innerFractionLower??.25,roundoverM:parameters.roundover??.00165,recessM:parameters.recess??.0003},
   output:{addedMeshes:doc.meshes.length-originalMeshCount,addedNodes:doc.nodes.length-originalNodeCount,addedTriangles:Object.values(results).reduce((s,o)=>s+o.lipTriangles,0),sourceBinaryPrefixBytes:oldBinLength,rigJoints:doc.skins[0].joints.length,animationClips:doc.animations.length,originalFaceMeshUnchanged:true,headBoneRigidAttachment:true,blinking:false},
   limitations:['A close-up preview candidate, not approved facial anatomy','A separate head-parented lip is not a watertight retopology of the skinned face','No eyelid opening/closing rig or 3D eye/surface intersection certification','New skin material may not perfectly match existing textured face and needs artist review'],
   review:{status:'requires-visual-approval',required:['front macro','left profile','right profile','three-quarter','animation/head turn','material tone compatibility']} };
 return {buffer:pack(doc,bin),artifact:v3};
}
