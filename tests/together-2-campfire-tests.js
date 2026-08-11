'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(seed){this.m=new Map(Object.entries(seed||{}))}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
function make(){
 const c={console,localStorage:new LS(),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
  location:{hostname:'example.test',pathname:'/insync/',hash:'#together',protocol:'https:'},navigator:{onLine:true},CustomEvent:function(){},document:{},
  btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),fetch:()=>Promise.reject(new Error('offline')),window:null};
 c.window=c;c.window.dispatchEvent=()=>{};vm.createContext(c);
 ['domains.js','contracts.js','journeys.js','theme.js','rewards.js','camp.js','store.js','intelligence.js','prompt-registry.js','ui.js','media.js','exercises.js','training.js','nutrition.js','insights.js','together.js','onboarding.js','badges.js','cloud.js','foods.js','screens.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),c,{filename:f}));
 return c;
}
const c=make(),S=c.Store,T=c.InSyncTogether;
S.setProfileName('Robert');S.setPartnerName('Lizzie');S.set('onboarded',true);S.set('profile.startDate','2026-08-03');

ok(!!T,'Together 2.0 module loads');
eq(T.MODES.length,3,'three Together presentation modes exist');
eq(T.mode(),'cooperative','Together defaults to Cooperative');
ok(T.setMode('quiet'),'Quiet Support can be selected');
eq(T.mode(),'quiet','Together mode is stored locally');
ok(!T.setMode('made-up'),'invalid Together mode is rejected');

// Build a deterministic current week: Monday through Tuesday on the fixture clock.
const cur=T.currentWeek();
S.setSteps(8000,cur); // 4 miles
S.setSteps(4000,S.shift(cur,1)); // 2 miles
S.set('days.'+cur+'.workouts',[{name:'Push',minutes:40,exercises:[]}]);
S.set('days.'+S.shift(cur,1)+'.workouts',[{name:'Legs',minutes:40,exercises:[]}]);
S.setMission=T.setMission;
ok(T.setMission(cur,'trail-12'),'Duo Mission can be selected for a week');
let ms=T.missionStatus(cur);
eq(ms.def.name,'Twelve Together','selected mission resolves to its definition');
ok(ms.mineProgress>=6,'trail mission derives local progress from real logged walking');
ok(!ms.agreed,'mission is not called agreed before the partner selects the same mission');

// Partner mission data is bounded and combines only once the ids match.
S.set('partnerData',{name:'Lizzie',initials:'LB',date:S.todayKey(),startDate:'2026-08-03',points:5,streak:1,earned:[],messages:[],activity:[],reactions:{},together:{duoMissions:[{weekOf:cur,id:'trail-12',progress:3.5,updatedAt:new Date().toISOString()}],weekSummary:null,campfireIntent:null,nextWeek:null}});
ms=T.missionStatus(cur);
ok(ms.agreed,'matching partner mission becomes agreed');
ok(ms.combined>=9.5,'combined mission progress adds only the two bounded mission contributions');

// Local presentation choice must never be included in partner payload.
let tp=T.sharePayload();
ok(Array.isArray(tp.duoMissions)&&tp.duoMissions.some(m=>m.id==='trail-12'),'Together sync publishes explicit Duo Mission progress');
ok(!Object.prototype.hasOwnProperty.call(tp,'mode'),'local Together mode is not synced');

// Weekly summary obeys the existing health privacy toggles.
S.set('privacy.workouts',false);S.set('privacy.steps',false);S.set('privacy.calories',false);
let ws=T.weeklySummary(cur);
ok(ws&&typeof ws.points==='number'&&typeof ws.loggedDays==='number','weekly shared summary always includes bounded Together scoring context');
ok(ws.workouts==null&&ws.avgSteps==null&&ws.avgProtein==null,'weekly summary omits health aggregates disabled by privacy settings');
S.set('privacy.workouts',true);S.set('privacy.steps',true);S.set('privacy.calories',true);
ws=T.weeklySummary(cur);
ok(ws.workouts!=null&&ws.avgSteps!=null&&ws.avgProtein!=null,'weekly summary includes only aggregates allowed by current privacy toggles');

