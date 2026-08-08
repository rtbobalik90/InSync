import { loadState, saveState, clearState, downloadJson, readJsonFile } from './storage.js?v=400';
import { analyzeMeal, askCoach, testAIConnection, analyzeProgressPhotos, identifyMachine, lookupFoodBarcode } from './ai.js?v=400';
import { testGitHub, pushProfile, pullProfile, pushShared as pushGitHubShared, pullShared as pullGitHubShared } from './github-sync.js?v=400';

const app = document.querySelector('#app');
const toastRegion = document.querySelector('#toast-region');
let deferredInstallPrompt = null;
let saveTimer = null;
const AI_LOCAL_KEY = 'insync-ai-settings-v1';
const ONBOARDING_DRAFT_KEY = 'insync-onboarding-draft-v1';
function saveAILocally(ai) {
  localStorage.setItem(AI_LOCAL_KEY, JSON.stringify(ai || {}));
}
function loadAILocally() {
  try { return JSON.parse(localStorage.getItem(AI_LOCAL_KEY) || 'null'); } catch { return null; }
}
function saveOnboardingDraft() {
  try {
    if (!state?.ui?.onboarding) return localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(state.ui.onboarding));
  } catch (error) { console.warn('Could not save onboarding draft.', error); }
}
function loadOnboardingDraft() {
  try { return JSON.parse(localStorage.getItem(ONBOARDING_DRAFT_KEY) || 'null'); } catch { return null; }
}
function clearOnboardingDraft() {
  try { localStorage.removeItem(ONBOARDING_DRAFT_KEY); } catch {}
}
async function persistOnboardingNow() {
  saveOnboardingDraft();
  await saveState(state);
}

const COLORS={robert:['#2ea8ff','#4f7cff'],lizzie:['#a06cff','#d36df2']};
const THEMES=[['Electric Blue','#2ea8ff','#4f7cff'],['Emerald','#37d67a','#12a56a'],['Violet','#9d6cff','#d36df2'],['Magenta','#ff4fb8','#a06cff'],['Coral','#ff6b6b','#ff9f43'],['Solar Orange','#ff8a3d','#ffd166'],['Gold','#ffd166','#f59e0b'],['Aqua','#22d3ee','#2ea8ff'],['Teal','#2dd4bf','#0ea5a4'],['Lime','#a3e635','#37d67a'],['Crimson','#fb4668','#ff8a3d'],['Rose','#fb7185','#d946ef'],['Ocean Gradient','#2ea8ff','#22d3ee'],['Blue Violet','#2ea8ff','#a06cff'],['Sunset','#ff8a3d','#d946ef'],['Aurora','#22d3ee','#a3e635'],['Midnight Blue Black','#246bfe','#02050b'],['Deep Ocean','#0b3b75','#0fb9b1'],['Obsidian Blue','#111827','#2563eb'],['Electric Midnight','#22a7ff','#11102f'],['Sapphire Graphite','#2563eb','#24262d'],['Purple Cyan','#8b5cf6','#22d3ee'],['Emerald Aqua','#10b981','#22d3ee'],['Crimson Black','#ef3340','#09090b'],['Galaxy Night','#6d28d9','#090b1a'],['Titanium Blue','#475569','#2f6fed']];

const ONBOARDING_QUESTIONS = [
  { key:'age', title:'How old are you?', help:'This helps calculate a safe starting energy range.', type:'number', min:18, max:100, placeholder:'Age' },
  { key:'sex', title:'Which calculation baseline should we use?', help:'This is used only for the initial resting-energy estimate.', type:'choice', options:[['male','Male calculation'],['female','Female calculation']] },
  { key:'height', title:'What is your height?', help:'Enter feet and inches.', type:'height' },
  { key:'currentWeight', title:'What is your current weight?', help:'This is your starting point, not a judgment.', type:'number', min:70, max:700, step:.1, suffix:'lb' },
  { key:'goalWeight', title:'What weight are you working toward?', help:'The plan will prioritize body composition, health, and strength—not only the scale.', type:'number', min:70, max:700, step:.1, suffix:'lb' },
  { key:'activity', title:'How active is a normal day before exercise?', help:'Choose the closest fit for work and daily life.', type:'choice', options:[['sedentary','Mostly seated'],['light','Some walking'],['moderate','Active or on feet'],['high','Highly physical work']] },
  { key:'steps', title:'About how many steps do you average now?', help:'A rough estimate is enough. You can import better data later.', type:'number', min:0, max:50000, step:100, suffix:'steps' },
  { key:'workoutDays', title:'How many gym days are realistic most weeks?', help:'The coach will build around your actual life, not an ideal week.', type:'choice', options:[['3','3 days'],['4','4 days'],['5','5 days'],['flex','Flexible week to week']] },
  { key:'experience', title:'How experienced are you with strength training?', help:'This controls exercise complexity, volume, and starting guidance.', type:'choice', options:[['beginner','New or restarting'],['intermediate','Comfortable with machines'],['advanced','Experienced and consistent']] },
  { key:'limitations', title:'Any pain, injuries, conditions, or exercise restrictions?', help:'List anything that could affect training. Enter “none” when there are no known limitations.', type:'textarea', placeholder:'Example: sore right knee, lower-back history, none…' },
  { key:'foodPreferences', title:'What foods and eating style actually work for you?', help:'Include favorites, dislikes, allergies, restaurants, cooking limits, or budget constraints.', type:'textarea', placeholder:'Foods I enjoy, foods I avoid, schedule challenges…' },
  { key:'sleep', title:'How much sleep do you usually get?', help:'Recovery changes both hunger and training capacity.', type:'number', min:2, max:14, step:.5, suffix:'hours' },
  { key:'schedule', title:'What does a normal weekday look like?', help:'Include wake time, work hours, lunch, likely workout time, and bedtime.', type:'textarea', placeholder:'Wake 6:00 AM, lunch 11:30 AM, gym after work…' },
  { key:'equipment', title:'What does your Planet Fitness have?', help:'The standard machine floor is enough. Note any equipment you know is missing or any machines you prefer.', type:'textarea', placeholder:'Standard Planet Fitness machines, Smith machine, dumbbells…' },
  { key:'motivation', title:'Why does this matter right now?', help:'This becomes the anchor the coach can bring you back to when motivation drops.', type:'textarea', placeholder:'What I want to change and who it matters for…' }
];

function uid(prefix='id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate()-n); return todayKey(d); }
function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}
function formatNumber(n, digits=0) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits:digits }); }
function formatDate(key) { return new Date(`${key}T12:00:00`).toLocaleDateString('en-US', { month:'short', day:'numeric' }); }
function initials(name) { return name.split(/\s+/).map(s=>s[0]).join('').slice(0,2).toUpperCase(); }
function pct(value, target) { return clamp(Math.round((Number(value||0) / Math.max(1, Number(target||1))) * 100), 0, 100); }
function markdownLite(text='') {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
}

const BADGE_DEFS=[
  {id:'first_step',icon:'👟',name:'First Step',description:'Log your first workout.',test:p=>p.logs.workouts.length>=1},
  {id:'workout_5',icon:'🏋️',name:'5 Workouts',description:'Complete 5 workouts.',test:p=>p.logs.workouts.length>=5},
  {id:'workout_10',icon:'🏋️',name:'10 Workouts',description:'Complete 10 workouts.',test:p=>p.logs.workouts.length>=10},
  {id:'workout_25',icon:'🏋️',name:'25 Workouts',description:'Complete 25 workouts.',test:p=>p.logs.workouts.length>=25},
  {id:'workout_50',icon:'🏋️',name:'50 Workouts',description:'Complete 50 workouts.',test:p=>p.logs.workouts.length>=50},
  {id:'workout_100',icon:'🏋️',name:'100 Workouts',description:'Complete 100 workouts.',test:p=>p.logs.workouts.length>=100},
  {id:'miles_1',icon:'🚶',name:'1 Mile',description:'Walk 1 treadmill miles.',test:p=>(p.logs.treadmill||[]).reduce((a,x)=>a+Number(x.miles||0),0)>=1},
  {id:'miles_10',icon:'🚶',name:'10 Miles',description:'Walk 10 treadmill miles.',test:p=>(p.logs.treadmill||[]).reduce((a,x)=>a+Number(x.miles||0),0)>=10},
  {id:'miles_25',icon:'🚶',name:'25 Miles',description:'Walk 25 treadmill miles.',test:p=>(p.logs.treadmill||[]).reduce((a,x)=>a+Number(x.miles||0),0)>=25},
  {id:'miles_50',icon:'🚶',name:'50 Miles',description:'Walk 50 treadmill miles.',test:p=>(p.logs.treadmill||[]).reduce((a,x)=>a+Number(x.miles||0),0)>=50},
  {id:'miles_100',icon:'🚶',name:'100 Miles',description:'Walk 100 treadmill miles.',test:p=>(p.logs.treadmill||[]).reduce((a,x)=>a+Number(x.miles||0),0)>=100},
  {id:'miles_250',icon:'🚶',name:'250 Miles',description:'Walk 250 treadmill miles.',test:p=>(p.logs.treadmill||[]).reduce((a,x)=>a+Number(x.miles||0),0)>=250},
  {id:'miles_500',icon:'🚶',name:'500 Miles',description:'Walk 500 treadmill miles.',test:p=>(p.logs.treadmill||[]).reduce((a,x)=>a+Number(x.miles||0),0)>=500},
  {id:'meals_1',icon:'🥗',name:'1 Meals Logged',description:'Log 1 meals.',test:p=>p.logs.meals.length>=1},
  {id:'meals_10',icon:'🥗',name:'10 Meals Logged',description:'Log 10 meals.',test:p=>p.logs.meals.length>=10},
  {id:'meals_25',icon:'🥗',name:'25 Meals Logged',description:'Log 25 meals.',test:p=>p.logs.meals.length>=25},
  {id:'meals_50',icon:'🥗',name:'50 Meals Logged',description:'Log 50 meals.',test:p=>p.logs.meals.length>=50},
  {id:'meals_100',icon:'🥗',name:'100 Meals Logged',description:'Log 100 meals.',test:p=>p.logs.meals.length>=100},
  {id:'meals_250',icon:'🥗',name:'250 Meals Logged',description:'Log 250 meals.',test:p=>p.logs.meals.length>=250},
  {id:'water_1',icon:'💧',name:'Hydration 1',description:'Log water on 1 days.',test:p=>new Set(p.logs.water.map(x=>x.date)).size>=1},
  {id:'water_7',icon:'💧',name:'Hydration 7',description:'Log water on 7 days.',test:p=>new Set(p.logs.water.map(x=>x.date)).size>=7},
  {id:'water_30',icon:'💧',name:'Hydration 30',description:'Log water on 30 days.',test:p=>new Set(p.logs.water.map(x=>x.date)).size>=30},
  {id:'water_60',icon:'💧',name:'Hydration 60',description:'Log water on 60 days.',test:p=>new Set(p.logs.water.map(x=>x.date)).size>=60},
  {id:'water_100',icon:'💧',name:'Hydration 100',description:'Log water on 100 days.',test:p=>new Set(p.logs.water.map(x=>x.date)).size>=100},
  {id:'checkin_1',icon:'🧭',name:'1 Check-Ins',description:'Complete 1 check-ins.',test:p=>p.logs.checkins.length>=1},
  {id:'checkin_7',icon:'🧭',name:'7 Check-Ins',description:'Complete 7 check-ins.',test:p=>p.logs.checkins.length>=7},
  {id:'checkin_14',icon:'🧭',name:'14 Check-Ins',description:'Complete 14 check-ins.',test:p=>p.logs.checkins.length>=14},
  {id:'checkin_30',icon:'🧭',name:'30 Check-Ins',description:'Complete 30 check-ins.',test:p=>p.logs.checkins.length>=30},
  {id:'checkin_60',icon:'🧭',name:'60 Check-Ins',description:'Complete 60 check-ins.',test:p=>p.logs.checkins.length>=60},
  {id:'checkin_100',icon:'🧭',name:'100 Check-Ins',description:'Complete 100 check-ins.',test:p=>p.logs.checkins.length>=100},
  {id:'photos_1',icon:'📸',name:'1 Photo Entries',description:'Save 1 progress-photo entries.',test:p=>(p.logs.photos||[]).length>=1},
  {id:'photos_4',icon:'📸',name:'4 Photo Entries',description:'Save 4 progress-photo entries.',test:p=>(p.logs.photos||[]).length>=4},
  {id:'photos_12',icon:'📸',name:'12 Photo Entries',description:'Save 12 progress-photo entries.',test:p=>(p.logs.photos||[]).length>=12},
  {id:'photos_24',icon:'📸',name:'24 Photo Entries',description:'Save 24 progress-photo entries.',test:p=>(p.logs.photos||[]).length>=24},
  {id:'challenge_1',icon:'⚔️',name:'1 Challenges',description:'Finish 1 partner challenges.',test:(p,state)=>(state.shared.challenges||[]).filter(x=>x.status==='completed'&&(x.createdBy===p.id||x.acceptedBy===p.id)).length>=1},
  {id:'challenge_5',icon:'⚔️',name:'5 Challenges',description:'Finish 5 partner challenges.',test:(p,state)=>(state.shared.challenges||[]).filter(x=>x.status==='completed'&&(x.createdBy===p.id||x.acceptedBy===p.id)).length>=5},
  {id:'challenge_10',icon:'⚔️',name:'10 Challenges',description:'Finish 10 partner challenges.',test:(p,state)=>(state.shared.challenges||[]).filter(x=>x.status==='completed'&&(x.createdBy===p.id||x.acceptedBy===p.id)).length>=10},
  {id:'challenge_25',icon:'⚔️',name:'25 Challenges',description:'Finish 25 partner challenges.',test:(p,state)=>(state.shared.challenges||[]).filter(x=>x.status==='completed'&&(x.createdBy===p.id||x.acceptedBy===p.id)).length>=25},
  {id:'level_5',icon:'⭐',name:'Level 5',description:'Reach level 5.',test:p=>ensureGamification(p).level>=5},
  {id:'level_10',icon:'⭐',name:'Level 10',description:'Reach level 10.',test:p=>ensureGamification(p).level>=10},
  {id:'level_20',icon:'⭐',name:'Level 20',description:'Reach level 20.',test:p=>ensureGamification(p).level>=20},
  {id:'level_30',icon:'⭐',name:'Level 30',description:'Reach level 30.',test:p=>ensureGamification(p).level>=30},
  {id:'level_50',icon:'⭐',name:'Level 50',description:'Reach level 50.',test:p=>ensureGamification(p).level>=50},
  {id:'notes_1',icon:'❤️',name:'1 Encouragement Notes',description:'Send 1 accountability notes.',test:(p,state)=>(state.shared.messages||[]).filter(x=>x.from===p.name).length>=1},
  {id:'notes_5',icon:'❤️',name:'5 Encouragement Notes',description:'Send 5 accountability notes.',test:(p,state)=>(state.shared.messages||[]).filter(x=>x.from===p.name).length>=5},
  {id:'notes_10',icon:'❤️',name:'10 Encouragement Notes',description:'Send 10 accountability notes.',test:(p,state)=>(state.shared.messages||[]).filter(x=>x.from===p.name).length>=10},
  {id:'four_view',icon:'🖼️',name:'Full View',description:'Save all four progress-photo views.',test:p=>(p.logs.photos||[]).some(x=>x.views&&Object.keys(x.views).length>=4)},
  {id:'ten_thousand',icon:'👣',name:'Ten Thousand',description:'Log 10,000 steps in one day.',test:p=>p.logs.steps.some(x=>Number(x.value)>=10000)},
  {id:'protein_target',icon:'🥩',name:'Protein Target',description:'Hit your protein goal in a day.',test:p=>{const d={};p.logs.meals.forEach(x=>d[x.date]=(d[x.date]||0)+Number(x.protein||0));return Object.values(d).some(v=>v>=p.targets.protein)}},
  {id:'goal_weight',icon:'👑',name:'Goal Weight',description:'Reach your goal weight.',test:p=>Number(currentWeight(p)||9999)<=Number(p.baseline.goalWeight||0)}
];
function ensureGamification(p){
  p.gamification=p.gamification||{xp:0,level:1,badges:[],xpHistory:[]};
  p.gamification.badges=p.gamification.badges||[];p.gamification.xpHistory=p.gamification.xpHistory||[];
  p.gamification.level=Math.floor(Number(p.gamification.xp||0)/250)+1;
  return p.gamification;
}
function levelProgress(p){const g=ensureGamification(p),within=g.xp%250;return {level:g.level,current:within,target:250,pct:Math.round(within/250*100)};}
function awardXP(amount,reason){
  const p=activeProfile(); if(!p)return; const g=ensureGamification(p),old=g.level;
  g.xp+=amount;g.level=Math.floor(g.xp/250)+1;g.xpHistory.push({id:uid('xp'),amount,reason,at:new Date().toISOString()});
  if(g.level>old)setTimeout(()=>toast(`Level up! You reached Level ${g.level}.`,4200),80);
  unlockBadges();
}
function unlockBadges(){
  const p=activeProfile();if(!p)return;const g=ensureGamification(p);
  BADGE_DEFS.forEach(b=>{if(!g.badges.includes(b.id)&&b.test(p,state)){g.badges.push(b.id);setTimeout(()=>toast(`Badge unlocked: ${b.name}`,3800),120);}});
}
function elapsedWalkSeconds(){if(!state.ui.treadmillStart)return 0;const end=state.ui.treadmillPausedAt||Date.now();return Math.max(0,Math.floor((end-state.ui.treadmillStart-(state.ui.treadmillPausedMs||0))/1000))}
function fmtTimer(sec){const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),ss=sec%60;return [h,m,ss].map(x=>String(x).padStart(2,'0')).join(':')}
function addNotification(type,title,text,profileId=state.activeProfileId){state.notifications=state.notifications||[];state.notifications.push({id:uid('notice'),type,title,text,profileId,at:new Date().toISOString(),read:false})}
function unreadCount(){return (state.notifications||[]).filter(n=>!n.read&&(n.profileId===state.activeProfileId||!n.profileId)).length}
function challengeProgress(ch){
  const p=state.profiles[ch.acceptedBy];if(!p)return 0;
  if(ch.type==='workouts')return p.logs.workouts.filter(x=>new Date(x.createdAt||`${x.date}T12:00:00`)>=new Date(ch.createdAt)).length;
  if(ch.type==='treadmill')return (p.logs.treadmill||[]).filter(x=>new Date(`${x.date}T12:00:00`)>=new Date(ch.createdAt)).reduce((a,x)=>a+Number(x.miles||0),0);
  if(ch.type==='steps')return p.logs.steps.filter(x=>new Date(`${x.date}T12:00:00`)>=new Date(ch.createdAt)).reduce((a,x)=>a+Number(x.value||0),0);
  if(ch.type==='water')return p.logs.water.filter(x=>new Date(`${x.date}T12:00:00`)>=new Date(ch.createdAt)).reduce((a,x)=>a+Number(x.ounces||0),0);
  return 0;
}
function refreshChallenges(){
  (state.shared.challenges||[]).forEach(ch=>{if(ch.status!=='active')return;ch.progress=challengeProgress(ch);if(ch.progress>=ch.target){ch.status='completed';ch.completedAt=new Date().toISOString();const winner=state.profiles[ch.acceptedBy];if(winner){ensureGamification(winner).xp+=Number(ch.rewardXP||100);ensureGamification(winner).level=Math.floor(winner.gamification.xp/250)+1;}}else if(Date.now()>new Date(ch.deadline).getTime())ch.status='expired';});
}

