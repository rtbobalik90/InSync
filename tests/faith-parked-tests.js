'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(seed){this.m=new Map(Object.entries(seed||{}))}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
function make(){
 const c={console,localStorage:new LS(),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
  location:{hostname:'example.test',pathname:'/insync/',hash:'#home',protocol:'https:'},navigator:{onLine:true},CustomEvent:function(){},window:null,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')};
 c.window=c;c.window.dispatchEvent=()=>{};vm.createContext(c);
 ['domains.js','contracts.js','journeys.js','theme.js','rewards.js','camp.js','store.js','intelligence.js','prompt-registry.js','cloud.js','ui.js','exercises.js','insights.js','foods.js','badges.js','screens.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),c,{filename:f}));
 return c;
}
(function(){
 const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
 const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
 const screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
 ok(fs.existsSync(path.join(ROOT,'faith.js'))&&fs.existsSync(path.join(ROOT,'scripture.js')),'Faith and Scripture source files are preserved for a future revisit');
 ok(!index.includes('<script src="faith.js"></script>')&&!index.includes('<script src="scripture.js"></script>'),'parked Faith modules are not loaded by the production app');
 ok(!sw.includes("'faith.js'")&&!sw.includes("'scripture.js'"),'parked Faith modules are not precached into the active shell');
 ok(sw.includes("CACHE = 'insync-v10-26'"),'service-worker cache is bumped so the parked build replaces the previous Faith UI');
 ['faith','memory','memory-item','scripture','scripture-passage','waypoint-reflection','prayers','rule-of-life'].forEach(r=>ok(!app.includes("root === '"+r+"'"),`router does not expose ${r}`));
 ['faith-add-passage','faith-add-waypoint','faith-waypoint-save','faith-add-today','faith-prayer-add','faith-sabbath-toggle'].forEach(a=>ok(!app.includes("action === '"+a+"'"),`production event layer does not expose ${a}`));
 const c=make(),S=c.Store,C=c.Cloud;S.setProfileName('Robert');S.setPartnerName('Lizzie');S.set('onboarded',true);
 let home=c.Screens.home();
 ok(!home.includes('Today at Camp')&&!home.includes('Memory Trail')&&!home.includes('Faith Hub'),'Home no longer contains the dedicated Faith experience');
 ok(home.includes('Verse for the day'),'the original daily Scripture line remains part of the existing InSync Home experience');
 let journey=c.Screens.journey();
 ok(!journey.includes('Along the Road')&&!journey.includes('Consider on this leg'),'Journey has no dedicated Faith waypoint surface while Faith is parked');
 let coach=c.Screens.coach();
 ok(!coach.includes('Faith Hub')&&!coach.includes('Open Faith'),'Coach has no dedicated Faith entry point');
 c.location.hash='#home';let reflection=c.Screens.reflection();
 ok(!reflection.includes('Close Camp')&&!reflection.includes('data-route="faith"'),'evening reflection is restored to the pre-Faith-section experience');
 ok(!screens.includes("aiPreferenceRow('Faith emphasis'"),'Faith emphasis is hidden from active Coach settings while the section is parked');
 ok(!screens.includes('Faith Companion'),'active Coach settings do not advertise a parked Faith skill');
 ok(S.state().faith&&S.state().faith.schema===1,'existing Faith state remains intact in storage so future work can resume without destructive migration');
 S.set('faith.gratitude.'+S.todayKey(),'Preserved private value');
 const exported=S.exportState();
 ok(exported.faith&&exported.faith.gratitude[S.todayKey()]==='Preserved private value','private parked Faith data remains in backups');
 const payload=C.sharePayload();
 eq(payload.schema,7,'partner sync schema stays at 7 to avoid a protocol downgrade');
 ok(payload.sharedPrayer==null&&Array.isArray(payload.prayerAcks)&&payload.prayerAcks.length===0,'no Faith sharing is emitted while the Faith module is not loaded');
 ok(app.includes("version:'6.0.0-p5.4'")&&screens.includes('Version 6.0.0-p5.4'),'runtime and Settings identify the parked Phase 3 build');
 console.log(`\n${passed} Faith parking checks passed, ${failed} failed`);if(failed)process.exit(1);
})();
