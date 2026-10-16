/** Measured glTF eyelid aperture and coupled eye-assembly fitting.
 * Does not invent an aperture, modify existing face topology, or certify a visual fix.
 * Uses ordered *actual open boundary edges* from the skin mesh; texture colors and
 * raster screenshots are not accepted as substitutes for topology evidence.
 */
export const EYE_FIT_SCHEMA='blank.geometry.eye-fit.v2';
const xyz=a=>a.map(x=>Number(x));
const finite=a=>Array.isArray(a)&&a.every(Number.isFinite);
function glbRead(buffer){
 const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);
 if(bytes.length<64||bytes.length>32*1024*1024)throw Error('GLB size invalid');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==bytes.length)throw Error('Invalid GLB header');
 let pos=12,doc=null,bin=null;
 while(pos<bytes.length){if(pos+8>bytes.length)throw Error('Truncated chunk');
  const size=v.getUint32(pos,true),type=v.getUint32(pos+4,true);
  if(size%4||pos+size+8>bytes.length)throw Error('Invalid GLB chunk');
  if(type===0x4e4f534a){if(doc)throw Error('Duplicate glTF manifest');doc=JSON.parse(new TextDecoder().decode(bytes.subarray(pos+8,pos+8+size)).trim());}
  else if(type===0x004e4942){if(bin)throw Error('Duplicate glTF buffer');bin=bytes.slice(pos+8,pos+8+size);}
  pos+=8+size;
 }
 if(pos!==bytes.length||!doc||!bin||doc.asset?.version!=='2.0')throw Error('Incomplete GLB');
 return {doc,bin,bytes};
}
function accessor(doc,bin,index){
 const a=doc.accessors?.[index];if(!a||a.sparse||a.bufferView==null)throw Error('Unsupported sparse accessor');
 const b=doc.bufferViews?.[a.bufferView];if(!b||b.buffer!==0)throw Error('Unsupported GLB buffer view');
 const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],width={5126:4,5123:2,5125:4}[a.componentType];
 if(!components||!width||!Number.isInteger(a.count)||a.count>300000)throw Error('Unsupported GLB accessor');
 const stride=b.byteStride||components*width,offset=(b.byteOffset||0)+(a.byteOffset||0),v=new DataView(bin.buffer,bin.byteOffset,bin.byteLength),out=[];
 if(stride<components*width||offset<0||offset+(a.count-1)*stride+components*width>bin.byteLength)throw Error('Accessor out of bounds');
 for(let i=0;i<a.count;i++){
  const row=[];for(let j=0;j<components;j++){
   const p=offset+i*stride+j*width;
   row.push(a.componentType===5126?v.getFloat32(p,true):a.componentType===5123?v.getUint16(p,true):v.getUint32(p,true));
  }
  out.push(row);
 }
 return out;
}
/** Every edge used by exactly one triangle is an actual open mesh boundary. */
export function meshBoundaryLoops(positions,triangles){
 if(!Array.isArray(positions)||!Array.isArray(triangles)||positions.some(p=>!finite(p)||p.length!==3))throw Error('Invalid mesh topology');
 const counts=new Map(),direction=new Map();
 for(const tri of triangles){if(!Array.isArray(tri)||tri.length!==3)throw Error('Nontriangle geometry');
  for(let j=0;j<3;j++){const a=tri[j],b=tri[(j+1)%3];if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=positions.length||b>=positions.length||a===b)throw Error('Invalid triangle indices');
   const key=Math.min(a,b)+':'+Math.max(a,b);counts.set(key,(counts.get(key)||0)+1);direction.set(key,[a,b]);
  }
 }
 const adj=new Map();
 for(const [key,count] of counts){if(count!==1)continue;const [a,b]=direction.get(key);
  for(const [v,peer] of [[a,b],[b,a]]){if(!adj.has(v))adj.set(v,[]);adj.get(v).push(peer);}
 }
 const visited=new Set(),loops=[];
 for(const start of adj.keys()){
  if(visited.has(start))continue;
  const stack=[start],component=[];visited.add(start);
  while(stack.length){const v=stack.pop();component.push(v);for(const next of adj.get(v)||[]){if(!visited.has(next)){visited.add(next);stack.push(next);}}}
  if(component.length<3)continue;
  // Reject open or branched boundaries: they cannot constrain a watertight eye aperture.
  if(component.some(v=>adj.get(v).length!==2))continue;
  const order=[start],seen=new Set(order);let prev=-1,current=start;
  while(order.length<component.length){const next=adj.get(current).find(x=>x!==prev&&!seen.has(x));if(next===undefined)break;order.push(next);seen.add(next);prev=current;current=next;}
  if(order.length===component.length)loops.push(order.map(i=>positions[i]));
 }
 return loops;
}
const bound=points=>({min:[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max:[0,1,2].map(i=>Math.max(...points.map(p=>p[i])))});
const mean=points=>[0,1,2].map(i=>points.reduce((s,p)=>s+p[i],0)/points.length);
const diff=(b,i)=>b.max[i]-b.min[i];
function classifyEyeContours(loops){
 const candidates=loops.map(p=>({points:p,bounds:bound(p),center:mean(p)})).filter(o=>
  o.points.length>=12&&o.points.length<=100&&Math.abs(o.center[0])>.015&&Math.abs(o.center[0])<.07&&o.center[1]>1.77&&o.center[1]<1.86&&
  o.center[2]>.12&&o.center[2]<.2&&diff(o.bounds,0)>.016&&diff(o.bounds,0)<.05&&diff(o.bounds,1)>.003&&diff(o.bounds,1)<.02);
 const results={};
 for(const side of ['L','R']){
  const matches=candidates.filter(o=>side==='L'?o.center[0]<0:o.center[0]>0);
  if(!matches.length)throw Error(`Measured eyelid aperture missing: ${side}`);
  const original=matches.sort((a,b)=>b.points.length-a.points.length)[0],similar=matches.filter(o=>
    Math.hypot(...o.center.map((x,i)=>x-original.center[i]))<.0001&&
    [0,1,2].every(i=>Math.abs(o.bounds.min[i]-original.bounds.min[i])<.0001&&Math.abs(o.bounds.max[i]-original.bounds.max[i])<.0001));
  if(!similar.length)throw Error('Aperture identity mismatch');
  results[side]={side,center:xyz(original.center),bounds:original.bounds,contour:original.points.map(xyz),vertices:original.points.length,
   duplicateUVLoops:similar.length-1,topology:'open-boundary',width:diff(original.bounds,0),height:diff(original.bounds,1),depth:diff(original.bounds,2)};
 }
 const L=results.L,R=results.R;
 if(Math.abs(L.center[0]+R.center[0])>.001||Math.abs(L.center[1]-R.center[1])>.001||Math.abs(L.width-R.width)>.001||Math.abs(L.height-R.height)>.001)throw Error('Eye openings are asymmetric beyond tolerance');
 return results;
}
const quatMul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
function rotate(q,p){const v=[...p,0],r=quatMul(quatMul(q,v),[-q[0],-q[1],-q[2],q[3]]);return r.slice(0,3);}
function worldNode(doc,index){
 const parent=new Map();doc.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>{if(parent.has(c))throw Error('Multiple bone parents');parent.set(c,i)}));
 const ancestry=[];let i=index;while(i!==undefined){ancestry.unshift(i);i=parent.get(i);if(ancestry.length>100)throw Error('Broken bone hierarchy');}
 let position=[0,0,0],q=[0,0,0,1],scale=[1,1,1];
 for(const j of ancestry){const n=doc.nodes[j],t=n.translation||[0,0,0],r=n.rotation||[0,0,0,1],s=n.scale||[1,1,1];
  const shift=rotate(q,t.map((x,k)=>x*scale[k]));position=position.map((x,k)=>x+shift[k]);q=quatMul(q,r);scale=scale.map((x,k)=>x*s[k]);
 }
 return {position,rotation:q,scale,
  toLocal(p){const v=rotate([-q[0],-q[1],-q[2],q[3]],p.map((x,k)=>x-position[k]));return v.map((x,k)=>x/scale[k]);}}
}
const distancePointSegment=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],dot=(p[0]-a[0])*dx+(p[1]-a[1])*dy,t=Math.max(0,Math.min(1,dot/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
export function pointInsideAperture(point,contour){
 let inside=false;
 for(let i=0,j=contour.length-1;i<contour.length;j=i++){
  const a=contour[i],b=contour[j];if(((a[1]>point[1])!==(b[1]>point[1]))&&(point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0]))inside=!inside;
 }
 return inside;
}
function clearance(point,contour){const p=point.slice(0,2);let minimum=Infinity;
 for(let i=0;i<contour.length;i++)minimum=Math.min(minimum,distancePointSegment(p,contour[i],contour[(i+1)%contour.length]));
 return pointInsideAperture(p,contour)?minimum:-minimum;
}
export function solveApertureEllipse(aperture,{minimumClearance=.00035,maxFraction=.95}={}){
 if(!aperture?.contour||aperture.contour.length<12||!(minimumClearance>0))throw Error('Measured contour required');
 const c=aperture.center,b=aperture.bounds,rx=(b.max[0]-b.min[0])/2,ry=(b.max[1]-b.min[1])/2;
 const score=f=>{let min=Infinity;for(let i=0;i<96;i++){const t=2*Math.PI*i/96,p=[c[0]+Math.cos(t)*rx*f,c[1]+Math.sin(t)*ry*f];min=Math.min(min,clearance(p,aperture.contour));}return min;};
 if(score(.03)<minimumClearance)throw Error('No feasible sclera center inside measured eyelid');
 let lo=.03,hi=maxFraction;
 for(let i=0;i<52;i++){const mid=(lo+hi)/2;if(score(mid)>=minimumClearance)lo=mid;else hi=mid;}
 return {center:c,width:2*rx*lo,height:2*ry*lo,fitFactor:lo,minimumClearance:score(lo)};
}
/** Coupled solve: sclera, iris, pupil and catchlight all derive from the SAME
 * eyelid opening and rest-pose head transform. Never scale them independently.
 * Existing eyelid vertex positions are untouched; appearance review stays gated.
 */
export function measureAndSolveEyeAssembly(buffer,{assetSha256}={}){
 if(!/^[a-f0-9]{64}$/.test(assetSha256||''))throw Error('Source SHA-256 is required for a measurable eye geometry artifact');
 const {doc,bin,bytes}=glbRead(buffer);
 if(doc.meshes?.[0]?.primitives?.length!==1||doc.meshes[0].name!=='base')throw Error('Pinned MakeHuman face mesh required');
 const prim=doc.meshes[0].primitives[0],positions=accessor(doc,bin,prim.attributes.POSITION),ind=accessor(doc,bin,prim.indices).map(a=>a[0]);
 if(ind.length%3)throw Error('Invalid indexed face triangles');
 const tris=[];for(let i=0;i<ind.length;i+=3)tris.push([ind[i],ind[i+1],ind[i+2]]);
 const apertures=classifyEyeContours(meshBoundaryLoops(positions,tris));
 const heads=doc.nodes.map((n,i)=>({name:n.name,index:i})).filter(x=>x.name==='head');if(heads.length!==1)throw Error('One animated head bone is required');
 const head=worldNode(doc,heads[0].index),shapes={sclera:[.0138,.0042,.01],iris:[.00375,.0033,.0014],pupil:[.0015,.00145,.00065],catchlight:[.0006,.0006,.0003]};
 const transforms={},fit={};
 for(const side of ['L','R']){
  const a=apertures[side],f=solveApertureEllipse(a),halfX=f.width/2,halfY=f.height/2;
  const rimDepth=a.center[2],base={sclera:[halfX,halfY,.006],iris:[halfX*.35,halfY*.61,.0009],pupil:[halfX*.135,halfY*.26,.00042],catchlight:[halfX*.05,halfY*.12,.00022]};
  const positions={sclera:[a.center[0],a.center[1],rimDepth-.004],iris:[a.center[0],a.center[1],rimDepth+.0022],pupil:[a.center[0],a.center[1],rimDepth+.0033],catchlight:[a.center[0]+(side==='L'?-1:1)*halfX*.13,a.center[1]+halfY*.30,rimDepth+.0038]};
  fit[side]={...a,ellipse:f};
  for(const part of Object.keys(shapes)){
   const name=`Blank.Eye.${side}.${part}`;
   const nodes=doc.nodes.map((n,i)=>({...n,index:i})).filter(n=>n.name===name);if(nodes.length!==1)throw Error('Eye assembly node missing: '+name);
   const s=base[part].map((v,i)=>v/shapes[part][i]);const pos=head.toLocal(positions[part]);
   if(s.some(x=>x<.08||x>2.2)||!finite(pos))throw Error('Coupled eye fit impossible');
   transforms[name]={position:pos,scale:s,sourceNode:nodes[0].index};
  }
 }
 const sidecar={schema:EYE_FIT_SCHEMA,id:'hero-measured-eyelid-fit-01',builder:'character',asset:{filename:'hero-v22-eyes.glb',sha256:assetSha256},
  units:'native GLB units (meters for the pinned hero)',coordinateFrame:'face bind pose + head-bone local',
  measurement:{method:'indexed mesh open-boundary topology',bodyMesh:doc.meshes[0].name,eyelids:fit},
  proposal:{transforms,eyelids:'retained unchanged',sourceMeshTopology:'retained unchanged'},
  quality:{status:'requires-visual-review',notes:['An anatomical eyelid fit cannot be certified using AABB or projection checks alone','No topology sculpting or blink deformation is implied','Capture front, profile and three-quarter head shots and reject clipping before approval']}};
 return {sidecar,doc,bin};
}
export function applyEyeAssemblyFit(buffer,options){
 const {sidecar,doc,bin}=measureAndSolveEyeAssembly(buffer,options);
 for(const [name,t] of Object.entries(sidecar.proposal.transforms)){
  const node=doc.nodes[t.sourceNode];if(node.name!==name)throw Error('Asset was modified during solve');node.translation=t.position;node.scale=t.scale;
 }
 const json=new TextEncoder().encode(JSON.stringify(doc)),n=Math.ceil(json.length/4)*4,m=Math.ceil(bin.length/4)*4;
 const out=new Uint8Array(12+8+n+8+m),v=new DataView(out.buffer);
 v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,out.length,true);
 v.setUint32(12,n,true);v.setUint32(16,0x4e4f534a,true);out.set(json,20);out.fill(32,20+json.length,20+n);
 v.setUint32(20+n,m,true);v.setUint32(24+n,0x004e4942,true);out.set(bin,28+n);
 return {buffer:out.buffer,sidecar};
}