function createProfile(id, name, accent, accent2) {
  return {
    id, name, accent, accent2,
    onboardingComplete:false, authenticated:false, auth:{username:'',passwordHash:'',salt:''}, profilePhoto:null, planMode:'suggested',
    baseline:{},
    targets:{ caloriesLow:1800, caloriesHigh:2100, protein:140, carbs:220, fat:70, fiber:28, water:80, steps:8500, sleep:7.5 },
    privacy:{ shareScore:true, shareWorkout:true, shareSteps:true, shareMilestones:true, shareWeightChange:true, shareNutritionScore:false },
    logs:{ meals:[], weights:[], workouts:[], water:[], steps:[], sleep:[], checkins:[], measurements:[], photos:[], supplements:[], treadmill:[] },
    plan:{ workouts:[], selfDriven:[], customGoals:[], createdAt:null, notes:'' },
    coachHistory:[{ id:uid('msg'), role:'ai', text:`Hi ${name}. Once your setup interview is complete, I’ll track your nutrition, workouts, recovery, and progress while keeping your private details under your control.`, at:new Date().toISOString() }],
    milestones:[],
    gamification:{xp:0,level:1,badges:[],xpHistory:[]}
  };
}

function defaultState() {
  return {
    version:3,
    activeProfileId:null,
    notifications:[],
    profiles:{
      robert:createProfile('robert','Robert',...COLORS.robert),
      lizzie:createProfile('lizzie','Lizzie',...COLORS.lizzie)
    },
    shared:{
      groupName:'InSync',
      streak:0,
      challenge:{ id:'steps', title:'Reach 120,000 combined steps this week', target:120000, progress:0, unit:'steps' },
      messages:[],
      milestones:[],
      sharedWorkouts:[],
      challenges:[],
      memberSummaries:{}
    },
    settings:{
      theme:'dark',
      reminders:{ morning:'06:00', midday:'11:30', evening:'21:00', enabled:true },
      units:'imperial',
      cloudSync:false,
      github:{owner:'',repo:'',branch:'main',token:'',connected:false,lastTestedAt:null},
      lastSyncedAt:null, ai:{apiKey:'',connected:false,lastTestedAt:null,model:''}, trainTab:'ai', photoView:'timeline'
    }
  };
}

function seedDemo(state) {
  for (const [index, profile] of Object.values(state.profiles).entries()) {
    profile.onboardingComplete = true;
    profile.baseline = {
      age: index ? 34 : 36, sex:index?'female':'male', heightIn:index?65:69,
      currentWeight:index?162:186, goalWeight:index?140:150, activity:'light', steps:index?6900:8100,
      workoutDays:'4', experience:'beginner', limitations:'none', sleep:index?7:6.5,
      motivation:'Build stronger health habits and feel better day to day.'
    };
    profile.targets = index
      ? { caloriesLow:1550, caloriesHigh:1750, protein:120, carbs:175, fat:58, fiber:25, water:72, steps:9000, sleep:7.5 }
      : { caloriesLow:1850, caloriesHigh:2150, protein:155, carbs:220, fat:70, fiber:30, water:96, steps:10000, sleep:7.5 };
    profile.plan.workouts = buildWorkoutPlan(4, profile.baseline.experience, profile.id);
    profile.plan.createdAt = new Date().toISOString();
    const weights = index ? [165.2,164.7,164.4,163.5,163.2,162.8,162.4] : [189.4,188.8,188.6,187.9,187.3,186.8,186.2];
    weights.forEach((w,i)=>profile.logs.weights.push({id:uid('w'),date:daysAgo(6-i),value:w,source:'user'}));
    profile.logs.steps.push({id:uid('s'),date:todayKey(),value:index?7235:8432});
    profile.logs.water.push({id:uid('wa'),date:todayKey(),ounces:index?48:64});
    profile.logs.sleep.push({id:uid('sl'),date:todayKey(),hours:index?7.2:6.8,quality:4});
    profile.logs.meals.push(
      {id:uid('m'),date:todayKey(),name:'Protein oatmeal',mealType:'Breakfast',calories:420,protein:31,carbs:52,fat:11,fiber:8,confidence:'verified'},
      {id:uid('m'),date:todayKey(),name:'Grilled chicken bowl',mealType:'Lunch',calories:582,protein:48,carbs:55,fat:16,fiber:9,confidence:'high'}
    );
  }
  state.shared.streak = 12;
  state.shared.challenge.progress = 85640;
  state.shared.messages = [{id:uid('note'),from:'Lizzie',text:'Nice job getting the workout done today.',at:new Date(Date.now()-7200000).toISOString()}];
  state.shared.milestones = [{id:uid('ms'),profileId:'robert',title:'Completed 10 workouts',date:daysAgo(2)}];
  state.activeProfileId='robert';
  return state;
}

let state = defaultState();
state.ui={currentPage:'home',drawerOpen:false,modal:null,onboarding:null,selectedMealPhoto:null,pendingMeal:null,selectedProgressPhotos:{},authUser:null,installAvailable:false,treadmillStart:null,treadmillPausedAt:null,treadmillPausedMs:0,expandedWorkoutId:null,pageHistory:[],notePhoto:null,notificationsOpen:false,photoPlaybackIndex:0,sessionPassword:'',loginProfileId:null};

