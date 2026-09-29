'use strict';

process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
let passed=0,failed=0;
function ok(value,message){if(value){passed++;console.log('PASS:',message)}else{failed++;console.error('FAIL:',message)}}
function eq(actual,expected,message){ok(actual===expected,message+' (got '+JSON.stringify(actual)+')')}
class LS{constructor(){this.values=new Map()}getItem(k){return this.values.has(k)?this.values.get(k):null}setItem(k,v){this.values.set(k,String(v))}removeItem(k){this.values.delete(k)}}
function run(ctx,file){vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),ctx,{filename:file})}
function context(){
  const ctx={console,localStorage:new LS(),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,Promise,
    parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
    location:{hostname:'example.test',pathname:'/insync/',hash:'#together',protocol:'https:'},navigator:{onLine:true},
    CustomEvent:function(){},document:{},fetch:()=>Promise.reject(new Error('network should not run')),
    btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),
    escape:global.escape,unescape:global.unescape,window:null};
  ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);
  ['domains.js','contracts.js','journeys.js','theme.js','rewards.js','camp.js','store.js','cloud.js'].forEach(f=>run(ctx,f));
  return ctx;
}
function configure(ctx){
  const S=ctx.Store;S.setProfileName('Robert');S.setPartnerName('Lizzie');S.setSecret('githubToken','token');
  S.set('connections.githubRepo','acme/insync-sync');S.set('connections.githubBranch','main');
}
function partnerRecord(S,updated){return {schema:8,name:'Lizzie',initials:'LI',date:S.todayKey(),updated:updated,points:7,streak:2,earned:[],history:{points:{},logged:{}}}}

const NOW=Date.parse('2026-09-06T18:00:00.000Z');
let ctx=context(),S=ctx.Store,C=ctx.Cloud,status=C.pairingStatus(NOW);
eq(status.id,'not-set-up','missing GitHub and partner fields derive the not-set-up state');
ok(status.missing.includes('a GitHub token')&&status.missing.includes('a private sync repository'),'not-set-up names the missing connection pieces');

ctx=context();S=ctx.Store;C=ctx.Cloud;configure(ctx);status=C.pairingStatus(NOW);
eq(status.id,'this-phone-ready','complete local settings before first sync derive this-phone-ready');
eq(status.title,'This phone is ready','ready state clearly confirms this phone is configured');
ok(status.nextStep.includes('Sync now'),'ready state prompts the first exchange');

S.set('connections.lastSync','2026-09-06T17:00:00.000Z');status=C.pairingStatus(NOW);
eq(status.id,'waiting-partner','successful exchange without a partner file derives waiting-for-partner');
eq(status.title,'Waiting for partner','missing partner file is distinct from a configuration error');
ok(status.nextStep.includes('names reversed'),'waiting state explains the second-phone setup');

ctx.navigator.onLine=false;status=C.pairingStatus(NOW);
eq(status.id,'offline','configured phone without connectivity derives offline');
ok(status.summary.includes('cannot reach GitHub'),'offline state explains the network boundary');

ctx.navigator.onLine=true;S.set('connections.lastSyncError','Bad credentials');S.set('connections.lastSyncErrorAt','2026-09-06T17:30:00.000Z');status=C.pairingStatus(NOW);
eq(status.id,'needs-attention','latest sync error derives needs-attention');
eq(status.error,'Bad credentials','needs-attention exposes the bounded useful error');

ctx=context();S=ctx.Store;C=ctx.Cloud;configure(ctx);
S.set('partnerData',partnerRecord(S,'2026-09-02T18:00:00.000Z'));S.set('connections.lastSync','2026-09-04T18:00:00.000Z');
status=C.pairingStatus(NOW);eq(status.id,'paired-stale','old successful exchange or partner update derives paired-stale');

S.set('partnerData',partnerRecord(S,'2026-09-06T16:00:00.000Z'));S.set('connections.lastSync','2026-09-06T17:00:00.000Z');
status=C.pairingStatus(NOW);eq(status.id,'paired-current','recent exchange and partner update derive paired-current');
ok(status.configured&&status.paired&&status.tone==='good','paired-current exposes configured, paired and healthy presentation facts');
eq(C.sharePayload().schema,8,'pairing status does not change the partner payload schema');

// Render both consumers with the same derived source of truth.
ctx={console,localStorage:new LS(),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,Promise,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
  location:{hostname:'example.test',pathname:'/insync/',hash:'#together',protocol:'https:'},navigator:{onLine:true},CustomEvent:function(){},document:{},
  fetch:()=>Promise.reject(new Error('offline')),btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),escape:global.escape,unescape:global.unescape,window:null};
ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);
['domains.js','contracts.js','journeys.js','theme.js','rewards.js','camp.js','store.js','intelligence.js','prompt-registry.js','cloud.js','ui.js','media.js','exercises.js','training.js','nutrition.js','insights.js','together.js','onboarding.js','badges.js','foods.js','screens.js'].forEach(f=>run(ctx,f));
configure(ctx);S=ctx.Store;const current=new Date().toISOString();S.set('partnerData',partnerRecord(S,current));S.set('connections.lastSync',current);
let html=ctx.Screens.together();
ok(html.includes('data-pairing-state="paired-current"')&&html.includes('Paired and current'),'Together shows the derived paired/current state');
ctx.location.hash='#settings/together';html=ctx.Screens.settings();
ok(html.includes('Pair these two phones')&&html.includes('names reversed'),'Settings gives an explicit two-phone pairing sequence');
ok(html.includes('data-pairing-state="paired-current"'),'Settings uses the same derived state as Together');

console.log('\nPairing states: '+passed+' passed, '+failed+' failed');
process.exit(failed?1:0);
