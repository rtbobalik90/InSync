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
 ['domains.js','contracts.js','journeys.js','theme.js','rewards.js','camp.js','store.js','faith.js','intelligence.js','prompt-registry.js','cloud.js','ui.js','exercises.js','insights.js','foods.js','badges.js','screens.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),c,{filename:f}));
 return c;
}
(function(){
 const c=make(),S=c.Store,F=c.Faith,C=c.Cloud,I=c.InSyncIntelligence;
 S.setProfileName('Robert');S.setPartnerName('Lizzie');S.set('onboarded',true);

 // Additive local state and no game economy coupling.
 ok(!!S.state().faith&&S.state().faith.schema===1,'Faith state exists as an additive schema without resetting the owner log');
 eq(F.version,'1.0.0','Faith Foundation module has an explicit version');
 eq(S.state().faith.sabbath.enabled,true,'Sabbath pressure relief defaults on');
 eq(S.state().faith.sabbath.day,0,'Sunday is the default Sabbath day');
 const xp0=S.state().baseCamp.xp;

 // Scripture Memory Trail uses only verified in-app verse text.
 const today=S.verse(),m=F.addVerse(today);
 ok(!!m&&m.text===today.text&&m.ref===today.ref,'today’s verified in-app verse can be added to the Memory Trail');
 eq(F.memory().length,1,'adding the same verse once creates one memory record');
 F.addVerse(today);eq(F.memory().length,1,'adding the same verse again does not duplicate it');
 eq(F.memoryStatus(m),'Learning','new memory starts Learning');
 ok(F.hideWords(m.text,3).includes('____'),'hide-words practice removes selected words instead of changing Scripture');
 ok(F.firstLetters(m.text).includes('…'),'first-letter practice preserves only prompts');
 F.advanceMemory(m.id);F.advanceMemory(m.id);F.advanceMemory(m.id);
 eq(F.memoryItem(m.id).stage,4,'read, hidden-word and first-letter steps advance to typed recall');
 let typed=F.checkTyped(m.id,m.text);
 ok(typed.ok&&typed.accuracy===1,'exact typed recall passes with 100 percent accuracy');
 eq(F.memoryItem(m.id).stage,5,'successful typed recall advances to recitation/self-check');
 let reviewed=F.reviewMemory(m.id,'good');
 eq(reviewed.stage,6,'self-check schedules the verse into spaced review');
 ok(!!reviewed.reviewDue&&reviewed.reviewDue>S.todayKey(),'spaced review sets a future review date');
 ok(reviewed.intervalDays>=3,'a successful first review expands beyond next-day repetition');
 ok(['Familiar','Memorized'].includes(F.memoryStatus(reviewed)),'reviewed memory moves beyond Learning without a streak mechanic');
 const beforeDue=reviewed.reviewDue;F.reviewMemory(m.id,'again');
 eq(F.memoryItem(m.id).intervalDays,1,'Again safely returns a verse to one-day review');
 ok(F.memoryItem(m.id).reviewDue<=beforeDue,'Again shortens review spacing rather than deleting progress');
 eq(S.state().baseCamp.xp,xp0,'Scripture practice never awards Base Camp XP');

 // Prayer journal is private by default with explicit one-request sharing.
 const privatePrayer=F.addPrayer('Private journal prayer about a family concern.','Family');
 const sharedPrayer=F.addPrayer('Please pray for wisdom this week.','Faith');
 eq(F.prayers().length,2,'prayer journal stores multiple private requests');
 eq(S.state().faith.sharedPrayerId,'','saving a prayer does not share it automatically');
 F.markAnswered(privatePrayer.id,'A private answer note that must remain on this phone.');
 eq(F.prayer(privatePrayer.id).status,'answered','prayer can move into an answered state');
 ok(!!F.prayer(privatePrayer.id).answeredAt,'answered prayer keeps its own timestamp');
 F.reopenPrayer(privatePrayer.id);eq(F.prayer(privatePrayer.id).status,'ongoing','answered prayer can be reopened without creating a duplicate');
 F.sharePrayer(sharedPrayer.id);eq(S.state().faith.sharedPrayerId,sharedPrayer.id,'one prayer request is explicitly selected for partner sharing');
 const outbound=C.sharePayload(),outJson=JSON.stringify(outbound);
 eq(outbound.schema,7,'Faith sharing advances partner sync to schema 7');
 ok(outbound.sharedPrayer&&outbound.sharedPrayer.id===sharedPrayer.id&&outbound.sharedPrayer.text===sharedPrayer.text,'shared payload includes the explicitly selected prayer request');
 ok(!outJson.includes('Private journal prayer')&&!outJson.includes('private answer note'),'unshared prayer text and answer notes never enter partner sync');
 F.saveGratitude('Private gratitude for today.');S.saveReflection('Private reflection for today.');
 const outbound2=JSON.stringify(C.sharePayload());
 ok(!outbound2.includes('Private gratitude')&&!outbound2.includes('Private reflection'),'gratitude and reflection remain private even when a prayer is shared');
 F.unsharePrayer(sharedPrayer.id);ok(C.sharePayload().sharedPrayer==null,'making a prayer private removes it from the next sync payload');

 // Sanitized inbound prayer and acknowledgement handshake.
 const raw={schema:7,name:'Lizzie',initials:'LZ',date:S.todayKey(),updated:new Date().toISOString(),points:5,streak:2,earned:[],history:{points:{},logged:{}},
  sharedPrayer:{id:'prayer-from-lizzie',text:'Please pray for peace before tomorrow.',category:'Relationship',createdAt:new Date().toISOString()},
  prayerAcks:[{id:'old-prayer',at:new Date().toISOString()}]};
 const sane=C.sanitizePartnerPayload(raw);
 ok(sane.sharedPrayer&&sane.sharedPrayer.text==='Please pray for peace before tomorrow.','partner prayer request is accepted only through the bounded sync schema');
 eq(sane.sharedPrayer.category,'Relationship','shared prayer category survives sanitation');
 eq(sane.prayerAcks.length,1,'partner prayer acknowledgements are bounded and sanitized');
 S.set('partnerData',sane);
 ok(F.partnerSharedPrayer().id==='prayer-from-lizzie','Faith reads the partner’s explicitly shared prayer');
 ok(!F.prayedForPartner('prayer-from-lizzie'),'partner prayer begins unacknowledged');
 F.ackPartnerPrayer('prayer-from-lizzie');ok(F.prayedForPartner('prayer-from-lizzie'),'I prayed for this is stored as acknowledgement, not score');
 ok(C.sharePayload().prayerAcks.some(a=>a.id==='prayer-from-lizzie'),'prayer acknowledgement crosses back on the next partner sync');
 eq(S.state().baseCamp.xp,xp0,'prayer and acknowledgement never award XP');

 // Gratitude is date-keyed and independent from reflection/points.
 F.saveGratitude('Thankful for a quiet meal with family.');
 eq(F.gratitude(),'Thankful for a quiet meal with family.','gratitude saves independently for today');
 ok(F.gratitudeEntries(5).some(g=>g.date===S.todayKey()),'gratitude history is retrievable by date');
 const pointsBefore=S.points();F.saveGratitude('Still thankful.');eq(S.points(),pointsBefore,'gratitude does not alter competitive daily health points');

 // Sabbath mode is calendar-based and removes score-closing pressure from primary surfaces.
 const todayDay=new Date(S.todayKey()+'T12:00:00').getDay();F.setSabbath(true,todayDay);
 ok(F.isSabbath(),'configured Sabbath is active on the selected weekday');
 let home=c.Screens.home();
 ok(home.includes('Sabbath mode')&&home.includes('Today is not a score to close'),'Home replaces deficit pressure with Sabbath language');
 ok(!home.includes('to go</div>'),'Sabbath Home does not render the normal target-deficit ledger');
 let coach=c.Screens.coach();
 ok(coach.includes('Coach will not turn today into a list to close'),'Coach respects Sabbath instead of demanding a clean score');
 F.setSabbath(false,todayDay);ok(!F.isSabbath(),'Sabbath can be turned off without deleting any faith data');
 coach=c.Screens.coach();ok(coach.includes('data-route="faith"')&&coach.includes('Faith Hub'),'ordinary Coach always provides a route into Faith');

 // Rule of Life is a non-scored private weekly rhythm.
 S.set('faith.ruleOfLife.worship','Sunday worship with church.');
 S.set('faith.ruleOfLife.rest','Protect one slower block each week.');
 eq(F.ruleConfiguredCount(),2,'Rule of Life reports only the areas actually configured');
 eq(F.ruleOfLife().worship,'Sunday worship with church.','Rule of Life keeps the owner’s own wording');
 eq(S.state().baseCamp.xp,xp0,'Rule of Life configuration never awards XP');

 // Faith screens are functional, reachable and explicit about privacy/non-competition.
 c.location.hash='#faith';let faithHtml=c.Screens.faith();
 ok(faithHtml.includes('Scripture Memory Trail')&&faithHtml.includes('Prayer Journal')&&faithHtml.includes('Rule of Life'),'Faith Hub exposes the full Phase 3 formation system');
 ok(faithHtml.includes('never partner rankings or competitive points'),'Faith Hub explicitly separates spiritual practice from competition');
 c.location.hash='#memory';let memoryHtml=c.Screens.memory();ok(memoryHtml.includes('Memory Trail')&&memoryHtml.includes(today.ref),'Memory Trail renders the verified verse collection');
 c.location.hash='#memory-item/'+encodeURIComponent(m.id);let itemHtml=c.Screens.memoryItem();ok(itemHtml.includes(m.ref),'memory-item route renders the selected verse');
 c.location.hash='#prayers';let prayersHtml=c.Screens.prayers();ok(prayersHtml.includes('Private by default')&&prayersHtml.includes('Save privately'),'Prayer Journal explains and implements private-by-default capture');
 c.location.hash='#rule-of-life';let ruleHtml=c.Screens.ruleOfLife();ok(ruleHtml.includes('Body stewardship')&&ruleHtml.includes('Relationship / family'),'Rule of Life covers body and relationship rhythms alongside spiritual ones');
 c.location.hash='#home';let reflection=c.Screens.reflection();ok(reflection.includes('id="gratitude"')&&reflection.includes('Open Faith Hub'),'evening reflection includes optional gratitude and a Faith Hub route');

 // Intelligence sees safe counts/state but not private spiritual text.
 let faithCtx=I.context('faith.verse'),faithJson=JSON.stringify(faithCtx);
 ok(faithCtx.faith.memoryTotal>=1&&faithCtx.faith.ongoingPrayerCount>=1,'Faith AI context can see safe structural counts');
 ok(faithCtx.faith.privateJournalIncluded===false,'Faith AI context explicitly excludes private journal content');
 ok(!faithJson.includes('Private journal prayer')&&!faithJson.includes('Still thankful')&&!faithJson.includes('Sunday worship with church'),'AI context does not silently receive prayer, gratitude or Rule-of-Life text');

 // Backup/restore keeps the owner’s private faith data locally and normalizes it.
 const exported=S.exportState();ok(exported.faith&&exported.faith.prayers.length===2,'private backup contains the owner’s Faith history for recovery');
 const d=make();d.Store.importState(exported);
 eq(d.Store.state().faith.prayers.length,2,'restore preserves prayer journal history');
 eq(d.Store.state().faith.memory.length,1,'restore preserves Scripture Memory Trail');
 eq(d.Faith.gratitude(),'Still thankful.','restore preserves gratitude locally');

 // Wiring / offline shell / versioning.
 const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8'),app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
 ok(index.indexOf('store.js')<index.indexOf('faith.js')&&index.indexOf('faith.js')<index.indexOf('intelligence.js'),'Faith loads after Store and before Intelligence');
 ok(sw.includes("CACHE = 'insync-v10-18'")&&sw.includes("'faith.js'"),'Faith Foundation ships in the offline PWA shell');
 ok(app.includes("version:'6.0.0-p3'")&&screens.includes('Version 6.0.0-p3'),'runtime and Settings identify the Phase 3 build');
 ['faith','memory','memory-item','prayers','rule-of-life'].forEach(route=>ok(app.includes("root === '"+route+"'"),`router contains ${route}`));
 ['faith-add-today','faith-memory-check','faith-memory-review','faith-prayer-add','faith-prayer-share','faith-prayer-ack','faith-sabbath-toggle'].forEach(action=>ok(app.includes("action === '"+action+"'"),`delegated handler contains ${action}`));
 const faithSource=fs.readFileSync(path.join(ROOT,'faith.js'),'utf8');
 ok(!/Rewards\.emit|baseCamp\.xp|FAITH_MILESTONE/.test(faithSource),'Faith module has no XP/reward emission path');

 console.log(`\n${passed} Phase 3 Faith Foundation checks passed, ${failed} failed`);if(failed)process.exit(1);
})();