function avatarMarkup(p,cls='avatar'){return p.profilePhoto?`<div class="${cls}" style="--profile-accent:${p.accent};background-image:url('${p.profilePhoto}');background-size:cover;background-position:center"></div>`:`<div class="${cls}" style="--profile-accent:${p.accent}">${initials(p.name)}</div>`;}
async function hashPassword(v,salt=''){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${salt}:${v}`));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function activeProfile() { return state.profiles[state.activeProfileId]; }
function partnerProfile() { return state.profiles[state.activeProfileId === 'robert' ? 'lizzie' : 'robert']; }
function logsForDate(profile, type, date=todayKey()) { return (profile.logs[type] || []).filter(item => item.date === date); }
function sum(list, key) { return list.reduce((total,item)=>total+Number(item[key]||0),0); }
function currentWeight(profile) { return profile.logs.weights.at(-1)?.value ?? profile.baseline.currentWeight ?? 0; }
function startWeight(profile) { return profile.logs.weights[0]?.value ?? profile.baseline.currentWeight ?? 0; }
function weightChange(profile) { return currentWeight(profile) - startWeight(profile); }
function latestSteps(profile) { return sum(logsForDate(profile,'steps'),'value'); }
function latestWater(profile) { return sum(logsForDate(profile,'water'),'ounces'); }
function latestSleep(profile) { return logsForDate(profile,'sleep').at(-1)?.hours || 0; }
function todaySummary(profile) {
  const meals = logsForDate(profile,'meals');
  const workouts = logsForDate(profile,'workouts');
  return {
    meals,
    workouts,
    calories:sum(meals,'calories'), protein:sum(meals,'protein'), carbs:sum(meals,'carbs'), fat:sum(meals,'fat'), fiber:sum(meals,'fiber'),
    water:latestWater(profile), steps:latestSteps(profile), sleep:latestSleep(profile),
    workoutMinutes:sum(workouts,'minutes'),
    pain:logsForDate(profile,'checkins').at(-1)?.pain || 'none'
  };
}
function dailyScore(profile) {
  const t = todaySummary(profile), g=profile.targets;
  const parts = [
    Math.min(1,t.protein/Math.max(1,g.protein)), Math.min(1,t.water/Math.max(1,g.water)),
    Math.min(1,t.steps/Math.max(1,g.steps)), Math.min(1,t.sleep/Math.max(1,g.sleep)),
    t.calories ? (t.calories <= g.caloriesHigh*1.1 ? 1 : .65) : .15
  ];
  return Math.round(parts.reduce((a,b)=>a+b,0)/parts.length*100);
}
function average(values) { return values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0; }
function sevenDayAverageWeight(profile) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-7);
  const values = profile.logs.weights.filter(w=>new Date(`${w.date}T12:00:00`)>=cutoff).map(w=>Number(w.value));
  return average(values);
}
function workoutCompletedToday(profile) { return logsForDate(profile,'workouts').some(w=>w.completed); }

function calculateTargets(answers) {
  const weightLb = Number(answers.currentWeight);
  const heightIn = Number(answers.heightFeet||0)*12 + Number(answers.heightInches||0);
  const age = Number(answers.age);
  const kg = weightLb * .453592;
  const cm = heightIn * 2.54;
  const bmr = 10*kg + 6.25*cm - 5*age + (answers.sex === 'female' ? -161 : 5);
  const factor = {sedentary:1.28,light:1.4,moderate:1.55,high:1.7}[answers.activity] || 1.4;
  const tdee = bmr * factor;
  const deficit = clamp(tdee * .2, 350, 650);
  const center = Math.max(1200, Math.round((tdee-deficit)/50)*50);
  const goalWeight = Number(answers.goalWeight || weightLb);
  const protein = Math.round(clamp(goalWeight*.85, answers.sex==='female'?90:110, 220)/5)*5;
  const fat = Math.round(Math.max(45, center*.28/9)/5)*5;
  const carbs = Math.max(90, Math.round((center-protein*4-fat*9)/4/5)*5);
  const water = Math.round(clamp(weightLb*.5,64,120)/8)*8;
  const steps = Math.round(clamp(Number(answers.steps||6000)+1200,7000,12000)/500)*500;
  return { caloriesLow:center-100, caloriesHigh:center+100, protein, carbs, fat, fiber:answers.sex==='female'?25:30, water, steps, sleep:Math.max(7,Number(answers.sleep||7)) };
}

const EX = {
  chest:['Chest Press Machine','3 × 8–12','Controlled shoulder blades; stop before shoulders roll forward.'],
  row:['Seated Row Machine','3 × 8–12','Drive elbows back while keeping the torso quiet.'],
  legpress:['Leg Press Machine','3 × 10–15','Use a pain-free depth and keep knees tracking with toes.'],
  curl:['Seated Leg Curl','3 × 10–15','Pause briefly in the contracted position.'],
  shoulder:['Shoulder Press Machine','2–3 × 8–12','Do not force range if the shoulder feels pinched.'],
  pulldown:['Lat Pulldown','3 × 8–12','Pull toward the upper chest without leaning far back.'],
  extension:['Leg Extension','2–3 × 10–15','Use controlled reps; reduce range if knees object.'],
  glute:['Glute Machine or Smith Hip Thrust','3 × 10–15','Finish with glutes rather than overextending the back.'],
  calf:['Calf Raise Machine','3 × 12–20','Pause at the bottom and top.'],
  pecdeck:['Pec Deck','2–3 × 10–15','Keep the chest tall and use a comfortable stretch.'],
  rear:['Reverse Pec Deck','2–3 × 12–15','Lead with elbows; avoid shrugging.'],
  biceps:['Cable or Machine Curl','2–3 × 10–15','Keep elbows still.'],
  triceps:['Cable Pressdown','2–3 × 10–15','Lock upper arms to the sides.'],
  core:['Cable Pallof Press','3 × 10/side','Resist rotation and breathe normally.'],
  incline:['Incline Treadmill Walk','10–20 min','Moderate pace; conversational effort.']
};
function ex(key) { const [name,prescription,cue]=EX[key]; return {id:uid('ex'),name,prescription,cue,completed:false}; }
function makeWorkout(name, focus, keys, minutes=50) { return {id:uid('plan'),name,focus,minutes,completed:false,exercises:keys.map(ex)}; }
function buildWorkoutPlan(days, experience='beginner', profileId='robert') {
  const n = days === 'flex' ? 3 : Number(days||3);
  const plans = n <= 3 ? [
    makeWorkout('Full Body A','Strength foundation',['legpress','chest','row','curl','core','incline']),
    makeWorkout('Full Body B','Balanced machine training',['glute','pulldown','shoulder','extension','rear','incline']),
    makeWorkout('Full Body C','Progressive full body',['legpress','pecdeck','row','curl','triceps','calf','core'])
  ] : n === 4 ? [
    makeWorkout('Upper A','Chest, back, shoulders',['chest','row','shoulder','pulldown','biceps','triceps']),
    makeWorkout('Lower A','Quads, hamstrings, glutes',['legpress','curl','extension','glute','calf','core']),
    makeWorkout('Upper B','Back and upper-body balance',['pulldown','pecdeck','row','rear','biceps','triceps']),
    makeWorkout('Lower B','Lower body and conditioning',['glute','legpress','curl','extension','calf','incline'])
  ] : [
    makeWorkout('Push','Chest, shoulders, triceps',['chest','shoulder','pecdeck','triceps','core']),
    makeWorkout('Pull','Back, rear delts, biceps',['pulldown','row','rear','biceps','incline']),
    makeWorkout('Legs','Quads, hamstrings, glutes',['legpress','curl','extension','glute','calf']),
    makeWorkout('Upper','Balanced upper-body volume',['chest','row','pulldown','shoulder','biceps','triceps']),
    makeWorkout('Full Body','Technique and conditioning',['legpress','chest','row','glute','core','incline'])
  ];
  if (experience === 'beginner') plans.forEach(w=>w.minutes=Math.min(w.minutes,50));
  return plans;
}

function profilePublicSummary(profile) {
  const today = todaySummary(profile);
  return {
    name:profile.name, score:dailyScore(profile), workout:profile.privacy.shareWorkout ? workoutCompletedToday(profile) : null,
    steps:profile.privacy.shareSteps ? today.steps : null,
    weightChange:profile.privacy.shareWeightChange ? weightChange(profile) : null,
    milestones:profile.privacy.shareMilestones ? profile.milestones.length : null,
    nutritionScore:profile.privacy.shareNutritionScore ? pct(today.protein,profile.targets.protein) : null
  };
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async()=>{
    await saveState(state);
    if (state.settings.cloudSync && state.settings.github?.connected && state.activeProfileId && state.ui.sessionPassword) {
      try {
        await Promise.all([pushProfile(activeProfile(), state.ui.sessionPassword, state.settings.github), pushGitHubShared(state.shared, state.settings.github)]);
        state.settings.lastSyncedAt = new Date().toISOString();
        await saveState(state);
      } catch (error) { console.warn('GitHub sync failed',error); }
    }
  },150);
}
function commit(message) { scheduleSave(); render(); if (message) toast(message); }
function toast(message, duration=2600) {
  const node=document.createElement('div'); node.className='toast'; node.textContent=message; toastRegion.append(node);
  setTimeout(()=>node.remove(),duration);
}

function render() {
  window.__INSYNC_AI__=state.settings.ai||null;
  setTheme();
  app.classList.remove('app-loading');
  if (!state.activeProfileId) {
    app.innerHTML = renderLogin();
  } else {
    const profile = activeProfile();
    if (!profile.onboardingComplete) {
      if (!state.ui.onboarding || state.ui.onboarding.profileId !== profile.id) {
        state.ui.onboarding = { profileId:profile.id, stage:'ai', index:0, answers:{...profile.baseline}, profileDraft:{username:profile.auth?.username||'',password:'',planMode:profile.planMode||'suggested'} }; saveOnboardingDraft();
      }
      app.innerHTML = renderOnboarding();
    } else {
      app.innerHTML = renderShell();
    }
  }
  bindInputs();
}
function setTheme() {
  const p = activeProfile();
  document.documentElement.style.setProperty('--accent',p?.accent||'#2ea8ff');
  document.documentElement.style.setProperty('--accent-2',p?.accent2||'#a06cff');
}

function renderLogin() {
  const profiles = Object.values(state.profiles);
  return `<main class="login-shell login-clean" style="--login-art:url('./assets/art/welcome.jpg')">
    <section class="login-card login-card-reference">
      <div class="login-logo-lockup"><img class="onboarding-logo" src="./assets/insync-logo.png"><h1>InSync</h1><p>Personal progress. Shared accountability.</p></div>
      <div class="login-profile-pair" aria-label="Private profiles">${profiles.map((p,index)=>`<button class="login-avatar-choice ${index?'second':''}" data-action="select-profile" data-id="${p.id}" style="--profile-accent:${p.accent}">${avatarMarkup(p,'avatar avatar-xl')}<span>${escapeHtml(p.name)}</span></button>`).join('')}<span class="pair-link" aria-hidden="true">↔</span></div>
      <div class="login-copy centered"><h2>Choose your private profile</h2><p>Each person signs in with a separate password. Only progress intentionally shared appears in Together.</p></div>
      <p class="local-note">Private health records remain separated and encrypted.</p>
    </section>
  </main>`;
}

const NAV = [
  ['home','home','Home'],['journey','journey','Journey'],['train','train','Train'],['nutrition','nutrition','Nutrition'],['together','together','Together']
];
const DRAWER_SECTIONS = [
  ['Main',[['home','⌂','Home'],['journey','⌁','Journey'],['train','△','Train'],['nutrition','◉','Nutrition'],['together','◎','Together']]],
  ['More',[['coach','✦','AI Coach'],['achievements','✧','Achievements'],['reflection','☼','Daily Reflection'],['progress','⌁','Progress & Trends'],['measurements','▥','Measurements'],['photos','▣','Progress Photos'],['meal-history','☷','Meal History'],['workout-history','◷','Workout History'],['plans','◎','Goals & Plans'],['milestones','♜','Milestones'],['privacy','♢','Privacy & Sharing']]],
  ['System',[['data','⇩','Data Import / Export'],['profile','♙','Profile & Appearance'],['settings','⚙','Settings']]]
];
function renderBottomNav() {
  return `<nav class="bottom-nav" aria-label="Primary navigation">${NAV.map(([id,icon,label])=>`<button class="${state.ui.currentPage===id?'active':''}" data-action="nav" data-page="${id}" aria-current="${state.ui.currentPage===id?'page':'false'}"><span class="custom-nav-icon"><img src="./assets/nav/${icon}.png" alt=""></span><small>${label}</small></button>`).join('')}</nav>`;
}
function renderShell(){const main=NAV.some(n=>n[0]===state.ui.currentPage),u=unreadCount();return `<div class="app-shell"><div class="drawer-backdrop ${state.ui.drawerOpen?'open':''}" data-action="menu-close"></div>${renderDrawer()}<header class="topbar">${main?`<button class="icon-btn menu-btn" data-action="menu-open">☰</button>`:`<button class="back-btn" data-action="nav-back">← Back</button>`}<h1>${pageTitle(state.ui.currentPage)}</h1><button class="icon-btn notification-btn" data-action="notifications">🔔${u?`<span class="notification-count">${u}</span>`:''}</button></header><main class="content">${renderPage()}</main>${renderBottomNav()}${renderModal()}${state.ui.notificationsOpen?renderNotifications():''}<input id="global-file-input" type="file" accept="image/*" hidden></div>`}
function renderDrawer() {
  const p=activeProfile();
  return `<aside class="drawer ${state.ui.drawerOpen?'open':''}">
    <div class="drawer-head"><div class="drawer-brand"><img src="./assets/insync-logo.png" style="width:34px;height:34px;object-fit:contain">InSync</div><button class="modal-close" data-action="menu-close">×</button></div>
    ${DRAWER_SECTIONS.map(([label,items])=>`<div class="drawer-section"><div class="drawer-label">${label}</div>${items.map(([id,icon,name])=>`<button class="drawer-item ${state.ui.currentPage===id?'active':''}" data-action="drawer-nav" data-page="${id}"><span class="i">${icon}</span>${name}</button>`).join('')}</div>`).join('')}
    <div class="drawer-profile"><div class="avatar" style="--profile-accent:${p.accent};width:42px;height:42px;font-size:14px">${initials(p.name)}</div><div><strong>${escapeHtml(p.name)}</strong><div class="muted" style="font-size:11px">Private profile</div></div><button class="icon-btn" data-action="switch-profile">⇄</button></div>
  </aside>`;
}
function pageTitle(page) { return ({home:'Home',journey:'Journey',today:'Today',train:'Train',nutrition:'Nutrition',together:'Together',coach:'AI Coach',progress:'Progress & Trends',measurements:'Measurements',photos:'Progress Photos','meal-history':'Meal History','workout-history':'Workout History',plans:'Goals & Plans',milestones:'Milestones',privacy:'Privacy & Sharing',data:'Data',profile:'Profile',settings:'Settings',achievements:'Achievements',reflection:'Reflection'})[page]||'InSync'; }
function renderPage() {
  const map={home:renderHome,journey:renderJourney,today:renderToday,train:renderTrain,nutrition:renderNutrition,together:renderTogether,coach:renderCoach,progress:renderProgress,measurements:renderMeasurements,photos:renderPhotos,'meal-history':renderMealHistory,'workout-history':renderWorkoutHistory,plans:renderPlans,milestones:renderMilestones,privacy:renderPrivacy,data:renderData,profile:renderProfile,settings:renderSettings,achievements:renderAchievements,reflection:renderReflection};
  return (map[state.ui.currentPage]||renderHome)();
}

const CHRISTIAN_VERSES=[
  {text:'Let us run with patience the race that is set before us.',ref:'Hebrews 12:1 · KJV'},
  {text:'And let us not be weary in well doing: for in due season we shall reap, if we faint not.',ref:'Galatians 6:9 · KJV'},
  {text:'Commit thy works unto the Lord, and thy thoughts shall be established.',ref:'Proverbs 16:3 · KJV'},
  {text:'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.',ref:'2 Timothy 1:7 · KJV'},
  {text:'Whatsoever ye do, do it heartily, as to the Lord, and not unto men.',ref:'Colossians 3:23 · KJV'}
];
function dailyVerse(){return CHRISTIAN_VERSES[Math.floor(Date.now()/86400000)%CHRISTIAN_VERSES.length];}
function greeting() { const h=new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening'; }
function profileArtGender(p){return String(p?.name||'').toLowerCase().includes('lizzie')||p?.id==='lizzie'?'female':'male';}
function timeOfDayArt(){const h=new Date().getHours();if(h<6)return {key:'night',label:'Night',file:'camp-night-stars.jpg'};if(h<9)return {key:'dawn',label:'Morning',file:'camp-dawn.jpg'};if(h<16)return {key:'day',label:'Day',file:'camp-day.jpg'};if(h<20)return {key:'sunset',label:'Evening',file:'camp-sunset.jpg'};return {key:'night',label:'Night',file:'camp-night.jpg'};}
function homeHeroArt(p){return `./assets/art/home-${profileArtGender(p)}.jpg`;}
function reflectionArt(p){return `./assets/art/reflection-${profileArtGender(p)}.jpg`; }
function workoutArt(p){return `./assets/art/workout-${profileArtGender(p)}.jpg`; }
function renderHome() {
  const p=activeProfile(),t=todaySummary(p),g=ensureGamification(p),lp=levelProgress(p),v=dailyVerse(),camp=timeOfDayArt();
  const quests=[
    ['./assets/nav/journey.png','Walk '+formatNumber(p.targets.steps)+' steps',t.steps,p.targets.steps,'steps'],
    ['./assets/nav/nutrition.png','Eat '+formatNumber(p.targets.protein)+'g protein',t.protein,p.targets.protein,'protein'],
    ['./assets/icons/water.svg','Drink '+formatNumber(p.targets.water)+' oz water',t.water,p.targets.water,'water'],
    ['./assets/nav/train.png','Complete strength workout',workoutCompletedToday(p)?1:0,1,'workout'],
    ['./assets/icons/weight.svg','Log your weight',p.logs.weights.some(x=>x.date===todayKey())?1:0,1,'weight']
  ];
  const completed=quests.filter(q=>q[2]>=q[3]).length;
  const xpToday=g.xpHistory.filter(x=>String(x.at||'').startsWith(todayKey())).reduce((a,x)=>a+Number(x.amount||0),0);
  return `<section class="page journey-home">
    <article class="journey-hero" style="--hero:url('${homeHeroArt(p)}')">
      <div class="hero-vignette"></div><div class="journey-hero-top"><div><span class="brand-word">InSync</span><p>${greeting()},</p><h2>${escapeHtml(p.name)}.</h2></div>${avatarMarkup(p,'avatar avatar-lg')}</div>
      <blockquote>“${escapeHtml(v.text)}”<cite>${escapeHtml(v.ref)}</cite></blockquote>
      <div class="level-panel"><div class="level-seal"><span>LEVEL</span><strong>${lp.level}</strong></div><div class="level-copy"><b>${formatNumber(xpToday)} XP today · ${formatNumber(g.xp)} lifetime</b><small>${lp.current} / ${lp.target} XP to Level ${lp.level+1}</small><div class="xp-track" style="--xp:${lp.pct}%"><span></span></div><em>Next reward at Level ${lp.level+1}</em></div></div>
    </article>
    <article class="time-camp-card" style="--camp:url('./assets/art/${camp.file}')"><div class="camp-shade"></div><div class="camp-copy"><span class="eyebrow">Your camp · ${camp.label}</span><h3>Prepare for the next faithful step.</h3><p>The camp changes through the day and grows with your consistency.</p></div><button class="camp-action" data-action="nav" data-page="today">Open today →</button></article>
    <article class="paper-card quest-sheet"><div class="card-header"><div><div class="eyebrow">Today’s focus</div><h3>${completed}/${quests.length} complete</h3></div><button class="journal-link" data-action="nav" data-page="journey"><img src="./assets/nav/journey.png" alt=""> View journey</button></div>
      <div class="quest-list">${quests.map(([icon,label,value,target,type])=>`<button class="quest-row ${value>=target?'done':''}" data-action="${type==='water'?'water-add':type==='workout'?'nav':type==='weight'?'quick-log':'nav'}" ${type==='water'?'data-oz="12"':type==='workout'?'data-page="train"':type==='weight'?'data-type="weight"':'data-page="today"'}><span class="quest-icon"><img src="${icon}" alt=""></span><span>${label}<i style="--q:${pct(value,target)}%"><b></b></i></span><small>${type==='workout'||type==='weight'?(value>=target?'Done':'Pending'):`${formatNumber(value)} / ${formatNumber(target)}`}</small></button>`).join('')}</div>
    </article>
    <div class="journey-stats"><article><span>🔥</span><b>${state.shared.streak||0}</b><small>day streak</small></article><article><span>✦</span><b>${xpToday}</b><small>XP today</small></article><article><span>◫</span><b>${formatNumber(t.steps)}</b><small>steps</small></article><article><span>◉</span><b>${formatNumber(t.calories)}</b><small>calories</small></article></div>
    <article class="paper-card next-milestone"><div><div class="eyebrow">Next milestone</div><h3>Reach Level ${lp.level+1}</h3><p>${lp.target-lp.current} XP to go. Keep choosing the next faithful step.</p></div><div class="milestone-ring" style="--p:${lp.pct}%"><span>${lp.pct}%</span></div></article>
    ${renderReminderCard()}
  </section>`;
}

function renderJourney(){
  const p=activeProfile(),lp=levelProgress(p),g=ensureGamification(p);
  const chapters=[['Starting Ground',1],['Building Rhythm',5],['Finding Strength',10],['Steady Climb',15],['Momentum',20],['Strong Foundation',25],['The Long Road',30],['Summit',40]];
  const current=chapters.slice().reverse().find(x=>lp.level>=x[1])||chapters[0];
  return `<section class="page journey-page"><div class="journey-map-art journey-reversed" style="--journey:url('./assets/art/journey-map.jpg')"><div class="journey-map-shade"></div><div class="journey-heading"><span class="eyebrow">Your progression</span><h2>Journey Map</h2><p>Begin at the camp below and climb toward the summit.</p></div><div class="journey-route">${chapters.map(([name,level],i)=>`<div class="journey-stop ${lp.level>=level?'reached':'locked'} ${current[1]===level?'current':''}" style="--offset:${i%2?18:60}%;--order:${i}"><span>${lp.level>=level?'✓':'○'}</span><div><strong>${name}</strong><small>Level ${level}${current[1]===level?' · You are here':''}</small></div></div>`).join('')}</div></div><article class="paper-card next-milestone"><div><div class="eyebrow">Current chapter</div><h3>${current[0]}</h3><p>${formatNumber(g.xp)} lifetime XP · ${lp.target-lp.current} XP until Level ${lp.level+1}</p></div><button class="primary-btn" data-action="drawer-nav" data-page="achievements">View awards</button></article></section>`;
}

function renderAchievements(){const p=activeProfile(),g=ensureGamification(p),lp=levelProgress(p);return `<section class="page achievements-page"><div class="page-title-row editorial-title"><div><span class="eyebrow">Forged through consistency</span><h2>Achievements</h2><p>${g.badges.length} of ${BADGE_DEFS.length} earned</p></div></div><article class="paper-card award-progress"><div class="award-level"><strong>${lp.level}</strong><span>Current level</span></div><div><small>${formatNumber(g.xp)} lifetime XP</small><div class="xp-track" style="--xp:${lp.pct}%"><span></span></div><small>${lp.target-lp.current} XP to Level ${lp.level+1}</small></div></article><div class="badge-vault">${BADGE_DEFS.map((b,i)=>`<article class="journey-badge ${g.badges.includes(b.id)?'earned':'locked'} rarity-${i%5}"><div class="badge-medallion"><span>${b.icon}</span></div><strong>${b.name}</strong><small>${g.badges.includes(b.id)?b.description:'Locked achievement'}</small><em>${['Common','Uncommon','Rare','Epic','Legendary'][i%5]}</em></article>`).join('')}</div></section>`}

function renderReflection(){const p=activeProfile(),v=dailyVerse();return `<section class="page reflection-page" style="--reflection:url('${reflectionArt(p)}')"><div class="reflection-overlay"><span class="eyebrow">End the day with purpose</span><h2>Reflection</h2><blockquote>“${escapeHtml(v.text)}”<cite>${escapeHtml(v.ref)}</cite></blockquote><article class="reflection-form paper-card"><label>Three things I’m grateful for<textarea id="reflection-gratitude" placeholder="1.\n2.\n3."></textarea></label><label>What went well today?<textarea id="reflection-well"></textarea></label><label>Where did I struggle?<textarea id="reflection-struggle"></textarea></label><label>How did I honor God today?<textarea id="reflection-faith"></textarea></label><label>Short prayer<textarea id="reflection-prayer"></textarea></label><button class="primary-btn" data-action="open-checkin">Save reflection through today’s check-in</button></article></div></section>`}

function renderReminderCard() {
  if (!state.settings.reminders.enabled) return '';
  const now=new Date(), mins=now.getHours()*60+now.getMinutes();
  const points=[['Morning check-in',360],['Midday recalibration',690],['Evening review',1260]];
  const next=points.find(([,m])=>m>=mins)||points[0];
  return `<article class="card compact"><div class="card-header" style="margin:0"><div><div class="eyebrow">Check-in rhythm</div><h4>${next[0]}</h4></div><button class="secondary-btn" data-action="open-checkin">Check in</button></div></article>`;
}

function renderToday() {
  const p=activeProfile(),t=todaySummary(p),g=p.targets;
  const calTarget=Math.round((g.caloriesLow+g.caloriesHigh)/2);
  return `<section class="page">
    <div class="page-title-row"><div><h2>Today</h2><p>${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p></div><button class="secondary-btn" data-action="open-checkin">Check in</button></div>
    <article class="card rings-card"><div class="activity-rings"><div class="ring r1" style="--c:#ff5d73;--p:${pct(t.calories,calTarget)}%"></div><div class="ring r2" style="--c:#7dde69;--p:${pct(t.protein,g.protein)}%"></div><div class="ring r3" style="--c:#2ea8ff;--p:${pct(t.steps,g.steps)}%"></div><div class="center-label"><strong>${dailyScore(p)}</strong><small>Daily score</small></div></div><div class="legend"><div class="legend-row"><span class="legend-dot" style="--dot:#ff5d73"></span><span>Calories</span><span>${formatNumber(t.calories)} / ${formatNumber(calTarget)}</span></div><div class="legend-row"><span class="legend-dot" style="--dot:#7dde69"></span><span>Protein</span><span>${formatNumber(t.protein)} / ${formatNumber(g.protein)} g</span></div><div class="legend-row"><span class="legend-dot" style="--dot:#2ea8ff"></span><span>Steps</span><span>${formatNumber(t.steps)} / ${formatNumber(g.steps)}</span></div></div></article>
    <div class="stat-grid">${statCard('Fiber',`${t.fiber} g`,`${g.fiber} g`,pct(t.fiber,g.fiber),'#ffb14a')}${statCard('Water',`${t.water} oz`,`${g.water} oz`,pct(t.water,g.water),'#2ea8ff')}${statCard('Sleep',`${t.sleep||'—'} h`,`${g.sleep} h`,pct(t.sleep,g.sleep),'#a06cff')}${statCard('Workout',t.workoutMinutes?`${t.workoutMinutes} min`:'Not logged','Complete planned session',t.workoutMinutes?100:0,'#7dde69')}</div>
    <article class="card"><div class="card-header"><h3>Macros</h3><button class="ghost-btn" data-action="quick-log" data-type="meal">Log food</button></div><div class="macro-bar"><span style="width:${Math.max(10,pct(t.protein,g.protein))}%;background:#7dde69;color:#081019">${t.protein}g</span><span style="width:${Math.max(10,pct(t.carbs,g.carbs))}%;background:#2ea8ff">${t.carbs}g</span><span style="width:${Math.max(10,pct(t.fat,g.fat))}%;background:#ff8a3d;color:#081019">${t.fat}g</span></div><div class="macro-labels"><span>Protein</span><span>Carbs</span><span>Fat</span></div></article>
    <article class="card"><div class="card-header"><h3>Meals</h3><span class="muted">${formatNumber(t.calories)} cal logged</span></div>${t.meals.length?`<div class="meal-list">${t.meals.map(renderMealRow).join('')}</div>`:emptyState('🍽','No meals logged','Take a photo or enter a quick description to start today’s nutrition record.')}</article>
    <article class="card"><div class="card-header"><h3>Water</h3><span class="muted">${t.water} / ${g.water} oz</span></div><div class="quick-grid">${[8,12,16,24].map(oz=>`<button class="quick-action" style="--qa-color:#2ea8ff;min-height:60px" data-action="water-add" data-oz="${oz}"><span>💧</span><span>+${oz} oz</span></button>`).join('')}</div></article>
  </section>`;
}
function statCard(label,big,goal,p,bar) { return `<div class="stat-card"><div class="label">${label}</div><div class="big">${big}</div><div class="goal">${goal}</div><div class="progress-track" style="--bar:${bar};--pct:${p}%"><span></span></div></div>`; }
function renderMealRow(m) { return `<div class="list-row"><div class="thumb">${m.imageData?`<img src="${m.imageData}" alt="">`:'🍽'}</div><div><h4>${escapeHtml(m.mealType||'Meal')} · ${escapeHtml(m.name)}</h4><p>${m.protein||0}g protein · ${m.carbs||0}g carbs · ${m.fat||0}g fat</p></div><div class="value"><strong>${m.calories||0}</strong><br>cal</div></div>`; }

function renderTrain(){const p=activeProfile(),plan=p.plan.workouts||[],tab=state.settings.trainTab||'ai',miles=(p.logs.treadmill||[]).filter(x=>new Date(x.date)>=new Date(Date.now()-7*86400000)).reduce((a,b)=>a+Number(b.miles||0),0);return `<section class="page"><div class="page-title-row"><div><h2>Train</h2><p>AI programming and self-driven sessions</p></div><button class="secondary-btn" data-action="rebuild-plan">Adjust plan</button></div><div class="train-art-banner" style="--workout-art:url('${workoutArt(p)}')"><div><span class="eyebrow">Focused training</span><strong>Build strength with intention.</strong></div></div><div class="segmented"><button class="${tab==='ai'?'active':''}" data-action="train-tab" data-tab="ai">AI Plan</button><button class="${tab==='self'?'active':''}" data-action="train-tab" data-tab="self">Self-Driven Plan</button></div>${tab==='ai'?`<article class="card"><div class="card-header"><h3>This week</h3><span>${plan.filter(w=>w.completed).length}/${plan.length}</span></div>${plan.map((w,i)=>`<div class="workout-inline"><button class="workout-summary" data-action="expand-workout" data-id="${w.id}"><span class="thumb">${w.completed?'✓':i+1}</span><span><strong>${escapeHtml(w.name)}</strong><small>${escapeHtml(w.focus)} · ${w.minutes} min</small></span><span>${state.ui.expandedWorkoutId===w.id?'Close':'Start'}</span></button>${state.ui.expandedWorkoutId===w.id?renderInlineWorkout(w):''}</div>`).join('')}</article>`:`<article class="card"><div class="card-header"><div><div class="eyebrow">Always available</div><h3>Treadmill Walk</h3></div><span class="confidence">${miles.toFixed(1)} mi this week</span></div>${state.ui.treadmillStart?`<div class="timer-display live-timer" data-live-timer>${fmtTimer(elapsedWalkSeconds())}</div><div class="field-row"><button class="secondary-btn" data-action="${state.ui.treadmillPausedAt?'resume-walk':'pause-walk'}">${state.ui.treadmillPausedAt?'Resume':'Pause'}</button><button class="primary-btn" data-action="end-walk">End Walk</button></div>`:`<button class="primary-btn" data-action="start-walk">Start Walk</button>`}</article><div class="quick-grid"><button class="quick-action" data-action="scan-machine"><span>▦</span><span>Scan Machine</span></button><button class="quick-action" data-action="custom-workout"><span>＋</span><span>Custom Workout</span></button></div>`}</section>`}
function renderInlineWorkout(w){return `<div class="inline-workout-form"><div class="exercise-entry warmup"><h4>🚶 Walking Warm-Up</h4><p>5–10 minutes at a comfortable-to-moderate pace.</p><div class="field-row"><input class="inline-walk-min" type="number" value="5"><input class="inline-walk-miles" type="number" step=".01" placeholder="Miles"></div></div>${w.exercises.map((e,i)=>`<div class="exercise-entry"><h4>${i+1}. ${escapeHtml(e.name)}</h4><p>${escapeHtml(e.prescription)} · ${escapeHtml(e.cue)}</p><div class="set-grid"><input type="number" placeholder="Weight"><input placeholder="Reps, e.g. 12/12/10"><input type="number" placeholder="Level"><label><input type="checkbox"> Done</label></div></div>`).join('')}<button class="primary-btn" data-action="complete-inline-workout" data-id="${w.id}">Complete workout</button></div>`}


function renderNutrition() {
  const p=activeProfile(),t=todaySummary(p),g=p.targets;
  return `<section class="page nutrition-page">
    <div class="page-title-row"><div><span class="eyebrow">Fuel the journey</span><h2>Nutrition</h2><p>Photograph, analyze, review, then save each meal.</p></div><div class="action-pair"><button class="secondary-btn" data-action="food-barcode">Scan barcode</button><button class="primary-btn" data-action="quick-log" data-type="meal">Add meal</button></div></div>
    <div class="segmented"><button class="active">Overview</button><button data-action="drawer-nav" data-page="meal-history">Meals</button><button data-action="drawer-nav" data-page="coach">Insights</button></div>
    <button class="nutrition-scan-hero" data-action="meal-photo-pick" style="--meal-art:url('./assets/art/meal-example.jpg')"><span class="scan-frame"></span><div class="nutrition-scan-copy"><div class="eyebrow">AI meal analysis</div><h3>Take a photo of your meal</h3><p>Claude fills every nutrition field. Review the estimate and save only when it looks right.</p></div></button>
    <article class="card nutrition-targets"><div class="card-header"><div><span class="eyebrow">Today</span><h3>Nutrition targets</h3></div><strong>${formatNumber(t.calories)} cal logged</strong></div><div class="stat-grid">${statCard('Calories',formatNumber(t.calories),`${g.caloriesLow}–${g.caloriesHigh}`,pct(t.calories,g.caloriesHigh),'#b7673c')}${statCard('Protein',`${t.protein} g`,`${g.protein} g`,pct(t.protein,g.protein),'#6d8b64')}${statCard('Fiber',`${t.fiber} g`,`${g.fiber} g`,pct(t.fiber,g.fiber),'#c3984f')}${statCard('Water',`${t.water} oz`,`${g.water} oz`,pct(t.water,g.water),'#5c819b')}</div></article>
    <article class="card"><div class="card-header"><h3>Recent meals</h3><button class="ghost-btn" data-action="drawer-nav" data-page="meal-history">View all</button></div>${p.logs.meals.length?`<div class="meal-list">${p.logs.meals.slice(-5).reverse().map(renderMealRow).join('')}</div>`:emptyState('🍎','No meals yet','Photograph your first meal to begin today’s nutrition record.')}</article>
  </section>`;
}

function renderTogether() {
  refreshChallenges();
  const p=activeProfile(),q=partnerProfile(),challenge=state.shared.challenge;
  const lp=levelProgress(p),lq=levelProgress(q),activeChallenges=(state.shared.challenges||[]).slice().reverse();
  const earned=ensureGamification(p).badges.map(id=>BADGE_DEFS.find(b=>b.id===id)).filter(Boolean).slice(-6).reverse();
  const notes=(state.shared.messages||[]).slice().reverse();
  return `<section class="page together-page">
    <div class="page-title-row"><div><span class="eyebrow">Shared accountability</span><h2>Together</h2><p>Supportive, private by default, and never competitive unless you choose it.</p></div><button class="secondary-btn" data-action="create-challenge">Challenge ${escapeHtml(q.name)}</button></div>
    <div class="level-grid"><article class="card level-card">${avatarMarkup(p,'avatar mini')}<div><div class="eyebrow">${escapeHtml(p.name)}</div><h3>Level ${lp.level}</h3><div class="xp-track" style="--xp:${lp.pct}%"><span></span></div><small>${ensureGamification(p).xp} lifetime XP</small></div></article><article class="card level-card">${avatarMarkup(q,'avatar mini')}<div><div class="eyebrow">${escapeHtml(q.name)}</div><h3>Level ${lq.level}</h3><div class="xp-track" style="--xp:${lq.pct}%"><span></span></div><small>${ensureGamification(q).xp} lifetime XP</small></div></article></div>
    <article class="card challenge-card"><div class="eyebrow">Current shared challenge</div><h3>${escapeHtml(challenge.title)}</h3><div class="progress-track" style="--bar:linear-gradient(90deg,#8b6a3e,#6d8b64);--pct:${pct(challenge.progress,challenge.target)}%"><span></span></div><div class="challenge-meta"><span>${formatNumber(challenge.progress)} ${challenge.unit}</span><strong>${pct(challenge.progress,challenge.target)}%</strong></div></article>
    <article class="card accountability-card"><div class="card-header"><div><span class="eyebrow">Accountability</span><h3>Notes & encouragement</h3></div><button class="ghost-btn" data-action="send-note">Add note + photo</button></div>${notes.length?notes.slice(0,5).map(m=>`<div class="feed-entry">${avatarMarkup(Object.values(state.profiles).find(x=>x.name===m.from)||{name:m.from},'avatar mini')}<div><div class="feed-head"><strong>${escapeHtml(m.from)}</strong><time>${m.at?new Date(m.at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):''}</time></div><p>${escapeHtml(m.text)}</p>${m.photo?`<img class="feed-photo" src="${m.photo}" alt="Attached note photo">`:''}<div class="feed-actions"><button>High five</button><button>Encourage</button></div></div></div>`).join(''):emptyState('✉','No notes yet','Send encouragement, a progress update, or a photo from today’s journey.')}</article>
    <article class="card recent-badges"><div class="card-header"><div><span class="eyebrow">Newest earned</span><h3>Recent badges</h3></div><span class="confidence">${ensureGamification(p).badges.length}/${BADGE_DEFS.length}</span></div><div class="recent-badge-grid">${earned.length?earned.map((b,i)=>`<button class="mini-badge rarity-${i%5}" data-action="drawer-nav" data-page="achievements"><span>${b.icon}</span><strong>${b.name}</strong></button>`).join(''):emptyState('✦','No badges yet','Your first completed action will begin the collection.')}</div><button class="secondary-btn full-width" data-action="drawer-nav" data-page="achievements">See all badges</button></article>
    <article class="card"><div class="card-header"><div><span class="eyebrow">Timed head-to-head</span><h3>Partner challenges</h3></div><button class="ghost-btn" data-action="create-challenge">＋ New</button></div>${activeChallenges.length?activeChallenges.slice(0,5).map(ch=>{const target=state.profiles[ch.acceptedBy],creator=state.profiles[ch.createdBy],prog=Number(ch.progress||0);return `<div class="challenge-row"><div class="challenge-icon">${ch.status==='completed'?'🏆':ch.status==='expired'?'⌛':'⚡'}</div><div><h4>${escapeHtml(ch.title)}</h4><p>${escapeHtml(creator?.name||'Partner')} challenged ${escapeHtml(target?.name||'partner')}</p><div class="mini-progress" style="--p:${pct(prog,ch.target)}%"><span></span></div><small>${formatNumber(prog,1)} / ${formatNumber(ch.target,1)} ${escapeHtml(ch.unit)} · ${ch.rewardXP} XP</small></div><span class="challenge-status ${ch.status}">${ch.status}</span></div>`}).join(''):emptyState('⚔','No partner challenges yet','Create a walking, workout, step, water, protein, or custom challenge.')}</article>
  </section>`;
}
function renderCoach() {
  const p=activeProfile(),t=todaySummary(p),w=sevenDayAverageWeight(p),connected=Boolean(state.settings.ai?.connected);
  const insights=[
    ['Nutrition',t.protein<p.targets.protein?`You have ${Math.max(0,p.targets.protein-t.protein)}g protein remaining today.`:'Protein is on target today.','nutrition'],
    ['Movement',t.steps<p.targets.steps?`${formatNumber(p.targets.steps-t.steps)} steps remain toward today’s target.`:'Your step target is complete.','movement'],
    ['Recovery',`Your current sleep target is ${p.targets.sleep||8} hours. Protect tonight’s recovery.`, 'recovery']
  ];
  return `<section class="page coach-page"><article class="coach-hero" style="--coach-art:url('./assets/art/ai-lantern.jpg')"><div class="coach-shade"></div><div><span class="eyebrow">Thoughtful guidance</span><h2>Today’s Guidance</h2><p>${connected?'Claude is connected and ready to review your real patterns.':'Local coaching mode is active until Claude is connected.'}</p></div></article>
    <article class="paper-card coach-brief"><div class="card-header"><div><span class="eyebrow">Daily briefing</span><h3>What matters next</h3></div><span class="confidence">${w?`${w.toFixed(1)} lb 7-day avg`:'Building baseline'}</span></div><div class="recommendation-grid">${insights.map(([title,text,type])=>`<article class="recommendation ${type}"><span></span><div><h4>${title}</h4><p>${text}</p><small>Based on today’s logged data</small></div></article>`).join('')}</div></article>
    <article class="card coach-chat-card"><div class="card-header"><div><span class="eyebrow">Ask your guide</span><h3>Conversation</h3></div></div><div class="chat" id="coach-chat">${p.coachHistory.slice(-20).map(m=>`<div class="chat-message ${m.role==='user'?'user':'ai'}">${markdownLite(m.text)}</div>`).join('')}</div><form class="chat-compose" data-form="coach"><input name="message" autocomplete="off" placeholder="Ask about food, training, recovery, or your plan" required><button aria-label="Send">↑</button></form></article>
    <article class="card compact safety-card"><div class="eyebrow">Safety boundary</div><p>The coach provides general education and conservative fitness guidance. It does not diagnose illness or replace medical care.</p></article></section>`;
}

function renderProgress() {
  const p=activeProfile(),weights=p.logs.weights.slice(-30),avg=sevenDayAverageWeight(p),change=weightChange(p),t=todaySummary(p);
  const direction=change<-.2?'moving downward':change>.2?'moving upward':'holding steady';
  return `<section class="page progress-page"><article class="progress-hero" style="--progress-art:url('./assets/art/chapter-ridge.jpg')"><div class="progress-shade"></div><div><span class="eyebrow">Progress & trends</span><h2>Your climb so far</h2><p>Your weight trend is ${direction}. Focus on the multiweek pattern, not one day.</p></div></article>
    <div class="period-tabs"><button class="active">7D</button><button>30D</button><button>90D</button><button>6M</button><button>1Y</button><button>All</button></div>
    <article class="card trend-card"><div class="card-header"><div><span class="eyebrow">Weight journey</span><h3>${currentWeight(p)?`${currentWeight(p).toFixed(1)} lb`:'No weight logged'}</h3></div><button class="secondary-btn" data-action="quick-log" data-type="weight">Log weight</button></div>${renderLineChart(weights.map(w=>Number(w.value)))}<div class="trend-summary"><div><span>7-day average</span><strong>${avg?avg.toFixed(1):'—'} lb</strong></div><div><span>Change</span><strong class="${change<=0?'good':'warn'}">${change>0?'+':''}${change.toFixed(1)} lb</strong></div><div><span>Goal</span><strong>${p.baseline.goalWeight||'—'} lb</strong></div></div></article>
    <article class="paper-card ai-trend-summary"><span class="eyebrow">AI interpretation</span><h3>What changed, what it means, what to do next</h3><p>${weights.length<2?'Keep logging consistently so InSync can identify a reliable trend.':`Your recent scale pattern is ${direction}. Keep calories, protein, sleep, and training consistent before making a major adjustment.`}</p></article>
    <div class="progress-metric-grid"><article class="card"><span>Steps today</span><strong>${formatNumber(t.steps)}</strong><small>${pct(t.steps,p.targets.steps)}% of target</small></article><article class="card"><span>Protein today</span><strong>${t.protein}g</strong><small>${pct(t.protein,p.targets.protein)}% of target</small></article><article class="card"><span>Workouts</span><strong>${p.logs.workouts.length}</strong><small>lifetime logged</small></article><article class="card"><span>Photos</span><strong>${(p.logs.photos||[]).length}</strong><small>progress entries</small></article></div>
  </section>`;
}
function renderLineChart(values) {
  if (values.length<2) return emptyState('⌁','Not enough trend data','Log at least two measurements to build a chart.');
  const w=600,h=170,pad=18,min=Math.min(...values),max=Math.max(...values),range=Math.max(1,max-min);
  const points=values.map((v,i)=>`${pad+i*(w-pad*2)/(values.length-1)},${pad+(max-v)*(h-pad*2)/range}`).join(' ');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Weight trend chart"><defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".25"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><g class="chart-grid"><line x1="0" y1="25" x2="600" y2="25"/><line x1="0" y1="85" x2="600" y2="85"/><line x1="0" y1="145" x2="600" y2="145"/></g><polyline class="chart-line" points="${points}"/>${values.map((v,i)=>{const [x,y]=points.split(' ')[i].split(',');return `<circle class="chart-dot" cx="${x}" cy="${y}" r="5"/>`}).join('')}</svg>`;
}

function renderMeasurements() {
  const p=activeProfile();
  return `<section class="page"><div class="page-title-row"><div><h2>Measurements</h2><p>Use consistent conditions for useful comparisons</p></div><button class="secondary-btn" data-action="add-measurement">Add measurement</button></div><article class="card">${p.logs.measurements.length?`<div class="history-list">${p.logs.measurements.slice().reverse().map(m=>`<div class="list-row"><div class="thumb">📏</div><div><h4>${formatDate(m.date)}</h4><p>Waist ${m.waist||'—'} · Chest ${m.chest||'—'} · Hips ${m.hips||'—'} in</p></div></div>`).join('')}</div>`:emptyState('📏','No measurements logged','Start with waist and add other measurements only when useful.')}</article></section>`;
}
function renderPhotos(){const p=activeProfile(),e=(p.logs.photos||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)),mode=state.settings.photoView||'timeline',sel=e[state.ui.photoPlaybackIndex]||e.at(-1);return `<section class="page"><div class="page-title-row"><div><h2>Progress Photos</h2><p>Front, left, right and back</p></div><button class="secondary-btn" data-action="add-progress-photo">New entry</button></div><div class="segmented"><button class="${mode==='timeline'?'active':''}" data-action="photo-mode" data-mode="timeline">Timeline</button><button class="${mode==='play'?'active':''}" data-action="photo-mode" data-mode="play">Playback</button><button class="${mode==='compare'?'active':''}" data-action="photo-mode" data-mode="compare">Dragger</button></div>${!e.length?`<article class="card">${emptyState('📷','No entries','Upload one or all four standard views.')}</article>`:mode==='timeline'?e.slice().reverse().map(x=>`<article class="card"><div class="card-header"><h3>${formatDate(x.date)}</h3><span class="confidence">${x.analysis?'AI analyzed':'Private'}</span></div><div class="four-photo-grid">${['Front','Left Side','Right Side','Back'].map(v=>x.views?.[v]?`<figure><img src="${x.views[v]}"><figcaption>${v}</figcaption></figure>`:`<figure class="missing-photo">${v}</figure>`).join('')}</div>${x.analysis?`<p class="muted analysis-note">${escapeHtml(x.analysis)}</p>`:''}</article>`).join(''):mode==='play'?`<article class="card"><div class="card-header"><h3>${formatDate(sel.date)}</h3><span>${state.ui.photoPlaybackIndex+1}/${e.length}</span></div><div class="play-photo"><img src="${sel.views?.Front||Object.values(sel.views||{})[0]}"></div><input class="range-wide photo-scrub" type="range" min="0" max="${e.length-1}" value="${state.ui.photoPlaybackIndex}"><div class="field-row"><button class="secondary-btn" data-action="photo-prev">Previous</button><button class="primary-btn" data-action="photo-play">Play</button><button class="secondary-btn" data-action="photo-next">Next</button></div></article>`:`<article class="card"><div class="field-row"><div class="field"><label>Earlier</label><select id="compare-a">${e.map((x,i)=>`<option value="${i}">${formatDate(x.date)}</option>`).join('')}</select></div><div class="field"><label>Later</label><select id="compare-b">${e.map((x,i)=>`<option value="${i}" ${i===e.length-1?'selected':''}>${formatDate(x.date)}</option>`).join('')}</select></div></div><div class="field"><label>View</label><select id="compare-view"><option>Front</option><option>Left Side</option><option>Right Side</option><option>Back</option></select></div><button class="primary-btn" data-action="build-comparison">Build comparison</button><div id="photo-comparison"></div></article>`}</section>`;}
function renderMealHistory() { const p=activeProfile(); return `<section class="page"><div class="page-title-row"><div><h2>Meal History</h2><p>${p.logs.meals.length} entries</p></div><button class="secondary-btn" data-action="quick-log" data-type="meal">Add meal</button></div><article class="card">${p.logs.meals.length?`<div class="meal-list">${p.logs.meals.slice().reverse().map(renderMealRow).join('')}</div>`:emptyState('🍽','No meal history','Food entries will appear here.')}</article></section>`; }
function renderWorkoutHistory() { const p=activeProfile(); return `<section class="page"><div class="page-title-row"><div><h2>Workout History</h2><p>${p.logs.workouts.length} completed entries</p></div></div><article class="card">${p.logs.workouts.length?`<div class="workout-list">${p.logs.workouts.slice().reverse().map(w=>`<div class="list-row"><div class="thumb">🏋</div><div><h4>${escapeHtml(w.name)}</h4><p>${w.minutes} min · ${w.exercisesCompleted||0} exercises · ${formatDate(w.date)}</p></div><div class="value">✓</div></div>`).join('')}</div>`:emptyState('🏋','No workouts logged','Start a workout from the Train tab.')}</article></section>`; }
function renderPlans(){const p=activeProfile(),t=p.targets;return `<section class="page"><div class="page-title-row"><div><h2>Goals & Plans</h2><p>These targets control the rest of InSync.</p></div><button class="secondary-btn" data-action="ai-plan-update">AI Plan</button></div><article class="card"><div class="targets-form">${[['caloriesLow','Calories low'],['caloriesHigh','Calories high'],['protein','Protein (g)'],['carbs','Carbs (g)'],['fat','Fat (g)'],['fiber','Fiber (g)'],['water','Water (oz)'],['steps','Steps'],['sleep','Sleep hours']].map(([k,l])=>`<label><span>${l}</span><input id="target-${k}" type="number" value="${t[k]??''}"></label>`).join('')}<label><span>Workouts / week</span><input id="target-workouts" type="number" value="${p.baseline.workoutDays==='flex'?3:(p.baseline.workoutDays||3)}"></label><label><span>Goal weight</span><input id="target-goalWeight" type="number" step=".1" value="${p.baseline.goalWeight||''}"></label><label><span>Goal deadline</span><input id="target-deadline" type="date" value="${p.baseline.goalDeadline||''}"></label></div><div class="field-row"><button class="secondary-btn" data-action="reset-ai-targets">Reset to AI</button><button class="primary-btn" data-action="save-targets">Save targets</button></div></article></section>`}
function renderMilestones() { const p=activeProfile(); const all=[...p.milestones.map(m=>({...m,shared:false})),...state.shared.milestones.filter(m=>m.profileId===p.id).map(m=>({...m,shared:true}))]; return `<section class="page"><div class="page-title-row"><div><h2>Milestones</h2><p>Scale and non-scale progress</p></div></div><article class="card">${all.length?all.map(m=>`<div class="list-row"><div class="thumb">🏆</div><div><h4>${escapeHtml(m.title)}</h4><p>${m.shared?'Shared':'Private'} · ${formatDate(m.date)}</p></div></div>`).join(''):emptyState('🏆','No milestones yet','Workout consistency, strength progress, weight trends, and habit wins can all become milestones.')}</article></section>`; }

