const FOOD_LIBRARY = [
  { keys:['chicken breast','grilled chicken','chicken'], name:'Grilled chicken', serving:'4 oz', calories:190, protein:35, carbs:0, fat:4, fiber:0 },
  { keys:['salmon'], name:'Salmon', serving:'4 oz', calories:235, protein:25, carbs:0, fat:14, fiber:0 },
  { keys:['ground beef','beef'], name:'Lean beef', serving:'4 oz', calories:245, protein:27, carbs:0, fat:15, fiber:0 },
  { keys:['rice'], name:'Cooked rice', serving:'1 cup', calories:205, protein:4, carbs:45, fat:0, fiber:1 },
  { keys:['potato','potatoes'], name:'Potato', serving:'1 medium', calories:165, protein:4, carbs:37, fat:0, fiber:4 },
  { keys:['broccoli'], name:'Broccoli', serving:'1 cup', calories:55, protein:4, carbs:11, fat:1, fiber:5 },
  { keys:['salad'], name:'Mixed salad', serving:'2 cups', calories:80, protein:3, carbs:12, fat:3, fiber:4 },
  { keys:['egg','eggs'], name:'Eggs', serving:'2 large', calories:140, protein:12, carbs:1, fat:10, fiber:0 },
  { keys:['oatmeal','oats'], name:'Oatmeal', serving:'1 cup cooked', calories:160, protein:6, carbs:28, fat:3, fiber:4 },
  { keys:['greek yogurt','yogurt'], name:'Greek yogurt', serving:'1 cup', calories:150, protein:20, carbs:10, fat:3, fiber:0 },
  { keys:['protein shake','protein smoothie'], name:'Protein shake', serving:'1 shake', calories:230, protein:30, carbs:20, fat:5, fiber:3 },
  { keys:['pizza'], name:'Pizza', serving:'2 slices', calories:570, protein:24, carbs:68, fat:22, fiber:4 },
  { keys:['burger','hamburger'], name:'Burger', serving:'1 burger', calories:650, protein:32, carbs:48, fat:36, fiber:3 },
  { keys:['fries','french fries'], name:'French fries', serving:'medium', calories:380, protein:5, carbs:48, fat:19, fiber:4 },
  { keys:['apple'], name:'Apple', serving:'1 medium', calories:95, protein:1, carbs:25, fat:0, fiber:4 },
  { keys:['banana'], name:'Banana', serving:'1 medium', calories:105, protein:1, carbs:27, fat:0, fiber:3 },
  { keys:['peanut butter'], name:'Peanut butter', serving:'2 tbsp', calories:190, protein:8, carbs:7, fat:16, fiber:2 },
  { keys:['bread','toast'], name:'Bread', serving:'2 slices', calories:160, protein:6, carbs:28, fat:2, fiber:3 },
  { keys:['pasta'], name:'Pasta', serving:'2 cups prepared', calories:520, protein:18, carbs:95, fat:8, fiber:6 },
  { keys:['taco','tacos'], name:'Tacos', serving:'3 tacos', calories:620, protein:30, carbs:58, fat:30, fiber:7 }
];

function quantityMultiplier(text) {
  const lower = text.toLowerCase();
  const numeric = lower.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:servings?|cups?|pieces?|slices?|oz)?/);
  if (numeric) return Math.min(4, Math.max(.25, Number(numeric[1])));
  if (/half|½/.test(lower)) return .5;
  if (/double|large portion|extra/.test(lower)) return 1.5;
  if (/small|light portion/.test(lower)) return .75;
  return 1;
}

function estimateFromText(description) {
  const text = description.toLowerCase();
  const matches = FOOD_LIBRARY.filter(item => item.keys.some(key => text.includes(key)));
  if (!matches.length) {
    return {
      name: description.trim() || 'Meal estimate',
      calories: 480,
      protein: 28,
      carbs: 48,
      fat: 19,
      fiber: 6,
      confidence: 'low',
      assumptions: ['No recognizable food keywords were provided.', 'A middle-of-the-road mixed meal estimate was used.']
    };
  }
  const multiplier = quantityMultiplier(text);
  const totals = matches.reduce((sum, item) => {
    for (const key of ['calories','protein','carbs','fat','fiber']) sum[key] += item[key];
    return sum;
  }, { calories:0, protein:0, carbs:0, fat:0, fiber:0 });
  for (const key of Object.keys(totals)) totals[key] = Math.round(totals[key] * multiplier);
  const additions = [];
  if (/fried|breaded/.test(text)) { totals.calories += 180; totals.fat += 13; totals.carbs += 12; additions.push('fried or breaded preparation'); }
  if (/cheese/.test(text)) { totals.calories += 110; totals.protein += 7; totals.fat += 9; additions.push('cheese'); }
  if (/dressing|mayo|sauce|butter|oil/.test(text)) { totals.calories += 140; totals.fat += 14; additions.push('sauce, oil, butter, or dressing'); }
  return {
    name: matches.map(item => item.name).slice(0,3).join(' + '),
    ...totals,
    confidence: matches.length > 1 ? 'moderate' : 'low',
    assumptions: [
      `Estimated from: ${matches.map(item => `${item.name} (${item.serving})`).join(', ')}.`,
      additions.length ? `Included allowance for ${additions.join(', ')}.` : 'No hidden cooking fats or sauces were added unless mentioned.'
    ]
  };
}

