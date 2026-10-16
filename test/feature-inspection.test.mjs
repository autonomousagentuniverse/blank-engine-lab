import test from 'node:test';
import assert from 'node:assert/strict';
import {focusCameraPose,clampInspectDistance,createInspectionBookmarks,INSPECT_MIN_DISTANCE,createUniversalInspector} from '../inspection/focus.mjs';
test('focus works at arbitrary 3D coordinates, not just facial presets',()=>{
 const actual=focusCameraPose({point:[3,2,-4],position:[3,2,8],distance:.45});
 assert.deepEqual(actual.target,[3,2,-4]);assert.deepEqual(actual.position,[3,2,-3.55]);
});
test('close-up distance is bounded for micro-features and large objects',()=>{
 assert.equal(clampInspectDistance(.0001),INSPECT_MIN_DISTANCE);
 assert.equal(clampInspectDistance(1000),35);
 assert.throws(()=>clampInspectDistance(NaN),/finite/);
});
test('bookmarks are independent deep copies and capped',()=>{
 const b=createInspectionBookmarks({limit:2});
 const entry=b.add({label:'Eye',target:[0,1,0],position:[0,1,.2]});
 entry.target[0]=99;assert.equal(b.list()[0].target[0],0);
 const n=b.add({label:'Door hinge',target:[2,4,0],position:[2,4,.3]});
 b.add({label:'Building facade',target:[9,1,0],position:[9,1,2]});
 assert.equal(b.list().length,2);assert.equal(b.get(n.id).label,'Door hinge');
 assert.equal(b.get(1),null);
});
test('invalid poses and bookmark capacity are rejected',()=>{
 assert.throws(()=>focusCameraPose({point:[1,2,NaN],position:[0,0,1],distance:.5}),/Invalid/);
 assert.throws(()=>createInspectionBookmarks({limit:0}),/Invalid/);
});
test('selection follows mesh-local point without moving or modifying mesh data',()=>{
 class V {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}clone(){return new V(this.x,this.y,this.z)}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}copy(v){return this.set(v.x,v.y,v.z)}add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this}distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)} }
 const callbacks={},canvas={style:{},addEventListener(n,f){callbacks[n]=f},removeEventListener(n){delete callbacks[n]},getBoundingClientRect(){return {left:0,top:0,width:100,height:100}}};
 const obj={id:7,name:'Sleeve seam',visible:true,parent:null,userData:{},offset:0,updateWorldMatrix(){},worldToLocal(p){p.x-=this.offset;return p},localToWorld(p){p.x+=this.offset;return p}};
 const THREE={Vector3:V,Vector2:class{set(){}},Raycaster:class{setFromCamera(){}intersectObjects(){return [{object:obj,point:new V(2,1,0)}]}}};
 const camera={position:new V(0,1,3),lookAt(){}};
 const controls={target:new V(0,1,0),update(){}};
 const s=createUniversalInspector(THREE,{camera,canvas,controls,getRoots:()=>[obj]});
 s.setArmed(true);callbacks.pointerdown({pointerId:1,clientX:40,clientY:50});callbacks.pointerup({pointerId:1,clientX:42,clientY:50});
 assert.equal(s.getState().selected.label,'Sleeve seam');
 assert.equal(s.bookmark('Sleeve seam').label,'Sleeve seam');
 obj.offset=1;s.follow();assert.ok(Math.abs(controls.target.x-3)<1e-8);
 s.setDistance(.3);assert.equal(s.getState().selected.distance,.3);
 s.clear();assert.equal(s.getState().selected,null);
 s.dispose();assert.equal(callbacks.pointerdown,undefined);
});