function renderPrivacy() {
  const p=activeProfile(); const items=[['shareScore','Daily progress score','A high-level score without private details'],['shareWorkout','Workout completion','Shows whether a workout was completed'],['shareSteps','Step totals','Shares today’s total with Lizzie'],['shareMilestones','Milestones','Allows selected milestones in Together'],['shareWeightChange','Weight change','Shares change only, never current weight'],['shareNutritionScore','Nutrition score','Shares target completion, not food details']];
  return `<section class="page"><div class="page-title-row"><div><h2>Privacy & Sharing</h2><p>Adult private data cannot be overridden</p></div></div><article class="card"><div class="eyebrow">Shared with Lizzie</div>${items.map(([key,title,desc])=>`<div class="toggle-row"><div><h4>${title}</h4><p>${desc}</p></div><button class="switch ${p.privacy[key]?'on':''}" data-action="toggle-share" data-key="${key}" aria-label="Toggle ${title}"></button></div>`).join('')}</article><article class="card compact"><div class="eyebrow">Always private</div><p class="muted" style="margin:8px 0 0;line-height:1.55">Meal details, progress photos, medical notes, pain reports, supplements, medications, and precise measurements stay private unless you intentionally export them.</p></article></section>`;
}
function renderData() { const g=state.settings.github||{};return `<section class="page"><div class="page-title-row"><div><h2>Data</h2><p>Local-first backup and private GitHub cloud sync</p></div></div><article class="card"><div class="history-list"><button class="list-row" style="color:inherit;text-align:left" data-action="export-data"><div class="thumb">⇩</div><div><h4>Export safe backup</h4><p>Downloads app data without your Claude key or GitHub token.</p></div><div>›</div></button><button class="list-row" style="color:inherit;text-align:left" data-action="import-data"><div class="thumb">⇧</div><div><h4>Import backup</h4><p>Replaces current local data after confirmation.</p></div><div>›</div></button><button class="list-row" style="color:inherit;text-align:left" data-action="cloud-sync"><div class="thumb">☁</div><div><h4>${g.connected?'Sync GitHub cloud now':'Configure GitHub cloud'}</h4><p>${g.connected?`Last synced ${state.settings.lastSyncedAt?new Date(state.settings.lastSyncedAt).toLocaleString():'never'}`:'Connect a private repository in Settings.'}</p></div><div>›</div></button><button class="list-row" style="color:inherit;text-align:left" data-action="cloud-pull"><div class="thumb">↻</div><div><h4>Restore this profile from cloud</h4><p>Pulls and unlocks only the currently signed-in profile.</p></div><div>›</div></button></div></article></section>`; }
function renderProfile(){const p=activeProfile();return `<section class="page"><div class="page-title-row"><div><h2>${escapeHtml(p.name)}</h2><p>Private profile and appearance</p></div>${avatarMarkup(p)}</div><article class="card"><button class="upload-zone compact-upload" data-action="profile-photo-pick"><div class="upload-icon">📷</div><h3>${p.profilePhoto?'Replace profile photo':'Upload profile photo'}</h3></button><div class="field"><label>Display name</label><input id="profile-name" value="${escapeHtml(p.name)}"></div><div class="theme-grid">${THEMES.map(([n,a,b])=>`<button data-action="set-theme" data-a="${a}" data-b="${b}" class="theme-swatch ${p.accent===a&&p.accent2===b?'selected':''}" style="--a:${a};--b:${b}"><span></span><small>${n}</small></button>`).join('')}</div><button class="primary-btn" data-action="save-profile">Save profile</button></article><article class="card"><div class="card-header"><h3>Security</h3><button class="ghost-btn" data-action="change-password">Change password</button></div><p class="muted">Username: ${escapeHtml(p.auth?.username||'Not configured')}</p><button class="secondary-btn" data-action="logout-profile">Log out</button></article></section>`;}
function renderSettings(){const s=state.settings,a=s.ai||{},g=s.github||{};return `<section class="page"><div class="page-title-row"><div><h2>Settings</h2><p>AI and GitHub cloud connections</p></div></div>
<article class="card"><div class="card-header"><div><div class="eyebrow">Stored only on this device</div><h3>Claude AI</h3></div><span class="confidence">${a.connected?'Connected':'Not connected'}</span></div><div class="field"><label>Claude API key</label><input id="ai-api-key" type="password" value="${escapeHtml(a.apiKey||'')}" placeholder="sk-ant-..."></div><div class="field"><label>Connected model</label><input id="ai-model" value="${escapeHtml(a.model||'Automatic')}" readonly></div><button class="primary-btn" data-action="test-ai">Test & Save Claude</button><p class="muted">Personal-build mode: the key is saved in this phone/browser. Do not use this approach for a public app.</p></article>
<article class="card"><div class="card-header"><div><div class="eyebrow">Auto-save cloud</div><h3>Private GitHub Repository</h3></div><span class="confidence">${g.connected?'Connected':'Not connected'}</span></div><div class="field-row"><div class="field"><label>Owner</label><input id="gh-owner" value="${escapeHtml(g.owner||'')}"></div><div class="field"><label>Repository</label><input id="gh-repo" value="${escapeHtml(g.repo||'')}"></div></div><div class="field"><label>Branch</label><input id="gh-branch" value="${escapeHtml(g.branch||'main')}"></div><div class="field"><label>Fine-grained token</label><input id="gh-token" type="password" value="${escapeHtml(g.token||'')}" placeholder="github_pat_..."></div><button class="primary-btn" data-action="test-github">Test & Enable Auto Sync</button><p class="muted">Use one private repository and a token limited to that repository with Contents read/write. Each private profile is encrypted with its own login password before upload.</p></article>
<article class="card"><div class="toggle-row"><div><h4>Check-in reminders</h4><p>Morning, midday and evening</p></div><button class="switch ${s.reminders.enabled?'on':''}" data-action="toggle-reminders"></button></div><div class="field-row"><input id="time-morning" type="time" value="${s.reminders.morning}"><input id="time-midday" type="time" value="${s.reminders.midday}"></div><input id="time-evening" type="time" value="${s.reminders.evening}"><button class="secondary-btn" data-action="save-reminders">Save times</button></article><article class="card compact"><p class="muted">InSync 4.0.0 · Journey editorial stabilization build</p></article></section>`;}


