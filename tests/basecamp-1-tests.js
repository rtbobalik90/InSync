'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');let passed=0,failed=0;
function ok(value,message){if(value){passed++;console.log('PASS:',message)}else{failed++;console.error('FAIL:',message)}}
function eq(actual,expected,message){ok(actual===expected,`${message} (got ${JSON.stringify(actual)})`)}
class LS{
  constructor(){this.m=new Map();this.fail=false}
  getItem(key){return this.m.has(key)?this.m.get(key):null}
  setItem(key,value){if(this.fail)throw new Error('quota');this.m.set(key,String(value))}
  removeItem(key){this.m.delete(key)}
}
function load(){
  const storage=new LS();
  const c={console,localStorage:storage,Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,
    setTimeout,clearTimeout,CustomEvent:function(type,opts){this.type=type;this.detail=opts&&opts.detail},location:{hostname:'example.test'},window:null};
  c.window=c;c.window.dispatchEvent=()=>{};vm.createContext(c);
  ['camp.js','basecamp-catalog.js','store.js','basecamp-state.js'].forEach(file=>vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),c,{filename:file}));
  return {c,storage};
}
const loaded=load(),c=loaded.c,storage=loaded.storage,C=c.InSyncBaseCampCatalog,B=c.InSyncBaseCampState,S=c.Store;

eq(C.grid.cols,6,'starter camp is six columns');
eq(C.grid.rows,6,'starter camp is six rows');
eq(B.placements().map(x=>x.instanceId).join(','),'starter-tent,starter-fire,starter-marker','starter layout is deterministic');
eq(B.cellsFor('base-tent',1,1,0).length,4,'tent footprint occupies four cells');
eq(C.footprint('base-tent',90).width,2,'rotated square footprint remains bounded');
ok(!B.check('base-tent',5,5,0).ok&&B.check('base-tent',5,5,0).code==='out-of-bounds','out-of-bounds placement is rejected');
ok(!B.check('base-fire-ring',1,1,0).ok&&B.check('base-fire-ring',1,1,0).code==='collision','occupied placement is rejected');

let moved=B.move('starter-fire',5,5);
ok(moved.ok,'an object moves to a valid empty cell');
eq(B.find('starter-fire').x,5,'move persists its new column');
eq(JSON.parse(storage.getItem(S.KEY)).baseCamp.placed.find(x=>x.instanceId==='starter-fire').y,5,'move persists through the local store');
let before=JSON.stringify(B.find('starter-marker'));
let blocked=B.move('starter-marker',1,1);
ok(!blocked.ok&&blocked.code==='collision','a colliding move is rejected');
eq(JSON.stringify(B.find('starter-marker')),before,'rejected move leaves state untouched');

let rotated=B.rotate('starter-tent');
ok(rotated.ok,'selected object rotates');
eq(B.find('starter-tent').rotation,90,'rotation persists in quarter turns');
let placed=B.place('base-trail-marker',5,0,0);
ok(placed.ok,'an unlocked starter object can be placed');
eq(placed.instanceId,'camp-trail-marker-1','new instance identity is deterministic');
ok(B.remove(placed.instanceId).ok,'placed object can be removed');
ok(!B.find(placed.instanceId),'removed object leaves the grid');

const tentBefore=JSON.stringify(B.find('starter-tent'));
storage.fail=true;
const failedSave=B.move('starter-tent',3,0);
storage.fail=false;
ok(!failedSave.ok&&failedSave.code==='save-failed','storage failure is reported');
eq(JSON.stringify(B.find('starter-tent')),tentBefore,'failed persistence rolls the in-memory camp back atomically');

c.UI={esc:s=>String(s),screen:opts=>opts.body};
vm.runInContext(fs.readFileSync(path.join(ROOT,'basecamp-renderer.js'),'utf8'),c,{filename:'basecamp-renderer.js'});
let html=c.InSyncBaseCampRenderer.screen({});
eq((html.match(/data-basecamp-cell="1"/g)||[]).length,36,'renderer produces exactly 36 tappable grid cells');
ok(html.includes('role="grid"')&&html.includes('aria-label="Base Camp, 6 rows by 6 columns"'),'board exposes an accessible grid label');
ok(html.includes('data-basecamp-item="base-tent"')&&html.includes('Local only'),'starter palette is explicit and local-only');

const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
const cloud=fs.readFileSync(path.join(ROOT,'cloud.js'),'utf8');
const styles=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
ok(app.includes("root === 'base-camp'")&&app.includes('InSyncBaseCampUI.bind(app, key, render)'),'Base Camp route and interaction binding are wired');
ok(app.includes('InSyncBaseCampState.isLocalCommit()'),'Base Camp layout commits do not trigger partner auto-sync');
ok(index.indexOf('basecamp-catalog.js')<index.indexOf('store.js')&&index.indexOf('basecamp-state.js')<index.indexOf('basecamp-ui.js'),'Base Camp modules load in dependency order');
ok(sw.includes("CACHE = 'insync-v10-39'")&&sw.includes("'basecamp-state.js'")&&sw.includes("'basecamp-ui.js'"),'offline shell advances and contains the full Base Camp slice');
ok(styles.includes('.basecamp-board')&&styles.includes('touch-action:manipulation'),'mobile board controls have dedicated touch styling');
ok(!cloud.includes('baseCamp'),'Base Camp remains outside partner sync');

console.log(`\nBase Camp 1.0: ${passed} passed, ${failed} failed`);
process.exit(failed?1:0);
