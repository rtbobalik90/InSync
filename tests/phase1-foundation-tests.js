'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(seed){this.m=new Map(Object.entries(seed||{}))}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
function make(seed){
 const c={console,localStorage:new LS(seed),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
  location:{hostname:'example.test',pathname:'/insync/',hash:'#home',protocol:'https:'},navigator:{onLine:true},CustomEvent:function(){},
  btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),fetch:()=>Promise.reject(new Error('offline')),window:null};
 c.window=c;c.window.dispatchEvent=()=>{};vm.createContext(c);
 ['domains.js','contracts.js','journeys.js','theme.js','rewards.js','camp.js','store.js','intelligence.js','prompt-registry.js','ui.js','exercises.js','insights.js','onboarding.js','badges.js','cloud.js','foods.js','screens.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),c,{filename:f}));
 return c;
}
const c=make(),S=c.Store;

// Domain/navigation contract.
eq(c.InSyncDomains.primary.map(x=>x.key).join(','),'home,journey,train,nutrition,together','primary navigation is the five-experience 6.0 model');
ok(c.InSyncDomains.supporting.some(x=>x.key==='coach'),'Coach remains a supporting global domain');
ok(c.InSyncDomains.supporting.some(x=>x.key==='faith')&&c.InSyncDomains.supporting.some(x=>x.key==='base-camp'),'Faith and Base Camp have explicit future domain boundaries');
const nav=c.UI.nav('journey');
ok(nav.includes('data-route="journey"')&&nav.includes('aria-current="page"'),'Journey renders as a first-class active bottom tab');
ok(!nav.includes('data-route="coach"'),'Coach no longer consumes a bottom-navigation slot');
S.setProfileName('Robert'); S.setPartnerName('Lizzie'); S.set('onboarded',true);
let header=c.UI.header({});
ok(header.includes('coach-access')&&header.includes('data-route="coach"'),'Coach is globally accessible from the standard header');
c.location.hash='#coach';header=c.UI.header({});
ok(!header.includes('coach-access'),'Coach does not render a redundant Coach shortcut on its own screen');

// Shared Journey catalog.
eq(c.Journeys.ORDER.length,12,'all twelve expedition routes live in the shared Journey catalog');
eq(c.Journeys.get('inca').name,'Inca Trail to Machu Picchu','shared Journey catalog resolves Inca Trail');
eq(c.Journeys.get('inca').legs.length,4,'Inca Trail retains all four production legs');
ok(Math.abs(c.Journeys.miles('inca')-26.1)<0.001,'route distance is derived from the shared leg data');
ok(c.Journeys.hero('inca').includes('inca-trail-leg-1.webp'),'Journey hero resolution uses the route catalog assets');
const screensSource=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
ok(!screensSource.includes("var ROUTES = {\n    camino:"),'route content has been extracted from the monolithic screen renderer');

// Theme foundation.
eq(c.InSyncTheme.get('base').name,'Base Camp','default theme pack is registered');
ok(!!c.InSyncTheme.get('inca'),'current expedition ids already have a theme-manifest seam');
S.set('expedition.routeId','inca');
eq(c.InSyncTheme.active().id,'inca','active theme follows the selected expedition when a pack exists');
ok(c.InSyncTheme.resolve('nutrition').includes('provisions.webp'),'missing expedition surface art safely falls back to Base Camp assets');

// Base Camp data model, deliberately not yet a game loop.
let camp=S.state().baseCamp;
eq(camp.schema,1,'Base Camp state has an explicit schema');
eq(camp.level,1,'new Base Camp begins at level one');
eq(camp.placed.length,3,'new Base Camp begins with three deterministic starter objects');
ok(camp.unlocked.includes('base-tent')&&camp.unlocked.includes('base-fire-ring'),'starter shelter and hearth are unlocked');
eq(c.InSyncCamp.levelForXp(0),1,'zero XP maps to camp level one');
eq(c.InSyncCamp.levelForXp(250),2,'camp XP threshold maps deterministically to level two');
eq(c.InSyncCamp.landForTier(1).cols,6,'first land tier has a bounded starter footprint');
ok(c.InSyncCamp.landForTier(4).cols>c.InSyncCamp.landForTier(1).cols,'higher land tiers expand the future buildable footprint');
const exportState=S.exportState();
ok(exportState.baseCamp&&exportState.baseCamp.placed.length===3,'Base Camp foundation is included in private backup/export state');
const cloudSource=fs.readFileSync(path.join(ROOT,'cloud.js'),'utf8');
ok(!cloudSource.includes('baseCamp'),'Base Camp is not silently added to partner sync during the architecture phase');

// Event and AI/privacy contracts.
ok(!!c.InSyncContracts.aiSkills.trainer&&!!c.InSyncContracts.aiSkills.faith,'AI skill boundaries are centralized before Intelligence Phase implementation');
ok(c.InSyncContracts.privacy.privateOnly.includes('prayer-journal'),'privacy contract keeps prayer journal private-only');
let eventSeen=false;c.InSyncRewards.on(c.InSyncContracts.events.EXPEDITION_COMPLETED,()=>eventSeen=true);
ok(c.InSyncRewards.emit(c.InSyncContracts.events.EXPEDITION_COMPLETED,{routeId:'inca'})&&eventSeen,'reward bus accepts declared domain events');
ok(c.InSyncRewards.emit('made.up.event',{})===false,'reward bus rejects undeclared event types');

// Journey screen states.
S.set('expedition.routeId',''); c.location.hash='#journey'; let html=c.Screens.journey();
ok(html.includes('Choose the road together')&&html.includes('Choose an expedition'),'Journey has a useful no-expedition state');
S.set('expedition.routeId','inca');S.set('expedition.legIndex',0);S.set('expedition.legStart',S.todayKey());S.set('expedition.legStartSteps',0);S.setSteps(5000);c.location.hash='#journey';html=c.Screens.journey();
ok(html.includes('Current expedition')&&html.includes('Checkpoints'),'Journey Hub renders route progress and the checkpoint map');
ok(html.includes('Km 82')&&html.includes('Wayllabamba'),'Journey Hub renders the current leg from shared route data');
ok(html.includes('Expedition passport'),'Journey Hub establishes the permanent passport surface');

// Wiring/version/cache.
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
ok(app.includes("var TABS = ['home', 'journey', 'train', 'nutrition', 'together']"),'router uses Journey in the primary tab set');
ok(app.includes("else if (root === 'coach') html = Screens.coach()"),'Coach remains routable after leaving bottom navigation');
ok(index.indexOf('journeys.js')<index.indexOf('screens.js')&&index.indexOf('camp.js')<index.indexOf('store.js'),'foundation modules load before their consumers');
ok(sw.includes("CACHE = 'insync-v10-28'")&&sw.includes("'journeys.js'")&&sw.includes("'camp.js'"),'service-worker shell contains the complete Phase 1 foundation');
ok(app.includes("version:'6.0.0-p5.6'")&&screensSource.includes('Version 6.0.0-p5.6'),'runtime and Settings preserve the Phase 1 foundation in the Phase 2 build');

console.log(`\n${passed} Phase 1 foundation checks passed, ${failed} failed`);
if(failed)process.exit(1);