function renderNotifications(){const n=(state.notifications||[]).filter(x=>x.profileId===state.activeProfileId||!x.profileId).slice().reverse();return `<div class="notification-panel"><div class="notification-head"><h2>Notifications</h2><button data-action="notifications-close">×</button></div>${n.length?n.map(x=>`<button class="notification-item ${x.read?'':'unread'}" data-action="notification-read" data-id="${x.id}"><span>🔔</span><span><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.text)}</small></span></button>`).join(''):emptyState('🔔','No notifications','AI updates, notes, challenges and awards appear here.')}</div>`}
function emptyState(icon,title,text) { return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${text}</p></div>`; }
function setupNeeded(thing) { return `<section class="page"><div class="page-title-row"><div><h2>Complete setup</h2><p>Your ${thing} depends on the onboarding interview.</p></div></div><article class="card">${emptyState('✦','Build your baseline first','The interview asks one question at a time, then creates starting nutrition ranges and a Planet Fitness plan.')}<button class="primary-btn" data-action="restart-onboarding">Start interview</button></article></section>`; }

function renderModal() {
  if (state.ui.onboarding) return renderOnboarding();
  const m=state.ui.modal; if (!m) return '';
  const body = ({
    meal:renderMealModal,
    weight:renderWeightModal,
    water:renderWaterModal,
    workout:renderWorkoutLogModal,
    workoutSession:renderWorkoutSessionModal,
    checkin:renderCheckinModal,
    note:renderNoteModal,
    measurement:renderMeasurementModal,
    progressPhoto:renderProgressPhotoModal,
    rebuildPlan:renderRebuildPlanModal,treadmillEnd:renderTreadmillEndModal,machine:renderMachineModal,customWorkout:renderCustomWorkoutModal,goal:renderGoalModal,foodBarcode:renderFoodBarcodeModal,login:renderLoginModal,password:renderPasswordModal,challenge:renderChallengeModal
  })[m.type]?.(m) || '';
  return `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><div class="modal-handle"></div><div class="modal-head"><h2>${escapeHtml(m.title||'Add entry')}</h2><button class="modal-close" data-action="modal-close">×</button></div>${body}</section></div>`;
}
function renderMealModal(){const x=state.ui.pendingMeal||{};return `<div class="form-grid">${state.ui.selectedMealPhoto?`<div class="photo-preview"><img src="${state.ui.selectedMealPhoto}"></div>`:`<button class="upload-zone" data-action="meal-photo-pick"><div class="upload-icon">📷</div><h3>Take or add a photo</h3></button>`}<div class="field"><label>Optional description</label><textarea id="meal-description">${escapeHtml(x.description||'')}</textarea></div><button class="secondary-btn" data-action="analyze-meal">Analyze Meal</button><div class="nutrition-entry-grid"><label>Meal name<input id="meal-name" value="${escapeHtml(x.name||'')}"></label><label>Serving size<input id="meal-serving" value="${escapeHtml(x.servingSize||'')}"></label>${[['calories','Calories'],['protein','Protein (g)'],['carbs','Carbs (g)'],['fat','Fat (g)'],['fiber','Fiber (g)'],['sugar','Sugar (g)'],['sodium','Sodium (mg)'],['saturatedFat','Saturated fat (g)']].map(([k,l])=>`<label>${l}<input id="meal-${k==='saturatedFat'?'satfat':k}" type="number" value="${x[k]??''}"></label>`).join('')}<label>Meal type<select id="meal-type"><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option><option>Drink</option></select></label></div>${x.name?`<article class="card compact"><div class="eyebrow">AI feedback</div><p>Review the estimate and edit anything that looks off before saving.</p><small>${escapeHtml((x.assumptions||[]).join(' '))}</small></article>`:''}<button class="primary-btn" data-action="save-meal">Save Meal</button></div>`}
function renderWeightModal() { return `<div class="form-grid"><div class="field"><label>Weight (lb)</label><input id="weight-value" type="number" inputmode="decimal" step=".1" value="${currentWeight(activeProfile())||''}" autofocus></div><div class="field"><label>Optional note</label><input id="weight-note" placeholder="Morning, after travel, sore from workout…"></div><button class="primary-btn" data-action="save-weight">Log weight</button><p class="muted" style="font-size:12px;line-height:1.5">The app prioritizes seven-day averages and will not overreact to one fluctuation.</p></div>`; }
function renderWaterModal() { return `<div class="form-grid"><div class="field"><label>Ounces</label><input id="water-value" type="number" value="16" inputmode="numeric"></div><button class="primary-btn" data-action="save-water">Add water</button></div>`; }
function renderWorkoutLogModal() { return `<div class="form-grid"><div class="field"><label>Activity</label><input id="activity-name" placeholder="Walk, sports, home workout…"></div><div class="field-row"><div class="field"><label>Minutes</label><input id="activity-minutes" type="number" value="30"></div><div class="field"><label>Intensity</label><select id="activity-intensity"><option>Light</option><option selected>Moderate</option><option>Hard</option></select></div></div><button class="primary-btn" data-action="save-activity">Log activity</button></div>`; }
function renderWorkoutSessionModal(m) {
  const w=activeProfile().plan.workouts.find(x=>x.id===m.workoutId); if (!w) return '<p>Workout not found.</p>';
  return `<div><div class="eyebrow">${escapeHtml(w.focus)}</div><p class="muted" style="line-height:1.5">Warm up for 5–8 minutes. Use a weight that leaves roughly two clean repetitions in reserve. Stop movements that create sharp or worsening pain.</p><div class="workout-list">${w.exercises.map((e,i)=>`<div class="exercise-row"><div class="exercise-index">${i+1}</div><div><h4>${escapeHtml(e.name)}</h4><p>${escapeHtml(e.prescription)} · ${escapeHtml(e.cue)}</p><div class="field-row" style="margin-top:9px"><input class="session-weight" data-index="${i}" type="number" placeholder="Weight"><input class="session-reps" data-index="${i}" type="text" placeholder="Reps e.g. 12,12,10"></div></div><label><input class="session-complete" data-index="${i}" type="checkbox"> ✓</label></div>`).join('')}</div><button class="primary-btn" data-action="complete-workout" data-id="${w.id}">Complete workout</button></div>`;
}
function renderCheckinModal() { const hour=new Date().getHours(),phase=hour<10?'Morning':hour<17?'Midday':'Evening'; return `<div class="form-grid"><div class="eyebrow">${phase} check-in</div><div class="field-row"><div class="field"><label>Energy (1–5)</label><input id="check-energy" type="number" min="1" max="5" value="3"></div><div class="field"><label>Hunger (1–5)</label><input id="check-hunger" type="number" min="1" max="5" value="3"></div></div><div class="field"><label>Soreness or pain</label><input id="check-pain" placeholder="none, normal soreness, sharp knee pain…"></div><div class="field"><label>Biggest risk or obstacle</label><textarea id="check-risk" placeholder="Schedule, cravings, fatigue, eating out…"></textarea></div><div class="field"><label>One commitment</label><input id="check-commitment" placeholder="The next specific action I will take"></div><button class="primary-btn" data-action="save-checkin">Save check-in</button><article class="card compact"><div class="eyebrow">Faith reflection</div><p style="line-height:1.55;margin:8px 0 0">“Let us not be weary in well doing.” — Galatians 6:9. Progress is built through faithful ordinary choices, not perfection.</p></article></div>`; }
function renderNoteModal(){return `<div class="form-grid"><div class="field"><label>Note to ${escapeHtml(partnerProfile().name)}</label><textarea id="shared-note"></textarea></div>${state.ui.notePhoto?`<div class="photo-preview"><img src="${state.ui.notePhoto}"></div>`:''}<button class="upload-zone mini" data-action="note-photo-pick">📷 Add photo</button><button class="primary-btn" data-action="save-note">Post to Together</button></div>`}
function renderMeasurementModal() { return `<div class="form-grid"><div class="field-row"><div class="field"><label>Waist (in)</label><input id="measure-waist" type="number" step=".1"></div><div class="field"><label>Chest (in)</label><input id="measure-chest" type="number" step=".1"></div></div><div class="field-row"><div class="field"><label>Hips (in)</label><input id="measure-hips" type="number" step=".1"></div><div class="field"><label>Thigh (in)</label><input id="measure-thigh" type="number" step=".1"></div></div><button class="primary-btn" data-action="save-measurement">Save measurements</button></div>`; }
function renderProgressPhotoModal(){const v=state.ui.selectedProgressPhotos||{};return `<div class="form-grid"><div class="four-upload-grid">${['Front','Left Side','Right Side','Back'].map(x=>`<button class="upload-zone mini" data-action="progress-view-pick" data-view="${x}">${v[x]?`<img src="${v[x]}">`:`<div class="upload-icon">📷</div><strong>${x}</strong>`}</button>`).join('')}</div><div class="field"><label>Notes</label><textarea id="photo-notes"></textarea></div><div class="field-row"><button class="secondary-btn" data-action="save-progress-entry">Upload</button><button class="primary-btn" data-action="analyze-progress-entry">Upload & Analyze</button></div></div>`;}
function renderRebuildPlanModal() { const p=activeProfile(); return `<div class="form-grid"><div class="field"><label>Days per week</label><select id="plan-days"><option value="3">3 days</option><option value="4" ${String(p.baseline.workoutDays)==='4'?'selected':''}>4 days</option><option value="5" ${String(p.baseline.workoutDays)==='5'?'selected':''}>5 days</option></select></div><div class="field"><label>Experience</label><select id="plan-experience"><option value="beginner">Beginner / restarting</option><option value="intermediate" ${p.baseline.experience==='intermediate'?'selected':''}>Intermediate</option><option value="advanced" ${p.baseline.experience==='advanced'?'selected':''}>Advanced</option></select></div><button class="primary-btn" data-action="save-rebuilt-plan">Build new plan</button></div>`; }

function renderTreadmillEndModal(){const sec=state.ui.treadmillStart?Math.round((Date.now()-state.ui.treadmillStart)/1000):0;return `<div class="form-grid"><div class="timer-display">${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}</div><div class="field-row"><div class="field"><label>Miles</label><input id="walk-miles" type="number" step=".01"></div><div class="field"><label>Calories</label><input id="walk-calories" type="number"></div></div><div class="field"><label>Effort: easy to extreme</label><input id="walk-effort" class="range-wide" type="range" min="1" max="6" value="3"></div><button class="primary-btn" data-action="save-walk" data-seconds="${sec}">Save walk</button></div>`;}
function renderMachineModal(){const d=state.ui.machineDraft;return `<div class="form-grid">${!d?`<button class="upload-zone" data-action="machine-photo-pick"><div class="upload-icon">▦</div><h3>Scan machine label or barcode</h3></button><div class="field"><label>Or enter name</label><input id="machine-manual"></div><button class="primary-btn" data-action="identify-machine">Identify</button>`:`<h3>${escapeHtml(d.name)}</h3><p class="muted">${escapeHtml(d.muscles||'Machine exercise')}</p><div id="set-builder">${[1,2,3].map(i=>`<div class="set-line"><strong>${i}</strong><input class="machine-weight" type="number" placeholder="Weight"><input class="machine-reps" type="number" placeholder="Reps"><input class="machine-tension" type="number" placeholder="Tension"></div>`).join('')}</div><button class="secondary-btn" data-action="add-set-line">+ Set</button><button class="primary-btn" data-action="save-machine-workout">Save exercise</button>`}</div>`;}
function renderCustomWorkoutModal(){return `<div class="form-grid"><div class="field"><label>Name</label><input id="custom-workout-name"></div><div class="field"><label>Minutes</label><input id="custom-workout-minutes" type="number" value="30"></div><button class="primary-btn" data-action="save-custom-workout">Save</button></div>`;}
function renderGoalModal(){return `<div class="form-grid"><div class="field"><label>Goal</label><input id="goal-title"></div><div class="field-row"><input id="goal-current" type="number" value="0" placeholder="Current"><input id="goal-target" type="number" placeholder="Target"></div><div class="field-row"><input id="goal-unit" placeholder="Unit"><input id="goal-deadline" type="date"></div><button class="primary-btn" data-action="save-goal">Add goal</button></div>`;}
function renderFoodBarcodeModal(){const f=state.ui.barcodeFood;return `<div class="form-grid"><div class="field"><label>UPC / barcode</label><input id="food-upc" inputmode="numeric"></div><button class="secondary-btn" data-action="lookup-food-barcode">Look up</button>${f?`<article class="card compact"><h3>${escapeHtml(f.name)}</h3><p>${escapeHtml(f.serving||'1 serving')}</p><input id="food-servings" type="number" step=".25" value="1"><button class="primary-btn" data-action="save-barcode-food">Add serving</button></article>`:''}</div>`;}
function renderChallengeModal(){const q=partnerProfile();return `<div class="form-grid"><p class="muted">Challenge ${escapeHtml(q.name)} to finish a measurable goal before time runs out.</p><div class="field"><label>Challenge title</label><input id="challenge-title" placeholder="Example: Complete 3 workouts"></div><div class="field-row"><div class="field"><label>Goal type</label><select id="challenge-type"><option value="workouts">Workouts</option><option value="treadmill">Treadmill miles</option><option value="steps">Steps</option><option value="water">Water ounces</option></select></div><div class="field"><label>Target</label><input id="challenge-target" type="number" min="1" value="3"></div></div><div class="field-row"><div class="field"><label>Time allowed</label><input id="challenge-time" type="number" min="1" value="3"></div><div class="field"><label>Unit</label><select id="challenge-time-unit"><option value="hours">Hours</option><option value="days" selected>Days</option></select></div></div><div class="field"><label>XP reward</label><select id="challenge-xp"><option value="50">50 XP</option><option value="100" selected>100 XP</option><option value="150">150 XP</option><option value="250">250 XP</option></select></div><button class="primary-btn" data-action="send-challenge">Send challenge</button></div>`;}
function renderLoginModal(){const p=state.profiles[state.ui.loginProfileId];return `<div class="form-grid"><input id="login-user" placeholder="Username"><input id="login-pass" type="password" placeholder="Password"><button class="primary-btn" data-action="login-submit" data-id="${p.id}">Open ${escapeHtml(p.name)}</button></div>`;}
function renderPasswordModal(){return `<div class="form-grid"><input id="new-password" type="password" placeholder="New password"><input id="confirm-password" type="password" placeholder="Confirm"><button class="primary-btn" data-action="save-new-password">Save password</button></div>`;}
function renderOnboarding(){const o=state.ui.onboarding,p=state.profiles[o.profileId];if(o.stage==='ai')return `<div class="modal-backdrop onboarding-modal"><section class="modal"><div class="onboarding-content"><img class="onboarding-logo" src="./assets/insync-logo.png"><div class="eyebrow">Step 1</div><h2>Connect Claude AI</h2><p>Paste the Claude API key for this phone. It stays in this browser and is not added to GitHub.</p><div class="field"><label>Claude API key</label><input id="onboard-api-key" type="password" placeholder="sk-ant-..."></div><button class="primary-btn" data-action="onboard-test-ai">Test & Continue</button><p class="muted onboarding-note">AI connection is required to generate a personalized plan.</p></div></section></div>`;if(o.stage==='profile'){const d=o.profileDraft||(o.profileDraft={username:p.auth?.username||'',password:'',planMode:p.planMode||'suggested',goalType:p.baseline?.goalType||'weight_loss',customGoal:p.baseline?.customGoal||''});return `<div class="modal-backdrop onboarding-modal"><section class="modal profile-final-modal"><div class="onboarding-content"><div class="eyebrow">Final step</div><h2>Secure ${escapeHtml(p.name)}'s profile</h2><button class="upload-zone compact-upload profile-photo-onboarding" data-action="onboard-profile-photo">${p.profilePhoto?`<div class="onboard-avatar-preview" style="background-image:url('${p.profilePhoto}')"></div><strong>Change profile picture</strong>`:`<div class="upload-icon">📷</div><strong>Add profile picture</strong>`}</button><div class="field"><label>Username</label><input id="onboard-username" value="${escapeHtml(d.username||'')}" autocomplete="username"></div><div class="field"><label>Password</label><input id="onboard-password" type="password" value="${escapeHtml(d.password||'')}" autocomplete="new-password"></div><div class="onboard-goal-block"><span class="eyebrow">Your goal</span><h3>What are you working toward?</h3><div class="goal-choice-grid">${[['weight_loss','Lose weight'],['muscle','Build muscle'],['health','Improve health'],['endurance','Increase endurance'],['recomposition','Lose fat + build muscle'],['custom','Create my own']].map(([v,l])=>`<button type="button" class="choice ${d.goalType===v?'selected':''}" data-action="onboard-goal-choice" data-value="${v}"><strong>${l}</strong><span>${d.goalType===v?'✓':''}</span></button>`).join('')}</div><textarea id="onboard-custom-goal" class="${d.goalType==='custom'?'':'hidden'}" placeholder="Describe the outcome you want...">${escapeHtml(d.customGoal||'')}</textarea></div><div class="onboard-plan-block"><span class="eyebrow">Build your plan</span><label class="plan-option ${d.planMode==='suggested'?'selected':''}"><input type="radio" name="onboard-plan" value="suggested" ${d.planMode==='suggested'?'checked':''}><div><strong>Generate my plan with AI</strong><small>Recommended. Uses your onboarding answers to create nutrition, walking, strength, and recovery targets.</small></div></label><label class="plan-option ${d.planMode==='custom'?'selected':''}"><input type="radio" name="onboard-plan" value="custom" ${d.planMode==='custom'?'checked':''}><div><strong>I’ll build my own plan</strong><small>Start with editable targets and enter your own goals.</small></div></label><label class="plan-option ${d.planMode==='hybrid'?'selected':''}"><input type="radio" name="onboard-plan" value="hybrid" ${d.planMode==='hybrid'?'checked':''}><div><strong>AI plan, then I customize it</strong><small>Generate a starting point and keep full manual control.</small></div></label></div><div id="profile-finish-error" class="onboarding-inline-error" role="alert" aria-live="polite"></div></div><div class="onboarding-finish-bar"><button class="primary-btn" data-action="finish-profile-setup">Begin My Journey</button></div></section></div>`;}const q=ONBOARDING_QUESTIONS[o.index],a=o.answers[q.key],c=q.type==='choice'?`<div class="choice-grid">${q.options.map(([v,l])=>`<button class="choice ${String(a)===v?'selected':''}" data-action="onboard-choice" data-value="${v}"><strong>${l}</strong><span>${String(a)===v?'✓':''}</span></button>`).join('')}</div>`:q.type==='height'?`<div class="field-row"><input id="onboard-feet" type="number" placeholder="Feet" value="${o.answers.heightFeet||''}"><input id="onboard-inches" type="number" placeholder="Inches" value="${o.answers.heightInches||''}"></div>`:q.type==='textarea'?`<textarea id="onboard-answer">${escapeHtml(a||'')}</textarea>`:`<input id="onboard-answer" type="${q.type}" value="${escapeHtml(a||'')}">`;return `<div class="modal-backdrop onboarding-modal"><section class="modal"><div class="onboarding-top"><button data-action="onboard-back">←</button><div class="onboarding-progress" style="--p:${Math.round((o.index+1)/ONBOARDING_QUESTIONS.length*100)}%"><span></span></div></div><div class="onboarding-content"><h2>${escapeHtml(q.title)}</h2><p>${escapeHtml(q.help)}</p>${c}</div><div class="onboarding-actions"><button class="primary-btn" data-action="onboard-next">Continue</button></div></section></div>`;}

function openModal(type,title,extra={}) { state.ui.modal={type,title,...extra}; render(); }
function closeModal() { state.ui.modal=null; state.ui.selectedMealPhoto=null; state.ui.pendingMeal=null; state.ui.selectedProgressPhoto=null; render(); }
function startOnboarding(profileId){const p=state.profiles[profileId];state.ui.onboarding={profileId,stage:'ai',index:0,answers:{...p.baseline},profileDraft:{username:p.auth?.username||'',password:'',planMode:p.planMode||'suggested'}};saveOnboardingDraft();render();}
function readOnboardValue() {
  const ob=state.ui.onboarding,q=ONBOARDING_QUESTIONS[ob.index];
  if (q.type==='height') { ob.answers.heightFeet=Number(document.querySelector('#onboard-feet')?.value||0); ob.answers.heightInches=Number(document.querySelector('#onboard-inches')?.value||0); return ob.answers.heightFeet>0; }
  if (q.type==='choice') return Boolean(ob.answers[q.key]);
  const value=document.querySelector('#onboard-answer')?.value?.trim(); if (!value) return false;
  ob.answers[q.key]=q.type==='number'?Number(value):value; return true;
}
function finishOnboarding() {
  const ob=state.ui.onboarding,p=state.profiles[ob.profileId],a=ob.answers;
  a.heightIn=Number(a.heightFeet)*12+Number(a.heightInches);
  p.baseline={...a}; p.targets=calculateTargets(a); p.plan={workouts:buildWorkoutPlan(a.workoutDays,a.experience,p.id),createdAt:new Date().toISOString(),notes:'Generated from onboarding baseline.'};
  if (!p.logs.weights.length) p.logs.weights.push({id:uid('w'),date:todayKey(),value:Number(a.currentWeight),source:'user'});
  p.coachHistory.push({id:uid('msg'),role:'ai',text:`Your starting plan is ready. The calorie range is an estimate, protein is the daily nutrition priority, and the workout plan is built for ${a.workoutDays==='flex'?'a flexible three-day baseline':`${a.workoutDays} realistic gym days`}. We will review trends weekly and avoid changing the plan from one unusual day.`,at:new Date().toISOString()});
  state.ui.onboarding.stage='profile';render();
}

async function compressImage(file,max=1280,quality=.78) {
  const bitmap=await createImageBitmap(file); const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas'); canvas.width=Math.round(bitmap.width*scale); canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close();
  return canvas.toDataURL('image/jpeg',quality);
}
function bindInputs() {
  const chat=document.querySelector('#coach-chat'); if (chat) chat.scrollTop=chat.scrollHeight;
}

app.addEventListener('click', async event => {
  const el=event.target.closest('[data-action]'); if (!el) return;
  const action=el.dataset.action;
  if(action==='select-profile'){const p=state.profiles[el.dataset.id];if(p.onboardingComplete&&p.auth?.passwordHash){state.ui.loginProfileId=p.id;openModal('login',`Open ${p.name}`);}else{state.activeProfileId=p.id;startOnboarding(p.id);}}
  else if(action==='onboard-test-ai'){const key=document.querySelector('#onboard-api-key').value.trim();el.disabled=true;el.textContent='Testing Claude…';try{const result=await testAIConnection(key,state.settings.ai?.model||'');const ai={apiKey:key,connected:true,lastTestedAt:new Date().toISOString(),model:result.model,displayName:result.displayName};state.settings.ai=ai;saveAILocally(ai);window.__INSYNC_AI__=ai;await saveState(state);state.ui.onboarding.stage='questions';render();toast(`Connected and saved: ${result.displayName}.`,4200);}catch(e){const ai={apiKey:key,connected:false,lastError:e.message||'Connection failed'};state.settings.ai=ai;saveAILocally(ai);await saveState(state);render();toast(`Claude did not connect: ${ai.lastError}`,6000);}}
  else if(action==='onboard-theme'){const o=state.ui.onboarding,p=state.profiles[o.profileId];const u=document.querySelector('#onboard-username'),pw=document.querySelector('#onboard-password'),pm=document.querySelector('#onboard-plan-mode');o.profileDraft={username:u?.value||o.profileDraft?.username||'',password:pw?.value||o.profileDraft?.password||'',planMode:pm?.value||o.profileDraft?.planMode||'suggested'};p.accent=el.dataset.a;p.accent2=el.dataset.b;await persistOnboardingNow();render();}
  else if(action==='onboard-goal-choice'){const o=state.ui.onboarding;const d=o.profileDraft||(o.profileDraft={});d.goalType=el.dataset.value;await persistOnboardingNow();render();}
  else if(action==='finish-profile-setup'){
    const o=state.ui.onboarding,p=state.profiles[o.profileId];
    const usernameInput=document.querySelector('#onboard-username');
    const passwordInput=document.querySelector('#onboard-password');
    const errorBox=document.querySelector('#profile-finish-error');
    const u=(usernameInput?.value||o.profileDraft?.username||p.auth?.username||'').trim();
    const typedPassword=passwordInput?.value||o.profileDraft?.password||'';
    const canReuseExistingPassword=Boolean(p.auth?.passwordHash&&p.auth?.salt);
    const pm=document.querySelector('input[name="onboard-plan"]:checked')?.value||o.profileDraft?.planMode||p.planMode||'suggested';
    const goalType=o.profileDraft?.goalType||'weight_loss';
    const customGoal=(document.querySelector('#onboard-custom-goal')?.value||o.profileDraft?.customGoal||'').trim();
    const showFinishError=(message,target)=>{if(errorBox){errorBox.textContent=message;errorBox.classList.add('show');}toast(message,5000);target?.focus();target?.scrollIntoView({behavior:'smooth',block:'center'});};
    if(!u){showFinishError('Enter a username before finishing setup.',usernameInput);return;}
    if(!canReuseExistingPassword&&typedPassword.length<6){showFinishError('Enter a password with at least 6 characters before finishing setup.',passwordInput);return;}
    el.disabled=true;el.textContent='Finishing…';
    try{
      p.auth=p.auth||{};
      p.auth.username=u;
      if(typedPassword.length>=6){p.auth.salt=uid('salt');p.auth.passwordHash=await hashPassword(typedPassword,p.auth.salt);state.ui.sessionPassword=typedPassword;}
      p.planMode=pm;p.baseline=p.baseline||{};p.baseline.goalType=goalType;p.baseline.customGoal=customGoal;p.authenticated=true;p.onboardingComplete=true;state.activeProfileId=p.id;
      o.profileDraft={username:u,password:'',planMode:pm,goalType,customGoal};
      await saveState(state);
      clearOnboardingDraft();
      state.ui.onboarding=null;state.ui.currentPage='home';
      await saveState(state);
      render();toast('Profile ready.',3500);
    }catch(error){
      console.error('Could not finish onboarding',error);
      el.disabled=false;el.textContent='Begin My Journey';
      showFinishError(`Could not finish setup: ${error?.message||'Please try again.'}`);
    }
  }
  else if(action==='login-submit'){const p=state.profiles[el.dataset.id],pw=document.querySelector('#login-pass').value,ok=document.querySelector('#login-user').value.trim()===p.auth.username&&await hashPassword(pw,p.auth.salt)===p.auth.passwordHash;if(!ok)return toast('Incorrect username or password.');p.authenticated=true;state.ui.sessionPassword=pw;state.activeProfileId=p.id;closeModal();commit(`Welcome, ${p.name}.`);}
  else if(action==='logout-profile'){activeProfile().authenticated=false;state.activeProfileId=null;commit('Profile locked.');}
  else if(action==='change-password'){openModal('password','Change Password');}
  else if(action==='save-new-password'){const a=document.querySelector('#new-password').value,b=document.querySelector('#confirm-password').value;if(a.length<6||a!==b)return toast('Passwords must match.');const p=activeProfile();p.auth.salt=uid('salt');p.auth.passwordHash=await hashPassword(a,p.auth.salt);closeModal();commit('Password changed.');}
  else if(action==='test-ai'){const key=document.querySelector('#ai-api-key').value.trim();el.disabled=true;el.textContent='Testing Claude…';try{const result=await testAIConnection(key,state.settings.ai?.model||'');const ai={apiKey:key,model:result.model,displayName:result.displayName,connected:true,lastTestedAt:new Date().toISOString()};state.settings.ai=ai;saveAILocally(ai);window.__INSYNC_AI__=ai;await saveState(state);render();toast(`Connected and saved: ${result.displayName}.`,4200);}catch(e){const ai={...(state.settings.ai||{}),apiKey:key,connected:false,lastError:e.message||'Connection failed'};state.settings.ai=ai;saveAILocally(ai);await saveState(state);render();toast(`Claude did not connect: ${ai.lastError}`,6000);}}
  else if(action==='test-github'){const cfg={owner:document.querySelector('#gh-owner').value.trim(),repo:document.querySelector('#gh-repo').value.trim(),branch:document.querySelector('#gh-branch').value.trim()||'main',token:document.querySelector('#gh-token').value.trim()};try{const info=await testGitHub(cfg);state.settings.github={...cfg,connected:true,lastTestedAt:new Date().toISOString()};state.settings.cloudSync=true;commit(`Connected to ${info.name}.`);}catch(e){toast(e.message||'GitHub connection failed.');}}
  else if(action==='nav-back'){state.ui.currentPage=state.ui.pageHistory.pop()||'home';commit();}
  else if(action==='notifications'){state.ui.notificationsOpen=true;render();}
  else if(action==='notifications-close'){state.ui.notificationsOpen=false;render();}
  else if(action==='notification-read'){const n=(state.notifications||[]).find(x=>x.id===el.dataset.id);if(n)n.read=true;commit();}
  else if(action==='expand-workout'){state.ui.expandedWorkoutId=state.ui.expandedWorkoutId===el.dataset.id?null:el.dataset.id;commit();}
  else if(action==='complete-inline-workout'){const w=activeProfile().plan.workouts.find(x=>x.id===el.dataset.id);if(w){w.completed=true;activeProfile().logs.workouts.push({id:uid('wo'),date:todayKey(),at:new Date().toISOString(),name:w.name,minutes:w.minutes,completed:true});awardXP(100,'Completed AI workout');state.ui.expandedWorkoutId=null;addNotification('award','Workout complete',`${w.name} earned 100 XP.`);commit('Workout complete · +100 XP');}}
  else if(action==='pause-walk'){state.ui.treadmillPausedAt=Date.now();commit();}
  else if(action==='resume-walk'){state.ui.treadmillPausedMs+=(Date.now()-state.ui.treadmillPausedAt);state.ui.treadmillPausedAt=null;commit();}
  else if(action==='scan-machine'){const f=document.querySelector('#global-file-input');f.dataset.purpose='machine';f.setAttribute('capture','environment');f.click();}
  else if(action==='note-photo-pick'){const f=document.querySelector('#global-file-input');f.dataset.purpose='note';f.click();}
  else if(action==='save-targets'){const p=activeProfile();['caloriesLow','caloriesHigh','protein','carbs','fat','fiber','water','steps','sleep'].forEach(k=>p.targets[k]=Number(document.querySelector(`#target-${k}`).value));p.baseline.workoutDays=document.querySelector('#target-workouts').value;p.baseline.goalWeight=Number(document.querySelector('#target-goalWeight').value);p.baseline.goalDeadline=document.querySelector('#target-deadline').value;commit('Targets saved across InSync.');}
  else if(action==='reset-ai-targets'||action==='ai-plan-update'){const p=activeProfile();p.targets=calculateTargets(p.baseline);p.plan.workouts=buildWorkoutPlan(p.baseline.workoutDays,p.baseline.experience,p.id);addNotification('ai','AI plan updated','Your goals and workout targets were refreshed.');commit('AI plan updated.');}
  else if(action==='train-tab'){state.settings.trainTab=el.dataset.tab;commit();}
  else if(action==='start-walk'){state.ui.treadmillStart=Date.now();state.ui.treadmillPausedAt=null;state.ui.treadmillPausedMs=0;commit();}
  else if(action==='end-walk'){state.ui.walkEndSeconds=elapsedWalkSeconds();openModal('treadmillEnd','Finish Walk');}
  else if(action==='save-walk'){const sec=Number(el.dataset.seconds),mi=Number(document.querySelector('#walk-miles').value),cal=Number(document.querySelector('#walk-calories').value);activeProfile().logs.treadmill.push({id:uid('walk'),date:todayKey(),seconds:sec,miles:mi,calories:cal,effort:Number(document.querySelector('#walk-effort').value)});activeProfile().logs.workouts.push({id:uid('wo'),date:todayKey(),name:'Treadmill Walk',minutes:Math.round(sec/60),calories:cal,completed:true});state.ui.treadmillStart=null;awardXP(40,'Completed treadmill walk');closeModal();commit('Walk saved and +40 XP.');}
  else if(action==='add-machine'){state.ui.machineDraft=null;openModal('machine','Add Machine');}
  else if(action==='machine-photo-pick'){const f=document.querySelector('#global-file-input');f.dataset.purpose='machine';f.click();}
  else if(action==='identify-machine'){const n=document.querySelector('#machine-manual')?.value.trim();state.ui.machineDraft=n?{name:n,muscles:'Manual entry'}:await identifyMachine(state.ui.machinePhoto,state.settings.ai);render();}
  else if(action==='add-set-line'){document.querySelector('#set-builder').insertAdjacentHTML('beforeend','<div class="set-line"><strong>+</strong><input class="machine-weight" type="number" placeholder="Weight"><input class="machine-reps" type="number" placeholder="Reps"><input class="machine-tension" type="number" placeholder="Tension"></div>');}
  else if(action==='save-machine-workout'){const d=state.ui.machineDraft,w=[...document.querySelectorAll('.machine-weight')],r=[...document.querySelectorAll('.machine-reps')],t=[...document.querySelectorAll('.machine-tension')];activeProfile().plan.selfDriven.push({id:uid('self'),date:todayKey(),name:d.name,muscles:d.muscles,sets:w.map((x,i)=>({weight:Number(x.value)||null,reps:Number(r[i].value)||null,tension:Number(t[i].value)||null})).filter(x=>x.weight||x.reps||x.tension)});closeModal();commit('Exercise saved.');}
  else if(action==='custom-workout'){openModal('customWorkout','Custom Workout');}
  else if(action==='save-custom-workout'){const n=document.querySelector('#custom-workout-name').value.trim(),m=Number(document.querySelector('#custom-workout-minutes').value);if(!n)return toast('Name the workout.');activeProfile().logs.workouts.push({id:uid('wo'),date:todayKey(),name:n,minutes:m,completed:true});awardXP(40,'Completed custom workout');closeModal();commit('Workout saved and +40 XP.');}
  else if(action==='add-goal'){openModal('goal','Add Goal');}
  else if(action==='save-goal'){const n=document.querySelector('#goal-title').value.trim(),t=Number(document.querySelector('#goal-target').value);if(!n||!t)return toast('Add a goal and target.');activeProfile().plan.customGoals.push({id:uid('goal'),title:n,current:Number(document.querySelector('#goal-current').value)||0,target:t,unit:document.querySelector('#goal-unit').value,deadline:document.querySelector('#goal-deadline').value});closeModal();commit('Goal added.');}
  else if(action==='plan-mode'){activeProfile().planMode=el.value;commit();}
  else if(action==='food-barcode'){state.ui.barcodeFood=null;openModal('foodBarcode','Food Barcode');}
  else if(action==='lookup-food-barcode'){try{state.ui.barcodeFood=await lookupFoodBarcode(document.querySelector('#food-upc').value.trim());render();}catch(e){toast(e.message||'Not found.');}}
  else if(action==='save-barcode-food'){const f=state.ui.barcodeFood,n=Number(document.querySelector('#food-servings').value||1);activeProfile().logs.meals.push({id:uid('m'),date:todayKey(),name:f.name,mealType:'Snack',calories:Math.round(f.calories*n),protein:f.protein*n,carbs:f.carbs*n,fat:f.fat*n,fiber:(f.fiber||0)*n,confidence:'verified',source:'barcode'});closeModal();commit('Food added.');}
  else if(action==='progress-view-pick'){const f=document.querySelector('#global-file-input');f.dataset.purpose='progress-view';f.dataset.view=el.dataset.view;f.click();}
  else if(action==='save-progress-entry'||action==='analyze-progress-entry'){const v=state.ui.selectedProgressPhotos||{};if(!Object.keys(v).length)return toast('Add a photo.');let analysis='';if(action==='analyze-progress-entry'){try{analysis=(await analyzeProgressPhotos(v,state.settings.ai,activeProfile())).text;}catch(e){toast('Saved without AI analysis.');}}activeProfile().logs.photos.push({id:uid('ph'),date:todayKey(),views:{...v},analysis,notes:document.querySelector('#photo-notes')?.value||'',private:true});state.ui.selectedProgressPhotos={};closeModal();commit('Progress entry saved.');}
  else if(action==='photo-mode'){state.settings.photoView=el.dataset.mode;commit();}
  else if(action==='photo-prev'){state.ui.photoPlaybackIndex=Math.max(0,state.ui.photoPlaybackIndex-1);render();}
  else if(action==='photo-next'){state.ui.photoPlaybackIndex=Math.min(activeProfile().logs.photos.length-1,state.ui.photoPlaybackIndex+1);render();}
  else if(action==='photo-play'){let i=0,total=activeProfile().logs.photos.length;const z=setInterval(()=>{state.ui.photoPlaybackIndex=i++;render();if(i>=total)clearInterval(z)},700);}
  else if(action==='build-comparison'){const e=activeProfile().logs.photos.slice().sort((a,b)=>a.date.localeCompare(b.date)),a=e[Number(document.querySelector('#compare-a').value)],b=e[Number(document.querySelector('#compare-b').value)],v=document.querySelector('#compare-view').value,h=document.querySelector('#photo-comparison');if(!a?.views?.[v]||!b?.views?.[v])return toast('Both entries need that view.');h.innerHTML=`<div class="comparison-wrap" style="--split:50%"><img src="${a.views[v]}"><div class="comparison-after"><img src="${b.views[v]}"></div><input type="range" min="0" max="100" value="50" oninput="this.parentElement.style.setProperty('--split',this.value+'%')"></div>`;}
  else if(action==='profile-photo-pick'||action==='onboard-profile-photo'){const f=document.querySelector('#global-file-input');f.dataset.purpose='profile';f.click();}
  else if(action==='set-theme'){activeProfile().accent=el.dataset.a;activeProfile().accent2=el.dataset.b;commit();}
  else if (action==='google-signin') {
    try { const user=await signInGoogle(); state.ui.authUser=user; const localId=state.settings.accountMap[user.email]; if (localId) state.activeProfileId=localId; else { state.activeProfileId='robert'; state.settings.accountMap[user.email]='robert'; } const remote=await pullPrivateProfile(user); if (remote) state.profiles[state.activeProfileId]=remote; const shared=await pullShared(); if (shared) state.shared={...state.shared,...shared}; state.settings.cloudSync=true; commit('Signed in with Google.'); if (!activeProfile().onboardingComplete) startOnboarding(state.activeProfileId); } catch(err){ toast(err.message||'Google sign-in failed.'); }
  }
  else if (action==='menu-open') { state.ui.drawerOpen=true; render(); }
  else if (action==='menu-close') { state.ui.drawerOpen=false; render(); }
  else if (action==='nav'||action==='drawer-nav') { state.ui.currentPage=el.dataset.page; state.ui.drawerOpen=false; render(); }
  else if (action==='switch-profile') { state.ui.sessionPassword='';state.activeProfileId=null; state.ui.drawerOpen=false; commit(); }
  else if (action==='quick-log') { const type=el.dataset.type; if(type==='meal')openModal('meal','Log food'); else if(type==='weight')openModal('weight','Log weight'); else if(type==='water')openModal('water','Add water'); else openModal('workout','Log activity'); }
  else if (action==='modal-close'||action==='modal-backdrop') { if (action==='modal-backdrop' && event.target!==el) return; closeModal(); }
  else if (action==='water-add') { activeProfile().logs.water.push({id:uid('water'),date:todayKey(),ounces:Number(el.dataset.oz),source:'user'}); awardXP(5,'Logged water'); commit(`Added ${el.dataset.oz} oz of water and +5 XP.`); }
  else if (action==='meal-photo-pick') { document.querySelector('#global-file-input').dataset.purpose='meal'; document.querySelector('#global-file-input').click(); }
  else if (action==='progress-photo-pick') { document.querySelector('#global-file-input').dataset.purpose='progress'; document.querySelector('#global-file-input').click(); }
  else if (action==='add-progress-photo') openModal('progressPhoto','Add progress photo');
  else if (action==='analyze-meal') {
    const description=document.querySelector('#meal-description')?.value.trim()||'';
    if (!description && !state.ui.selectedMealPhoto) return toast('Add a photo or description first.');
    el.disabled=true; el.innerHTML='<span class="loading-inline"><span class="spinner"></span>Estimating…</span>';
    const p=activeProfile(); state.ui.pendingMeal=await analyzeMeal({description,imageData:state.ui.selectedMealPhoto,profile:{baseline:p.baseline,targets:p.targets},context:todaySummary(p)}); state.ui.pendingMeal.description=description; render();
  }
  else if (action==='save-meal') {
    const pending=state.ui.pendingMeal; const p=activeProfile();
    p.logs.meals.push({id:uid('meal'),date:todayKey(),name:pending.name,description:pending.description,mealType:document.querySelector('#meal-type')?.value||'Meal',calories:Number(document.querySelector('#meal-calories').value),protein:Number(document.querySelector('#meal-protein').value),carbs:Number(document.querySelector('#meal-carbs').value),fat:Number(document.querySelector('#meal-fat').value),fiber:Number(document.querySelector('#meal-fiber').value),confidence:pending.confidence||'estimated',source:pending.source,imageData:state.ui.selectedMealPhoto||null,createdAt:new Date().toISOString()}); awardXP(10,'Logged a meal'); closeModal(); commit('Meal logged and +10 XP.');
  }
  else if (action==='save-weight') { const value=Number(document.querySelector('#weight-value').value); if(!value)return toast('Enter a valid weight.'); activeProfile().logs.weights.push({id:uid('w'),date:todayKey(),value,note:document.querySelector('#weight-note').value,source:'user'}); awardXP(10,'Logged weight'); closeModal(); commit('Weight logged and +10 XP.'); }
  else if (action==='save-water') { const oz=Number(document.querySelector('#water-value').value); activeProfile().logs.water.push({id:uid('water'),date:todayKey(),ounces:oz,source:'user'}); awardXP(5,'Logged water'); closeModal(); commit(`Added ${oz} oz of water and +5 XP.`); }
  else if (action==='save-activity') { const name=document.querySelector('#activity-name').value.trim(); const minutes=Number(document.querySelector('#activity-minutes').value); if(!name||!minutes)return toast('Add an activity and duration.'); activeProfile().logs.workouts.push({id:uid('wo'),date:todayKey(),name,minutes,intensity:document.querySelector('#activity-intensity').value,completed:true,exercisesCompleted:0}); awardXP(40,'Completed activity'); closeModal(); commit('Activity logged and +40 XP.'); }
  else if (action==='start-workout') openModal('workoutSession',activeProfile().plan.workouts.find(w=>w.id===el.dataset.id)?.name||'Workout',{workoutId:el.dataset.id});
  else if (action==='complete-workout') {
    const p=activeProfile(),w=p.plan.workouts.find(x=>x.id===el.dataset.id); const boxes=[...document.querySelectorAll('.session-complete')]; const completed=boxes.filter(b=>b.checked).length;
    w.completed=true; w.exercises.forEach((e,i)=>{e.completed=boxes[i]?.checked||false;e.lastWeight=Number(document.querySelector(`.session-weight[data-index="${i}"]`)?.value||0);e.lastReps=document.querySelector(`.session-reps[data-index="${i}"]`)?.value||'';});
    p.logs.workouts.push({id:uid('wo'),date:todayKey(),name:w.name,minutes:w.minutes,completed:true,exercisesCompleted:completed,details:w.exercises.map(e=>({name:e.name,weight:e.lastWeight,reps:e.lastReps,completed:e.completed}))});
    awardXP(75,'Completed planned workout'); closeModal(); commit(`${w.name} completed. +75 XP`);
  }
  else if (action==='open-checkin') openModal('checkin','Health check-in');
  else if (action==='save-checkin') { activeProfile().logs.checkins.push({id:uid('check'),date:todayKey(),at:new Date().toISOString(),energy:Number(document.querySelector('#check-energy').value),hunger:Number(document.querySelector('#check-hunger').value),pain:document.querySelector('#check-pain').value||'none',risk:document.querySelector('#check-risk').value,commitment:document.querySelector('#check-commitment').value}); awardXP(15,'Completed check-in'); closeModal(); commit('Check-in saved and +15 XP.'); }
  else if (action==='create-challenge') openModal('challenge',`Challenge ${partnerProfile().name}`);
  else if (action==='send-challenge') { const title=document.querySelector('#challenge-title').value.trim(),type=document.querySelector('#challenge-type').value,target=Number(document.querySelector('#challenge-target').value),time=Number(document.querySelector('#challenge-time').value),unit=document.querySelector('#challenge-time-unit').value,rewardXP=Number(document.querySelector('#challenge-xp').value);if(!title||!target||!time)return toast('Add a title, target, and time limit.');const deadline=new Date(Date.now()+time*(unit==='hours'?3600000:86400000)).toISOString();state.shared.challenges=state.shared.challenges||[];state.shared.challenges.push({id:uid('challenge'),title,type,target,unit:type==='workouts'?'workouts':type==='treadmill'?'miles':type==='steps'?'steps':'oz',createdBy:activeProfile().id,acceptedBy:partnerProfile().id,createdAt:new Date().toISOString(),deadline,rewardXP,progress:0,status:'active'});awardXP(25,'Sent a partner challenge');closeModal();commit('Challenge sent.'); }
  else if (action==='send-note') openModal('note','Add encouragement');
  else if (action==='save-note') { const text=document.querySelector('#shared-note').value.trim(); if(!text)return toast('Write a note first.'); state.shared.messages.push({id:uid('note'),from:activeProfile().name,text,photo:state.ui.notePhoto||null,at:new Date().toISOString()});addNotification('note',`${activeProfile().name} sent a note`,text,partnerProfile().id);state.ui.notePhoto=null;closeModal();commit('Note added to Together.'); }
  else if (action==='toggle-share') { const key=el.dataset.key; activeProfile().privacy[key]=!activeProfile().privacy[key]; commit('Sharing preference updated.'); }
  else if (action==='add-measurement') openModal('measurement','Add measurements');
  else if (action==='save-measurement') { activeProfile().logs.measurements.push({id:uid('measure'),date:todayKey(),waist:Number(document.querySelector('#measure-waist').value)||null,chest:Number(document.querySelector('#measure-chest').value)||null,hips:Number(document.querySelector('#measure-hips').value)||null,thigh:Number(document.querySelector('#measure-thigh').value)||null}); closeModal(); commit('Measurements saved.'); }
  else if (action==='save-progress-photo') { activeProfile().logs.photos.push({id:uid('photo'),date:todayKey(),view:document.querySelector('#photo-view').value,imageData:state.ui.selectedProgressPhoto,private:true}); closeModal(); commit('Private progress photo saved.'); }
  else if (action==='rebuild-plan') openModal('rebuildPlan','Adjust workout plan');
  else if (action==='save-rebuilt-plan') { const p=activeProfile(),days=document.querySelector('#plan-days').value,exp=document.querySelector('#plan-experience').value;p.baseline.workoutDays=days;p.baseline.experience=exp;p.plan.workouts=buildWorkoutPlan(days,exp,p.id);p.plan.createdAt=new Date().toISOString();closeModal();commit('Workout plan rebuilt.'); }
  else if (action==='onboard-choice') { const ob=state.ui.onboarding,q=ONBOARDING_QUESTIONS[ob.index]; ob.answers[q.key]=el.dataset.value; render(); }
  else if (action==='onboard-next') { if(!readOnboardValue())return toast('Answer this question to continue.'); if(state.ui.onboarding.index===ONBOARDING_QUESTIONS.length-1)finishOnboarding(); else {state.ui.onboarding.index++;render();} }
  else if (action==='onboard-back') { readOnboardValue(); state.ui.onboarding.index=Math.max(0,state.ui.onboarding.index-1); render(); }
  else if (action==='restart-onboarding') startOnboarding(state.activeProfileId);
  else if (action==='export-data') { const clean=structuredClone(state);delete clean.ui;if(clean.settings?.ai)clean.settings.ai.apiKey='';if(clean.settings?.github)clean.settings.github.token='';downloadJson(clean,`insync-backup-${todayKey()}.json`);toast('Safe backup downloaded without secret keys.'); }
  else if (action==='import-data') { document.querySelector('#global-file-input').dataset.purpose='import'; document.querySelector('#global-file-input').accept='application/json'; document.querySelector('#global-file-input').click(); }
  else if (action==='cloud-sync') { const g=state.settings.github;if(!g?.connected)return toast('Connect GitHub in Settings first.');if(!state.ui.sessionPassword)return toast('Log out and sign in again before syncing.');try{await Promise.all([pushProfile(activeProfile(),state.ui.sessionPassword,g),pushGitHubShared(state.shared,g)]);state.settings.lastSyncedAt=new Date().toISOString();commit('Encrypted GitHub sync complete.');}catch(err){toast(err.message||'GitHub sync failed.');} }
  else if (action==='cloud-pull') { const g=state.settings.github;if(!g?.connected)return toast('Connect GitHub in Settings first.');if(!state.ui.sessionPassword)return toast('Log out and sign in again before restoring.');try{const [remote,shared]=await Promise.all([pullProfile(activeProfile().id,state.ui.sessionPassword,g),pullGitHubShared(g)]);if(remote)state.profiles[remote.id]=remote;if(shared)state.shared={...state.shared,...shared};state.settings.lastSyncedAt=new Date().toISOString();commit(remote?'Cloud profile restored.':'No cloud profile exists yet.');}catch(err){toast(err.message||'Cloud restore failed.');} }
  else if (action==='set-accent') { activeProfile().accent=el.dataset.color; activeProfile().accent2=el.dataset.color; commit(); }
  else if (action==='save-profile') { const name=document.querySelector('#profile-name').value.trim(); if(name)activeProfile().name=name;commit('Profile saved.'); }
  else if (action==='toggle-reminders') { state.settings.reminders.enabled=!state.settings.reminders.enabled;commit(); }
  else if (action==='save-reminders') { state.settings.reminders.morning=document.querySelector('#time-morning').value;state.settings.reminders.midday=document.querySelector('#time-midday').value;state.settings.reminders.evening=document.querySelector('#time-evening').value;commit('Reminder times saved.'); }
  else if (action==='install-app') { if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;state.ui.installAvailable=false;render();} }
  else if (action==='reset-app') { if(confirm('Delete all local InSync data? This cannot be undone unless you exported a backup.')){await clearState();location.reload();} }
});

