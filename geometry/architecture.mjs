/** Deterministic, budgeted architectural detail. Decorative meshes stay within the
 * collision footprint, except the non-traversable roof. No remote resources.
 */
const finite=(n)=>Number.isFinite(n);
const round=(v)=>Math.round(v*1000)/1000;
export const MAX_FACADE_WINDOWS=60;

export function facadePlan({width,height,depth,index=0,seed=42,detail='mobile'}) {
 if (![width,height,depth,index,seed].every(finite)||width<2||width>20||depth<1||depth>20||height<5||height>55||!Number.isInteger(index)||!Number.isInteger(seed)||!['mobile','desktop'].includes(detail))throw Error('Invalid architectural footprint');
 const type=(Math.abs((seed*7+index*13)|0)%3);
 const groundFloor=Math.min(3.2,Math.max(2.6,height*.18));
 const floors=Math.min(detail==='mobile'?7:10,Math.max(0,Math.floor((height-groundFloor-1.3)/2.85)));
 const frontCols=Math.max(1,Math.min(detail==='mobile'?4:6,Math.floor((width-1.3)/1.55)));
 const sideCols=Math.max(1,Math.min(detail==='mobile'?3:5,Math.floor((depth-1.2)/1.5)));
 const windows=[];
 const add=(axis,colCount,rowCount)=>{
  const span=axis==='front'?width:depth;
  for(let row=0;row<rowCount;row++)for(let col=0;col<colCount;col++){
   const along=(col+.5)*((span-.95)/colCount)-(span-.95)/2;
   const y=groundFloor+row*2.85+.65;
   const lit=((row*7+col*11+index*3+seed)%5===0);
   windows.push(axis==='front'?{x:round(along),y:round(y),z:round(-depth/2-.025),rotation:Math.PI,lit}:
    {x:round(width/2+.025),y:round(y),z:round(along),rotation:Math.PI/2,lit});
  }
 };
 add('front',frontCols,floors);
 add('right',sideCols,floors);
 if(windows.length>MAX_FACADE_WINDOWS)throw Error('Facade exceeds mobile window budget');
 const roof=type===0?'flat':type===1?'parapet':'mechanical';
 return {type,roof,width,height,depth,frontCols,sideCols,floors,windows,door:{x:0,y:1.05,z:round(-depth/2-.028)},
  drawCallBudget:11,frameBudget:MAX_FACADE_WINDOWS};
}

function mesh(THREE,parent,geometry,material,position){
 const o=new THREE.Mesh(geometry,material);o.position.set(...position);parent.add(o);return o;
}
function batches(THREE,parent,windows,material){
 if(!windows.length)return;
 const instanced=new THREE.InstancedMesh(new THREE.PlaneGeometry(.73,.96),material,windows.length);
 instanced.name='Batched facade windows';
 const pos=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1),matrix=new THREE.Matrix4(),yAxis=new THREE.Vector3(0,1,0);
 windows.forEach((w,i)=>{pos.set(w.x,w.y,w.z);rotation.setFromAxisAngle(yAxis,w.rotation);matrix.compose(pos,rotation,scale);instanced.setMatrixAt(i,matrix);});
 instanced.instanceMatrix.needsUpdate=true;
 instanced.frustumCulled=false;
 parent.add(instanced);
}
/** Scene-integrated accent geometry. All materials are provided by caller and shared
 * across buildings. Windows are GPU-instanced instead of separate draw calls.
 */
export function addArchitecturalDetails(THREE,parent,plan,materials){
 if(!plan||!materials?.glass||!materials?.lit||!materials?.door||!materials?.trim||!materials?.roof)throw Error('Missing architecture materials');
 const {width,height,depth,windows,roof,door}=plan;
 batches(THREE,parent,windows.filter(x=>!x.lit),materials.glass);
 batches(THREE,parent,windows.filter(x=>x.lit),materials.lit);
 mesh(THREE,parent,new THREE.BoxGeometry(width,.22,depth),materials.roof,[0,height+.1,0]);
 // Door and header sit against the facade, not in the player's path.
 mesh(THREE,parent,new THREE.BoxGeometry(Math.min(1.45,width*.38),2.1,.035),materials.door,[door.x,door.y,door.z]);
 mesh(THREE,parent,new THREE.BoxGeometry(Math.min(1.8,width*.46),.12,.14),materials.trim,[0,2.3,door.z]);
 if(roof==='parapet'){
  const h=.5;
  mesh(THREE,parent,new THREE.BoxGeometry(width,h,.18),materials.roof,[0,height+h/2,-depth/2+.12]);
  mesh(THREE,parent,new THREE.BoxGeometry(width,h,.18),materials.roof,[0,height+h/2,depth/2-.12]);
 }else if(roof==='mechanical'){
  mesh(THREE,parent,new THREE.BoxGeometry(Math.min(1.5,width*.3),1.2,Math.min(1.5,depth*.3)),materials.roof,[0,height+.8,0]);
 }
 parent.userData.architecture={style:roof,windows:windows.length,instanced:true};
 return parent.userData.architecture;
}
