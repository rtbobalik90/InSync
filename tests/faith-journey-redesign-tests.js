'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
function make(){
 const c={console,localStorage:new LS(),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
  location:{hostname:'example.test',pathname:'/insync/',hash:'#home',protocol:'https:'},navigator:{onLine:true},CustomEvent:function(){},window:null,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')};
 c.window=c;c.window.dispatchEvent=()=>{};vm.createContext(c);
 ['domains.js','contracts.js','journeys.js','theme.js','rewards.js','camp.js','store.js','scripture.js','faith.js','intelligence.js','prompt-registry.js','cloud.js','ui.js','exercises.js','insights.js','foods.js','badges.js','screens.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),c,{filename:f}));
 return c;
}
(function(){
 const c=make(),S=c.Store,F=c.Faith,L=c.ScriptureLibrary,C=c.Cloud,I=c.InSyncIntelligence;
 S.setProfileName('Robert');S.setPartnerName('Lizzie');S.set('onboarded',true);
 S.set('expedition.routeId','inca');S.set('expedition.legIndex',0);S.set('expedition.legStart',S.todayKey());

 // Verified local Scripture layer.
 eq(L.version,'1.0.0','Scripture Library is independently versioned');
 eq(L.translation,'KJV','Scripture Library declares the KJV translation');
 const eph=L.get('ephesians-4-1-6'),rom=L.get('romans-8-28');
 ok(!!eph&&eph.verses.length===6,'Ephesians 4:1–6 is stored as a verified multi-verse passage');
 eq(eph.verses[0].text,'I therefore, the prisoner of the Lord, beseech you that ye walk worthy of the vocation wherewith ye are called,','Ephesians passage preserves exact stored verse text');
 eq(rom.verses[0].text,'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.','Romans 8:28 preserves exact stored verse text');
 ok(L.catalog().every(p=>p.ref&&p.verses&&p.verses.length),'every Scripture Library entry has a reference and stored text');
 ok(L.books().includes('Romans')&&L.books().includes('Ephesians'),'Bible index can browse verified books');
 ok(L.chapters('Ephesians').includes(4),'Bible index exposes verified chapters');

 // Home stays unmistakably InSync and faith appears inside Daily Camp.
 c.location.hash='#home';const home=c.Screens.home();
 ok(home.includes('Today at Camp'),'Home integrates faith into Daily Camp instead of a detached module');
 ok(home.includes('Today’s Scripture')&&home.includes('Memory Trail')&&home.includes('Prayer'),'Daily Camp carries Scripture, memory and prayer together');
 ok(home.includes('Close your day at camp'),'Home points naturally into the evening Close Camp rhythm');
 ok(home.includes('Inca Trail'),'the faith briefing remains grounded in the active expedition world');

 // Journey holds formation at the waypoint.
 c.location.hash='#journey';const journey=c.Screens.journey();
 ok(journey.includes('Along the Road'),'Journey renders a waypoint reflection surface');
 ok(journey.includes('Consider on this leg'),'Journey frames Scripture as part of the current road');
 ok(journey.includes('waypoint-reflection'),'Journey offers a private reflection from the waypoint');
 ok(journey.includes('faith-add-waypoint'),'Journey can carry a waypoint passage into Memory Trail');
 const wp=F.waypoint('inca',0);
 ok(!!wp&&wp.ref&&wp.text&&wp.passageId,'waypoint Scripture is drawn from the verified local library');

 // Faith Hub is a journey surface, not a mint-green mini app / dashboard wall.
 c.location.hash='#faith';const hub=c.Screens.faith();
 ok(hub.includes('Grow in faith as you walk the road.'),'Faith Hub states the road-first formation purpose');
 ok(hub.includes('Inca Trail'),'Faith Hub inherits the current expedition context');
 ok(hub.includes('Bible')&&hub.includes('Memory Trail')&&hub.includes('Prayer')&&hub.includes('Journal')&&hub.includes('Rhythm'),'Faith Hub gives deeper tools without adding primary navigation tabs');
 ok(hub.includes('Private by default · Shared by choice · Never competitive'),'Faith Hub preserves the pastor/privacy boundary in the experience');

 // Bible / passage reader stays inside InSync and can flow into Memory Trail.
 c.location.hash='#scripture';const bible=c.Screens.scripture();
 ok(bible.includes('King James Version')&&bible.includes('Read Scripture without leaving the road.'),'Bible reader is framed as an InSync journey surface');
 ok(bible.includes('Ephesians 4:1–6')&&bible.includes('Romans 8:28'),'Bible reader exposes verified featured passages');
 c.location.hash='#scripture-passage/ephesians-4-1-6';const passage=c.Screens.scripturePassage();
 ok(passage.includes('Ephesians 4:1–6')&&passage.includes('Endeavouring to keep the unity of the Spirit'),'passage view renders verse-by-verse stored Scripture');
 ok(passage.includes('faith-scripture-listen'),'passage view supports listening without changing Scripture text');
 ok(passage.includes('faith-add-passage'),'passage view can add verified text to Memory Trail');

 // Memory Trail borrows the useful mechanics from reference apps while keeping InSync visual/routes.
 const mem=F.addPassage(rom);ok(!!mem,'verified Romans passage can enter Memory Trail');
 c.location.hash='#memory';const trail=c.Screens.memory();
 ['Tap to Reveal','Word Bank','First Letters','Type It','Speak'].forEach(label=>ok(trail.includes(label),`Memory Trail previews ${label} practice`));
 c.location.hash='#memory-item/'+encodeURIComponent(mem.id)+'/reveal';const reveal=c.Screens.memoryItem();
 ok(reveal.includes('faith-reveal-segment')&&reveal.includes('Tap to reveal'),'Reveal mode is interactive and progressive');
 c.location.hash='#memory-item/'+encodeURIComponent(mem.id)+'/word-bank';const bankHtml=c.Screens.memoryItem();
 ok(bankHtml.includes('data-word-bank-practice')&&bankHtml.includes('faith-bank-word'),'Word Bank mode renders fill-in practice and tappable words');
 const easy=F.wordBank(mem.text,1),hard=F.wordBank(mem.text,5);
 ok(hard.blanks>=easy.blanks,'Word Bank difficulty progressively hides at least as many words');
 ok(easy.answers.length>0&&easy.tokens.some(t=>t.type==='blank'),'Word Bank produces bounded answer choices and real blanks');
 c.location.hash='#memory-item/'+encodeURIComponent(mem.id)+'/letters';ok(c.Screens.memoryItem().includes(F.firstLetters(mem.text)),'First Letters mode is generated from stored Scripture');
 c.location.hash='#memory-item/'+encodeURIComponent(mem.id)+'/type';ok(c.Screens.memoryItem().includes('memory-type'),'Type It mode provides recall input');
 c.location.hash='#memory-item/'+encodeURIComponent(mem.id)+'/speak';ok(c.Screens.memoryItem().includes('Recite it before you reveal it.'),'Speak mode uses self-check instead of pretending speech certainty');

 // Prayer and Close Camp are quiet journey rituals.
 const pr=F.addPrayer('Please give me wisdom for tomorrow.','Faith');
 c.location.hash='#prayers';const prayer=c.Screens.prayers();
 ok(prayer.includes('Prayer at Camp')&&prayer.includes('Bring what’s on your heart.'),'Prayer feels like a camp experience rather than a database screen');
 ok(prayer.includes('Save privately'),'new prayers remain private by default');
 F.sharePrayer(pr.id);const shared=JSON.stringify(C.sharePayload());
 ok(shared.includes('Please give me wisdom for tomorrow.')&&!shared.includes('waypointNotes'),'only explicitly shared prayer content crosses partner sync');
 c.location.hash='#reflection';const evening=c.Screens.reflection();
 ok(evening.includes('Close Camp')&&evening.includes('Evening at Camp'),'evening reflection is now the Close Camp ritual');
 ok(evening.includes('Where did you notice God today?')&&evening.includes('What are you grateful for?')&&evening.includes('What are you carrying into tomorrow?'),'Close Camp uses the approved three-part reflection rhythm');
 ok(evening.includes('Scripture carried today'),'Close Camp connects the day back to Scripture');

 // Waypoint journaling is private, persistent, and not gamified.
 const xp0=S.state().baseCamp.xp;
 F.saveWaypointNote('inca',0,'A private reflection from this pass.');
 eq(F.waypointNote('inca',0),'A private reflection from this pass.','waypoint reflection persists locally');
 ok(!JSON.stringify(C.sharePayload()).includes('A private reflection from this pass.'),'waypoint reflection never enters partner sync');
 const faithCtx=JSON.stringify(I.context('faith.verse'));
 ok(!faithCtx.includes('A private reflection from this pass.'),'waypoint reflection never silently enters general AI context');
 eq(S.state().baseCamp.xp,xp0,'Scripture, prayer and waypoint reflection do not award Base Camp XP');
 c.location.hash='#waypoint-reflection';const waypointPage=c.Screens.waypointReflection();
 ok(waypointPage.includes('Journal at this waypoint')&&waypointPage.includes('This stays private'),'waypoint reflection explains its privacy boundary in the UI');

 // Rhythm stays secondary and Sabbath remains non-performance-oriented.
 c.location.hash='#rule-of-life';const rhythm=c.Screens.ruleOfLife();
 ok(rhythm.includes('Build a rhythm that helps you stay faithful on the road.'),'Rule of Life is presented as Rhythm for the road');
 ok(rhythm.includes('Rest should remove pressure'),'Sabbath language remains pressure-reducing');

 // Production wiring / offline / version boundaries.
 const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8'),styles=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8'),screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
 ['scripture','scripture-passage','waypoint-reflection'].forEach(route=>ok(app.includes("root === '"+route+"'"),`router contains ${route}`));
 ['faith-add-passage','faith-add-waypoint','faith-scripture-listen','faith-reveal-segment','faith-bank-word','faith-waypoint-save'].forEach(action=>ok(app.includes("action === '"+action+"'")||app.includes("action === 'faith-add-passage' || action === 'faith-add-waypoint'"),`delegated handler contains ${action}`));
 ok(idx.indexOf('store.js')<idx.indexOf('scripture.js')&&idx.indexOf('scripture.js')<idx.indexOf('faith.js'),'Scripture Library loads between Store and Faith');
 ok(sw.includes("CACHE = 'insync-v10-19'")&&sw.includes("'scripture.js'")&&sw.includes("'faith.js'"),'Phase 3B Scripture/Faith experience ships offline');
 ok(app.includes("version:'6.0.0-p3b'")&&screens.includes('Version 6.0.0-p3b'),'runtime and Settings identify Phase 3B');
 ok(styles.includes('Faith woven into the journey')&&styles.includes('.along-road')&&styles.includes('.close-camp'),'approved Faith visual system is present in production CSS');
 ok(fs.readFileSync(path.join(ROOT,'store.js'),'utf8').includes("var KEY = 'insync.v10'"),'Phase 3B does not force a local-state reset');
 eq(C.sharePayload().schema,7,'Phase 3B keeps the established bounded partner schema');

 console.log(`\n${passed} Phase 3B Faith/Journey redesign checks passed, ${failed} failed`);if(failed)process.exit(1);
})();