app.addEventListener('input', event => {
  if(!state.ui.onboarding || state.ui.onboarding.stage!=='profile') return;
  const d=state.ui.onboarding.profileDraft||(state.ui.onboarding.profileDraft={username:'',password:'',planMode:'suggested'});
  if(event.target.id==='onboard-username') d.username=event.target.value;
  if(event.target.id==='onboard-password') d.password=event.target.value;
  if(event.target.name==='onboard-plan') d.planMode=event.target.value;
  if(event.target.id==='onboard-custom-goal') d.customGoal=event.target.value;
  saveOnboardingDraft();
});
app.addEventListener('change', event => {
  if(state.ui.onboarding?.stage==='profile' && event.target.name==='onboard-plan'){
    state.ui.onboarding.profileDraft.planMode=event.target.value;
    saveOnboardingDraft(); render();
  }
});

app.addEventListener('submit', async event => {
  if (event.target.dataset.form!=='coach') return;
  event.preventDefault(); const input=event.target.elements.message; const message=input.value.trim(); if(!message)return;
  const p=activeProfile(); p.coachHistory.push({id:uid('msg'),role:'user',text:message,at:new Date().toISOString()}); input.value=''; render();
  const result=await askCoach({message,profile:{baseline:p.baseline,targets:p.targets,plan:p.plan},today:todaySummary(p),shared:state.shared,recent:{weights:p.logs.weights.slice(-7),workouts:p.logs.workouts.slice(-5),meals:p.logs.meals.slice(-10)}});
  p.coachHistory.push({id:uid('msg'),role:'ai',text:result.text,source:result.source,at:new Date().toISOString()}); commit();
});

