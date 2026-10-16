/** Three.js boundary for Geometry Artifact. Geometry topology/skin weights remain untouched. */
import {createGeometryArtifact,solveGeometryArtifact,mirrorTransform,validateGeometryArtifact} from './artifact.mjs';
const vec=a=>[a.x,a.y,a.z];
function snapshot(o){return {position:vec(o.position),scale:vec(o.scale)};}
function restore(o,transform){o.position.set(...transform.position);o.scale.set(...transform.scale);o.updateMatrixWorld(true);}
/** The bounding box is taken in object-local mesh coordinates, not from a screenshot. */
export function artifactFromThreeMesh(mesh,{id,builder='character',asset={},mirror=null,notes=''}={}){
 if(!mesh?.isMesh||!mesh.geometry?.getAttribute?.('position')||!mesh.name)throw Error('Select a named editable mesh, not a group or empty hit');
 const geometry=mesh.geometry;geometry.computeBoundingBox();
 const b=geometry.boundingBox;if(!b||b.isEmpty())throw Error('Selected geometry has no bounds');
 return createGeometryArtifact({id:id||`geometry-${mesh.name.replace(/[^a-zA-Z0-9_.-]/g,'-')}`.slice(0,100),builder,asset,target:mesh.name,
  position:vec(mesh.position),scale:vec(mesh.scale),bounds:{min:vec(b.min),max:vec(b.max)},mirror,notes});
}
/** Start preview/undo transaction. Nothing writes to a GLB until a separate export step. */
export function createGeometrySession(root,artifact){
 validateGeometryArtifact(artifact);
 if(!root?.traverse)throw Error('Missing editable scene root');
 const find=name=>{let match=null,count=0;root.traverse(o=>{if(o.name===name){match=o;count++;}});if(count!==1)throw Error(`Expected one target named ${name}; found ${count}`);return match;};
 const mesh=find(artifact.target.name),other=artifact.mirror?find(artifact.mirror.name):null;
 if(!mesh.isMesh||other&&!other.isMesh)throw Error('Geometry target must be a mesh');
 const baseline=snapshot(mesh),otherBaseline=other?snapshot(other):null;
 const approx=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-5);
 if(!approx(baseline.position,artifact.baseline.position)||!approx(baseline.scale,artifact.baseline.scale))throw Error('Artifact baseline no longer matches the scene');
 let active=false,last=null;
 function revert(){restore(mesh,baseline);if(other)restore(other,otherBaseline);active=false;last=null;}
 return {preview(request=artifact.request){
   // Restore first: repeated previews must never accumulate deltas.
   revert();
   const result=solveGeometryArtifact(artifact,request);
   restore(mesh,result.transform);
   if(other)restore(other,mirrorTransform(artifact,result,otherBaseline));
   active=true;last=result;return result;
  },revert,get active(){return active},get result(){return last},get targets(){return [mesh,other].filter(Boolean)} };
}
