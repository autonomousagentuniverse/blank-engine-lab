import {CONTROLS,SCHEMA,DEFAULTS,validateRequest} from './controls.mjs';
const $=s=>document.querySelector(s);
const SAVED='blank-human-builder:v1:manual-values';
const groups=new Map();
for(const c of CONTROLS){
 if(!groups.has(c.section))groups.set(c.section,[]);
 groups.get(c.section).push(c);
}
let values={...DEFAULTS};
try{
 const previous=JSON.parse(localStorage.getItem(SAVED)||'null');
 if(previous?.schema===SCHEMA)values=validateRequest(previous).controls;
}catch{}
let dirty=0,activeJob=null,poll=null;
const numberText=(c,value)=>c.unit==='ratio'&&c.step<.01?Number(value).toFixed(3):String(value);
function note(){
 $('#dirty').textContent=dirty?dirty+' parameter change'+(dirty===1?'':'s')+' since last rebuild':'Ready to submit current anatomy';
 $('#count').textContent=CONTROLS.length+' fully bound adjustable variables';
 localStorage.setItem(SAVED,JSON.stringify({schema:SCHEMA,controls:values}));
}
function makeInput(c){
 const wrap=document.createElement('div');wrap.className='control';wrap.dataset.search=(c.label+' '+c.id).toLowerCase();
 const head=document.createElement('div');head.className='line';
 const label=document.createElement('label');label.textContent=c.label;head.append(label);
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
 details.open=['Body','Hair','Skin & appearance','Feet & toes'].includes(name);
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
$('#reset').addEventListener('click',()=>{if(confirm('Reset all anatomy variables to defaults?')){values={...DEFAULTS};sync()}});
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
function status(value){$('#buildStatus').textContent=value}
function showResults(job){
 const id=encodeURIComponent(job.id);
 $('#empty').hidden=true;$('#images').hidden=false;
 for(const name of ['front','three_quarter','profile']){
  $('#'+name).src='/outputs/'+id+'/'+name+'.png';
 }
 const g=job.report.geometry;
 $('#report').textContent=[
  'Generation: '+job.report.generator,
  'Applied controls: '+job.report.controls_applied,
  'Height: '+(g.height_m*100).toFixed(1)+' cm · pelvis target: '+(g.total_hip_width_target_m*100).toFixed(1)+' cm',
  'Skin mesh: '+g.skin_union_vertices.toLocaleString()+' vertices / '+g.skin_union_faces.toLocaleString()+' faces',
  'Hands / feet: '+g.hands+' / '+g.feet+' · five individually modeled digits each',
  'Hair: '+g.hair_style+' · '+g.hair_strand_groups+' authored strand groups',
  'Quality: anatomical clay prototype — human visual review pending'
 ].join('\n');
 const links=$('#artifactLinks');links.replaceChildren();
 for(const [label,name] of [['Editable Blender','anatomical_character.blend'],['JSON evidence','report.json']]){
  const a=document.createElement('a');a.href='/outputs/'+id+'/'+name;a.textContent=label;a.download=name;links.append(a);
 }
}
async function check(id){
 try{
  const res=await fetch('/api/jobs/'+encodeURIComponent(id));
  if(!res.ok)throw Error('Build status request failed');
  const job=await res.json();status(job.status.toUpperCase());
  $('#log').textContent=job.log||'';
  if(job.status==='complete'||job.status==='failed'){
   clearInterval(poll);poll=null;activeJob=null;build.disabled=false;
   if(job.status==='complete'){showResults(job);dirty=0;note();}
   else{$('#report').textContent='Blender failed: '+job.error+'. See the logs for the exact error.';status('BUILD FAILED')}
  }
 }catch(err){status('STATUS ERROR');$('#log').textContent=err.message;clearInterval(poll);poll=null;activeJob=null;build.disabled=false}
}
build.addEventListener('click',async()=>{
 if(activeJob)return;
 try{
  const payload=validateRequest({schema:SCHEMA,controls:values});
  build.disabled=true;status('SUBMITTING…');$('#log').textContent='';
  const response=await fetch('/api/rebuild',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Blender service rejected submission');
  activeJob=result.jobId;status('QUEUED');await check(activeJob);
  if(activeJob)poll=setInterval(()=>{void check(activeJob)},1600);
 }catch(err){activeJob=null;build.disabled=false;status('SUBMIT ERROR');$('#log').textContent=err.message}
});