document.querySelector('#global-file-input').addEventListener('change', async event => {
  const file=event.target.files?.[0]; if(!file)return; const purpose=event.target.dataset.purpose;
  try {
    if (purpose==='import') {
      const imported=await readJsonFile(file); if(!imported.profiles||!imported.shared)throw new Error('Invalid InSync backup.');
      if(confirm('Replace current local data with this backup?')) { state={...imported,ui:{currentPage:'home',drawerOpen:false,modal:null,onboarding:null,selectedMealPhoto:null,pendingMeal:null,authUser:null,installAvailable:false}}; await saveState(state); render(); toast('Backup imported.'); }
    } else {
      const data=await compressImage(file);
      if(purpose==='meal'){state.ui.selectedMealPhoto=data;if(!state.ui.modal)state.ui.modal={type:'meal',title:'Log food'};}
      if(purpose==='progress'){state.ui.selectedProgressPhoto=data;} if(purpose==='progress-view'){state.ui.selectedProgressPhotos[event.target.dataset.view]=data;} if(purpose==='machine'){state.ui.machinePhoto=data;} if(purpose==='note'){state.ui.notePhoto=data;} if(purpose==='profile'){const target=(state.ui.onboarding?state.profiles[state.ui.onboarding.profileId]:activeProfile());target.profilePhoto=data;await saveState(state);if(state.ui.onboarding)saveOnboardingDraft();toast('Profile picture saved.');}
      render();
    }
  } catch(error) { toast(error.message||'Could not read that file.'); }
  event.target.value=''; event.target.accept='image/*';
});

