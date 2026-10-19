import {CONTROLS,SCHEMA,DEFAULTS,PRESET_ID,PRESET_NAME,PRESET_DESCRIPTION,validateRequest} from './controls.mjs';
const $=s=>document.querySelector(s);
// Use a new storage key so old trial values cannot silently override the newly agreed character.
// Older values remain intact in the v1 key; they can still be imported from a JSON backup.
const SAVED='blank-human-builder:v3:'+PRESET_ID+':manual-values';
const PREVIOUS_SAVED='blank-human-builder:v2:original-figure-dark-afro-medium-v1:manual-values';
const ANCESTRY_SWATCH={african:'#482a20','east-asian':'#c89872',european:'#dfb9a3',mixed:'#977055'};
const ANCESTRY_HAIR={african:'afro','east-asian':'straight',european:'straight',mixed:'short-curls'};
const groups=new Map();
for(const c of CONTROLS){
 if(!groups.has(c.section))groups.set(c.section,[]);
 groups.get(c.section).push(c);
}
let values={...DEFAULTS};
try{
 const previous=JSON.parse(localStorage.getItem(SAVED)||localStorage.getItem(PREVIOUS_SAVED)||'null');
 if(previous?.controls)values=validateRequest({schema:SCHEMA,controls:{...DEFAULTS,...previous.controls}}).controls;
}catch{}
$('#presetName').textContent=PRESET_NAME;
$('#presetDescription').textContent=PRESET_DESCRIPTION+' Â· Body morphology and ancestry-inspired references can be changed independently of skin tone.';
let dirty=0,activeJob=null,poll=null;
let previewUpdater=()=>{}, previewSnapshot=null, previewPending=false;
function queuePreview(){
 if(previewPending)return;
 previewPending=true;
 requestAnimatio¶»§q«^