async function callClaude({apiKey,model}, system, messages, maxTokens=900) {
  if (!apiKey) return null;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{
      'content-type':'application/json',
      'x-api-key':apiKey,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'
    },
    body:JSON.stringify({model:model||'claude-sonnet-4-20250514',max_tokens:maxTokens,system,messages})
  });
  let data={}; try{data=await response.json();}catch{}
  if(!response.ok) throw new Error(data?.error?.message||`Claude returned ${response.status}`);
  return data.content?.map(x=>x.text||'').join('\n').trim()||'';
}
function aiSettings(){return window.__INSYNC_AI__||null;}
function extractJson(text){const cleaned=String(text||'').replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();const a=cleaned.indexOf('{'),b=cleaned.lastIndexOf('}');if(a<0||b<a)throw new Error('Claude did not return usable JSON.');return JSON.parse(cleaned.slice(a,b+1));}
async function callEndpoint(action,payload){
  const ai=aiSettings(); if(!ai?.apiKey)return null;
  if(action==='coach'){
    const text=await callClaude(ai,'You are InSync, a practical health and fitness coach. Give concise, safe, non-diagnostic coaching. Never recommend medication changes. Use the supplied profile and daily data.','' && []);
  }
  return null;
}

export async function analyzeMeal({ description, imageData, profile, context }) {
  try {
    const ai=aiSettings();
    if(ai?.apiKey){
      const content=[];
      if(imageData)content.push({type:'image',source:{type:'base64',media_type:(imageData.match(/^data:(.*?);/)||[])[1]||'image/jpeg',data:imageData.split(',')[1]}});
      content.push({type:'text',text:`Estimate this meal. Description: ${description||'none'}. Return JSON only with name, calories, protein, carbs, fat, fiber, confidence, assumptions (array). Use reasonable portions and clearly mark uncertainty.`});
      const text=await callClaude(ai,'You analyze food photos for a personal wellness log. Estimates are educational, not medical. Return only valid JSON.',[{role:'user',content}],800);
      return {source:'ai',...extractJson(text)};
    }
  } catch (error) { console.warn('Claude meal analysis failed; using local estimate.', error); }
  return { source:'local-estimate', ...estimateFromText(description) };
}

function dashboardNudge(profile, today) {
  const target = profile.targets || {};
  const proteinGap = Math.max(0, (target.protein || 140) - (today.protein || 0));
  const calorieGap = Math.max(0, (target.caloriesHigh || 2200) - (today.calories || 0));
  if (today.pain && today.pain !== 'none') return `Because you reported ${today.pain}, keep today conservative. Avoid movements that reproduce sharp or worsening pain and consider professional evaluation if it persists.`;
  if (proteinGap > 45 && calorieGap < 450) return `Protein is the priority now. Choose a lean option worth roughly 30–45 grams without turning the evening into a calorie chase.`;
  if ((today.water || 0) < (target.water || 80) * .55) return `Hydration is lagging. Add 16–24 ounces over the next couple of hours rather than trying to catch up all at once.`;
  if ((today.steps || 0) < (target.steps || 8000) * .45) return `Movement is behind pace. A purposeful 15–20 minute walk would materially improve the day without becoming a punishment workout.`;
  return `The plan is still intact. Focus on the next controllable action rather than trying to perfect the entire day.`;
}

export async function askCoach({ message, profile, today, shared, recent }) {
  try {
    const ai=aiSettings();
    if(ai?.apiKey){
      const prompt=`User message: ${message}\nProfile: ${JSON.stringify(profile)}\nToday: ${JSON.stringify(today)}\nRecent: ${JSON.stringify(recent)}\nShared accountability: ${JSON.stringify(shared)}`;
      const text=await callClaude(ai,'You are InSync, a practical and encouraging health coach. Be concise, specific, non-diagnostic, and avoid medication advice. Explain uncertainty. Support sustainable habits, Planet Fitness training, and realistic nutrition.',[{role:'user',content:prompt}],700);
      return {source:'ai',text};
    }
  } catch (error) { console.warn('Claude coach failed; using local coach.', error); }
  const lower = message.toLowerCase();
  let text;
  if (/workout|gym|train/.test(lower)) {
    const next = profile.plan?.workouts?.find(w => !w.completed) || profile.plan?.workouts?.[0];
    text = next ? `Your next programmed session is **${next.name}**. Keep the first working set conservative, use controlled reps, and stop any movement that creates sharp or worsening pain.` : 'Complete the onboarding interview so I can build a Planet Fitness plan around your schedule and experience.';
  } else if (/meal|eat|food|protein|calorie/.test(lower)) {
    text = dashboardNudge(profile, today);
  } else if (/missed|failed|messed up|bad day/.test(lower)) {
    text = `One difficult decision is data, not a verdict. Log it honestly, identify what triggered it, and make the next decision ordinary and useful. Do not compensate with starvation or punishment exercise.`;
  } else if (/prayer|scripture|faith/.test(lower)) {
    text = `“Let us not be weary in well doing.” — Galatians 6:9. Stewardship grows through repeated faithful choices, not dramatic perfection. Ask God for strength for the next decision, then take it.`;
  } else {
    text = dashboardNudge(profile, today);
  }
  return { source:'local-coach', text };
}