window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;state.ui.installAvailable=true;render();});

function normalizeProfile(profile, id) {
  const base=createProfile(id, profile?.name || (id==='lizzie'?'Lizzie':'Robert'), profile?.accent || COLORS[id]?.[0] || '#2ea8ff', profile?.accent2 || COLORS[id]?.[1] || '#4f7cff');
  const merged={...base,...(profile||{})};
  merged.auth={...base.auth,...(profile?.auth||{})};
  merged.baseline={...base.baseline,...(profile?.baseline||{})};
  merged.targets={...base.targets,...(profile?.targets||{})};
  merged.privacy={...base.privacy,...(profile?.privacy||{})};
  merged.logs={...base.logs,...(profile?.logs||{})};
  Object.keys(base.logs).forEach(k=>{if(!Array.isArray(merged.logs[k])) merged.logs[k]=[];});
  merged.plan={...base.plan,...(profile?.plan||{})};
  if(!Array.isArray(merged.plan.workouts)) merged.plan.workouts=[];
  if(!Array.isArray(merged.plan.selfDriven)) merged.plan.selfDriven=[];
  if(!Array.isArray(merged.plan.customGoals)) merged.plan.customGoals=[];
  if(!Array.isArray(merged.coachHistory)) merged.coachHistory=base.coachHistory;
  if(!Array.isArray(merged.milestones)) merged.milestones=[];
  ensureGamification(merged);
  return merged;
}

async function initialize() {
  try {
    const stored=await loadState();
    if(stored){
      const fresh=defaultState();
      state={...fresh,...stored,ui:state.ui};
      state.profiles={
        robert:normalizeProfile(stored.profiles?.robert,'robert'),
        lizzie:normalizeProfile(stored.profiles?.lizzie,'lizzie')
      };
      state.shared={...fresh.shared,...(stored.shared||{})};
      state.shared.challenges=Array.isArray(state.shared.challenges)?state.shared.challenges:[];
      state.shared.messages=Array.isArray(state.shared.messages)?state.shared.messages:[];
      state.notifications=Array.isArray(stored.notifications)?stored.notifications:[];
      state.settings={...fresh.settings,...(stored.settings||{})};
      state.settings.ai={...fresh.settings.ai,...(stored.settings?.ai||{})};
      if(state.settings.ai.workerUrl&&!state.settings.ai.apiKey)state.settings.ai={...fresh.settings.ai};
      state.settings.github={...fresh.settings.github,...(stored.settings?.github||{})};
      state.settings.reminders={...fresh.settings.reminders,...(stored.settings?.reminders||{})};
    }
    const savedOnboarding=loadOnboardingDraft();
  if(savedOnboarding?.profileId && state.profiles[savedOnboarding.profileId] && !state.profiles[savedOnboarding.profileId].onboardingComplete){
    state.activeProfileId=savedOnboarding.profileId;
    state.ui.onboarding=savedOnboarding;
    state.ui.onboarding.profileDraft=state.ui.onboarding.profileDraft||{username:'',password:'',planMode:state.profiles[savedOnboarding.profileId].planMode||'suggested'};
  }
  const localAI=loadAILocally();
  if(localAI?.apiKey){
    state.settings.ai={...(state.settings.ai||{}),...localAI};
    window.__INSYNC_AI__=state.settings.ai;
  }
  else if (window.INSYNC_CONFIG?.demoMode || new URLSearchParams(location.search).get('demo')==='1') state={...seedDemo(defaultState()),ui:state.ui};
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js?v=204').catch(console.warn);
    render();
  } catch (error) {
    console.error('InSync startup failed', error);
    app.className='';
    app.innerHTML=`<main class="boot-error"><h1>InSync could not finish loading</h1><p>${escapeHtml(error?.message||'An unexpected startup error occurred.')}</p><button class="primary-button" onclick="location.reload()">Try again</button><button class="secondary-button" onclick="indexedDB.deleteDatabase('insync-local-v1');localStorage.removeItem('insync-local-v1');location.reload()">Reset local app data</button></main>`;
  }
}
setInterval(()=>{const x=document.querySelector('[data-live-timer]');if(x&&state.ui.treadmillStart&&!state.ui.treadmillPausedAt)x.textContent=fmtTimer(elapsedWalkSeconds())},1000);
initialize();

export { defaultState, calculateTargets, buildWorkoutPlan, todaySummary };
