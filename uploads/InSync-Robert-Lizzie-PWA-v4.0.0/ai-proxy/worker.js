/**
 * InSync AI Cloudflare Worker
 * Secrets required:
 *   ANTHROPIC_API_KEY
 *   INSYNC_CONNECTION_CODE
 * Optional variable:
 *   ALLOWED_ORIGIN=https://YOURNAME.github.io
 */
const MODEL='claude-sonnet-4-20250514';
const cors=(env,request)=>({
  'Access-Control-Allow-Origin':env.ALLOWED_ORIGIN||request.headers.get('Origin')||'*',
  'Access-Control-Allow-Headers':'Content-Type, X-InSync-Code',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json'
});
function json(data,status,env,request){return new Response(JSON.stringify(data),{status,headers:cors(env,request)});}
function imageBlock(dataUrl){const m=/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s.exec(dataUrl||'');return m?{type:'image',source:{type:'base64',media_type:m[1],data:m[2]}}:null;}
async function claude(env,system,blocks,max_tokens=900){
 const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:env.CLAUDE_MODEL||MODEL,max_tokens,system,messages:[{role:'user',content:blocks}]})});
 const data=await r.json(); if(!r.ok)throw new Error(data?.error?.message||`Claude returned ${r.status}`); return data.content?.map(x=>x.text||'').join('\n')||'';
}
function parseJson(text){const m=text.match(/\{[\s\S]*\}/);if(!m)throw new Error('Claude did not return JSON.');return JSON.parse(m[0]);}
export default {async fetch(request,env){
 if(request.method==='OPTIONS')return new Response(null,{headers:cors(env,request)});
 if(request.method!=='POST')return json({error:'POST required'},405,env,request);
 if(!env.ANTHROPIC_API_KEY)return json({error:'ANTHROPIC_API_KEY is not configured in Cloudflare.'},500,env,request);
 if(env.INSYNC_CONNECTION_CODE && request.headers.get('X-InSync-Code')!==env.INSYNC_CONNECTION_CODE)return json({error:'Invalid InSync connection code.'},401,env,request);
 try{
  const body=await request.json(),action=body.action;
  if(action==='health')return json({ok:true,model:env.CLAUDE_MODEL||MODEL},200,env,request);
  if(action==='meal_analysis'){
   const blocks=[imageBlock(body.imageData),{type:'text',text:`Analyze this meal for a health tracker. Description: ${body.description||'none'}. Return JSON only: {"meal":{"name":"","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"sodium":0,"saturatedFat":0,"confidence":"high|moderate|low","assumptions":[]},"text":"brief useful note"}. Use ranges internally but provide a reasonable midpoint. Do not pretend image estimates are exact.`}].filter(Boolean);
   return json(parseJson(await claude(env,'You are an evidence-informed nutrition image analyst. Never diagnose and never use false precision.',blocks)),200,env,request);
  }
  if(action==='machine_identification'){
   const blocks=[imageBlock(body.imageData),{type:'text',text:'Identify the Planet Fitness or gym machine from the image. Return JSON only: {"machine":{"name":"","muscles":"","instructions":"","safety":"","confidence":"high|moderate|low"}}. If uncertain, say so.'}].filter(Boolean);
   return json(parseJson(await claude(env,'You are a careful personal-training equipment specialist.',blocks)),200,env,request);
  }
  if(action==='progress_analysis'){
   const blocks=[]; for(const [view,img] of Object.entries(body.views||{})){const b=imageBlock(img);if(b){blocks.push({type:'text',text:`${view} view:`},b);}}
   blocks.push({type:'text',text:`Give cautious, respectful progress feedback using the photos plus this context: ${JSON.stringify(body.profile||{})}. Do not estimate exact body-fat percentage, diagnose, sexualize, shame, or infer health conditions. Discuss visible changes only when supported, photo consistency, posture, and how to compare with measurements. Return JSON only: {"text":"concise feedback"}.`});
   return json(parseJson(await claude(env,'You analyze adult fitness progress photos conservatively and respectfully.',blocks,700)),200,env,request);
  }
  if(action==='coach'){
   const text=await claude(env,'You are InSync, an evidence-informed nutrition and Planet Fitness coach. Be concise, practical, Christian-faith-aware when relevant, and never diagnose or prescribe medication.',[{type:'text',text:JSON.stringify(body)}],700);
   return json({text},200,env,request);
  }
  return json({error:'Unknown action'},400,env,request);
 }catch(e){return json({error:e.message||'Worker error'},500,env,request);}
}};
