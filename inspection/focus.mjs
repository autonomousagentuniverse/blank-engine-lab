/** Universal feature inspection: one controller for character, object and scene builders.
 * Anchors are expressed in mesh-local coordinates so a focused moving part can
 * be followed without mutating meshes, materials, skeletons or simulation state.
 * This is a visual QA tool, not geometry editing or photorealism certification.
 */
export const INSPECT_MIN_DISTANCE = 0.13;
export const INSPECT_MAX_DISTANCE = 35;
export const INSPECT_BOOKMARK_LIMIT = 12;
export function clampInspectDistance(value){
  if(!Number.isFinite(value))throw Error('Inspection distance must be finite');
  return Math.min(INSPECT_MAX_DISTANCE,Math.max(INSPECT_MIN_DISTANCE,value));
}
export function focusCameraPose({point,position,distance}){
  if(!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite)||!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite))throw Error('Invalid inspection camera pose');
  const d=clampInspectDistance(distance);
  const delta=position.map((v,i)=>v-point[i]);
  const length=Math.hypot(...delta);
  const normalized=length>1e-7?delta.map(v=>v/length):[0,0,1];
  return {target:[...point],position:point.map((v,i)=>v+normalized[i]*d),distance:d};
}
export function createInspectionBookmarks({limit=INSPECT_BOOKMARK_LIMIT}={}){
  if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Invalid bookmark limit');
  const entries=[];
  return {
    add({label,target,position}){
      const pose=focusCameraPose({point:target,position,distance:Math.hypot(...position.map((v,i)=>v-target[i]))});
      if(entries.length>=limit)entries.shift();
      const entry={id:entries.length?Math.max(...entries.map(x=>x.id))+1:1,label:String(label||'Detail').slice(0,100),target:[...pose.target],position:[...pose.position]};
      entries.push(entry);return {...entry,target:[...entry.target],position:[...entry.position]};
    },
    list:()=>entries.map(x=>({...x,target:[...x.target],position:[...x.position]})),
    get:id=>{const x=entries.find(e=>e.id===id);return x?{...x,target:[...x.target],position:[...x.position]}:null},
    clear:()=>{entries.length=0;}
  };
}
export function createUniversalInspector(THREE,{camera,canvas,controls=null,getRoots,afterFocus=()=>{}}){
  if(!THREE?.Raycaster||!camera||!canvas||typeof getRoots!=='function')throw Error('Inspection requires a camera, canvas, Three.js, and scene roots');
  const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2();
  const bookmarks=createInspectionBookmarks();
  let armed=false,focus=null,restorePose=null,pointerDown=null;
  const vector=a=>new THREE.Vector3(...a);
  const coords=v=>[v.x,v.y,v.z];
  function applyCamera(pose){
    camera.position.set(...pose.position);
    if(controls){controls.target.set(...pose.target);controls.update();}
    else camera.lookAt(vector(pose.target));
    afterFocus(getState());
  }
  function getState(){return {armed,selected:focus?{label:focus.label,distance:focus.distance,point:[...focus.point]}:null,bookmarks:bookmarks.list()};}
  function getCameraPose(){return {position:coords(camera.position),target:controls?coords(controls.target):focus?[...focus.point]:[0,0,0]};}
  function focusPoint(point,{object=null,label='Detail',distance=null}={}){
    if(!point||![point.x,point.y,point.z].every(Number.isFinite))throw Error('Focus point must be finite');
    if(!restorePose)restorePose=getCameraPose();
    const target=point.clone();
    object?.updateWorldMatrix?.(true,false);
    const local=object?object.worldToLocal(point.clone()):null;
    const d=clampInspectDistance(distance??Math.min(1.2,Math.max(.40,camera.position.distanceTo(point)*.22)));
    focus={object,local,label:String(label||object?.name||'Detail'),point:coords(target),distance:d};
    const pose=focusCameraPose({point:coords(target),position:coords(camera.position),distance:d});
    applyCamera(pose);return getState();
  }
  function pickAt(clientX,clientY){
    const bounds=canvas.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return null;
    ndc.set(((clientX-bounds.left)/bounds.width)*2-1,-((clientY-bounds.top)/bounds.height)*2+1);
    raycaster.setFromCamera(ndc,camera);
    const roots=getRoots().filter(Boolean),hits=raycaster.intersectObjects(roots,true);
    const hit=hits.find(({object})=>{
      for(let obj=object;obj;obj=obj.parent){if(obj.userData?.inspectionIgnore)return false;}
      return object.visible&&!object.isHelper&&!object.isLine&&!object.isPoints;
    });
    if(!hit)return null;
    const label=hit.object.name||hit.object.parent?.name||`Mesh ${hit.object.id}`;
    return focusPoint(hit.point,{object:hit.object,label});
  }
  function setArmed(next){armed=!!next;canvas.style.cursor=armed?'crosshair':'';afterFocus(getState());return armed;}
  function setDistance(next){
    if(!focus)return null;
    focus.distance=clampInspectDistance(next);
    applyCamera(focusCameraPose({point:focus.point,position:coords(camera.position),distance:focus.distance}));return getState();
  }
  function follow(){
    if(!focus?.object||!focus.local)return;
    // Follow animated/skinned model transforms without editing the model itself.
    focus.object.updateWorldMatrix(true,false);
    const point=focus.object.localToWorld(focus.local.clone());
    if(point.distanceTo(vector(focus.point))<1e-5)return;
    const offset=camera.position.clone().sub(vector(focus.point));
    focus.point=coords(point);
    camera.position.copy(point).add(offset);
    if(controls){controls.target.copy(point);controls.update();}else camera.lookAt(point);
  }
  function bookmark(label){
    if(!focus)return null;
    const pose=getCameraPose();
    return bookmarks.add({...pose,label:label||focus.label});
  }
  function recall(id){
    const x=bookmarks.get(id);if(!x)return false;
    focus={object:null,local:null,label:x.label,point:x.target,distance:clampInspectDistance(Math.hypot(...x.position.map((v,i)=>v-x.target[i])))};
    applyCamera(x);return true;
  }
  function clear({restore=true}={}){
    const old=restorePose;focus=null;armed=false;canvas.style.cursor='';restorePose=null;
    if(restore&&old)applyCamera(old);else afterFocus(getState());
  }
  function onPointerDown(e){if(armed&&e.isPrimary!==false)pointerDown={id:e.pointerId,x:e.clientX,y:e.clientY};}
  function onPointerUp(e){
    if(!armed||!pointerDown||e.pointerId!==pointerDown.id)return;
    const delta=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);pointerDown=null;
    if(delta>8)return;pickAt(e.clientX,e.clientY);
  }
  canvas.addEventListener('pointerdown',onPointerDown);
  canvas.addEventListener('pointerup',onPointerUp);
  return {setArmed,pickAt,focusPoint,setDistance,follow,bookmark,recall,clear,getState,getCameraPose,bookmarks,dispose(){canvas.removeEventListener('pointerdown',onPointerDown);canvas.removeEventListener('pointerup',onPointerUp);clear({restore:false});}};
}
