import test from 'node:test';
import assert from 'node:assert/strict';
import {createGeometryArtifact,solveGeometryArtifact,mirrorTransform,validateGeometryArtifact,serializeGeometryArtifact,GEOMETRY_SCHEMA} from '../geometry/artifact.mjs';
import {createGeometrySession,artifactFromThreeMesh} from '../geometry/three-adapter.mjs';
const simple=(extra={})=>createGeometryArtifact({id:'example-eyes',builder:'character',asset:{sha256:'a'.repeat(64)},target:'Blank.Eye.L.sclera',
 position:[-.0357,.03394,.103615],bounds:{min:[-.0138,-.0042,-.01],max:[.0138,.0042,.01]},
 maxOffset:[.01,.01,.01],mirror:{name:'Blank.Eye.R.sclera',axis:0},...extra});
test('geometry artifact captures measured local bounds and explicit review gate',()=>{
 const a=simple();assert.equal(a.schema,GEOMETRY_SCHEMA);assert.equal(a.review.status,'not-reviewed');assert.equal(a.limits.envelope,null);
 assert.deepEqual(JSON.parse(serializeGeometryArtifact(a)),a);
});
test('projection solves requested position/scale and preserves baseline',()=>{
 const a=simple(),before=JSON.stringify(a),r=solveGeometryArtifact(a,{offset:[0,0,-.002],factor:[1,.94,.89]});
 assert.equal(r.transform.position[2],a.baseline.position[2]-.002);
 assert.ok(Math.abs(r.transform.scale[1]-.94)<1e-9);assert.equal(r.constraintStatus,'satisfied');assert.equal(r.measuredEnvelope,false);
 assert.equal(JSON.stringify(a),before);
});
test('unbounded user edits are projected to declared limits',()=>{
 const r=solveGeometryArtifact(simple(),{offset:[3,0,-3],factor:[100,.01,1]});
 assert.deepEqual(r.clampedAxes,['x','y','z']);assert.ok(Math.abs(r.appliedRequest.offset[0]-.01)<1e-10);assert.equal(r.appliedRequest.factor[1],.65);
});
test('measured placement envelope constrains geometry extents',()=>{
 const a=createGeometryArtifact({id:'hinge-fit',builder:'object',target:'DoorHinge',position:[0,0,0],bounds:{min:[-1,-.2,-.2],max:[1,.2,.2]},
 envelope:{min:[-1.1,-.3,-.3],max:[1.1,.3,.3]},maxOffset:[1,1,1]});
 const r=solveGeometryArtifact(a,{offset:[.6,.5,.3],factor:[1.35,1,1]});
 assert.ok(r.transform.position[0]+a.baseline.bounds.max[0]*r.transform.scale[0]<=1.1000001);
 assert.equal(r.measuredEnvelope,true);assert.deepEqual(r.clampedAxes,['x','y','z']);
});
test('infeasible envelopes reject rather than generating intersecting geometry',()=>{
 const a=createGeometryArtifact({id:'bad',builder:'scene',target:'Column',position:[0,0,0],bounds:{min:[-1,-1,-1],max:[1,1,1]},
 envelope:{min:[-.1,-.1,-.1],max:[.1,.1,.1]}});
 assert.throws(()=>solveGeometryArtifact(a),/Infeasible/);
});
test('paired symmetry mirrors positional offsets but not size or depth changes',()=>{
 const a=simple(),r=solveGeometryArtifact(a,{offset:[.003,-.001,-.002],factor:[.9,1.04,.89]});
 const mirrored=mirrorTransform(a,r,{position:[.0357,.03394,.103615],scale:[1,1,1]});
 assert.ok(Math.abs(mirrored.position[0]-(.0357-.003))<1e-10);
 assert.ok(Math.abs(mirrored.position[2]-(.103615-.002))<1e-10);
 assert.ok(Math.abs(mirrored.scale[0]-.9)<1e-10);
});
test('rejects nonfinite geometry, negative scale, schema changes and missing provenance',()=>{
 assert.throws(()=>createGeometryArtifact({id:'bad',target:'Mesh',position:[NaN,0,0],bounds:{min:[0,0,0],max:[1,1,1]}}),/finite/);
 assert.throws(()=>validateGeometryArtifact({...simple(),schema:'unknown'}),/Unsupported/);
 assert.throws(()=>solveGeometryArtifact(simple(),{offset:[Infinity,0,0],factor:[1,1,1]}),/finite/);
});
function fakeNode(name,position){return {isMesh:true,name,position:{x:position[0],y:position[1],z:position[2],set(x,y,z){Object.assign(this,{x,y,z});}},scale:{x:1,y:1,z:1,set(x,y,z){Object.assign(this,{x,y,z});}},geometry:{getAttribute(){return {count:24}},computeBoundingBox(){this.boundingBox={min:{x:-.0138,y:-.0042,z:-.01},max:{x:.0138,y:.0042,z:.01},isEmpty(){return false}}}},updateMatrixWorld(){}};}
test('preview and revert are reversible and do not accumulate deltas',()=>{
 const left=fakeNode('Blank.Eye.L.sclera',[-.0357,.03394,.103615]),right=fakeNode('Blank.Eye.R.sclera',[.0357,.03394,.103615]);
 const root={traverse(fn){fn(left);fn(right);}};
 const a=artifactFromThreeMesh(left,{mirror:{name:right.name,axis:0},asset:{sha256:'a'.repeat(64)}});
 const session=createGeometrySession(root,a),edit={offset:[0,0,-.002],factor:[1,.9,.8]};
 session.preview(edit);const first=left.position.z;session.preview(edit);assert.equal(left.position.z,first);
 assert.equal(right.position.z,first);assert.ok(left.scale.z<1);
 session.revert();assert.equal(left.position.z,.103615);assert.equal(right.position.z,.103615);
 assert.equal(left.scale.z,1);assert.equal(session.active,false);
});
test('artifact binding fails on changed baseline and duplicate mesh identity',()=>{
 const obj=fakeNode('Box',[0,0,0]);const root={traverse(fn){fn(obj)}};
 const a=artifactFromThreeMesh(obj);obj.position.x=.3;
 assert.throws(()=>createGeometrySession(root,a),/baseline no longer matches/);
 assert.throws(()=>createGeometrySession({traverse(fn){fn(obj);fn(obj)}},a),/Expected one/);
});
