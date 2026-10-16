/** Geometry Artifact v1: a portable, constraint-checked *local transform* repair.
 *
 * Nothing here modifies vertices, UV maps, skeletons or the source GLB.  A
 * solved artifact is a reversible sidecar proposal, not proof of visual quality.
 * A future topology/eyelid solver may consume the same target + provenance.
 */
export const GEOMETRY_SCHEMA='blank.geometry.v1';
const finite3=a=>Array.isArray(a)&&a.length===3&&a.every(x=>typeof x==='number'&&Number.isFinite(x));
const copy3=a=>a.slice();
const assert3=(a,label)=>{if(!finite3(a))throw Error(`${label} must be three finite numbers`);};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function validateBox(b,label){
 if(!b||!finite3(b.min)||!finite3(b.max)||b.min.some((x,i)=>x>=b.max[i]))throw Error(`${label} must have ordered finite 3D bounds`);
}
export function validateGeometryArtifact(a){
 if(!a||a.schema!==GEOMETRY_SCHEMA||!['character','object','scene'].includes(a.builder)||typeof a.target?.name!=='string'||!a.target.name||a.target.name.length>160)throw Error('Unsupported geometry artifact or target');
 if(typeof a.id!=='string'||!/^[-._a-zA-Z0-9]{1,100}$/.test(a.id))throw Error('Invalid geometry artifact ID');
 if(a.asset?.sha256!=null&&!/^[a-f0-9]{64}$/.test(a.asset.sha256))throw Error('Invalid source asset SHA-256');
 assert3(a.baseline?.position,'Baseline position');assert3(a.baseline?.scale,'Baseline scale');
 if(a.baseline.scale.some(v=>v<=0))throw Error('Only positive local scales are supported');
 validateBox(a.baseline.bounds,'Mesh local geometry');
 assert3(a.limits?.maxOffset,'Translation limits');assert3(a.limits?.minFactor,'Minimum scale factors');assert3(a.limits?.maxFactor,'Maximum scale factors');
 for(let i=0;i<3;i++){
  if(a.limits.maxOffset[i]<=0||a.limits.maxOffset[i]>100||a.limits.minFactor[i]<=0||a.limits.minFactor[i]>a.limits.maxFactor[i]||a.limits.maxFactor[i]>10)throw Error('Invalid geometry constraints');
 }
 if(a.limits.envelope!=null)validateBox(a.limits.envelope,'Placement envelope');
 if(a.mirror!=null){if(typeof a.mirror.name!=='string'||!a.mirror.name||a.mirror.name===a.target.name||![0,1,2].includes(a.mirror.axis))throw Error('Invalid paired geometry target');}
 assert3(a.request?.offset,'Requested translation');assert3(a.request?.factor,'Requested scale factors');
 if(a.request.factor.some(v=>v<=0))throw Error('Requested scale must be positive');
 if(a.notes!=null&&(typeof a.notes!=='string'||a.notes.length>1000))throw Error('Invalid review notes');
 return a;
}
export function createGeometryArtifact({id,builder='character',asset={},target,position,scale=[1,1,1],bounds,maxOffset=null,minFactor=[.65,.65,.65],maxFactor=[1.35,1.35,1.35],envelope=null,mirror=null,notes=''}){
 validateBox(bounds,'Mesh local geometry');assert3(position,'Baseline position');assert3(scale,'Baseline scale');
 const span=bounds.max.map((v,i)=>v-bounds.min[i]);
 const artifact={schema:GEOMETRY_SCHEMA,id,builder,asset:{...asset},target:{name:target},
  coordinateFrame:'target-parent-local',units:'meters',
  baseline:{position:copy3(position),scale:copy3(scale),bounds:{min:copy3(bounds.min),max:copy3(bounds.max)}},
  limits:{maxOffset:maxOffset?copy3(maxOffset):span.map(v=>clamp(v*.5,.004,.25)),minFactor:copy3(minFactor),maxFactor:copy3(maxFactor),envelope:envelope?{min:copy3(envelope.min),max:copy3(envelope.max)}:null},
  mirror:mirror?{name:mirror.name,axis:mirror.axis}:null,
  request:{offset:[0,0,0],factor:[1,1,1]},notes,
  review:{status:'not-reviewed',needed:['inspect front, side and three-quarter views','confirm no clipping against adjacent meshes']}};
 return validateGeometryArtifact(artifact);
}
/** Orthogonal projection of a requested edit onto explicit scale/offset/AABB constraints.
 * If the aperture envelope was not measured, the solution stays preliminary.
 */
export function solveGeometryArtifact(artifact,request=artifact.request){
 validateGeometryArtifact(artifact);
 assert3(request?.offset,'Requested translation');assert3(request?.factor,'Requested scale factors');
 if(request.factor.some(v=>v<=0))throw Error('Requested scale must be positive');
 const a=artifact,offset=[],factor=[],position=[],scale=[],clamped=[];
 for(let i=0;i<3;i++){
  const {limits:l,baseline:b}=a;
  let f=clamp(request.factor[i],l.minFactor[i],l.maxFactor[i]);
  const bspan=b.bounds.max[i]-b.bounds.min[i];
  if(l.envelope){
   const limit=(l.envelope.max[i]-l.envelope.min[i])/(bspan*b.scale[i]);
   if(limit<l.minFactor[i]-1e-10)throw Error(`Infeasible placement envelope on axis ${i}`);
   f=Math.min(f,limit);
  }
  let v=clamp(request.offset[i],-l.maxOffset[i],l.maxOffset[i]);
  let p=b.position[i]+v,s=b.scale[i]*f;
  if(l.envelope){
   // Offset geometry bounds can be asymmetric around its local origin.
   const low=l.envelope.min[i]-b.bounds.min[i]*s;
   const high=l.envelope.max[i]-b.bounds.max[i]*s;
   if(low>high+1e-8)throw Error(`Infeasible transformed bounds on axis ${i}`);
   p=clamp(p,low,high);
  }
  offset.push(p-b.position[i]);factor.push(f);position.push(p);scale.push(s);
  if(Math.abs(v-request.offset[i])>1e-8||Math.abs(f-request.factor[i])>1e-8||Math.abs(p-b.position[i]-v)>1e-8)clamped.push(['x','y','z'][i]);
 }
 const result={schema:GEOMETRY_SCHEMA,id:a.id,target:a.target.name,
  transform:{position,scale},appliedRequest:{offset,factor},clampedAxes:[...new Set(clamped)],
  constraintStatus:clamped.length?'projected':'satisfied',
  reviewStatus:'requires-visual-approval',
  measuredEnvelope:!!a.limits.envelope};
 // A feasible AABB is not proof of a visually correct surface or an eyelid seal.
 return result;
}
export function mirrorTransform(artifact,solved,peerBaseline){
 validateGeometryArtifact(artifact);
 if(!artifact.mirror)throw Error('Artifact has no mirrored target');
 assert3(peerBaseline?.position,'Paired baseline position');assert3(peerBaseline?.scale,'Paired baseline scale');
 const axis=artifact.mirror.axis;
 return {position:peerBaseline.position.map((v,i)=>v+(solved.transform.position[i]-artifact.baseline.position[i])*(i===axis?-1:1)),
  scale:peerBaseline.scale.map((v,i)=>v*(solved.transform.scale[i]/artifact.baseline.scale[i]))};
}
export function serializeGeometryArtifact(artifact){validateGeometryArtifact(artifact);return JSON.stringify(artifact,null,2);}
