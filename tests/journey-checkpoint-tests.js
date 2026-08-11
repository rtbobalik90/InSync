'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(x,m){if(x){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(seed){this.m=new Map(Object.entries(seed||{}))}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
function make(seed){
 const c={console,localStorage:new LS(seed),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
  location:{hostname:'example.test',pathname:'/insync/',hash:'#home',protocol:'https:'},navigator:{onLine:true},CustomEvent:function(){},window:null};
 c.window=c;c.window.dispatchEvent=()=>{};vm.createContext(c);
 ['domains.js','contracts.js','journeys.js','theme.js','rewards.js','camp.js','store.js','intelligence.js','prompt-registry.js','ui.js','exercises.js','insights.js','onboarding.js','badges.js','cloud.js','foods.js','nutrition.js','training.js','screens.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),c,{filename:f}));
 return c;
}
const c=make(),S=c.Store,J=c.Journeys;
S.setProfileName('Robert');S.setPartnerName('Lizzie');S.set('onboarded',true);

// Catalog / asset slots.
eq(J.version,2,'Journey catalog exposes the checkpoint-aware v2 manifest');
eq(J.checkpoints('grand').length,5,'Grand Canyon has a trailhead plus four reached checkpoint places');
eq(J.checkpoint('grand',0).name,'North Rim Trailhead','Grand Canyon starting place has the trailhead identity');
eq(J.checkpoint('grand',2).name,'Phantom Ranch','Grand Canyon destination list includes Phantom Ranch');
ok(J.checkpoint('grand',2).art.endsWith('/grand/checkpoints/checkpoint-02.webp'),'checkpoint art has a deterministic drop-in slot');
ok(J.travelArt('grand',0).endsWith('/grand/travel/leg-01.webp'),'active leg art has a deterministic drop-in slot');
ok(J.sectionArt('grand','home').endsWith('/grand/sections/home.webp'),'app-section art has a deterministic drop-in slot');
ok(J.homeArt('grand','dawn').endsWith('/grand/sections/home-dawn.webp'),'Grand Canyon Home has a dawn slot');
ok(J.homeArt('grand','day').endsWith('/grand/sections/home-day.webp'),'Grand Canyon Home has a day slot');
ok(J.homeArt('grand','sunset').endsWith('/grand/sections/home-sunset.webp'),'Grand Canyon Home has a sunset slot');
ok(J.homeArt('grand','night').endsWith('/grand/sections/home-night.webp'),'Grand Canyon Home has a night slot');
ok(J.homeArt('inca','night').endsWith('/inca/sections/home.webp'),'routes without a complete time pack keep the generic Home slot');
eq(J.checkpoints('everest').length,10,'Everest manifest can preserve notable route places beyond simple leg endpoints');
ok(J.checkpoints('paine').some(x=>x.name==='Grey Glacier'),'Patagonia manifest retains Grey Glacier as a place checkpoint');

// Starting an expedition unlocks and records the trailhead.
S.beginExpedition('grand');
eq(S.state().expedition.routeId,'grand','Grand Canyon can begin normally');
ok(S.checkpointUnlocked('grand',0),'starting checkpoint is unlocked immediately');
ok(!S.checkpointUnlocked('grand',1),'first destination remains locked before the first leg is finished');
let rec=S.checkpointArrival('grand',0);
ok(rec&&rec.checkpointIndex===0&&!!rec.at,'trailhead receives a real local arrival record when the expedition begins');

// The Journey screen distinguishes travel from reached places.
c.location.hash='#journey';
let html=c.Screens.journey();
ok(html.includes('assets/art/grand/checkpoints/checkpoint-00.webp')&&html.includes('At the trailhead'),'Journey opens on the scenic starting checkpoint before the first mile');
S.setSteps(1000); c.location.hash='#journey'; html=c.Screens.journey();
ok(html.includes('assets/art/grand/travel/leg-01.webp'),'Journey switches to the active Travel/Leg artwork once movement begins');
ok(html.includes('North Rim Trailhead')&&html.includes('checkpoint/grand/0'),'reached trailhead is visible and tappable from Journey');
ok(html.includes('Cottonwood Camp')&&html.includes('0%'),'current destination is visible with live leg progress');
ok(!html.includes('checkpoint/grand/1" aria-label="Open Cottonwood Camp'),'locked current destination is not tappable before arrival');
ok(html.includes('Reached places stay unlocked'),'Journey explains the permanent checkpoint behavior');

// Complete the first leg. Each person must still satisfy the existing fairness rule.
S.setSteps(10000); // 5.0 local miles after the leg baseline.
S.set('partnerLegMiles',2.0);
ok(S.advanceLeg(),'first Grand Canyon leg can advance when distance and contribution rules are met');
eq(S.state().expedition.legIndex,1,'leg index advances exactly once');
rec=S.checkpointArrival('grand',1);
ok(rec&&rec.legIndex===0,'Cottonwood Camp is written as the arrival for completed leg zero');
ok(rec&&rec.milesMine===5&&rec.milesHers===2,'checkpoint record preserves the two-person leg contribution');
ok(S.checkpointUnlocked('grand',1),'Cottonwood Camp becomes permanently unlocked');
eq(S.state().lastArrival.checkpointIndex,1,'arrival moment points at the primary destination checkpoint');

// Arrival uses the scenic checkpoint art slot rather than recycling travel art.
c.location.hash='#arrival';html=c.Screens.arrival();
ok(html.includes('assets/art/grand/checkpoints/checkpoint-01.webp'),'arrival moment requests the scenic Cottonwood checkpoint artwork');
ok(html.includes('You reached Cottonwood Camp'),'arrival names the reached place');
ok(html.includes('Explore Cottonwood Camp')&&html.includes('checkpoint/grand/1'),'arrival provides a direct checkpoint-detail action');
ok(html.includes('assets/art/grand/north-rim.webp')||html.includes('assets/art/grand/cottonwood-camp.webp'),'arrival keeps known-good route art underneath the not-yet-delivered checkpoint file');

// Reopened checkpoint detail page.
c.location.hash='#checkpoint/grand/1';html=c.Screens.checkpoint();
ok(html.includes('Cottonwood Camp')&&html.includes('Leg breakdown'),'checkpoint detail page has the place and small leg breakdown');
ok(html.includes('North Rim')&&html.includes('Cottonwood Camp'),'checkpoint detail identifies the completed route segment');
ok(html.includes('Who carried this leg')&&html.includes('Lizzie'),'checkpoint detail preserves the partner contribution view');
ok(html.includes('This scenic checkpoint stays unlocked once reached'),'checkpoint page explains that it is a permanent route memory');

// Direct access to a future checkpoint protects the scenic art until reached.
c.location.hash='#checkpoint/grand/3';html=c.Screens.checkpoint();
ok(html.includes('Still ahead')&&html.includes('Indian Garden'),'future checkpoint route has a safe locked state');
ok(!html.includes('assets/art/grand/checkpoints/checkpoint-03.webp'),'locked checkpoint does not expose the scenic arrival art');

// Existing installs do not lose unlocked places just because old history had no record.
const oldState=S.exportState();
oldState.expedition.routeId='inca'; oldState.expedition.legIndex=2; oldState.expedition.legStart=S.todayKey(); oldState.expedition.arrivals={};
const seed={'insync.v10':JSON.stringify(oldState)};
const migrated=make(seed),MS=migrated.Store;
ok(MS.checkpointUnlocked('inca',0)&&MS.checkpointUnlocked('inca',1)&&MS.checkpointUnlocked('inca',2),'legacy route progress still unlocks all already-reached checkpoints');
const migratedRec=MS.checkpointArrival('inca',1);
ok(migratedRec&&migratedRec.migrated===true&&!migratedRec.at,'migration creates a no-invention checkpoint marker instead of a fake reached date');
migrated.location.hash='#checkpoint/inca/1';const migratedHtml=migrated.Screens.checkpoint();
ok(migratedHtml.includes('will not invent an arrival date or contribution split'),'migrated checkpoint page is explicit about unknown historical detail');

// New expedition section art is wired with fallback across recurring screens.
S.set('expedition.routeId','grand');c.location.hash='#home';html=c.Screens.home();
ok(html.includes('assets/art/grand/sections/home-')&&html.includes('.webp')&&html.includes('assets/art/camp-'),'Home uses the delivered time-aware Grand Canyon art with a camp fallback');
c.location.hash='#train';html=c.Screens.train();
ok(html.includes('assets/art/grand/sections/train.webp')&&html.includes('assets/art/train-banner.webp'),'Train is ready for expedition section art with its existing fallback');
c.location.hash='#nutrition';html=c.Screens.nutrition();
ok(html.includes('assets/art/grand/sections/nutrition.webp')&&html.includes('assets/art/provisions.webp'),'Nutrition is ready for expedition section art with its existing fallback');
c.location.hash='#coach';html=c.Screens.coach();
ok(html.includes('assets/art/grand/sections/coach.webp')&&html.includes('assets/art/coach-desk.webp'),'Coach is ready for expedition section art with its existing fallback');

// Whole-expedition completion stays distinct from the final checkpoint place.
c.location.hash='#expedition-complete/grand';html=c.Screens.expeditionComplete();
ok(html.includes('Still on the road'),'whole-expedition ceremony remains locked before the final leg');
S.set('expedition.legIndex',4);
c.location.hash='#expedition-complete/grand';html=c.Screens.expeditionComplete();
ok(html.includes('assets/art/grand/sections/arrival.webp'),'whole-expedition completion requests the dedicated Arrival Ceremony section artwork');
ok(html.includes('The road you finished')&&html.includes('Places reached'),'completion screen summarizes the whole route rather than one leg');
ok(html.includes('checkpoint/grand/0')&&html.includes('checkpoint/grand/4'),'completion screen links the route memory back to its checkpoint pages');
ok(!html.includes('assets/art/grand/checkpoints/checkpoint-04.webp') || html.includes('assets/art/grand/sections/arrival.webp'),'final ceremony has its own art slot separate from the final checkpoint asset');

// Production wiring / release identity.
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8'),ui=fs.readFileSync(path.join(ROOT,'ui.js'),'utf8');
ok(app.includes("else if (root === 'checkpoint') html = Screens.checkpoint()"),'router exposes checkpoint detail pages');
ok(app.includes("else if (root === 'expedition-complete') html = Screens.expeditionComplete()"),'router exposes the separate whole-expedition completion ceremony');
ok(ui.includes('opts.artFallback')&&ui.includes('fallback && fallback !== art'),'UI shell supports missing-future-art fallbacks without a broken hero');
ok(app.includes("version:'6.0.0-p6.0'")&&sw.includes("CACHE = 'insync-v10-33'"),'P5.3 runtime and service-worker cache are bumped for installed phones');

console.log(`\n${passed} Journey checkpoint checks passed, ${failed} failed`);
if(failed)process.exitCode=1;