async function listClaudeModels(apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/models?limit=100', {
    method:'GET',
    headers:{
      'x-api-key':apiKey,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'
    }
  });
  let data={}; try{data=await response.json();}catch{}
  if(!response.ok) throw new Error(data?.error?.message||`Claude model check returned ${response.status}`);
  return Array.isArray(data.data) ? data.data : [];
}

export async function testAIConnection(apiKey, preferredModel='') {
  if(!apiKey) throw new Error('Paste your Claude API key first.');
  const models=await listClaudeModels(apiKey);
  if(!models.length) throw new Error('The API key worked, but no Claude models were available for this account.');
  const ids=models.map(item=>item.id).filter(Boolean);
  const model = ids.includes(preferredModel)
    ? preferredModel
    : ids.find(id=>/sonnet/i.test(id)) || ids[0];
  const text=await callClaude({apiKey,model},'Reply with only the word connected.',[{role:'user',content:'Connection test'}],20);
  if(!/connected/i.test(text))throw new Error('Claude responded, but the connection test was unexpected.');
  return {ok:true,model,displayName:models.find(item=>item.id===model)?.display_name||model};
}

export async function analyzeProgressPhotos(views, ai, profile) {
  if (!ai?.connected||!ai.apiKey) throw new Error('Connect Claude in Settings first.');
  const content=[];
  for(const [view,imageData] of Object.entries(views||{}))if(imageData)content.push({type:'image',source:{type:'base64',media_type:(imageData.match(/^data:(.*?);/)||[])[1]||'image/jpeg',data:imageData.split(',')[1]}});
  content.push({type:'text',text:`These are labeled progress views: ${Object.keys(views||{}).join(', ')}. Baseline and trends: ${JSON.stringify({baseline:profile.baseline,targets:profile.targets,recentWeights:profile.logs.weights.slice(-12),measurements:profile.logs.measurements.slice(-6)})}. Give cautious observations about visible posture, general shape, consistency, and photo quality. Do not estimate exact body-fat percentage or diagnose anything.`});
  const text=await callClaude(ai,'You provide respectful, non-medical progress-photo observations. Avoid attractiveness judgments, diagnoses, and exact body-fat claims.',[{role:'user',content}],900);
  return {text};
}

export async function identifyMachine(imageData, ai) {
  if (!imageData) throw new Error('Take a clear machine photo or enter the name manually.');
  if (!ai?.connected||!ai.apiKey) return {name:'Unidentified gym machine',muscles:'Confirm the machine name manually',source:'local'};
  const media=(imageData.match(/^data:(.*?);/)||[])[1]||'image/jpeg';
  const text=await callClaude(ai,'Identify gym equipment from images. Return only valid JSON with name, muscles, instructions, safety, commonMistakes.',[{role:'user',content:[{type:'image',source:{type:'base64',media_type:media,data:imageData.split(',')[1]}},{type:'text',text:'Identify this Planet Fitness machine and provide concise safe use guidance. Return JSON only.'}]}],700);
  return {...extractJson(text),source:'ai'};
}

export async function lookupFoodBarcode(upc) {
  if (!upc) throw new Error('Enter a barcode.');
  const response=await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(upc)}.json`);
  if (!response.ok) throw new Error('Barcode lookup failed.');
  const data=await response.json(), p=data.product;
  if (!p) throw new Error('Product was not found.');
  const n=p.nutriments||{};
  return {
    name:p.product_name||p.generic_name||'Packaged food',
    serving:p.serving_size||'1 serving',
    calories:Number(n['energy-kcal_serving'] ?? n['energy-kcal_100g'] ?? 0),
    protein:Number(n.proteins_serving ?? n.proteins_100g ?? 0),
    carbs:Number(n.carbohydrates_serving ?? n.carbohydrates_100g ?? 0),
    fat:Number(n.fat_serving ?? n.fat_100g ?? 0),
    fiber:Number(n.fiber_serving ?? n.fiber_100g ?? 0)
  };
}