// Campfire intention is explicit and short; private journal data never enters it.
const review=c.Insights.reviewWeekKey();
ok(T.setCampfireIntent(review,'Protect one dinner together and get outside Saturday.'),'Campfire shared intention saves');
let cf=T.campfireFor(review);
eq(cf.intent,'Protect one dinner together and get outside Saturday.','Campfire stores the explicit shared intention');
ok(T.closeCampfire(review),'Campfire can be closed locally');
ok(!!T.campfireFor(review).closedAt,'closed Campfire receives a real timestamp');
tp=T.sharePayload();
ok(tp.campfireIntent&&tp.campfireIntent.text.includes('Protect one dinner'),'only the explicit Campfire intention is published');
ok(JSON.stringify(tp).indexOf('reflection')<0,'private reflection text is absent from Together share payload');

// Partner sanitizer accepts schema 8 Together payload and drops unbounded junk.
const raw={schema:8,name:'Lizzie',initials:'LB',date:S.todayKey(),startDate:'2026-08-03',updated:new Date().toISOString(),points:6,streak:1,earned:[],history:{points:{},logged:{}},
 together:{duoMissions:[{weekOf:cur,id:'strong-8',progress:2,updatedAt:new Date().toISOString()},{weekOf:'bad',id:'x',progress:99999999}],weekSummary:{weekOf:review,points:42,loggedDays:5,workouts:3,avgSteps:9000},campfireIntent:{weekOf:review,text:'Walk Saturday.',updatedAt:new Date().toISOString()},nextWeek:{weekOf:S.shift(review,7),training:true,meals:false,mealCount:12}}};
const clean=c.Cloud.sanitizePartnerPayload(raw);
eq(clean.schema,8,'partner sanitizer accepts Together sync schema 8');
eq(clean.together.duoMissions.length,1,'partner sanitizer rejects invalid Duo Mission rows');
eq(clean.together.campfireIntent.text,'Walk Saturday.','partner sanitizer preserves bounded explicit Campfire intention');
eq(clean.together.nextWeek.mealCount,12,'partner sanitizer preserves bounded planning readiness');

// Screen behavior by mode.
c.location.hash='#together';T.setMode('quiet');let html=c.Screens.together();
ok(html.includes('Quiet Support')&&html.includes('No scoreboard needed'),'Quiet Support changes Together hero and mode UI');
ok(!html.includes('Today’s points')&&!html.includes('This week’s challenge'),'Quiet Support hides competitive score cards');
T.setMode('competitive');html=c.Screens.together();
ok(html.includes('Today’s points')&&html.includes('This week’s challenge'),'Competitive mode restores the fair daily/weekly contest');
T.setMode('cooperative');html=c.Screens.together();
ok(html.includes('Our week')&&html.includes('points together'),'Cooperative mode leads with combined weekly progress');
ok(!html.includes('Weekly Campfire')&&html.includes('Duo Mission')&&html.includes('Shared Dinner'),'a locally closed Campfire leaves Together while the remaining shared workflows stay visible');
ok(html.includes('Quick encouragement'),'Together includes one-tap encouragement without requiring score comparison');

c.location.hash='#duo-mission';html=c.Screens.duoMission();
eq((html.match(/class="mission-option/g)||[]).length,8,'Duo Mission screen offers four presets for this week and four for next week');
ok(html.includes('No extra grinding')&&html.includes('Healthy ceilings still win'),'Duo Mission screen explicitly rejects unhealthy game grinding');

c.location.hash='#campfire';html=c.Screens.campfire();
ok(html.includes('Around the fire')&&html.includes('Next Week Command Center'),'Weekly Campfire combines review and forward planning');
ok(html.includes('What we carry forward')&&html.includes('Close the Campfire'),'Weekly Campfire includes explicit shared intention and a close ritual');
ok(html.includes('Shared Dinner')&&html.includes('Duo Mission'),'Campfire coordinates next-week shared dinner and Duo Mission planning');

const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8'), cloud=fs.readFileSync(path.join(ROOT,'cloud.js'),'utf8'), index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'), sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
ok(app.includes("root === 'campfire'")&&app.includes("root === 'duo-mission'"),'router exposes Weekly Campfire and Duo Mission screens');
ok(app.includes("action === 'quick-encouragement'")&&app.includes("action === 'close-campfire'"),'Together interactions are wired through explicit actions');
ok(index.includes('together.js')&&sw.includes("'together.js'"),'Together module is loaded online and cached offline');
ok(cloud.includes('schema: 8')&&cloud.includes('together: window.InSyncTogether'),'partner sync is intentionally bumped and carries Together 2.0 explicit payload');
ok(app.includes("version:'6.0.0-p6.2'")&&sw.includes("CACHE = 'insync-v10-35'"),'Phase 6 runtime and cache identifiers are current');

console.log(`\nTogether 2.0 / Campfire: ${passed} passed, ${failed} failed`);process.exit(failed?1:0);
