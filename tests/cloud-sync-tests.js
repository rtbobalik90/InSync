'use strict';

process.env.TZ = 'America/Chicago';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log('PASS:', msg); } else { failed++; console.error('FAIL:', msg); } }
function eq(a,b,msg) { ok(a===b, msg + ` (got ${JSON.stringify(a)})`); }
class LS { constructor(){this.m=new Map();} getItem(k){return this.m.has(k)?this.m.get(k):null;} setItem(k,v){this.m.set(k,String(v));} removeItem(k){this.m.delete(k);} }
function run(ctx,file){vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),ctx,{filename:file});}
function response(status, body, delay) {
  return new Promise(resolve => setTimeout(() => resolve({
    status, ok: status >= 200 && status < 300,
    text: () => Promise.resolve(body == null ? '' : JSON.stringify(body)),
    json: () => Promise.resolve(body == null ? {} : body)
  }), delay || 0));
}
function callbackPromise(fn){ return new Promise((resolve,reject)=>fn((err,value)=>err?reject(err):resolve(value))); }
function b64decode(str){ return Buffer.from(String(str||'').replace(/\n/g,''),'base64').toString('utf8'); }

(async function(){
  const ls = new LS();
  let own = null;
  let partner = null;
  let conflictNextPut = false;
  let failPartnerGet = false;
  let putDelay = 0, activePuts = 0, maxActivePuts = 0, putCount = 0;
  const requests=[];

  const ctx = {
    console, localStorage:ls, Date, Math, JSON, String, Number, Object, Array, RegExp, Intl,
    Promise, parseInt, parseFloat, isFinite, isNaN, setTimeout, clearTimeout,
    AbortController: global.AbortController,
    location:{hostname:'app.example.test',pathname:'/insync/',hash:'',protocol:'https:'}, navigator:{},
    CustomEvent:function(type,init){this.type=type;this.detail=init&&init.detail;},
    btoa:s=>Buffer.from(s,'binary').toString('base64'), atob:s=>Buffer.from(s,'base64').toString('binary'),
    escape:global.escape, unescape:global.unescape,
    UI:{esc:s=>String(s==null?'':s),asset:s=>s}
  };
  ctx.window=ctx; ctx.window.dispatchEvent=()=>{};
  ctx.fetch=(url,opts={})=>{
    const method=opts.method||'GET'; requests.push({url,method});
    if (/\/repos\/acme\/insync-sync$/.test(url)) return response(200,{private:true});
    if (/\/repos\/acme\/insync-sync\/contents\?ref=main$/.test(url)) return response(200,[]);
    if (/\/contents\/sync\/robert\.json/.test(url) && method==='GET') return own ? response(200,{sha:own.sha,content:own.content}) : response(404,{message:'Not Found'});
    if (/\/contents\/sync\/robert\.json/.test(url) && method==='PUT') {
      putCount++; activePuts++; maxActivePuts=Math.max(maxActivePuts,activePuts);
      const body=JSON.parse(opts.body||'{}');
      if (conflictNextPut) {
        conflictNextPut=false;
        return response(409,{message:'sha does not match'},putDelay).then(r=>{activePuts--;return r;});
      }
      own={sha:'sha-'+putCount,content:body.content};
      return response(200,{content:{sha:own.sha}},putDelay).then(r=>{activePuts--;return r;});
    }
    if (/\/contents\/sync\/lizzie\.json/.test(url) && method==='GET') {
      if (failPartnerGet) return response(500,{message:'temporary failure'});
      return partner ? response(200,{sha:'partner-sha',content:partner}) : response(404,{message:'Not Found'});
    }
    return response(404,{message:'unexpected '+method+' '+url});
  };
  vm.createContext(ctx);
  run(ctx,'store.js'); run(ctx,'exercises.js'); run(ctx,'onboarding.js'); run(ctx,'cloud.js');
  const S=ctx.Store, C=ctx.Cloud;
  S.setProfileName('Robert'); S.setPartnerName('Lizzie');
  S.setSecret('githubToken','token'); S.set('connections.githubRepo','acme/insync-sync'); S.set('connections.githubBranch','main');

  const today=S.todayKey(), yesterday=S.shift(today,-1);
  S.day(yesterday).noteToPartner='Offline at night'; S.save();
  await callbackPromise(cb=>C.push(cb));
  const firstPayload=JSON.parse(b64decode(own.content));
  eq(firstPayload.note,'Offline at night','successful GitHub push carries an overnight note');
  eq(firstPayload.noteDate,yesterday,'overnight note keeps its authored date');
  eq(S.state().notesSent,1,'successful GitHub write acknowledges the note locally');
  await callbackPromise(cb=>C.push(cb));
  eq(S.state().notesSent,1,'re-sending the same represented note does not double-count it');

  conflictNextPut=true;
  const beforeConflictPuts=putCount;
  await callbackPromise(cb=>C.push(cb));
  eq(putCount-beforeConflictPuts,2,'GitHub SHA conflict retries once with a fresh GET/PUT cycle');

  putDelay=30; maxActivePuts=0;
  S.day(today).noteToPartner='First concurrent note'; S.save();
  const p1=callbackPromise(cb=>C.push(cb));
  S.day(today).noteToPartner='Newest concurrent note'; S.save();
  const p2=callbackPromise(cb=>C.push(cb));
  await Promise.all([p1,p2]);
  eq(maxActivePuts,1,'overlapping push requests are serialized to one GitHub write at a time');
  const concurrentPayload=JSON.parse(b64decode(own.content));
  eq(concurrentPayload.note,'Newest concurrent note','queued push finishes with the newest local state');

  partner=Buffer.from(unescape(encodeURIComponent(JSON.stringify({
    schema:2,name:'Lizzie',initials:'L',date:today,points:8,streak:5,earned:[],note:'Made it',noteDate:today,
    history:{points:{[today]:8},logged:{[today]:true}},steps:9000
  }))),'binary').toString('base64');
  putDelay=15; maxActivePuts=0;
  const s1=callbackPromise(cb=>C.sync(cb)), s2=callbackPromise(cb=>C.sync(cb));
  await Promise.all([s1,s2]);
  eq(maxActivePuts,1,'overlapping full sync requests never race GitHub writes');
  eq(S.state().partnerData.name,'Lizzie','full sync stores sanitized partner data');
  eq(S.state().partnerHistory[today],8,'full sync merges partner history');
  ok(!!S.state().connections.lastSync,'successful full sync records a completion timestamp');
  eq(S.state().connections.lastSyncError,'','successful full sync leaves no stale error');

  // A shared expedition is monotonic across the two phones. If the partner has
  // already opened the next leg, this phone follows that leg index and never
  // reuses their previous-leg miles on the new leg.
  S.setSteps(0,today); S.beginExpedition('milford'); S.setSteps(4000,today);
  partner=Buffer.from(unescape(encodeURIComponent(JSON.stringify({
    schema:3,name:'Lizzie',initials:'L',date:today,points:8,streak:5,earned:[],
    history:{points:{[today]:8},logged:{[today]:true}},
    expedition:{routeId:'milford',legIndex:1,legStart:today,updatedAt:new Date().toISOString(),previousLegMiles:2},
    legMiles:0.6
  }))),'binary').toString('base64');
  await callbackPromise(cb=>C.pull(cb));
  eq(S.state().expedition.legIndex,1,'partner arrival advances this phone to the same expedition leg');
  eq(S.legMine(),0,'catching up to a partner arrival resets this phone at a safe local step baseline');
  eq(S.legHers(),0.6,'partner miles are applied only to the matching current leg');
  eq(S.state().lastArrival.milesHers,2,'partner previous-leg contribution is preserved in the arrival record');

  partner=Buffer.from(unescape(encodeURIComponent(JSON.stringify({
    schema:3,name:'Lizzie',initials:'L',date:today,points:8,streak:5,earned:[],
    history:{points:{[today]:8},logged:{[today]:true}},
    expedition:{routeId:'milford',legIndex:0,legStart:today},legMiles:99
  }))),'binary').toString('base64');
  await callbackPromise(cb=>C.pull(cb));
  eq(S.state().expedition.legIndex,1,'a stale partner file cannot move the expedition backwards');
  eq(S.legHers(),0,'miles from a stale previous leg cannot leak into the current leg');

  failPartnerGet=true;
  let failure=null; try { await callbackPromise(cb=>C.sync(cb)); } catch(e) { failure=e; }
  ok(!!failure,'partner download failure is surfaced to the caller');
  ok(/temporary failure/i.test(S.state().connections.lastSyncError),'failed full sync is recorded for Settings visibility');
  ok(!!S.state().connections.lastSyncErrorAt,'failed full sync records when the failure occurred');
  failPartnerGet=false;
  await callbackPromise(cb=>C.sync(cb));
  eq(S.state().connections.lastSyncError,'','later successful sync clears the prior error');

  const repoChecks=requests.filter(r=>/\/repos\/acme\/insync-sync$/.test(r.url)).length;
  eq(repoChecks,1,'verified private sync repository is cached during the session');

  console.log(`\n${passed} cloud sync checks passed, ${failed} failed`);
  if(failed) process.exit(1);
})().catch(err=>{ console.error(err && err.stack || err); process.exit(1); });
