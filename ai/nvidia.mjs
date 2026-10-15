/** Server-only NVIDIA hosted inference client. */
export const DEFAULT_NVIDIA_MODEL = 'openai/gpt-oss-20b';
export function createNvidiaClient({apiKey=process.env.NVIDIA_API_KEY,fetchImpl=globalThis.fetch,timeoutMs=45000}={}) {
  if(typeof apiKey!=='string'||!apiKey) throw Error('NVIDIA_API_KEY not configured');
  if(typeof fetchImpl!=='function') throw Error('fetch unavailable');
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>120000) throw Error('Invalid timeout');
  return {
    async complete({role,model=DEFAULT_NVIDIA_MODEL,messages,maxTokens=512}) {
      if(!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(model)) throw Error('Invalid model');
      if(!Array.isArray(messages)||messages.length===0) throw Error('Missing messages');
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),timeoutMs);
      try {
        const res=await fetchImpl('https://integrate.api.nvidia.com/v1/chat/completions',{
          method:'POST',
          headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
          body:JSON.stringify({model,messages,max_tokens:maxTokens,temperature:0.3,stream:false,...(model.startsWith('openai/gpt-oss-')?{reasoning_effort:'low'}:{})}),
          signal:controller.signal
        });
        if(!res.ok) throw Error('NVIDIA request failed [HTTP_'+res.status+']');
        const result=await res.json();
        const value=result?.choices?.[0]?.message?.content;
        if(typeof value!=='string'||!value.trim()) throw Error('NVIDIA returned no textual content');
        return {role,model,content:value,usage:{
          prompt_tokens:Number(result.usage?.prompt_tokens)||0,
          completion_tokens:Number(result.usage?.completion_tokens)||0
        }};
      } catch(error) {
        if(error?.name==='AbortError') throw Error('NVIDIA request timeout');
        throw error;
      } finally {clearTimeout(timer);}
    }
  };
}
export function parseAgentJson(text) {
  if(typeof text!=='string'||text.length>12000) throw Error('Invalid agent output');
  let s=text.trim();
  if(s.startsWith('```json\n')&&s.endsWith('```')) s=s.slice(8,-3).trim();
  let value;
  try {value=JSON.parse(s);} catch {throw Error('Agent output is not valid JSON');}
  if(!value||typeof value!=='object'||Array.isArray(value)) throw Error('Agent output must be a JSON object');
  return value;
}
