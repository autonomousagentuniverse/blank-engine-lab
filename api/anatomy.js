// Server-side auth proxy. Never expose BLENDER_WORKER_TOKEN to the browser.
// The Blender output URLs use 128-bit unguessable job IDs and expire after 1h.
export const config={maxDuration:60};
const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 const worker=(process.env.BLENDER_WORKER_URL||'').replace(/\/+$/,'');
 const token=process.env.BLENDER_WORKER_TOKEN;
 if(!worker||!/^https:\/\/[a-z0-9.-]+(?::443)?$/i.test(worker)||!token||token.length<32)
  return res.status(503).json({error:'Blender worker is not configured. Rendering is unavailable; no synthetic success is reported.'});
 if(req.method!=='POST'&&req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 if(req.method==='POST'){
  const origin=req.headers.origin||'';
  const ownHost=req.headers['x-forwarded-host']||req.headers.host||'';
  if(origin&&new URL(origin).host!==ownHost)return res.status(403).json({error:'Cross-origin build request refused'});
  const bytes=Buffer.byteLength(JSON.stringify(req.body||{}),'utf8');
  if(bytes>4_400_000)return res.status(413).json({error:'Snapshot too large'});
 }
 if(req.method==='GET'&&(!ID.test(req.query.job||'')))return res.status(400).json({error:'Invalid job ID'});
 const route=req.method==='POST'?'/api/rebuild':'/api/jobs/'+req.query.job;
 try{
  const ctl=new AbortController();
  const timeout=setTimeout(()=>ctl.abort(),52_000);
  let up;
  try{
   up=await fetch(worker+route,{
    method:req.method,
    headers:{Authorization:'Bearer '+token,...(req.method==='POST'?{'Content-Type':'application/json'}:{})},
    ...(req.method==='POST'?{body:JSON.stringify(req.body)}:{}),
    signal:ctl.signal
   });
  }finally{clearTimeout(timeout)}
  const text=await up.text();
  if(text.length>200_000)return res.status(502).json({error:'Invalid oversized worker response'});
  let body;try{body=JSON.parse(text)}catch{return res.status(502).json({error:'Blender worker returned invalid JSON'})}
  if(up.ok&&req.method==='GET'&&body.status==='complete')body.outputBaseUrl=worker;
  return res.status(up.status).json(body);
 }catch(e){
  return res.status(502).json({error:'Blender worker unreachable or still waking; retry in a moment'});
 }
}
