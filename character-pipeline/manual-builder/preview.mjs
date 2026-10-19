// Blank Engine — anatomical proxy v2. Browser WebGL preview (not Blender/Cycles).
// Sculpted variable-section topology, deliberately no ball-joint or capsule anatomy.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';

export function mountClayPreview(host, initial){
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(1.6,window.devicePixelRatio||1));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.2;
  host.replaceChildren(renderer.domElement);
  const canvas=renderer.domElement;
  canvas.style.touchAction='none';
  canvas.style.cursor='grab';
  canvas.setAttribute('aria-label','Live full-body human anatomy preview; drag to rotate, pinch or scroll to zoom');
  const camera=new THREE.PerspectiveCamera(32,1,.02,30);
  const model=new THREE.Group();scene.add(model);
  scene.add(new THREE.HemisphereLight(0xffffff,0x4e4b52,2.4));
  const key=new THREE.DirectionalLight(0xfff4e9,3.0);key.position.set(-2.1,3.1,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0xb2bdde,1.3);rim.position.set(2.2,2.9,-3);scene.add(rim);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(1.2,64),new THREE.MeshStandardMaterial({color:0x444650,roughness:1}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.016;scene.add(floor);
  const sphere=new THREE.SphereGeometry(1,16,12);
  let height=1.72,azimuth=.21,elevation=.015,distance=3.65,drag=false,last=[0,0];
  const N=(v,id)=>Number(v[id]);
  const C=(v,id)=>N(v,id)*.01;
  const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const sat=x=>clamp(x,0,1);
  const smooth=t=>{t=sat(t);return t*t*(3-2*t)};
  const bulge=(x,s)=>Math.exp(-x*x/(s*s));
  const mat=(color,roughness=.89)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness:0});materials.push(m);return m};
  const buffers=[];
  const materials=[];
  function attach(geometry,material){const mesh=new THREE.Mesh(geometry,material);model.add(mesh);buffers.push(geometry);return mesh}
  function ball(x,y,z,rx,ry,rz,material){const m=new THREE.Mesh(sphere,material);m.position.set(x,y,z);m.scale.set(Math.max(.001,rx),Math.max(.001,ry),Math.max(.001,rz));model.add(m);return m}
  function sample(controls,t){
    const j=Math.min(controls.length-2,Math.floor(t*(controls.length-1))),u=t*(controls.length-1)-j;
    const a=controls[Math.max(0,j-1)],b=controls[j],c=controls[j+1],d=controls[Math.min(controls.length-1,j+2)];
    // Shape-preserving smooth interpolation avoids the segmented cylinders of v1.
    return b.map((_,i)=>{
      const t1=(c[i]-a[i])*.5,t2=(d[i]-b[i])*.5;
      return (2*u*u*u-3*u*u+1)*b[i]+(u*u*u-2*u*u+u)*t1+(-2*u*u*u+3*u*u)*c[i]+(u*u*u-u*u)*t2;
    });
  }
  function surfaceHorizontal(stations,material,segments=36,detail=90,deform=null){
    const pos=[],tri=[];
    for(let k=0;k<=detail;k++){
      const [y,rx,rz,z]=sample(stations,k/detail);
      for(let j=0;j<segments;j++){
        const a=2*Math.PI*j/segments,co=Math.cos(a),si=Math.sin(a);
        let x=rx*co,depth=z+rz*si;
        if(deform){const adjusted=deform(x,y,depth,si,co);x=adjusted[0];depth=adjusted[1]}
        pos.push(x,y,depth);
      }
    }
    for(let k=0;k<detail;k++)for(let j=0;j<segments;j++){
      const a=k*segments+j,b=k*segments+(j+1)%segments,c=(k+1)*segments+j,d=(k+1)*segments+(j+1)%segments;
      tri.push(a,c,b,b,c,d);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(tri);geo.computeVertexNormals();attach(geo,material);
  }
  function tube(stations,material,detail=52,segments=20,cap=true){
    // Stations: x, y, z, horizontal cross-section radius, front-back radius.
    const pos=[],tri=[];
    for(let k=0;k<=detail;k++){
      const t=k/detail,[x,y,z,rx,rz]=sample(stations,t);
      const p=sample(stations,clamp(t+.002,0,1)),m=sample(stations,clamp(t-.002,0,1));
      const dx=p[0]-m[0],dy=p[1]-m[1],len=Math.hypot(dx,dy)||1;
      const ux=-dy/len,uy=dx/len;
      for(let j=0;j<segments;j++){
        const a=j*2*Math.PI/segments;
        pos.push(x+ux*Math.cos(a)*rx,y+uy*Math.cos(a)*rx,z+Math.sin(a)*rz);
      }
    }
    for(let k=0;k<detail;k++)for(let j=0;j<segments;j++){
      const a=k*segments+j,b=k*segments+(j+1)%segments,c=(k+1)*segments+j,d=(k+1)*segments+(j+1)%segments;
      // Reverse visible normals when centers run downward rather than upward.
      const flip=stations[stations.length-1][1] < stations[0][1];
      if(flip)tri.push(a,b,c,b,d,c);else tri.push(a,c,b,b,c,d);
    }
    if(cap){
      const [sx,sy,sz]=stations[0], [ex,ey,ez]=stations[stations.length-1];
      const aidx=pos.length/3;pos.push(sx,sy,sz,ex,ey,ez);
      for(let j=0;j<segments;j++){tri.push(aidx,(j+1)%segments,j);const b=detail*segments;tri.push(aidx+1,b+j,b+(j+1)%segments)}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(tri);geo.computeVertexNormals();attach(geo,material);
  }
  function foot(x,length,width,heel,instep,arch,material){
    // Low-poly shoe primitives replaced by an authored smooth forefoot and heel skin.
    const z0=-length*.35,z1=length*.59;
    const st=[
      [z0,.012,.014,.022],[z0+length*.12,heel*.44,.028,.035],
      [z0+length*.32,heel*.52,.038,.042],[z0+length*.55,width*.44,.034+arch*.15,.041],
      [z0+length*.76,width*.52,.029,.030],[z1,width*.39,.018,.017],
      [z1+.007,.006,.004,.007]
    ];
    const pos=[],tri=[],rings=56,sides=28;
    for(let k=0;k<=rings;k++){
      const [z,w,high,depth]=sample(st,k/rings);
      for(let j=0;j<sides;j++){
        const a=j*Math.PI*2/sides,co=Math.cos(a),si=Math.sin(a);
        pos.push(x+co*w,Math.max(.008,instep*.22+si*high),z+si*depth*.09);
      }
    }
    for(let k=0;k<rings;k++)for(let j=0;j<sides;j++){
      const a=k*sides+j,b=k*sides+(j+1)%sides,c=(k+1)*sides+j,d=(k+1)*sides+(j+1)%sides;
      tri.push(a,b,c,b,d,c);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(tri);geo.computeVertexNormals();attach(geo,material);
  }
  function make(v){
    height=C(v,'body.height');
    scene.background=new THREE.Color(v['render.background']);floor.material.color.set(v['render.background']).multiplyScalar(1.12);
    key.intensity=2.8*N(v,'render.light');
    const clay=v['render.clay']==='true',skinShade=new THREE.Color(v['skin.color']);
    if(clay)skinShade.lerp(new THREE.Color('#b0a8a3'),.72);
    const skin=mat(skinShade,clamp(N(v,'skin.roughness')-.08*N(v,'skin.specular'),.3,.98));
    const shade=mat(skinShade.clone().multiplyScalar(.93+.07*N(v,'skin.variation')),.85);
    const lipmat=mat(skinShade.clone().lerp(new THREE.Color('#874e50'),clay?.20:.34),.83);
    const hair=mat(v['hair.color'],.98);
    const eye=mat(v['eye.sclera_tint'],.44);
    const iris=mat(v['eye.iris_color'],.44);
    const pupil=mat('#101012',.44);
    const nails=mat(skinShade.clone().lerp(new THREE.Color('#c79d92'),.3),.68);
    const H=height,headH=C(v,'face.head_length'),neckL=C(v,'body.neck_length');
    const headY=H-headH*.51,chinY=H-headH;
    const shoulderY=chinY-neckL*.65,crotch=H*N(v,'legs.length_ratio');
    const trunk=shoulderY-crotch,waistY=crotch+trunk*(.49+(N(v,'body.torso_ratio')-.31)*.5),chestY=crotch+trunk*.78;
    const shoulder=C(v,'body.shoulders'),chest=C(v,'body.chest'),waist=C(v,'body.waist'),hip=C(v,'body.hips');
    const hipDepth=C(v,'body.hip_depth'),chestDepth=C(v,'body.chest_depth'),waistDepth=C(v,'body.waist_depth');
    const fat=N(v,'body.fat'),muscle=N(v,'body.muscle'),glute=C(v,'body.glutes'),abdomen=C(v,'body.abdomen'),bust=C(v,'body.bust');
    const pitch=Math.tan(N(v,'body.posture')*Math.PI/180)*.032;
    const bustX=C(v,'body.bust_spacing')*.5;
    surfaceHorizontal([
      [crotch-.02,hip*.21,hipDepth*.23,0],[crotch+.005,hip*.31,hipDepth*.3,0],
      [crotch+.057,hip*.48,hipDepth*.47,0],[crotch+trunk*.22,hip*.5,hipDepth*.5,0],
      [waistY,waist*.5,waistDepth*.5,pitch*.2],[chestY,chest*.5,chestDepth*.5,pitch*.6],
      [shoulderY-.082,shoulder*.46,chestDepth*.39,pitch],
      [shoulderY-.032,shoulder*.39,chestDepth*.34,pitch],
      [shoulderY+.009,C(v,'body.neck_width')*.38,C(v,'body.neck_width')*.36,pitch]],skin,48,96,
      (x,y,z,front)=>{
       const bs=front>0?bust*.55*(bulge((x-bustX),.056)+bulge((x+bustX),.056))*bulge(y-chestY,.07)*Math.pow(front,3):0;
       const ab=front>0?abdomen*.35*bulge(y-waistY+.02,.1)*front:0;
       const gs=front<0?glute*.42*bulge(y-(crotch+trunk*.24),.084)*(-front):0;
       return [x,z+bs+ab-gs];
      });
    // Anatomically sloped neck with embedded sternocleidomastoid transition.
    const neckW=C(v,'body.neck_width');
    surfaceHorizontal([
      [shoulderY-.052,neckW*.65,neckW*.48,pitch],
      [shoulderY-.025,neckW*.49,neckW*.42,pitch*.7],
      [chinY-.027,neckW*.41,neckW*.4,0],
      [chinY+.029,neckW*.39,neckW*.35,0]],skin,32,32);
    for(const side of [-1,1]){
      const s=side;
      // Seam-minimized upper limb sweeps begin inside the shoulder and pelvis, without visible ball joints.
      const L=C(v,'arms.length'),up=L*N(v,'arms.upper_ratio'),ang=N(v,'arms.relax')*Math.PI/180;
      const sy=shoulderY-.046-C(v,'body.shoulder_slope')*.14;
      const shoulderX=s*(shoulder*.43),ex=shoulderX+s*up*Math.sin(ang),ey=sy-up*Math.cos(ang);
      const wx=ex+s*(L-up)*Math.sin(ang*.69),wy=ey-(L-up)*Math.cos(ang*.69);
      const u=C(v,'arms.upper_width')*.5*(1+muscle*.035),e=C(v,'arms.elbow_width')*.5,w=C(v,'arms.wrist_width')*.5;
      tube([[s*shoulder*.37,sy+.03,pitch,u*.98,u*.96],
            [shoulderX,sy-.024,pitch,u*1.1,u],
            [lerp(shoulderX,ex,.47),lerp(sy,ey,.47),C(v,'arms.forward')*.25,u*.9,u*.85],
            [ex,ey,C(v,'arms.forward')*.52,e,e*.92],
            [lerp(ex,wx,.48),lerp(ey,wy,.48),C(v,'arms.forward')*.78,C(v,'arms.forearm_width')*.45,C(v,'arms.forearm_width')*.42],
            [wx,wy,C(v,'arms.forward'),w,w*.9]],skin);
      const palmL=C(v,'hands.length'),palmW=C(v,'hands.width'),pd=C(v,'hands.depth');
      const pz=C(v,'arms.forward');
      tube([[wx,wy+.008,pz,w*.91,w*.83],
           [wx,wy-palmL*.20,pz,palmW*.40,pd*.50],
           [wx,wy-palmL*.64,pz+.002,palmW*.46,pd*.44],
           [wx,wy-palmL*.97,pz+.004,palmW*.45,pd*.39]],skin,28,16);
      const fw=C(v,'hands.finger_width'),fL=C(v,'hands.fingers'),spread=N(v,'hands.spread')*Math.PI/180;
      for(let j=0;j<4;j++){
       const fx=wx+(j-1.5)*palmW*.22,fy=wy-palmL*.92,fl=fL*[.81,.96,1,.75][j],dx=(j-1.5)*Math.tan(spread)*.033;
       tube([[fx,fy,pz+.002,fw*.46,fw*.43],[fx+dx*.55,fy-fl*.62,pz+.004,fw*.36,fw*.34],
             [fx+dx,fy-fl,pz+.006,fw*.21,fw*.2]],skin,17,10);
       ball(fx+dx,fy-fl,pz+.011,C(v,'hands.nails')*.33,C(v,'hands.nails')*.39,.0015,nails);
      }
      const thumb=C(v,'hands.thumb'),tx=wx+s*palmW*.43,ty=wy-palmL*.32;
      tube([[tx,ty,pz,fw*.55,fw*.47],[tx+s*thumb*.37,ty-thumb*.35,pz+.012,fw*.43,fw*.35],
         [tx+s*thumb*.65,ty-thumb*.8,pz+.019,fw*.27,fw*.24]],skin,17,10);
      const stance=C(v,'legs.stance')*.5,ankx=s*stance,hipx=s*hip*.25;
      const kneeX=lerp(hipx,ankx,.47)-s*C(v,'legs.knee_in'),kneeY=crotch*.53;
      const thigh=C(v,'legs.thigh')*.5*(.93+fat*.06+N(v,'legs.muscle')*.04);
      const knee=C(v,'legs.knee')*.5,calf=C(v,'legs.calf')*.5,ankle=C(v,'legs.ankle')*.5;
      tube([[hipx,crotch+.081,-.007,thigh*1.01,thigh*1.02],
        [hipx*.99,crotch+.028,-.004,thigh,thigh*.94],
        [lerp(hipx,kneeX,.48),lerp(crotch,kneeY,.48),-.002,thigh*.86,thigh*.84],
        [kneeX,kneeY,.003,knee,knee*.92],
        [lerp(kneeX,ankx,.29),lerp(kneeY,.092,.29),-C(v,'legs.calf_curve')*.38,calf,calf*.98],
        [lerp(kneeX,ankx,.75),lerp(kneeY,.092,.75),0,ankle*1.15,ankle*1.06],
        [ankx,.092,0,ankle,ankle]],skin,70,24);
      const footL=C(v,'feet.length'),footW=C(v,'feet.width'),instep=C(v,'feet.instep');
      foot(ankx,footL,footW,C(v,'feet.heel'),instep,C(v,'feet.arch'),skin);
      const toeL=C(v,'feet.toe_length'),toes=C(v,'feet.toe_splay'),end=footL*.59;
      for(let j=0;j<5;j++){
        const q=(j-2)*footW*.175,baseX=ankx+q;
        const length=toeL*[.89,1,.93,.83,.74][j]+(j===0?C(v,'feet.big_toe'):0);
        const dx=s*(j-2)*toes*.18;
        tube([[baseX,.033,end-.018,footW*(j===0?.083:.07),.019],
              [baseX+dx*.65,.031,end+length*.45,footW*(j===0?.076:.058),.015],
              [baseX+dx,.025,end+length*.8,footW*.042,.009]],skin,15,10);
      }
    }
    // Cranial and jaw silhouettes formed as one continuous variable radius surface.
    const headW=C(v,'face.head_width'),headD=C(v,'face.head_depth'),jaw=C(v,'face.jaw'),chin=C(v,'face.chin');
    const cy=headY,hh=headH;
    surfaceHorizontal([
      [cy-hh*.51,chin*.17,headD*.18,headD*.035],
      [cy-hh*.43,chin*.45,headD*.25,headD*.048],
      [cy-hh*.30,jaw*.5,headD*.38,headD*.028],
      [cy-hh*.16,headW*.435,headD*.455,headD*.018],
      [cy+hh*.07,headW*.49,headD*.5,0],
      [cy+hh*.27,headW*.495,headD*.48,-headD*.015],
      [cy+hh*.40,headW*.41,headD*.39,-headD*.015],
      [cy+hh*.50,headW*.055,headD*.07,-headD*.012]],skin,48,80,
      (x,y,z,front)=>{
        const cheek=front>0?N(v,'face.cheeks')*.0045*bulge(Math.abs(x)-headW*.27,.025)*bulge(y-(cy-hh*.12),.042)*front:0;
        return [x,z+cheek];
      });
    const eyeSpacing=C(v,'face.eye_spacing'),eyeR=C(v,'face.eye_size')*.5,eyeY=cy+hh*.047;
    const frontDepth=headD*.475;
    for(const s of [-1,1]){
      const x=s*eyeSpacing*.5,y=eyeY+s*N(v,'face.eye_tilt')*.00065,z=frontDepth;
      // Recess sclera, tint with eyelid geometry, limit white exposure.
      ball(x,y,z-.002,eyeR*.97,eyeR*.57,eyeR*.20,eye);
      ball(x,y,z+eyeR*.155,C(v,'face.iris')*.48,C(v,'face.iris')*.46,.0019,iris);
      ball(x,y,z+eyeR*.17,C(v,'face.iris')*.24,C(v,'face.iris')*.25,.0021,pupil);
      ball(x,y+eyeR*.64,z,eyeR*1.15,eyeR*.19,.0055,skin);
      ball(x,y-eyeR*.60,z,eyeR*1.08,eyeR*.20,.0052,skin);
      ball(x,y+eyeR*1.65+C(v,'face.brows')*.09,z-.002,eyeR*1.27,C(v,'face.brow_width')*.34,.0038,hair);
      const earH=C(v,'face.ears'),earP=C(v,'face.ear_projection');
      ball(s*(headW*.47+earP*.12),cy-hh*.14,-.01,earP*.51,earH*.42,.011,skin);
      ball(s*(headW*.47+earP*.24),cy-hh*.12,.001,earP*.28,earH*.22,.0036,shade);
    }
    const noseW=C(v,'face.nose_width'),noseH=C(v,'face.nose_length'),noseD=C(v,'face.nose_depth');
    ball(0,cy-hh*.09,frontDepth+noseD*.19,noseW*.22,noseH*.45,noseD*.47,skin);
    ball(0,cy-hh*.24,frontDepth+noseD*.41,noseW*.45,noseH*.13,noseD*.36,skin);
    for(const s of [-1,1])ball(s*noseW*.37,cy-hh*.24,frontDepth+noseD*.23,noseW*.17,noseH*.09,.009,skin);
    const mouthY=cy-hh*.34,mouthW=C(v,'face.mouth'),lipH=C(v,'face.lips');
    ball(0,mouthY+.004,frontDepth*.93,mouthW*.47,lipH*.33,.005,lipmat);
    ball(0,mouthY-.0045,frontDepth*.94,mouthW*.45,lipH*.42,.005,lipmat);
    // Short, irregular scalp-hugging afro. Sphere instances replace the towering gridded wig.
    if(v['hair.style']!=='bald'){
      const style=v['hair.style'];
      const length=C(v,'hair.length'),volume=N(v,'hair.volume'),curl=N(v,'hair.curl');
      const density=Math.min(420,Math.max(35,Math.floor(N(v,'hair.density'))));
      const radius=clamp(length*.17*volume,.012,style==='afro'?.045:.03);
      const cap=mat(v['hair.color'],.97);
      ball(0,cy+hh*.29,-.004,headW*.505+radius*.29,hh*.21+radius*.24,headD*.46+radius*.31,cap);
      const instances=new THREE.InstancedMesh(sphere,hair,density);
      const marker=new THREE.Object3D();
      for(let i=0;i<density;i++){
        const f=(i+.5)/density,theta=Math.acos(1-1.87*f),phi=i*2.399963229728653;
        const dx=Math.cos(phi)*Math.sin(theta),dy=Math.cos(theta),dz=Math.sin(phi)*Math.sin(theta);
        // Positive z is face. Avoid solid fringe descending onto eyelids and upper face.
        if(dz>.35&&dy<.05&&i%2===0){marker.scale.setScalar(.0001);marker.updateMatrix();instances.setMatrixAt(i,marker.matrix);continue}
        const jitter=1+.14*Math.sin(i*1.179)+.08*Math.sin(i*3.59),r=radius*jitter;
        const extent=style==='afro'?1:style==='short-curls'?.68:.85;
        const x=dx*(headW*.485+r*.58*extent)+N(v,'hair.asymmetry')*.012;
        const y=cy+hh*.27+dy*(hh*.25+r*.58*extent)+r*.26-C(v,'hair.hairline')*(dz>.3?.35:.1);
        const z=dz*(headD*.44+r*.55*extent)-.009;
        marker.position.set(x,y,z);
        const rr=style==='locs'? r*.28:style==='straight'?r*.30:r*(.29+.1*curl);
        marker.scale.set(rr*(.7+.2*Math.sin(i*5.2)),rr*(.78+.2*Math.cos(i*2.41)),rr);
        marker.rotation.set(i*.03,i*.19,i*.07);marker.updateMatrix();instances.setMatrixAt(i,marker.matrix);
      }
      instances.instanceMatrix.needsUpdate=true;instances.computeBoundingSphere();
      model.add(instances);
      // Locs/straight shapes follow the scalp without creating a tall artificial dome.
      if(style==='locs'||style==='straight'){
        for(let j=0;j<Math.min(54,density/4);j++){
          const a=j*2.39996,xx=Math.cos(a)*headW*.40,zz=Math.sin(a)*headD*.42;
          if(zz>.025&&Math.sin(a)<0.15)continue;
          tube([[xx,cy+hh*.32,zz,.006,.005],
            [xx*1.07,cy+hh*.12,zz*.93,.0048,.0048],
            [xx*1.09,cy+hh*.12-length*.42,zz*.90,.004,.004]],hair,20,9);
        }
      }
    }
  }
  function clear(){
    while(model.children.length){const m=model.children[0];model.remove(m);if(m.isInstancedMesh)m.dispose();}
    for(const g of buffers)g.dispose();buffers.length=0;
    for(const m of materials)m.dispose();materials.length=0;
  }
  function draw(){
    camera.position.set(Math.sin(azimuth)*distance, height*.53+Math.sin(elevation)*distance,Math.cos(azimuth)*distance);
    camera.lookAt(0,height*.53,0);renderer.render(scene,camera);
  }
  function resize(){
    const w=Math.max(240,host.clientWidth),h=Math.max(340,host.clientHeight);
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();
  }
  function update(values){clear();make(values);resize()}
  canvas.addEventListener('pointerdown',e=>{drag=true;last=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointerup',()=>drag=false);
  canvas.addEventListener('pointercancel',()=>drag=false);
  canvas.addEventListener('pointermove',e=>{if(!drag)return;azimuth+=(e.clientX-last[0])*.007;elevation=clamp(elevation+(e.clientY-last[1])*.006,-.65,.65);last=[e.clientX,e.clientY];draw()});
  canvas.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance*Math.exp(e.deltaY*.001),2.5,7.5);draw()},{passive:false});
  const observer=new ResizeObserver(resize);observer.observe(host);
  update(initial);
  return {update,dispose(){observer.disconnect();clear();renderer.dispose();sphere.dispose();floor.geometry.dispose();floor.material.dispose()}};
}