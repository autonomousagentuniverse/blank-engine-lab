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
$('#presetDescription').textContent=PRESET_DESCRIPTION+' · Body morphology and ancestry-inspired references can be changed independently of skin tone.';
let dirty=0,activeJob=null,poll=null;
const LAST_JOB_KEY='blank-anatomy:last-running-job:v1';
let checkFailures=0,checkingJob=false;
let previewUpdater=()=>{}, previewSnapshot=null, previewPending=false;
function queuePreview(){
 if(previewPending)return;
 previewPending=true;
 requestAnimationFrame(()=>{previewPending=false;previewUpdater(values)});
}
import('./preview.mjs').then(async ({mountClayPreview})=>{
 $('#previewState').textContent='Loading connected CC0 human topology…';
 const viewport=await mountClayPreview($('#clayViewport'),values);
 previewUpdater=next=>viewport.update(next);
 previewSnapshot=()=>viewport.snapshot();
 viewport.update(values); // Apply edits made while the source mesh was downloading.
 $('#previewState').textContent='LIVE · MakeHuman · '+viewport.source.vertices.toLocaleString()+' vertices · '+viewport.source.macros+' real morphs';
 if(new URLSearchParams(location.search).has('qa'))window.__blankQA={inspect:()=>viewport.inspect(),snapshot:()=>viewport.snapshot(),values:()=>({...values}),update:(id,value)=>{if(!(id in values))throw Error('Unknown '+id);values[id]=value;viewport.update(values);return viewport.inspect()}};
 $('#report').textContent='CC0 MakeHuman: '+viewport.source.vertices.toLocaleString()+' mesh vertices, '+viewport.source.faces.toLocaleString()+' triangles, '+viewport.source.macros+' authentic adult macro morphs. Preview settings now affect the browser model except Blender Cycles samples; body shapes/appearance are approximations, not identity or photorealism.';
}).catch(err=>{
 $('#previewState').textContent='3D renderer unavailable: '+err.message;
 $('#report').textContent='WebGL preview could not initialize; your controls and exported JSON still work.';
});
const numberText=(c,value)=>c.unit==='ratio'&&c.step<.01?Number(value).toFixed(3):String(value);
function note(){
 $('#dirty').textContent=dirty?dirty+' parameter change'+(dirty===1?'':'s')+' since last rebuild':'Starting figure: '+PRESET_NAME;
 $('#count').textContent=CONTROLS.length+' controls · all adjustable; Cycles samples export only';
 localStorage.setItem(SAVED,JSON.stringify({schema:SCHEMA,controls:values}));
 queuePreview();
}
function makeInput(c){
 const wrap=document.createElement('div');wrap.className='control';wrap.dataset.search=(c.label+' '+c.id).toLowerCase();
 const head=document.createElement('div');head.className='line';
 const label=document.createElement('label');label.textContent=c.label+(c.id==='render.samples'?' (Blender only)':'');head.append(label);
 const out=document.createElement('output');out.textContent=c.type==='n'?numberText(c,values[c.id])+' '+c.unit:values[c.id];head.append(out);wrap.append(head);
 let inp,other=null;
 if(c.type==='n'){
  const row=document.createElement('div');row.className='row';
  inp=document.createElement('input');inp.type='range';
  other=document.createElement('input');other.type='number';
  for(const el of [inp,other]){el.min=c.min;el.max=c.max;el.step=c.step;el.value=values[c.id];el.setAttribute('aria-label',c.label);}
  row.append(inp,other);wrap.append(row);
 }else if(c.type==='s'){
  inp=document.createElement('select');inp.setAttribute('aria-label',c.label);
  for(const option of c.options){
   const el=document.createElement('option');el.value=option;el.textContent=option.replaceAll('-',' ');
   inp.append(el);
  }
  inp.value=values[c.id];wrap.append(inp);
 }else{
  inp=document.createElement('input');inp.type='color';inp.value=values[c.id];
  inp.setAttribute('aria-label',c.label);wrap.append(inp);
 }
 function change(raw){
  const next=c.type==='n'?Number(raw):raw;
  if(c.type==='n'&&(!Number.isFinite(next)||next<c.min||next>c.max))return;
  if(next===values[c.id])return;
  values[c.id]=next;
  inp.value=String(next);
  if(other)other.value=String(next);
  out.textContent=c.type==='n'?numberText(c,next)+' '+c.unit:String(next);
  if(c.id==='appearance.population'){
   values['skin.color']=ANCESTRY_SWATCH[next];
   values['hair.style']=ANCESTRY_HAIR[next];
   $('#presetName').textContent='Custom appearance · '+next.replace('-',' ');
   $('#presetDescription').textContent='MakeHuman anatomical reference '+next+'; this provides a starting complexion and hairstyle, both independently editable.';
  }
  if(c.id==='body.gender'){
   const shape=next==='masculine'?[.25,44,32]:next==='androgynous'?[1.3,42,33]:[2.6,40,34];
   values['body.bust']=shape[0];values['body.shoulders']=shape[1];values['body.hips']=shape[2];
   $('#presetName').textContent='Custom morphology · '+next;
   $('#presetDescription').textContent='Full-body MakeHuman '+next+' macro target; individual body settings remain editable.';
  }
  if(c.id==='appearance.population'||c.id==='body.gender')for(const w of widgets)w.sync();
  dirty++;note();
 }
 inp.addEventListener('input',()=>change(inp.value));
 if(other)other.addEventListener('change',()=>change(other.value));
 wrap.sync=()=>{inp.value=String(values[c.id]);if(other)other.value=String(values[c.id]);
   out.textContent=c.type==='n'?numberText(c,values[c.id])+' '+c.unit:values[c.id];};
 return wrap;
}
const widgets=[];
for(const [name,entries] of groups){
 const details=document.createElement('details');details.className='group';
 details.open=['Appearance & morphology','Body','Hair','Skin & appearance','Feet & toes'].includes(name);
 const summary=document.createElement('summary');
 const count=document.createElement('small');count.textContent=entries.length+' controls';
 summary.append(document.createTextNode(name),count);details.append(summary);
 const fields=document.createElement('div');fields.className='fields';
 for(const c of entries){const input=makeInput(c);widgets.push(input);fields.append(input);}
 details.append(fields);$('#sections').append(details);
}
note();
function sync(){
 for(const widget of widgets)widget.sync();
 dirty=0;note();
}
$('#search').addEventListener('input',event=>{
 const text=event.target.value.trim().toLowerCase();
 for(const group of $('#sections').children){
  let visible=0;
  for(const widget of group.querySelectorAll('.control')){
   const good=!text||widget.dataset.search.includes(text);
   widget.hidden=!good;
   if(good)visible++;
  }
  group.hidden=visible===0;
  if(text&&visible)group.open=true;
 }
});
$('#reset').addEventListener('click',()=>{if(confirm('Restore the original target figure? This will replace your current manual changes.')){values={...DEFAULTS};sync();$('#buildStatus').textContent='ORIGINAL FIGURE RESTORED'}});
$('#save').addEventListener('click',()=>{
 const blob=new Blob([JSON.stringify({schema:SCHEMA,controls:values},null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='human-anatomy-controls.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),500);
});
$('#import').addEventListener('change',async(event)=>{
 const file=event.target.files?.[0];if(!file)return;
 try{values=validateRequest(JSON.parse(await file.text())).controls;sync();$('#buildStatus').textContent='Imported specification';}
 catch(err){alert('Import refused: '+err.message)}
 event.target.value='';
});
const build=$('#submit');
const HOSTED=!['localhost','127.0.0.1'].includes(location.hostname);
function exportSpecification(data,name){
 const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
const API_REBUILD=HOSTED?'/api/anatomy':'/api/rebuild';
const API_STATUS=id=>HOSTED?('/api/anatomy?job='+encodeURIComponent(id)):('/api/jobs/'+encodeURIComponent(id));
if(HOSTED){
 build.textContent='Generate actual Blender build';
 $('#report').textContent='Submit runs real Blender in an isolated Vercel Sandbox. Six Cycles views and an editable .blend are available for approximately 30 minutes.';
}
function status(value){$('#buildStatus').textContent=value}
const ANIMATION_LABELS={
 idle:'Idle / Breathing',walk:'Walk in place',jog:'Jog in place',
 run:'Run in place',happy:'Happy face',sad:'Sad face',
 angry:'Angry face',laugh:'Laugh',fight:'Fight combo'
};
let activeAnimation='walk';
let renderedJob=null;
function showAnimationChoice(){
 document.querySelectorAll('[data-action]').forEach(button=>{
  const selected=button.dataset.action===activeAnimation;
  button.setAttribute('aria-pressed',String(selected));
  button.classList.toggle('selected',selected);
 });
 const title=ANIMATION_LABELS[activeAnimation];
 $('#animationChoiceStatus').textContent=renderedJob
   ?title+' selected · press Play or choose another action'
   :title+' selected · Generate a Blender build to play it';
 $('#activeClipTitle').textContent=title;
 if(renderedJob){
  const job=renderedJob;
  const id=encodeURIComponent(job.workerJobId||job.id);
  const prefix=job.outputBaseUrl||'';
  const video=$('#activeAnimationVideo');
  video.pause();
  if(job.status==='running'&&!job.progress?.availablePreviews?.includes(activeAnimation)){
   video.removeAttribute('src');video.load();
   $('#activeClipDescription').textContent='This clip is still rendering. The completed videos are available while Blender continues.';
   return;
  }
  video.src=prefix+'/outputs/'+id+'/'+activeAnimation+'_preview.mp4';
  video.load();
  const videoData=job.report.animation.previews.find(p=>p.kind===activeAnimation);
  const details=[];
  if(videoData){
   details.push('Preview: '+videoData.height_px+'px · '+videoData.cycles_samples+
     ' Cycles samples'+(videoData.denoised?' · denoised':''));
  }
  const metricName={walk:'Walk_InPlace',jog:'Jog_InPlace',run:'Run_InPlace'}[activeAnimation];
  const metric=metricName&&job.report.animation.biomechanics?.[metricName];
  if(metric){
   details.push('Measured ankle stance: left '+metric.L.stance_frames+
    ' frames, right '+metric.R.stance_frames+' frames');
   details.push('Swing clearance: '+Math.round(100*metric.L.clearance_m)+
     ' cm left / '+Math.round(100*metric.R.clearance_m)+' cm right');
  } else if(activeAnimation==='fight')details.push('Fight is a choreographed motion without impact physics');
  else if(['happy','sad','angry','laugh'].includes(activeAnimation)){
   details.push('Facial action: keyframed 3D mesh shape key (not FACS-certified)');
  }
  $('#animationQualityStatus').textContent=details.join(' · ');
  const face=['happy','sad','angry','laugh'].includes(activeAnimation);
  $('#activeClipDescription').textContent=face
   ?'Blender face close-up with keyframed facial mesh deformation'
   :'Full-body Blender motion preview. Running, jogging and fighting are first-pass in-place performances';
 }
}
document.querySelectorAll('[data-action]').forEach(button=>{
 button.addEventListener('click',()=>{
  activeAnimation=button.dataset.action;
  showAnimationChoice();
  if(renderedJob){
   const video=$('#activeAnimationVideo');
   video.play().catch(()=>{ /* native Play button remains available */ });
   $('#animations').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
 });
});
showAnimationChoice();
function showResults(job){
 const id=encodeURIComponent(job.workerJobId||job.id);
 const filesBase=job.outputBaseUrl||'';
 $('#images').hidden=false;
 $('#animations').hidden=false;
 renderedJob=job;
 showAnimationChoice();
 for(const name of ['front','three_quarter','profile','face_macro','hand_macro','feet_macro']){
  $('#'+name).src=filesBase+'/outputs/'+id+'/'+name+'.png';
 }
 const g=job.report.mesh;
 $('#report').textContent=[
  'Generator: '+job.report.generator,
  'Controls: '+job.report.controls_applied+' / 93',
  'Morphology: '+job.report.morphology+' · reference: '+job.report.population_reference,
  'Source: CC0 MakeHuman (full provenance in report.json)',
  'Body geometry: '+g.vertices.toLocaleString()+' vertices / '+g.triangles.toLocaleString()+' triangles',
  'Stature: '+(g.height_m*100).toFixed(1)+' cm',
  'Browser/Blender vertex deviation: '+g.max_blender_vertex_deviation_m.toFixed(8)+' m',
  'Degenerate faces: '+g.degenerate_triangles,
  'Hair instances: '+job.report.hair_instances,
  'Animation: '+job.report.animation.bones+' bones · '+job.report.animation.clips.join(' / '),
  'Animation choices: '+job.report.animation.clips.length+' · 4 facial shape-key expressions',
  'Motion quality: FIRST PASS · in-place motion and approximate expressions',
  'Skin deformation QA: '+Object.entries(job.report.animation.skin_strain||{})
    .map(([action,metric])=>action.replace('_InPlace','')+' '+metric.max_edge_length_ratio.toFixed(2)+'× worst edge stretch')
    .join(' · '),
  'Human realism is NOT visually approved',
  'Sandbox downloads expire after approximately 30 minutes; save your .blend immediately'
 ].join('\n');
 const links=$('#artifactLinks');links.replaceChildren();
 const play=document.createElement('a');
 play.href='/index.html?anatomyJob='+encodeURIComponent(job.id);
 play.textContent='Play-test this character in Blank Engine ↗';
 play.className='play-in-engine';
 play.target='_blank';
 play.rel='noopener noreferrer';
 play.title='Load the generated rigged human into the existing Rapier playable scene (temporary Blender job)';
 links.append(play);
 for(const [label,name] of [['Animated GLB · all 9 clips','animated_character.glb'],['Editable Blender','anatomical_character.blend'],['Build evidence','report.json']]){
  const a=document.createElement('a');a.href=filesBase+'/outputs/'+id+'/'+name;a.textContent=label;a.download=name;links.append(a);
 }
}
function updateBuildProgress(job){
 const p=job.progress;
 if(!p)return;
 $('#buildProgressPanel').hidden=false;
 $('#buildProgress').value=p.renderedFrames;
 const remaining=p.estimatedRemainingSeconds==null?'Estimating time remaining':Math.max(1,Math.ceil(p.estimatedRemainingSeconds/60))+' min remaining (estimate)';
 const stalled=p.lastProgressSeconds>130?' · No new frames for '+p.lastProgressSeconds+'s':'';
 $('#buildProgressDetail').textContent=(p.renderedFrames===p.totalFrames?'Finalizing Blender files':p.phase)+' · '+p.renderedFrames+'/'+p.totalFrames+
  ' frames · '+p.availablePreviews.length+'/9 videos ready · '+remaining+stalled;
 if(p.availablePreviews.includes(activeAnimation)){
  $('#animations').hidden=false;
  const src=(job.outputBaseUrl||'')+'/outputs/'+encodeURIComponent(job.workerJobId||job.id)+'/'+activeAnimation+'_preview.mp4';
  const video=$('#activeAnimationVideo');
  if(!renderedJob||renderedJob.id!==job.id){
   renderedJob={...job,report:{animation:{previews:[],biomechanics:{}}}};
  }
  if(video.src!==new URL(src,location.href).href){video.src=src;video.load();}
  if(job.status==='running'){
   $('#animationQualityStatus').textContent='Playable '+ANIMATION_LABELS[activeAnimation]+
     ' preview ready · '+p.renderedFrames+'/'+p.totalFrames+
     ' Cycles frames rendered · final biomechanics/quality evidence pending';
   $('#activeClipDescription').textContent='Early Blender preview. Remaining animations and final quality checks are still processing.';
  }
 }
}
async function check(id){
 if(checkingJob)return;checkingJob=true;
 try{
  const res=await fetch(API_STATUS(id),{cache:'no-store',signal:AbortSignal.timeout(20000)});
  const job=await res.json();
  if(!res.ok){
   if(res.status===410||res.status===404){
    localStorage.removeItem(LAST_JOB_KEY);
    clearInterval(poll);poll=null;activeJob=null;build.disabled=false;
    $('#resumeBuild').hidden=true;
    status('BUILD EXPIRED');
    $('#buildProgressDetail').textContent=job.error||'The Blender worker has expired; start a new build.';
    return;
   }
   throw Error(job.error||'HTTP '+res.status+' while checking Blender');
  }
  checkFailures=0;status(job.status.toUpperCase());updateBuildProgress(job);
  $('#log').textContent=job.log||'';
  if(job.status==='complete'||job.status==='failed'){
   clearInterval(poll);poll=null;activeJob=null;build.disabled=false;
   localStorage.removeItem(LAST_JOB_KEY);$('#resumeBuild').hidden=true;
   if(job.status==='complete'){showResults(job);dirty=0;note();}
   else{$('#report').textContent='Blender failed: '+job.error+'. See the logs for the exact error.';status('BUILD FAILED')}
  }
 }catch(err){
  checkFailures++;
  status('RECONNECTING '+checkFailures+'/6');
  $('#buildProgressPanel').hidden=false;
  $('#buildProgressDetail').textContent='Status connection interrupted; Blender may still be rendering. '+err.message;
  if(checkFailures>=6){
   clearInterval(poll);poll=null;activeJob=null;build.disabled=false;
   status('TRACKING PAUSED');$('#resumeBuild').hidden=false;
  }
 }finally{checkingJob=false}
}
build.addEventListener('click',async()=>{
 if(activeJob)return;
 try{
  // Snapshot matches the last displayed shape and is the only mesh Blender may use.
  if(!previewSnapshot)throw Error('MakeHuman geometry still loading; replica export refused');
  previewUpdater(values);
  const payload={...validateRequest({schema:SCHEMA,controls:values}),snapshot:previewSnapshot(),selectedAnimation:activeAnimation};
  build.disabled=true;status('SUBMITTING…');$('#log').textContent='';
  renderedJob=null;$('#animations').hidden=true;$('#images').hidden=true;
  const response=await fetch(API_REBUILD,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Blender service rejected submission');
  activeJob=result.jobId;checkFailures=0;localStorage.setItem(LAST_JOB_KEY,JSON.stringify({id:activeJob,at:Date.now(),selected:activeAnimation}));
  status('QUEUED');$('#buildProgressPanel').hidden=false;await check(activeJob);
  if(activeJob)poll=setInterval(()=>{void check(activeJob)},3000);
 }catch(err){activeJob=null;build.disabled=false;status('SUBMIT ERROR');$('#log').textContent=err.message}
});

async function reconnectBuild(){
 if(activeJob)return;
 let saved;
 try{saved=JSON.parse(localStorage.getItem(LAST_JOB_KEY)||'null')}catch{}
 if(!saved?.id)return;
 if(Date.now()-saved.at>30*60*1000){
  localStorage.removeItem(LAST_JOB_KEY);status('PREVIOUS BUILD EXPIRED');return;
 }
 activeJob=saved.id;build.disabled=true;checkFailures=0;
 if(ANIMATION_LABELS[saved.selected]){activeAnimation=saved.selected;showAnimationChoice();}
 $('#resumeBuild').hidden=true;status('RECONNECTING TO BLENDER');
 await check(activeJob);
 if(activeJob&&!poll)poll=setInterval(()=>{void check(activeJob)},2500);
}
$('#resumeBuild').addEventListener('click',()=>{void reconnectBuild()});
if(HOSTED)void reconnectBuild();
