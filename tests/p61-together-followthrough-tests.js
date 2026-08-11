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
S.set('expedition.routeId','grand');S.set('expedition.legIndex',0);S.set('expedition.legStart',S.todayKey());
const review=c.Insights.reviewWeekKey();

// Open Campfire owns the prime Together slot.
let html=c.Screens.together();
ok(html.includes('Weekly Campfire'),'open Campfire remains visible on Together until this person closes it');
ok(html.indexOf('Weekly Campfire') < html.indexOf('Together style'),'open Campfire occupies the lead Together card');

// Partner closure must never dismiss our local Campfire.
S.set('partnerData',{name:'Lizzie',initials:'LB',date:S.todayKey(),points:5,startDate:'2026-08-03',earned:[],messages:[],activity:[],reactions:{},together:{duoMissions:[],weekSummary:null,campfireIntent:{weekOf:review,text:'Keep Sunday easy.',updatedAt:new Date().toISOString(),closedAt:new Date().toISOString()},nextWeek:null}});
html=c.Screens.together();
ok(html.includes('Weekly Campfire'),'partner closedAt does not dismiss this phone’s local Campfire');

// Local close hides it and promotes the current leg.
ok(T.closeCampfire(review),'local Campfire closes');
html=c.Screens.together();
ok(!html.includes('Weekly Campfire'),'local closed Campfire disappears from Together');
ok(html.includes('North Rim')&&html.includes('Cottonwood Camp'),'current expedition leg replaces the closed Campfire at the top');
ok(html.indexOf('North Rim') < html.indexOf('Together style'),'current leg is promoted ahead of Together style after Campfire closure');

// Archive is retained locally and appears in History & Calendar.
const closed=T.closedCampfires();
ok(closed.some(x=>x.weekOf===review&&x.closedAt),'closed Campfires are retained in the local archive');
c.location.hash='#calendar/'+review.slice(0,7);html=c.Screens.calendar();
ok(html.includes('Weekly Campfires')&&html.includes('campfire-history/'+review),'History & Calendar lists the archived Campfire');
ok(html.includes('✦ Campfire closed'),'calendar legend explains the Campfire marker');
c.location.hash='#campfire-history/'+review;html=c.Screens.campfireHistory();
ok(html.includes('Campfire archive')&&html.includes('A week you closed and kept.'),'archived Campfire opens as a read-only recap surface');
ok(!html.includes('Close this Campfire'),'archive cannot re-close or mutate the completed review');

// Modes visibly change structure and no longer need a second navigation action.
T.setMode('quiet');c.location.hash='#together';html=c.Screens.together();
ok(html.includes('Same road. No scoreboard needed.')&&!html.includes('Today’s points'),'Quiet Support has a visibly distinct no-score experience');
ok(html.indexOf('Quick encouragement') < html.indexOf('Duo Mission'),'Quiet Support prioritizes encouragement ahead of missions');
T.setMode('competitive');html=c.Screens.together();
ok(html.includes('Today’s points')&&html.includes('This week’s challenge'),'Competitive immediately exposes score-and-challenge surfaces');
T.setMode('cooperative');html=c.Screens.together();
ok(html.includes('Our week')&&html.includes('points together'),'Cooperative immediately exposes combined progress');

const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8'),sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
ok(app.includes("root === 'campfire-history'")&&screens.includes('campfireHistory: campfireHistory'),'Campfire archive route is wired end to end');
ok(app.includes("InSyncTogether.setMode(el.getAttribute('data-value'))) render()"),'Together style selection re-renders immediately');
ok(app.includes("data-encouragement-status")||screens.includes('data-encouragement-status'),'Quick Encouragement has an explicit live feedback target');
ok(app.includes("Sent to '+Store.partnerName()+' ✓")&&app.includes('sync will retry automatically'),'Quick Encouragement distinguishes delivery from retry state');
ok(app.includes("location.hash='#together'")&&app.includes("action === 'close-campfire'"),'closing Campfire returns to Together so the teaser disappears immediately');
ok(app.includes("version:'6.0.0-p6.2'")&&screens.includes('Version 6.0.0-p6.2')&&sw.includes("CACHE = 'insync-v10-35'"),'P6.1 runtime, Settings and cache identifiers are current');

console.log(`\nP6.1 Together follow-through: ${passed} passed, ${failed} failed`);process.exit(failed?1:0);
