// Live deformation of MakeHuman's CC0 hm08 human basemesh, pinned to MPFB2 commit 3af0cd5.
// IMPORTANT: This is a body-mesh browser preview, not a Blender/Cycles render or a rigged export.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';
import {loadMacroTargets,targetAt,secondaryVertex} from './morph-engine.mjs';

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const gauss=(d,s)=>Math.exp(-((d/s)**2)*2);
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const NUM=(v,key)=>Number(v[key]);
const CM=(v,key)=>.01*NUM(v,key);
const sourceBaseY=-8.1676,sourceHeight=16.6589;
const sourceHeadTop=8.4913;

/** Returns a live deformable human; fails explicitly if the licensed source geometry cannot load. */
export async function mountClayPreview(host,initial){
  const response=await fetch(new URL('./basemesh.json',import.meta.url));
  if(!response.ok)throw new Error('Real human basemesh unavailable: HTTP '+response.status);
  const asset=await response.json();
  if(asset.schema!=='blank.cc0.anatomy.base.v1'||asset.source_license!=='CC0'||
     asset.position_xyz?.length<35000||asset.body_indices?.length<70000)throw Error('Invalid verified MakeHuman anatomy asset');
  const original=new Float32Array(asset.position_xyz);
  const count=original.length/3;
  const macroTargets=await loadMacroTargets(count);
  const group=new THREE.Group(),scene=new THREE.Scene();scene.add(group);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.3;
  host.replaceChildren(renderer.domElement);
  const canvas=renderer.domElement;
  canvas.style.touchAction='none';canvas.style.cursor='grab';
  canvas.setAttribute('aria-label','CC0 anatomically connected full-body MakeHuman mesh. Drag to orbit and use controls to deform body.');
  const camera=new THREE.PerspectiveCamera(32,1,.02,30);
  const lights=[new THREE.HemisphereLight(0xffffff,0x383442,2.1),
     new THREE.DirectionalLight(0xffede0,3.8),new THREE.DirectionalLight(0xb1c6ef,1.5)];
  lights[1].position.set(-2.7,3.7,4.1);lights[2].position.set(3.4,2.6,-3);
  for(const light of lights)scene.add(light);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(1.05,64),new THREE.MeshStandardMaterial({color:0x555660,roughness:1}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.017;scene.add(floor);
  const skin=new THREE.MeshStandardMaterial({color:0x5d382c,roughness:.72,side:THREE.DoubleSide});
  const sclera=new THREE.MeshStandardMaterial({color:0xded9d0,roughness:.46});
  const iris=new THREE.MeshStandardMaterial({color:0x33231a,roughness:.38});
  const pupil=new THREE.MeshStandardMaterial({color:0x0d0c0c,roughness:.4});
  const hair=new THREE.MeshStandardMaterial({color:0x18120f,roughness:.91});
  const geometry=new THREE.BufferGeometry();
  const position=new Float32Array(original.length);
  const attribute=new THREE.BufferAttribute(position,3);attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position',attribute);geometry.setIndex(asset.body_indices);
  const body=new THREE.Mesh(geometry,skin);group.add(body);
  const eyes=[];
  for(const indices of [asset.eye_left_indices,asset.eye_right_indices]){
    const g=new THREE.BufferGeometry();g.setAttribute('position',attribute);g.setIndex(indices);
    g.computeVertexNormals();const m=new THREE.Mesh(g,sclera);group.add(m);eyes.push(m);
  }
  const irisSphere=new THREE.SphereGeometry(1,16,12);
  const irises=[],pupils=[];
  for(const s of [-1,1]){
    const e=new THREE.Mesh(irisSphere,iris),p=new THREE.Mesh(irisSphere,pupil);
    group.add(e,p);irises.push(e);pupils.push(p);
  }
  const curlGeometry=new THREE.IcosahedronGeometry(1,1);
  const maxCurls=420;
  const curls=new THREE.InstancedMesh(curlGeometry,hair,maxCurls);
  curls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  curls.frustumCulled=false;group.add(curls);
  const tmp=new THREE.Object3D();
  const seedHeads=[];
  // Source scalp vertex provenance: use only connected body vertices in the head's superior cap.
  const scalpIndices=new Set();
  for(const ix of asset.body_indices)scalpIndices.add(ix);
  for(const i of scalpIndices){const j=i*3,x=original[j],y=original[j+1],z=original[j+2];
    if(y>7.54 && (y>7.98 || z<1.20) && Math.abs(x)<.97)seedHeads.push(i);
  }
  if(seedHeads.length<70)throw Error('Anatomical scalp vertices not found');
  let height=1.72;
  const deformed=new Float32Array(original.length);
  function morph(v){
    height=CM(v,'body.height');
    const scale=height/sourceHeight;
    const shoulders=CM(v,'body.shoulders'),hips=CM(v,'body.hips'),waist=CM(v,'body.waist');
    const rib=CM(v,'body.chest'),thigh=CM(v,'legs.thigh'),calf=CM(v,'legs.calf');
    const bust=CM(v,'body.bust'),glute=CM(v,'body.glutes'),abd=CM(v,'body.abdomen');
    const chestDepth=CM(v,'body.chest_depth'),hipDepth=CM(v,'body.hip_depth');
    const stance=CM(v,'legs.stance'),legLength=NUM(v,'legs.length_ratio');
    const neckW=CM(v,'body.neck_width'),headW=CM(v,'face.head_width'),headD=CM(v,'face.head_depth');
    const headL=CM(v,'face.head_length'),noseW=CM(v,'face.nose_width'),noseD=CM(v,'face.nose_depth');
    const lips=CM(v,'face.lips'),jaw=CM(v,'face.jaw'),cheeks=NUM(v,'face.cheeks');
    const muscle=NUM(v,'body.muscle'),fat=NUM(v,'body.fat');
    const longArm=CM(v,'arms.length');
    const bodyPitch=Math.tan(NUM(v,'body.posture')*Math.PI/180)*.016;
    const core=(x)=>1-smooth(1.35,2.85,Math.abs(x));
    for(let i=0;i<count;i++){
      const k=i*3;
      const [mx,my,mz]=targetAt(macroTargets,i,v);
      const ox=original[k]+mx,oy=original[k+1]+my,oz=original[k+2]+mz;
      const y=(oy-sourceBaseY)*scale,py=(oy-sourceBaseY)/sourceHeight;
      const front=smooth(.40,1.4,oz),coreW=core(ox);
      const gh=gauss(py-.55,.13)*coreW,gw=gauss(py-.66,.09)*coreW,gc=gauss(py-.78,.1)*coreW;
      let x=ox*scale,z=oz*scale;
      const torsoX=(hips/.32-1)*gh+(waist/.267-1)*gw+(rib/.32-1)*gc+(shoulders/.40-1)*gauss(py-.81,.035)*coreW;
      x*=1+torsoX;
      const chestFront=gauss(py-.758,.058)*front*coreW;
      z+=(chestDepth/.21-1)*.018*chestFront;
      z+=(hipDepth/.23-1)*.018*gauss(py-.565,.11)*front*coreW;
      // Breast topology evolves by lifting the existing chest vertices, not inserting sphere primitives.
      const sideBust=gauss(Math.abs(x)-CM(v,'body.bust_spacing')*.5,.058);
      z+=bust*.41*gauss(py-.755,.052)*sideBust*front;
      z+=abd*.45*gauss(py-.642,.08)*front*coreW;
      z-=glute*.34*gauss(py-.56,.055)*(1-front)*coreW;
      // Correct stance and thigh/calf volume while preserving the source's contiguous leg skin.
      if(py<.54){
        const legEnvelope=smooth(.025,.22,Math.abs(ox));
        const legCenter=Math.sign(ox||1);
        x+=legCenter*(stance-.19)*.5*(1-smooth(.38,.55,py))*legEnvelope;
        x=legCenter*CM(v,'legs.knee_in')*.10*gauss(py-.27,.045)+x;
        const atThigh=gauss(py-.42,.115),atCalf=gauss(py-.18,.09);
        x+=((thigh/.175-1)*atThigh+(calf/.126-1)*atCalf)*.11*(x-legCenter*.11);
        z+=((thigh/.175-1)*atThigh+(calf/.126-1)*atCalf)*.06*(z-.025);
      }
      // Arms: broad regional masks avoid tearing at the shoulder joint.
      if(Math.abs(ox)>1.55 && py>.41 && py<.84){
        const a=smooth(1.55,2.65,Math.abs(ox))*smooth(.41,.57,py);
        x+=(NUM(v,'arms.relax')-10)*.00022*Math.sign(x)*a;
        x+=(CM(v,'arms.upper_width')/.092-1)*.007*Math.sign(x)*a;
        const longFactor=(longArm/.60-1);
        x+=Math.sign(x)*longFactor*.025*a;
        z+=CM(v,'arms.forward')*.18*a;
      }
      // Face modifiers blend through contiguous cranial geometry and affect no detached facial ornaments.
      const face=smooth(.854,.89,py);
      const skull=face*(1-smooth(.996,1,py));
      x*=1+(headW/.155-1)*skull;
      z+=(headD/.185-1)*.052*skull;
      x*=1+(jaw/.116-1)*gauss(py-.879,.018)*skull;
      z+=cheeks*.0038*gauss(py-.910,.022)*gauss(Math.abs(x)-.038,.035)*front;
      z+=(noseD/.026-1)*.025*gauss(py-.920,.028)*gauss(x,.020)*front;
      x*=1+(noseW/.038-1)*gauss(py-.911,.020)*gauss(Math.abs(x)-.019,.018)*front;
      z+=(lips/.012-1)*.008*gauss(py-.875,.011)*gauss(x,.025)*front;
      const cranialHeight=headL/.23-1;
      const scaledY=y+Math.max(0,py-.87)*cranialHeight*.08;
      const postureZ=bodyPitch*gauss(py-.69,.16);
      x+=Math.sign(x)*(fat-.42)*.005*coreW*gauss(py-.56,.22);
      z+=(muscle-.27)*.004*(1-coreW)*gauss(py-.6,.22);
      const result=secondaryVertex(v,{ox,oy,oz,x,y:scaledY+((legLength-.475)*.14*gauss(py-.48,.16)),z:z+postureZ,py,front,coreW,scale});
      deformed[k]=result[0];deformed[k+1]=result[1];deformed[k+2]=result[2];
    }
    position.set(deformed);attribute.needsUpdate=true;
    geometry.computeVertexNormals();
    for(const e of eyes)e.geometry.computeVertexNormals();
    const eyeSize=CM(v,'face.eye_size')/.0245,spacing=CM(v,'face.eye_spacing')/.063,irisSize=CM(v,'face.iris')/.0115;
    const scleraColor=new THREE.Color(v['eye.sclera_tint']);sclera.color.copy(scleraColor);
    iris.color.set(v['eye.iris_color']);
    for(let k=0;k<2;k++){
      // Anatomically matched eye positions: derive actual indexed eye bounds from source helper geometry.
      const indices=k===0?asset.eye_right_indices:asset.eye_left_indices;
      let sx=0,sy=0,zmax=-Infinity,n=0;
      for(const ix of indices){sx+=deformed[ix*3];sy+=deformed[ix*3+1];zmax=Math.max(zmax,deformed[ix*3+2]);n++}
      const cx=sx/n,cy=sy/n,z=zmax+.0002;
      irises[k].position.set(cx+(spacing-1)*Math.sign(cx)*.008,cy,z);
      irises[k].scale.set(.006*eyeSize*irisSize,.0057*eyeSize*irisSize,.0013);
      pupils[k].position.set(irises[k].position.x,cy,z+.0011);
      pupils[k].scale.set(.0029*eyeSize,.0031*eyeSize,.0011);
    }
    // The sculpts' skin is not bleached by a clay-only override: pigmentation remains visible.
    const tone=new THREE.Color(v['skin.color']);
    if(v['render.clay']==='true')tone.lerp(new THREE.Color('#b0a8a3'),.45);
    tone.lerp(new THREE.Color('#bc9173'),NUM(v,'skin.variation')*.12);
    skin.color.copy(tone);skin.roughness=clamp(NUM(v,'skin.roughness')-.05*NUM(v,'skin.specular')-.07*NUM(v,'skin.subsurface'),.25,.96);
    hair.color.set(v['hair.color']);
    lights[1].intensity=3.8*NUM(v,'render.light');
    floor.material.color.set(v['render.background']).multiplyScalar(1.12);
    scene.background=new THREE.Color(v['render.background']);
    updateHair(v);
  }
  function updateHair(v){
    const style=v['hair.style'];
    if(style==='bald'){curls.count=0;return;}
    const density=clamp(Math.floor(NUM(v,'hair.density')*1.3),60,maxCurls);
    const spread=clamp(CM(v,'hair.length')*.2*NUM(v,'hair.volume'),.008,.039);
    const curlFactor=NUM(v,'hair.curl');
    curls.count=density;
    for(let i=0;i<density;i++){
      // Deterministic, nonuniform follicles sampled from native scalp topology.
      const q=seedHeads[(i*223+Math.floor(i*i*.12))%seedHeads.length]*3;
      const x=deformed[q],y=deformed[q+1],z=deformed[q+2];
      const jitter=Math.sin(i*2.183)*.27+Math.sin(i*3.513)*.14;
      const size=clamp(spread*(.58+.17*jitter),.004,.02);
      const hairline=CM(v,'hair.hairline'),asym=NUM(v,'hair.asymmetry');
      tmp.position.set(x+(Math.sin(i*7.3)*spread*.13)+asym*.013,y+spread*.34+Math.cos(i*8.5)*spread*.18-hairline*.17,z+Math.cos(i*5.9)*spread*.20);
      if(style==='short-curls')tmp.scale.set(size*.7,size*.62,size*.72);
      else if(style==='locs'||style==='straight')tmp.scale.set(size*.3,size*(1.2+curlFactor*.7),size*.34);
      else tmp.scale.set(size,size*(.88+.17*curlFactor),size*.98);
      tmp.rotation.set(i*.31,i*.77,i*.28);
      tmp.updateMatrix();curls.setMatrixAt(i,tmp.matrix);
    }
    curls.instanceMatrix.needsUpdate=true;
  }
  function draw(){
    camera.position.set(Math.sin(az)*distance,height*.54+Math.sin(el)*distance,Math.cos(az)*distance);
    camera.lookAt(0,height*.54,0);renderer.render(scene,camera);
  }
  function resize(){
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6)*clamp(NUM(lastValues,'render.resolution')/960,.6,1.6));
    const w=Math.max(240,host.clientWidth),h=Math.max(340,host.clientHeight);
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();
  }
  let lastValues=initial;
  function update(values){lastValues=values;morph(values);resize()}
  function inspect(){let h=2166136261;for(let i=0;i<position.length;i+=3){h=Math.imul(h^Math.round(position[i]*1e6),16777619)>>>0;h=Math.imul(h^Math.round(position[i+1]*1e6),16777619)>>>0;h=Math.imul(h^Math.round(position[i+2]*1e6),16777619)>>>0;}return {shape:h.toString(16),skin:skin.color.getHexString(),roughness:skin.roughness,hair:hair.color.getHexString(),hairCount:curls.count,iris:iris.color.getHexString(),irisSize:irises[0].scale.x,instancesHash:Math.round(curls.instanceMatrix.array[12]*1e6),renderWidth:renderer.domElement.width,renderHeight:renderer.domElement.height,sex:lastValues['body.gender'],population:lastValues['appearance.population']}}
  let last=[0,0],drag=false,az=.12,el=.035,distance=3.45;
  canvas.addEventListener('pointerdown',e=>{drag=true;last=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointerup',()=>drag=false);
  canvas.addEventListener('pointercancel',()=>drag=false);
  canvas.addEventListener('pointermove',e=>{if(!drag)return;az+=(e.clientX-last[0])*.007;el=clamp(el+(e.clientY-last[1])*.006,-.65,.65);last=[e.clientX,e.clientY];draw()});
  canvas.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance*Math.exp(e.deltaY*.001),2.4,7);draw()},{passive:false});
  const ro=new ResizeObserver(resize);ro.observe(host);
  update(initial);
  return {update,inspect,source:{name:'CC0 MakeHuman hm08 + six target morphs',vertices:count,faces:asset.body_indices.length/3,macros:macroTargets.length},dispose(){ro.disconnect();geometry.dispose();for(const e of eyes)e.geometry.dispose();irisSphere.dispose();curlGeometry.dispose();curls.dispose();skin.dispose();sclera.dispose();iris.dispose();pupil.dispose();hair.dispose();floor.geometry.dispose();floor.material.dispose();renderer.dispose()}};
}