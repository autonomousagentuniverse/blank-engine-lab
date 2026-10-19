// CC0 MakeHuman target morphology + local anatomical deformation helpers.
// Original source: https://github.com/makehumancommunity/mpfb2/tree/3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf/src/mpfb/data/targets/macrodetails
// MPFB2's CC0 asset targets are pinned; downloaded on first preview load and cached.
export const MORPH_SOURCE='3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf';
export const MORPH_FILES=['african-female-young','african-male-young','asian-female-young','asian-male-young','caucasian-female-young','caucasian-male-young'];
const SOURCE_URL='https://cdn.jsdelivr.net/gh/makehumancommunity/mpfb2@'+MORPH_SOURCE+'/src/mpfb/data/targets/macrodetails/';
export const cm=(v,k)=>Number(v[k])*.01;
export const num=(v,k)=>Number(v[k]);
const gauss=(v,center,width)=>Math.exp(-2*((v-center)/width)**2);
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
const vertexId=(i)=>i<13380?i:i<13452?14598+i-13380:14670+i-13452;
let cached=null;
export function populationWeights(name){
 if(name==='african')return [1,0,0];
 if(name==='east-asian')return [0,1,0];
 if(name==='european')return [0,0,1];
 if(name==='mixed')return [1/3,1/3,1/3];
 throw Error('Unrecognized appearance reference '+name);
}
export function sexBlend(name){if(name==='feminine')return 0;if(name==='androgynous')return .5;if(name==='masculine')return 1;throw Error('Unrecognized body morphology '+name)}
export async function loadMacroTargets(vertexCount){
 if(vertexCount!==13524)throw Error('Unexpected MakeHuman basemesh index mapping: '+vertexCount);
 if(cached)return cached;
 cached=Promise.all(MORPH_FILES.map(async name=>{
  const r=await fetch(SOURCE_URL+name+'.target.gz');
  if(!r.ok)throw Error('MakeHuman morphology download failed '+name+': '+r.status);
  const bytes=new Uint8Array(await r.arrayBuffer());
  const isGzip=bytes[0]===31&&bytes[1]===139;
  if(isGzip&&typeof DecompressionStream!=='function')throw Error('This browser cannot decode licensed MakeHuman morphology assets');
  const body=isGzip?new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))):new Response(bytes);
  const text=await body.text(),out=new Float32Array(vertexCount*3);
  let matched=0;
  for(const line of text.split(/\r?\n/)){
   if(!line||line[0]==='#')continue;
   const cols=line.trim().split(/\s+/);if(cols.length<4)continue;
   const id=Number(cols[0]);
   let index=-1;
   if(id>=0&&id<13380)index=id;
   else if(id>=14598&&id<14670)index=13380+id-14598;
   else if(id>=14670&&id<14742)index=13452+id-14670;
   if(index<0)continue;
   const k=3*index;
   out[k]=Number(cols[1]);out[k+1]=Number(cols[2]);out[k+2]=Number(cols[3]);matched++;
  }
  if(matched<13000)throw Error('Truncated MakeHuman CC0 morphology target: '+name+' ('+matched+' vertices)');
  return out;
 })).catch(err=>{cached=null;throw err});
 return cached;
}
export function targetAt(morphs,i,v){
 const gender=sexBlend(v['body.gender']),p=populationWeights(v['appearance.population']);
 const k=i*3, f=1-gender;let x=0,y=0,z=0;
 for(let a=0;a<3;a++){
  if(p[a]===0)continue;
  const lo=morphs[a*2],hi=morphs[a*2+1],w=p[a];
  x+=w*(f*lo[k]+gender*hi[k]);y+=w*(f*lo[k+1]+gender*hi[k+1]);z+=w*(f*lo[k+2]+gender*hi[k+2]);
 }
 return [x,y,z];
}
// Auxiliary controls operate on the *same connected MakeHuman skin topology*.
// Every default deviation from the original figure is zero to prevent preset drift.
// Geometry masks limit deformations to the intended anatomical regions; the effects are
// deliberately smaller than the authentic MakeHuman full-body morphology differences.
export function secondaryVertex(v,{ox,oy,oz,x,y,z,py,front,coreW,scale}){
 const radial=(a,base)=>a/base-1;
 const px=Math.abs(ox),sign=Math.sign(ox||1);
 const arm=smooth(1.9,3.0,px)*gauss(py,.69,.25);
 const fore=smooth(2.7,3.6,px)*arm,elbow=gauss(px,3.04,.42)*arm,wrist=gauss(px,3.75,.29)*arm;
 const hand=smooth(3.44,4.13,px)*gauss(py,.62,.25);
 const fingers=smooth(4.09,4.70,px)*hand;
 const tip=smooth(4.72,4.96,px)*hand;
 const foot=(1-smooth(.08,.14,py));
 const toes=foot*smooth(.7,1.55,oz);
 const heel=foot*(1-smooth(.25,.72,oz));
 const knee=gauss(py,.31,.046),ankle=gauss(py,.085,.042);
 const head=smooth(.84,.88,py),face=head*(1-smooth(.995,1,py));
 const faceFront=smooth(.7,1.35,oz)*face;
 // Correct formerly inert neck width and eye spacing on connected facial topology.
 x+=sign*(cm(v,'body.neck_width')-.115)*.62*gauss(py,.849,.032)*gauss(px,.43,.49);
 x+=sign*(cm(v,'face.eye_spacing')-.062)*.53*gauss(py,.934,.021)*gauss(px,.37,.24)*faceFront;
 const brow=gauss(py,.943,.021)*faceFront;
 const ears=face*gauss(py,.924,.042)*gauss(px,.72,.26);
 // Torso: depth (front-back), relative length, neck height and shoulder slope.
 z+=(cm(v,'body.waist_depth')-.195)*.60*gauss(py,.645,.066)*coreW*(front?1:-.5);
 y+=(num(v,'body.torso_ratio')-.31)*.26*gauss(py,.70,.22)*coreW;
 y+=(cm(v,'body.neck_length')-.08)*.45*head;
 y+=(cm(v,'body.shoulder_slope')-.03)*(-.48)*gauss(py,.81,.06)*smooth(.8,2,px);
 // Forearms and elbows are radial changes about a soft centerline, not cylinders.
 y+=(num(v,'arms.upper_ratio')-.52)*.085*elbow;
 x+=sign*(cm(v,'arms.forearm_width')-.074)*.46*fore;
 x+=sign*(cm(v,'arms.elbow_width')-.062)*.42*elbow;
 x+=sign*(cm(v,'arms.wrist_width')-.052)*.48*wrist;
 // Independent palm and fingers. Source arms are in a resting angled T stance.
 x+=sign*(cm(v,'hands.length')-.10)*.62*hand*(1-tip);
 y+=(cm(v,'hands.width')-.078)*.54*hand;
 z+=(cm(v,'hands.depth')-.027)*.67*hand;
 x+=sign*(cm(v,'hands.fingers')-.076)*.63*fingers;
 z+=(cm(v,'hands.finger_width')-.017)*.38*fingers;
 y+=(num(v,'hands.spread')-9)*.0011*fingers*sign;
 x+=sign*(cm(v,'hands.thumb')-.055)*.25*gauss(px,4.09,.25)*hand;
 z+=(cm(v,'hands.nails')-.0065)*.55*tip;
 // Native legs and feet/toes remain one contiguous surface.
 x+=sign*(cm(v,'legs.knee')-.111)*.32*knee;
 x+=sign*(cm(v,'legs.ankle')-.074)*.33*ankle;
 z-=(cm(v,'legs.calf_curve')-.012)*.40*gauss(py,.19,.08);
 x+=sign*(num(v,'legs.muscle')-.31)*.006*gauss(py,.30,.19);
 z+=(cm(v,'feet.length')-.25)*.55*foot*smooth(.2,.85,oz);
 x+=sign*(cm(v,'feet.width')-.095)*.58*foot*(1-heel);
 x+=sign*(cm(v,'feet.heel')-.062)*.45*heel;
 y+=(cm(v,'feet.instep')-.06)*.40*foot*(1-toes);
 y+=(cm(v,'feet.arch')-.015)*.36*foot*gauss(oz,.55,.60);
 z+=(cm(v,'feet.toe_length')-.045)*.58*toes;
 x+=sign*(cm(v,'feet.toe_splay')-.007)*.72*toes;
 z+=(cm(v,'feet.big_toe')-.005)*.65*toes*gauss(px,1.28,.4);
 // Cranial features adjust the existing face, mouth and ear surfaces.
 x+=sign*(cm(v,'face.chin')-.078)*.30*faceFront*gauss(py,.863,.018);
 y+=(num(v,'face.eye_tilt')-.5)*.00035*faceFront*gauss(py,.93,.024)*sign;
 y+=(cm(v,'face.nose_length')-.049)*.48*faceFront*gauss(py,.911,.022)*gauss(px,.12,.12);
 x+=sign*(cm(v,'face.mouth')-.053)*.50*faceFront*gauss(py,.871,.016)*gauss(px,.2,.16);
 y+=(cm(v,'face.ears')-.056)*.62*ears;
 x+=sign*(cm(v,'face.ear_projection')-.013)*.65*ears;
 y+=(cm(v,'face.brows')-.006)*.65*brow;
 z+=(cm(v,'face.brow_width')-.0055)*.42*brow;
 return [x,y,z];
}
export const PRESET_COLORS={african:'#482a20','east-asian':'#c89872',european:'#dfb9a3',mixed:'#977055'};
export const PRESET_HAIR={african:'afro','east-asian':'straight',european:'straight',mixed:'short-curls'};