'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(seed){this.m=new Map(Object.entries(seed||{}))}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
function make(seed){
 const c={console,localStorage:new LS(seed),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
  location:{hostname:'example.test',pathname:'/insync/',hash:'#home',protocol:'https:'},navigator:{onLine:false},CustomEvent:function(){},document:{},window:null};
 c.window=c;c.window.dispatchEvent=()=>{};vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(ROOT,'store.js'),'utf8'),c,{filename:'store.js'});
 c.UI={esc:s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;'),CAMP:{dawn:'d.webp',day:'d.webp',sunset:'d.webp',night:'d.webp'},SCRIMS:{light:'none'},screen:o=>JSON.stringify(o)};
 vm.runInContext(fs.readFileSync(path.join(ROOT,'trail-notes.js'),'utf8'),c,{filename:'trail-notes.js'});
 return c;
}
const c=make(),S=c.Store,T=c.InSyncTrailNotes;
eq(T.all().length,6,'initial journal ships six concise milestone notes');
eq(T.unseen().length,6,'all milestone notes are unseen on the first Trail Notes capable build');
let html=T.modal(T.unseen());
ok(html.includes('Notes from the Trail')&&html.includes('Clear all')&&html.includes('View Trail Notes'),'popup exposes story title, Clear all and detailed journal route');
ok((html.match(/data-action="trail-note-dismiss"/g)||[]).length===6,'unseen notes stack with one clear control each');
ok(html.includes('6 unread trail notes'),'popup states the stacked unread count plainly');

const first=T.all()[0].id;
ok(T.dismiss(first),'one trail note can be cleared locally');
eq(T.unseen().length,5,'clearing one leaves the rest stacked');
ok(T.seen(first),'cleared note is recorded as read on this phone');
const remaining=T.unseen(), key=T.keyFor(remaining), story='The camp shifted while you were away, and the exact field notes remain below.';
ok(T.saveStory(remaining,story),'AI-style story cache can be saved without marking notes read');
eq(T.cachedStory(remaining),story,'story cache is keyed to the exact unseen set');
ok(T.dismiss(remaining[0].id),'changing unread set succeeds');
eq(T.cachedStory(T.unseen()),'','story cache never leaks onto a different unread set');

html=T.screen();
ok(html.includes('Trail Notes')&&html.includes('Field journal'),'detailed Trail Notes screen is available');
ok(html.includes('Read')&&html.includes('New'),'journal distinguishes cleared and unread entries');
ok(T.clearAll(),'Clear all marks every currently shipped note read');
eq(T.unseen().length,0,'no popup remains after Clear all');
eq(T.fallbackStory([]),'The trail is quiet. You are caught up.','offline fallback has a stable caught-up state');

const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const cloud=fs.readFileSync(path.join(ROOT,'cloud.js'),'utf8');
const prompts=fs.readFileSync(path.join(ROOT,'prompt-registry.js'),'utf8');
const store=fs.readFileSync(path.join(ROOT,'store.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
const styles=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
const screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
ok(app.includes("root === 'trail-notes'")&&app.includes("action === 'trail-notes-view'"),'Trail Notes detail route is wired from popup to journal');
ok(app.includes("action === 'trail-notes-close'")&&app.includes('trailNotesHiddenSession=true'),'Close hides popup for the current app session without clearing entries');
ok(app.includes("action === 'trail-note-dismiss'")&&app.includes("action === 'trail-notes-clear-all'"),'single-note and clear-all actions are wired');
ok(app.includes('maybeTrailNotes();')&&app.includes('InSyncTrailNotes.unseen()'),'unseen notes are checked as the app renders/enters foreground');
ok(store.includes("appUpdates: { seen: [], storyCache")&&store.includes('S.appUpdates.seen'),'read state and story cache are normalized in local state');
ok(!cloud.includes('appUpdates'),'Trail Notes read state is absent from partner sync code');
ok(prompts.includes("id:'trail.notes'")&&prompts.includes('never add a feature'),'AI prompt registry forbids invented release facts');
ok(cloud.includes('factsText(entries)')&&cloud.includes('STRICT FACT RULE')&&cloud.includes('use ONLY the release facts'),'AI story receives exact release facts with a strict no-invention contract');
ok(cloud.includes('function trailNotesStory')&&cloud.includes('trailNotesStory: trailNotesStory'),'AI story transport is exposed through Cloud with deterministic caller fallback');
ok(index.includes('<script src="trail-notes.js"></script>')&&sw.includes("'trail-notes.js'"),'Trail Notes module is loaded online and cached offline');
ok(styles.includes('.trail-notes-layer')&&styles.includes('.trail-note-stack')&&styles.includes('.trail-notes-foot'),'popup has dedicated stacked-note, story and action styling');
ok(screens.includes("row('Trail Notes'")&&screens.includes('data-route=\"trail-notes\"'),'Settings keeps the complete Trail Notes journal reachable after the popup is cleared');
ok(app.includes("version:'6.0.0-p6.2'")&&sw.includes("CACHE = 'insync-v10-35'"),'P6.2 runtime and service-worker identifiers are current');

console.log(`\nP6.2 Notes from the Trail: ${passed} passed, ${failed} failed`);process.exit(failed?1:0);
