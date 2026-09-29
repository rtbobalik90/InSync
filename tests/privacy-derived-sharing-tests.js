'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,m+' (got '+JSON.stringify(a)+')')}
class LS{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const c={console,localStorage:new LS(),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
 location:{hostname:'example.test',pathname:'/insync/',hash:'',protocol:'https:'},navigator:{},CustomEvent:function(){},document:{},
 btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),window:null};
c.window=c;c.window.dispatchEvent=()=>{};vm.createContext(c);
['domains.js','contracts.js','journeys.js','theme.js','rewards.js','camp.js','store.js','intelligence.js','prompt-registry.js','ui.js','media.js','exercises.js','training.js','nutrition.js','insights.js','together.js','onboarding.js','badges.js','cloud.js','foods.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),c,{filename:f}));
const S=c.Store,T=c.InSyncTogether,C=c.Cloud,week=T.currentWeek(),today=S.todayKey();
S.setProfileName('Robert');S.setPartnerName('Lizzie');S.set('onboarded',true);S.set('profile.startDate',week);

function privacy(weight,calories,workouts,steps){S.set('privacy.weight',weight);S.set('privacy.calories',calories);S.set('privacy.workouts',workouts);S.set('privacy.steps',steps)}
function missionRows(){return T.sharePayload().duoMissions}

// Populate unmistakable values so a false pass cannot come from an empty log.
S.set('days.'+today+'.meals',[{slot:'Dinner',name:'PRIVATE MEAL',kcal:2200,protein:180}]);
S.set('days.'+today+'.workouts',[{name:'PRIVATE WORKOUT',minutes:45,exercises:[{name:'PRIVATE LIFT',weight:777,sets:4}]}]);
S.setSteps(24680,today);S.set('days.'+today+'.weight',186.4);

privacy(false,false,false,false);
T.setMission(week,'trail-12');
eq(missionRows().length,0,'trail mission progress is omitted when steps sharing is off');
privacy(false,false,false,true);
eq(missionRows().length,1,'trail mission progress is shared when steps sharing is on');

privacy(false,false,false,false);
T.setMission(week,'train-6');
eq(missionRows().length,0,'training mission progress is omitted when workout sharing is off');
privacy(false,false,true,false);
eq(missionRows().length,1,'training mission progress is shared when workout sharing is on');

T.setMission(week,'strong-8');
privacy(true,true,true,true);
eq(missionRows().length,1,'score-derived mission progress is shared when every score category is allowed');
['weight','calories','workouts','steps'].forEach(function(key){
 privacy(true,true,true,true);S.set('privacy.'+key,false);
 eq(missionRows().length,0,'score-derived mission progress is omitted when '+key+' sharing is off');
});
T.setMission(week,'perfect-4');
privacy(false,false,false,false);
eq(missionRows().length,0,'perfect-day mission cannot bypass disabled health sharing');

// Perfect-day social activity is another derived progress disclosure. Stub the
// activity source so the boundary itself is tested independently of scoring.
c.Insights.localActivity=function(){return [
 {id:'a:robert:'+today+':score',date:today,type:'score',text:'Closed the day 10 of 10'},
 {id:'a:robert:'+today+':protein',date:today,type:'protein',text:'PRIVATE PROTEIN'},
 {id:'a:robert:'+today+':steps',date:today,type:'steps',text:'PRIVATE STEPS'},
 {id:'a:robert:'+today+':workout:0',date:today,type:'workout',text:'PRIVATE WORKOUT'}
]};
privacy(false,false,false,false);
eq(C.sharePayload().activity.length,0,'all derived activity is omitted when all health sharing is off');
privacy(false,true,false,false);
eq(C.sharePayload().activity.map(x=>x.type).join(','),'protein','energy sharing permits only protein activity');
privacy(false,false,true,false);
eq(C.sharePayload().activity.map(x=>x.type).join(','),'workout','workout sharing permits only workout activity');
privacy(false,false,false,true);
eq(C.sharePayload().activity.map(x=>x.type).join(','),'steps','step sharing permits only step activity');
privacy(true,true,true,true);
ok(C.sharePayload().activity.some(x=>x.type==='score'),'perfect-day activity is shared only with every score category allowed');

privacy(false,false,false,false);
const serialized=JSON.stringify(C.sharePayload());
['PRIVATE MEAL','PRIVATE WORKOUT','PRIVATE LIFT','PRIVATE PROTEIN','PRIVATE STEPS','24680','186.4','777'].forEach(function(secret){
 ok(serialized.indexOf(secret)<0,'disabled sharing payload excludes '+secret);
});

console.log('\nPrivacy-derived sharing: '+passed+' passed, '+failed+' failed');
process.exit(failed?1:0);
