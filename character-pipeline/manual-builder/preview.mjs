// Interactive proportion preview: browser-generated geometry, not a Blender/Cycles render.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';

export function mountClayPreview(host, initial) {
  const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  host.replaceChildren(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Interactive full-body anatomical clay model. Drag to rotate and scroll to zoom.');
  renderer.domElement.style.touchAction='none';
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, .02, 50);
  const group = new THREE.Group();
  scene.add(group);
  const hemi = new THREE.HemisphereLight(0xf7f5ee,0x24242d,2);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff,3);
  key.position.set(-2,4,5);scene.add(key);
  const fill = new THREE.DirectionalLight(0xb5c5ec,1.6);
  fill.position.set(3,2,-2);scene.add(fill);
  const stage = new THREE.Mesh(new THREE.CircleGeometry(1.12,64),new THREE.MeshStandardMaterial({color:0x34343d,roughness:1}));
  stage.rotation.x=-Math.PI/2; stage.position.y=-.013;scene.add(stage);
  let azimuth=.24,elevation=.06,distance=4.15,height=1.72;
  const sph=new THREE.SphereGeometry(1,16,12);
  const pick=(v,id)=>Number(v[id]);
  const cm=(v,id)=>pick(v,id)/100;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function material(color,roughness=.77,metalness=0){
    return new THREE.MeshPhysicalMaterial({color,roughness,metalness, clearcoat:0.015});
  }
  function ell(x,y,z,w,h,d,mat,rot=0){
    const o=new THREE.Mesh(sph,mat);
    o.position.set(x,y,z);o.scale.set(Math.max(.001,w),Math.max(.001,h),Math.max(.001,d));
    o.rotation.z=rot;group.add(o);return o;
  }
  function limb(a,b,ra,rb,mat){
    const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),vec=q.clone().sub(p);
    const length=vec.length();if(length<.001)return;
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(Math.max(.001,rb),Math.max(.001,ra),length,14,1),mat);
    mesh.position.copy(p.clone().add(q).multiplyScalar(.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vec.normalize());
    group.add(mesh);
    ell(...a,ra,ra,ra,mat);ell(...b,rb,rb,rb,mat);
  }
  function torso(sections,mat,v){
    const sides=32,vertices=[],indices=[];
    for(const [y,w,d,zoff] of sections){
      for(let j=0;j<sides;j++){
        const a=j*2*Math.PI/sides,s=Math.sin(a);
        vertices.push(Math.cos(a)*w*.5,y,s*d*.5+zoff +
          (s>0?cm(v,'body.abdomen')*.12: -cm(v,'body.glutes')*.25));
      }
    }
    for(let i=0;i<sections.length-1;i++)for(let j=0;j<sides;j++){
      const a=i*sides+j,b=i*sides+(j+1)%sides,c=(i+1)*sides+j,d=(i+1)*sides+(j+1)%sides;
      indices.push(a,b,c,b,d,c);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geo.setIndex(indices);geo.computeVertexNormals();
    group.add(new THREE.Mesh(geo,mat));
    for(const [y,w,d,z] of [sections[0],sections[sections.length-1]])ell(0,y,z,w*.48,.013,d*.48,mat);
  }
  const radial=(a,s)=>[Math.cos(a)*s,Math.sin(a)*s];
  function create(v){
    height=cm(v,'body.height');
    scene.background=new THREE.Color(v['render.background']);
    stage.material.color.set(v['render.background']).multiplyScalar(.88);
    key.intensity=3*pick(v,'render.light');
    const clay=v['render.clay']==='true';
    const skinColor=new THREE.Color(v['skin.color']);
    const tone=clay?new THREE.Color('#aaa3a0').lerp(skinColor,.32):skinColor;
    const skin=material(tone,pick(v,'skin.roughness'),0);
    skin.clearcoat=pick(v,'skin.specular')*.1;
    skin.subsurface=0; // SSS strength is reserved for the Blender material pass.
    const lightSkin=material(tone.clone().lerp(new THREE.Color('#f3d6b7'),clamp(pick(v,'skin.variation')*.33,0,.2)),.81);
    const hair=material(v['hair.color'],.91);
    const iris=material(v['eye.iris_color'],.32);
    const sclera=material(v['eye.sclera_tint'],.35);
    const dark=material('#211e22',.65);
    const mouth=material(clay?'#877779':'#854f4e',.68);
    const nails=material(clay?'#c1b9b2':'#9c756f',.5);
    const H=height,hh=cm(v,'face.head_length'),nw=cm(v,'body.neck_width'),nl=cm(v,'body.neck_length');
    const headY=H-hh*.5,neckBase=H-hh-nl,shoulderY=neckBase+.016;
    const crotch=H*pick(v,'legs.length_ratio'),torsoLength=shoulderY-crotch;
    const waistY=crotch+torsoLength*(.43+(pick(v,'body.torso_ratio')-.31)*.9);
    const chestY=crotch+torsoLength*.77,posture=Math.tan(pick(v,'body.posture')*Math.PI/180)*torsoLength*.3;
    const sw=cm(v,'body.shoulders'),rw=cm(v,'body.chest'),ww=cm(v,'body.waist'),hw=cm(v,'body.hips');
    const rd=cm(v,'body.chest_depth'),wd=cm(v,'body.waist_depth'),hd=cm(v,'body.hip_depth');
    const fat=pick(v,'body.fat'),muscle=pick(v,'body.muscle');
    torso([
      [crotch-.022,hw*.42,hd*.55,0],
      [crotch+.015,hw*.84,hd*.77,0],
      [crotch+torsoLength*.14,hw,hd,0],
      [crotch+torsoLength*.27,hw*.91,hd*.92,.001],
      [waistY,ww,wd,posture*.3],
      [chestY,rw,rd,posture*.75],
      [shoulderY-.032,sw*.89,rd*.82,posture],
      [shoulderY, nw*.96,nw*.89,posture]],skin,v);
    ell(0,crotch+torsoLength*.16,-cm(v,'body.glutes')*.35,hw*.43,torsoLength*.23,hd*.39,lightSkin);
    if(cm(v,'body.bust')>.002)for(const s of [-1,1]){
      ell(s*cm(v,'body.bust_spacing')*.5,chestY,rd*.48+cm(v,'body.bust')*.27,
          rw*.17+fat*.005,.075+cm(v,'body.bust')*.32,cm(v,'body.bust')*.7+.014,skin);
    }
    limb([0,neckBase,posture],[0,H-hh+.026,0],nw*.42,nw*.44,skin);
    // Left/right anatomy derived independently from landmark widths and joint angles.
    for(const s of [-1,1]){
      const L=cm(v,'arms.length'),upper=L*pick(v,'arms.upper_ratio');
      const angle=pick(v,'arms.relax')*Math.PI/180;
      const shoulder=[s*(sw*.5-.017),shoulderY-pick(v,'body.shoulder_slope')*.002,posture];
      const elbow=[shoulder[0]+s*Math.sin(angle)*upper,shoulder[1]-Math.cos(angle)*upper,cm(v,'arms.forward')*.55];
      const wrist=[elbow[0]+s*Math.sin(angle*.6)*(L-upper),elbow[1]-(L-upper)*Math.cos(angle*.6),cm(v,'arms.forward')];
      const ud=(cm(v,'arms.upper_width')*(1+muscle*.09))*0.5;
      limb(shoulder,elbow,ud,cm(v,'arms.elbow_width')*.5,skin);
      limb(elbow,wrist,cm(v,'arms.forearm_width')*.5,cm(v,'arms.wrist_width')*.5,skin);
      const pl=cm(v,'hands.length'),pw=cm(v,'hands.width'),pd=cm(v,'hands.depth');
      const palm=[wrist[0]+s*.001,wrist[1]-pl*.46,wrist[2]+.005];
      ell(...palm,pw*.49,pl*.51,pd*.51,skin,s*.05);
      const spread=pick(v,'hands.spread')*Math.PI/180;
      const fw=cm(v,'hands.finger_width'),fl=cm(v,'hands.fingers');
      for(let j=0;j<4;j++){
        const offset=(j-1.5)*pw*.235;
        const y=palm[1]-pl*.48;
        const length=fl*[.86,1,.97,.78][j];
        const x=palm[0]+offset;
        const out=offset*Math.tan(spread)*1.8;
        limb([x,y,palm[2]],[x+out,y-length,palm[2]+.008],fw*.47,fw*.33,skin);
        ell(x+out,y-length,palm[2]+.009,cm(v,'hands.nails')*.42,cm(v,'hands.nails')*.42,.002,nails);
      }
      const thumb=cm(v,'hands.thumb'),tx=palm[0]+s*pw*.48,ty=palm[1]+pl*.12;
      limb([tx,ty,palm[2]],[tx+s*thumb*.62,ty-thumb*.75,palm[2]+.017],fw*.63,fw*.4,skin);
      const yfoot=cm(v,'feet.instep')*.56;
      const ankleX=s*cm(v,'legs.stance')*.5;
      const thighX=s*hw*.285,kneeX=(thighX+ankleX)*.5-s*cm(v,'legs.knee_in');
      const hip=[thighX,crotch+torsoLength*.11,0];
      const knee=[kneeX,crotch*.52,.002];
      const ankle=[ankleX,yfoot,0];
      const thigh=cm(v,'legs.thigh')*.5*(.89+fat*.13+pick(v,'legs.muscle')*.1);
      limb(hip,knee,thigh,cm(v,'legs.knee')*.5,skin);
      limb(knee,ankle,cm(v,'legs.calf')*.5*(1+muscle*.08),cm(v,'legs.ankle')*.5,skin);
      ell(knee[0],knee[1],-cm(v,'legs.calf_curve')*.15,cm(v,'legs.knee')*.47,cm(v,'legs.knee')*.48,cm(v,'legs.knee')*.45,skin);
      const footL=cm(v,'feet.length'),footW=cm(v,'feet.width'),heelW=cm(v,'feet.heel');
      ell(ankleX,yfoot*.48,footL*.25,footW*.5,yfoot*.6,footL*.47,skin);
      ell(ankleX,yfoot*.28,-footL*.11,heelW*.5,yfoot*.43,heelW*.55,skin);
      const toeBase=footL*.54,tl=cm(v,'feet.toe_length'),sp=cm(v,'feet.toe_splay');
      for(let j=0;j<5;j++){
        const x=ankleX+s*((j-2)*footW*.177);
        const length=tl*([1,.93,.83,.72,.61][j])+(j===0?cm(v,'feet.big_toe'):0);
        ell(x+s*(j-2)*sp*.13,yfoot*.22,toeBase+length*.48,footW*(j===0?.115:.084),yfoot*.24,length*.54,skin);
      }
      // Feet arch produces a visible instep/heel transition.
      ell(ankleX,yfoot*.5-cm(v,'feet.arch')*.1,footL*.07,footW*.36,yfoot*.35,footL*.3,skin);
    }
    // New head constructed from dimensions; does not reuse prior Blender meshes.
    const faceW=cm(v,'face.head_width'),faceD=cm(v,'face.head_depth');
    ell(0,headY,0,faceW*.5,hh*.49,faceD*.5,skin);
    ell(0,headY-hh*.235,faceD*.042,cm(v,'face.jaw')*.5,hh*.26,faceD*.39,skin);
    ell(0,headY-hh*.425,faceD*.09,cm(v,'face.chin')*.49,hh*.085,faceD*.27,skin);
    for(const s of [-1,1]){
      ell(s*faceW*.31,headY-hh*.12,faceD*.25,
          .017+pick(v,'face.cheeks')*.012,hh*.145,.018,skin);
      const eyex=s*cm(v,'face.eye_spacing')*.5,eyey=headY+hh*.06+s*pick(v,'face.eye_tilt')*.0008,eyez=faceD*.444;
      const er=cm(v,'face.eye_size')*.49;
      ell(eyex,eyey,eyez,er,er*.65,er*.47,sclera);
      ell(eyex,eyey,eyez+er*.43,cm(v,'face.iris')*.49,cm(v,'face.iris')*.49,.0029,iris);
      ell(eyex,eyey,eyez+er*.48,cm(v,'face.iris')*.24,cm(v,'face.iris')*.24,.0031,dark);
      ell(eyex,eyey+er*.63,eyez+.002,er*1.13,er*.24,er*.36,skin);
      ell(eyex,eyey-er*.63,eyez+.002,er*1.13,er*.18,er*.35,skin);
      const browY=eyey+er*1.8+cm(v,'face.brows')*.16;
      ell(eyex,browY,eyez+.001,er*1.32,cm(v,'face.brow_width')*.5,.005,hair,s*.12);
      ell(s*(faceW*.5+cm(v,'face.ear_projection')*.25),headY-hh*.08,-.003,
          cm(v,'face.ear_projection')*.64,cm(v,'face.ears')*.5,.014,skin);
    }
    const noseLen=cm(v,'face.nose_length'),noseDepth=cm(v,'face.nose_depth'),noseW=cm(v,'face.nose_width');
    ell(0,headY-hh*.05,faceD*.46+noseDepth*.22,noseW*.27,noseLen*.47,noseDepth*.51,skin);
    ell(0,headY-hh*.2,faceD*.46+noseDepth*.47,noseW*.49,noseLen*.16,noseDepth*.42,skin);
    const mouthY=headY-hh*.285;
    ell(0,mouthY+.004,faceD*.39,cm(v,'face.mouth')*.5,cm(v,'face.lips')*.35,.011,mouth);
    ell(0,mouthY-.007,faceD*.4,cm(v,'face.mouth')*.48,cm(v,'face.lips')*.42,.013,mouth);
    // Deterministic follicles with controllable hairstyle, density, length, volume and asymmetry.
    const style=v['hair.style'],length=cm(v,'hair.length')*pick(v,'hair.volume'),density=pick(v,'hair.density');
    if(style!=='bald'){
      const curl=pick(v,'hair.curl'),recede=cm(v,'hair.hairline'),asym=pick(v,'hair.asymmetry');
      ell(0,headY+hh*.34-recede*.19,-.003,faceW*.51,hh*.17,faceD*.5,hair);
      for(let k=0;k<density;k++){
        const t=(k+.5)/density,theta=Math.acos(1-1.76*t),a=k*2.399963229728653;
        const x=Math.cos(a)*Math.sin(theta),z=Math.sin(a)*Math.sin(theta),y=Math.cos(theta);
        // Keep guides around scalp; prevent opaque curtain across the face.
        const fx=faceW*.48*x,fy=headY+hh*.39+hh*.13*y,fz=faceD*.47*z;
        if(style==='afro'||style==='short-curls'){
          const radius=(style==='afro'?.018:.009)+length*(style==='afro'?.22:.09);
          ell(fx*(1+length*.75)+asym*length*.45,fy+length*y*.53,
              fz*(1+length*.5),radius*(.88+.18*Math.sin(k*4.27)),
              radius*(.8+curl*.37),radius,hair);
        }else{
          const strandL=length*(.38+.62*(.5+.5*Math.sin(k*1.71)));
          const tip=[fx+asym*strandL*.3,fy-strandL,fz+Math.sin(k*1.87)*curl*.007];
          limb([fx,fy,fz],tip,style==='locs'?.009:.0045,style==='locs'?.008:.0028,hair);
        }
      }
    }
    return {skin,clay};
  }
  function clear(){
    while(group.children.length){
      const child=group.children[0];group.remove(child);
      if(child.geometry!==sph)child.geometry.dispose();
      // Shared material objects may be disposed more than once, which is harmless.
      if(child.material && child.material.dispose)child.material.dispose();
    }
  }
  function size(){
    const w=Math.max(250,host.clientWidth),h=Math.max(340,host.clientHeight);
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    draw();
  }
  function draw(){
    const target=new THREE.Vector3(0,height*.54,0);
    camera.position.set(Math.sin(azimuth)*distance,target.y+Math.sin(elevation)*distance,Math.cos(azimuth)*distance);
    camera.lookAt(target);renderer.render(scene,camera);
  }
  let last,dragging=false;
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',event=>{dragging=true;last=[event.clientX,event.clientY];canvas.setPointerCapture(event.pointerId)});
  canvas.addEventListener('pointerup',()=>{dragging=false});
  canvas.addEventListener('pointercancel',()=>{dragging=false});
  canvas.addEventListener('pointermove',event=>{
    if(!dragging)return;
    const [x,y]=last;azimuth+=(event.clientX-x)*.008;elevation=clamp(elevation+(event.clientY-y)*.006,-.9,.9);
    last=[event.clientX,event.clientY];draw();
  });
  canvas.addEventListener('wheel',event=>{event.preventDefault();distance=clamp(distance*Math.exp(event.deltaY*.001),2,7.5);draw()},{passive:false});
  const resize=new ResizeObserver(size);resize.observe(host);
  function update(v){clear();create(v);size();}
  update(initial);
  return {update,dispose(){resize.disconnect();clear();sph.dispose();stage.geometry.dispose();stage.material.dispose();renderer.dispose()}};
}
