// Shared, auditable control registry. Defaults approximate the user's original human target.
// Prior accepted head geometry is not available to this procedural builder; no claim of exact identity.
// Every parameter is included in the submitted JSON.
export const SCHEMA = 'blank.manual-human-builder.v1';
export const PRESET_ID = 'original-figure-dark-afro-medium-v1';
export const PRESET_NAME = 'Original figure · Dark skin / natural Afro';
export const PRESET_DESCRIPTION = 'Full-body Black woman, approximately 28, medium natural proportions, dark skin, natural afro. Reconstructed parameter seed only: the previously preferred Blender head mesh is not loaded.';
const rows = String.raw`
Body|body.height|Height|n|172|145|205|1|cm
Body|body.shoulders|Shoulder width|n|40|30|52|0.5|cm
Body|body.chest|Ribcage width|n|31|23|42|0.5|cm
Body|body.chest_depth|Ribcage depth|n|21|15|31|0.5|cm
Body|body.bust|Bust projection|n|2.6|0|8|0.1|cm
Body|body.bust_spacing|Bust center spacing|n|18|12|27|0.5|cm
Body|body.waist|Waist width|n|27.5|20|40|0.5|cm
Body|body.waist_depth|Waist depth|n|19.5|14|30|0.5|cm
Body|body.hips|Pelvis / hip width|n|34|26|46|0.5|cm
Body|body.hip_depth|Pelvis depth|n|23|17|34|0.5|cm
Body|body.glutes|Glute projection|n|1|0|7|0.1|cm
Body|body.abdomen|Abdomen projection|n|0.8|0|6|0.1|cm
Body|body.torso_ratio|Torso length ratio|n|0.31|0.26|0.36|0.005|ratio
Body|body.neck_width|Neck width|n|11.5|8|16|0.5|cm
Body|body.neck_length|Neck length|n|8|5|13|0.5|cm
Body|body.shoulder_slope|Shoulder slope|n|3|0|8|0.5|cm
Body|body.posture|Torso pitch|n|0|-7|7|0.5|degrees
Body|body.fat|Soft tissue fullness|n|0.44|0|1|0.01|ratio
Body|body.muscle|Muscle definition|n|0.27|0|1|0.01|ratio
Arms|arms.length|Overall arm length|n|60|49|73|0.5|cm
Arms|arms.upper_ratio|Upper arm fraction|n|0.52|0.42|0.59|0.01|ratio
Arms|arms.upper_width|Upper arm diameter|n|9|6|15|0.2|cm
Arms|arms.forearm_width|Forearm diameter|n|7.4|5|12|0.2|cm
Arms|arms.elbow_width|Elbow diameter|n|6.2|4|10|0.2|cm
Arms|arms.wrist_width|Wrist diameter|n|5.2|3.5|8|0.1|cm
Arms|arms.relax|Arm angle from vertical|n|9|0|32|1|degrees
Arms|arms.forward|Arms forward offset|n|1|-8|10|0.5|cm
Hands|hands.length|Palm length|n|10|7|13|0.2|cm
Hands|hands.width|Palm width|n|7.8|5.8|11|0.2|cm
Hands|hands.depth|Palm thickness|n|2.7|1.6|4.8|0.1|cm
Hands|hands.fingers|Middle finger length|n|7.6|5|11|0.2|cm
Hands|hands.finger_width|Finger diameter|n|1.7|1|2.7|0.1|cm
Hands|hands.spread|Finger spread|n|9|0|22|1|degrees
Hands|hands.thumb|Thumb length|n|5.5|3.8|7.5|0.2|cm
Hands|hands.nails|Nail size|n|0.65|0.2|1.3|0.05|cm
Legs|legs.stance|Ankle separation|n|19|12|39|0.5|cm
Legs|legs.length_ratio|Crotch height ratio|n|0.475|0.43|0.54|0.005|ratio
Legs|legs.thigh|Thigh diameter|n|16.6|12|26|0.2|cm
Legs|legs.knee|Knee diameter|n|11.1|8|17|0.2|cm
Legs|legs.calf|Calf diameter|n|12.1|8|20|0.2|cm
Legs|legs.ankle|Ankle diameter|n|7.4|5.5|12|0.2|cm
Legs|legs.knee_in|Knee inward offset|n|0.8|-3|5|0.2|cm
Legs|legs.calf_curve|Calf rear projection|n|1.2|0|4.5|0.1|cm
Legs|legs.muscle|Leg muscle fullness|n|0.31|0|1|0.01|ratio
Feet & toes|feet.length|Foot length|n|25|20|32|0.5|cm
Feet & toes|feet.width|Forefoot width|n|9.5|7|14|0.2|cm
Feet & toes|feet.heel|Heel width|n|6.2|4.5|9|0.2|cm
Feet & toes|feet.instep|Instep height|n|6|4.2|10|0.2|cm
Feet & toes|feet.arch|Arch rise|n|1.5|0|3.4|0.1|cm
Feet & toes|feet.toe_length|Toe length|n|4.5|3|6.5|0.1|cm
Feet & toes|feet.toe_splay|Toe splay|n|0.7|0|2.4|0.1|cm
Feet & toes|feet.big_toe|Big toe length bias|n|0.5|-1.5|2|0.1|cm
Head & face|face.head_width|Cranial width|n|15.4|12|20|0.2|cm
Head & face|face.head_depth|Cranial depth|n|18.4|14|23|0.2|cm
Head & face|face.head_length|Head height|n|22.8|19|28|0.2|cm
Head & face|face.jaw|Jaw width|n|11.6|8|17|0.2|cm
Head & face|face.chin|Chin width|n|7.8|5|12|0.2|cm
Head & face|face.cheeks|Cheek fullness|n|0.61|0|1|0.01|ratio
Head & face|face.eye_spacing|Eye-center spacing|n|6.2|5|8.5|0.1|cm
Head & face|face.eye_size|Eyeball diameter|n|2.4|1.9|3.2|0.05|cm
Head & face|face.iris|Iris diameter|n|1.15|0.8|1.6|0.05|cm
Head & face|face.eye_tilt|Eye tilt|n|0.5|-9|9|0.5|degrees
Head & face|face.nose_width|Nose width|n|4.1|2.3|6|0.1|cm
Head & face|face.nose_length|Nose length|n|4.9|3|7.5|0.1|cm
Head & face|face.nose_depth|Nose projection|n|2.5|1.2|4.2|0.1|cm
Head & face|face.lips|Lip fullness|n|1.6|0.4|2.5|0.1|cm
Head & face|face.mouth|Mouth width|n|5.3|3.6|7.2|0.1|cm
Head & face|face.ears|Ear height|n|5.6|4|8|0.1|cm
Head & face|face.ear_projection|Ear projection|n|1.3|0.3|3|0.1|cm
Head & face|face.brows|Brow arch|n|0.6|0|2|0.1|cm
Head & face|face.brow_width|Brow thickness|n|0.55|0.2|1.2|0.05|cm
Hair|hair.style|Hair style|s|afro|afro,short-curls,locs,straight,bald
Hair|hair.length|Hair length|n|11|0|45|0.5|cm
Hair|hair.volume|Hair volume|n|1.14|0.6|1.8|0.025|ratio
Hair|hair.density|Strand groups|n|220|30|400|10|count
Hair|hair.curl|Curl tightness|n|0.84|0|1|0.02|ratio
Hair|hair.hairline|Hairline recession|n|0.4|0|3|0.1|cm
Hair|hair.asymmetry|Hair asymmetry|n|0.04|-0.3|0.3|0.01|ratio
Hair|hair.color|Hair color|c|#171210
Skin & appearance|skin.color|Skin color|c|#482a20
Skin & appearance|skin.roughness|Skin roughness|n|0.56|0.2|0.95|0.01|ratio
Skin & appearance|skin.subsurface|Skin subsurface|n|0.14|0|0.35|0.01|ratio
Skin & appearance|skin.variation|Skin color variation|n|0.17|0|0.4|0.01|ratio
Skin & appearance|skin.specular|Skin sheen|n|0.28|0|0.8|0.01|ratio
Skin & appearance|eye.iris_color|Iris color|c|#281910
Skin & appearance|eye.sclera_tint|Sclera tint|c|#dfd7cb
Studio|render.samples|Cycles samples|n|24|8|128|4|samples
Studio|render.resolution|Image height|n|960|480|1800|60|px
Studio|render.background|Background color|c|#474951
Studio|render.light|Key light strength|n|1|0.4|2|0.05|ratio
Studio|render.clay|Clay mode|s|false|true,false
`.trim();
export const CONTROLS = Object.freeze(rows.split('\n').map(line => {
 const [section,id,label,type,def,min,max,step,unit] = line.split('|');
 const common = { section,id,label,type };
 if (type === 'n') return Object.freeze({ ...common,default:Number(def),min:Number(min),max:Number(max),step:Number(step),unit });
 if (type === 's') return Object.freeze({ ...common, default:def, options:(min||'').split(',') });
 return Object.freeze({ ...common, default:def });
}));
export const DEFAULTS=Object.freeze(Object.fromEntries(CONTROLS.map(c=>[c.id,c.default])));
const byId=new Map(CONTROLS.map(c=>[c.id,c]));
if(byId.size!==CONTROLS.length)throw Error('Duplicate character control IDs');
export function validateValues(values) {
 if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Controls must be an object');
 if(Object.keys(values).length!==CONTROLS.length)throw Error('All '+CONTROLS.length+' controls must be present; unknown and missing fields are rejected');
 const clean={};
 for(const c of CONTROLS){
  const v=values[c.id];
  if(c.type==='n'){
   if(typeof v!=='number'||!Number.isFinite(v)||v<c.min||v>c.max)throw Error('Invalid '+c.id);
   clean[c.id]=v;
  }else if(c.type==='c'){
   if(typeof v!=='string'||!/^#[0-9a-fA-F]{6}$/.test(v))throw Error('Invalid color '+c.id);
   clean[c.id]=v.toLowerCase();
  }else{
   if(typeof v!=='string'||!c.options.includes(v))throw Error('Invalid option '+c.id);
   clean[c.id]=v;
  }
 }
 for(const key of Object.keys(values))if(!byId.has(key))throw Error('Unknown control '+key);
 return clean;
}
export function validateRequest(payload){
 if(!payload||payload.schema!==SCHEMA)throw Error('Unsupported character specification');
 return {schema:SCHEMA,controls:validateValues(payload.controls)};
}
export function defaultRequest(){return {schema:SCHEMA,controls:{...DEFAULTS}}}
