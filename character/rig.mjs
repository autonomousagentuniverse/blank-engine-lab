/** Procedural skinned character rig: actual Three.js bones and GPU skin weights.
 * A rig/animation contract that can later be populated by authored glTF assets.
 */
export const SKINS=Object.freeze({
  explorer:{armor:0xbdd9e6,skin:0xb98266,accent:0x24bde4},
  amber:{armor:0x352d37,skin:0xd7a078,accent:0xf0a344},
  obsidian:{armor:0x202936,skin:0x815c50,accent:0x96a6ff}
});
export const SKIN_NAMES=Object.keys(SKINS);
export function validateSkin(name) {
  if(!Object.hasOwn(SKINS,name))throw new Error('Unknown character skin');
  return name;
}
export function limbWeights(vertexYs,length){
  if(!Array.isArray(vertexYs)||!Number.isFinite(length)||length<=0)throw new Error('Invalid skinning geometry');
  const indices=[],weights=[];
  for(const y of vertexYs){
    if(!Number.isFinite(y))throw new Error('Invalid vertex height');
    const t=Math.max(0,Math.min(1,(-y/length-.20)/.65));
    indices.push(0,1,0,0);weights.push(1-t,t,0,0);
  }
  return {indices,weights};
}

export function createCharacterRig(THREE,{skin='explorer',makeMaterial}={}) {
  validateSkin(skin);
  if(typeof makeMaterial!=='function')throw new Error('Material allocator required');
  const root=new THREE.Group();
  const palette=SKINS[skin];
  const armor=makeMaterial(palette.armor,{metalness:.36,roughness:.65});
  const bodySkin=makeMaterial(palette.skin,{roughness:.88,metalness:0});
  const accent=makeMaterial(palette.accent,{emissive:palette.accent,emissiveIntensity:.55});
  const mesh=(geo,mat,parent=root)=>{const m=new THREE.Mesh(geo,mat);parent.add(m);return m;};
  const torso=mesh(new THREE.BoxGeometry(.98,1.05,.57),armor);torso.position.y=1.77;
  const belt=mesh(new THREE.BoxGeometry(1.1,.16,.65),accent);belt.position.y=1.25;
  const neck=mesh(new THREE.CylinderGeometry(.17,.2,.24,10),bodySkin);neck.position.y=2.42;
  const head=mesh(new THREE.SphereGeometry(.40,18,12),bodySkin);head.position.y=2.81;
  const visor=mesh(new THREE.BoxGeometry(.56,.10,.09),accent);visor.position.set(0,2.84,-.36);

  // Each limb has two bones and a SkinnedMesh; its vertices actually deform at a joint.
  function limb({x,y,z=0,length=.9,radius=.17,material=armor}){
    const geo=new THREE.CylinderGeometry(radius*.87,radius,length,10,12);
    geo.translate(0,-length/2,0);
    const position=geo.getAttribute('position');
    const ys=Array.from({length:position.count},(_,i)=>position.getY(i));
    const {indices,weights}=limbWeights(ys,length);
    geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
    geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
    const skinned=new THREE.SkinnedMesh(geo,material);
    skinned.frustumCulled=false;
    const upper=new THREE.Bone(),lower=new THREE.Bone();
    upper.name='upper';lower.name='lower';lower.position.y=-length*.55;
    upper.add(lower);skinned.add(upper);skinned.bind(new THREE.Skeleton([upper,lower]));
    skinned.position.set(x,y,z);root.add(skinned);
    return {skinned,upper,lower};
  }
  const leftLeg=limb({x:-.29,y:1.23,length:1.17,radius:.20});
  const rightLeg=limb({x:.29,y:1.23,length:1.17,radius:.20});
  const leftArm=limb({x:-.65,y:2.28,length:1.05,radius:.16,material:bodySkin});
  const rightArm=limb({x:.65,y:2.28,length:1.05,radius:.16,material:bodySkin});
  const limbs={leftLeg,rightLeg,leftArm,rightArm};
  let phase=0,anim='idle',elapsed=0,currentSkin=skin;
  function setSkin(name){
    validateSkin(name);currentSkin=name;const colors=SKINS[name];
    armor.color.setHex(colors.armor);bodySkin.color.setHex(colors.skin);
    accent.color.setHex(colors.accent);accent.emissive.setHex(colors.accent);
    return name;
  }
  function update(actor,dt){
    const desired=['idle','walk','run','jump','fall'].includes(actor.motion)?actor.motion:'idle';
    const speed=Math.hypot(actor.vx,actor.vz);
    if(desired!==anim){anim=desired;elapsed=0;}
    elapsed+=dt;
    const actionSpeed=desired==='run'?10:7.2;
    phase+=(desired==='walk'||desired==='run'?actionSpeed:1.2)*dt;
    const stride=desired==='run'?.72:desired==='walk'?.49:0;
    const s=Math.sin(phase)*stride;
    leftLeg.upper.rotation.x=desired==='jump'?-0.32:desired==='fall'?.12:s;
    rightLeg.upper.rotation.x=desired==='jump'?.12:desired==='fall'?-.2:-s;
    leftArm.upper.rotation.x=desired==='jump'?.8:desired==='fall'?.32:-s*.9;
    rightArm.upper.rotation.x=desired==='jump'?.8:desired==='fall'?.32:s*.9;
    leftLeg.lower.rotation.x=desired==='jump'?.68:Math.max(0,-s)*.85;
    rightLeg.lower.rotation.x=desired==='jump'?.68:Math.max(0,s)*.85;
    leftArm.lower.rotation.x=desired==='jump'?-.32:-.15;
    rightArm.lower.rotation.x=desired==='jump'?-.32:-.15;
    torso.rotation.z=(desired==='walk'||desired==='run')?Math.sin(phase)*.025:0;
    head.rotation.y=Math.sin(phase*.34)*.035;
    root.position.y=actor.y+((actor.grounded&&speed>.35)?Math.abs(Math.sin(phase))*.045:0);
    return anim;
  }
  const poseChains={};
  for(const [side,part] of [['left','Leg'],['right','Leg'],['left','Arm'],['right','Arm']]){
    const limb=limbs[`${side}${part}`];
    const total=part==='Leg'?1.17:1.05;
    poseChains[`${side}${part}`]={upper:limb.upper,lower:limb.lower,
      endLocal:{x:0,y:-total*.45,z:0}};
  }
  return {root,limbs,poseChains,update,setSkin,get skin(){return currentSkin;},get animation(){return anim;},get skeletonCount(){return 4;}};
}
