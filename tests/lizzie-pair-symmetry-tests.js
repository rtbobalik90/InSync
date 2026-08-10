'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); const remote={}; let passed=0,failed=0,requests=[];
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
function resp(status,body){return Promise.resolve({status,ok:status>=200&&status<300,text:()=>Promise.resolve(JSON.stringify(body||{})),json:()=>Promise.resolve(body||{})});}
function b64(s){return Buffer.from(unescape(encodeURIComponent(s)),'binary').toString('base64')}
function make(name,partner){
 class LS{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
 const c={console,localStorage:new LS(),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,Promise,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,AbortController:global.AbortController,
  location:{hostname:'app.test',pathname:'/insync/',hash:'#home',protocol:'https:'},navigator:{onLine:true},CustomEvent:function(){},
  btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),escape:global.escape,unescape:global.unescape,window:null,UI:{esc:String,asset:s=>s}};
 c.window=c;c.window.dispatchEvent=()=>{};
 c.fetch=(url,opts={})=>{const method=opts.method||'GET';requests.push({name,url,method});
  if(/\/repos\/acme\/insync-sync$/.test(url))return resp(200,{private:true});
  if(/\/contents\?ref=main$/.test(url))return resp(200,[]);
  const m=url.match(/\/contents\/sync\/([^?]+)\.json/);if(m){const slug=m[1];
   if(method==='GET')return remote[slug]?resp(200,{sha:remote[slug].sha,content:remote[slug].content}):resp(404,{message:'Not Found'});
   if(method==='PUT'){const body=JSON.parse(opts.body);remote[slug]={sha:'s'+Date.now()+Math.random(),content:body.content};return resp(200,{content:{sha:remote[slug].sha}});}
  }
  return resp(404,{message:'bad request'});
 };
 vm.createContext(c);for(const f of ['store.js','ui.js','exercises.js','insights.js','badges.js','cloud.js','screens.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),c,{filename:f});
 c.Store.setProfileName(name);c.Store.setPartnerName(partner);c.Store.set('profile.startDate',c.Store.todayKey());c.Store.set('onboarded',true);c.Store.setSecret('githubToken','x');c.Store.set('connections.githubRepo','acme/insync-sync');c.Store.set('connections.githubBranch','main');
 return c;
}
const p=fn=>new Promise((res,rej)=>fn((e,v)=>e?rej(e):res(v)));
(async()=>{
 const L=make('Lizzie','Robert'),R=make('Robert','Lizzie');
 L.Store.setSteps(8123);L.Store.setPartnerNote('Hi Robert');L.Store.set('privacy.calories',false);L.Store.addMeal({name:'Private',slot:'Lunch',kcal:600,protein:45,carbs:1,fat:1});
 await p(cb=>L.Cloud.push(cb));
 ok(!!remote.lizzie&&!remote.robert,'Lizzie writes only sync/lizzie.json from her phone');
 await p(cb=>R.Cloud.pull(cb));
 eq(R.Store.state().partnerData.name,'Lizzie','Robert reads Lizzie as the partner owner');
 eq(R.Store.state().partnerData.steps,8123,'Lizzie shared steps arrive on Robert phone');
 ok(R.Store.state().partnerData.calories==null,'Lizzie calorie privacy switch prevents daily calories crossing');
 ok(!JSON.parse(decodeURIComponent(escape(Buffer.from(remote.lizzie.content,'base64').toString('binary')))).mealPlan,'full Lizzie meal plan never enters the sync file');

 R.Store.setSteps(9444);R.Store.setPartnerNote('Hi Lizzie');await p(cb=>R.Cloud.push(cb));await p(cb=>L.Cloud.pull(cb));
 eq(L.Store.state().partnerData.name,'Robert','Lizzie reads Robert as the partner owner');
 eq(L.Store.state().partnerData.steps,9444,'Robert shared steps arrive on Lizzie phone');

 L.Store.propose('inca','Inca Trail');await p(cb=>L.Cloud.push(cb));await p(cb=>R.Cloud.pull(cb));
 eq(R.Store.state().invite.from,'partner','a route proposed on Lizzie phone arrives as a partner invitation on Robert phone');
 R.Store.acceptInvite();await p(cb=>R.Cloud.push(cb));await p(cb=>L.Cloud.pull(cb));
 ok(!!L.Store.state().invite.accepted,'Robert acceptance returns to Lizzie phone');
 eq(L.Store.state().invite.decidedBy,'partner','Lizzie correctly sees that the partner made the acceptance decision');

 // A malformed/misfiled payload must never switch the configured partner identity.
 const before=L.Store.state().partnerData && L.Store.state().partnerData.name;
 const bad=Object.assign({},R.Cloud.sharePayload(),{name:'Someone Else',initials:'SE'});
 remote.robert={sha:'wrong-owner',content:b64(JSON.stringify(bad))};
 let mismatchErr=null;await new Promise(resolve=>L.Cloud.pull(e=>{mismatchErr=e;resolve()}));
 ok(!!mismatchErr&&/different (name|profile)/i.test(mismatchErr.message),'Lizzie rejects a sync/robert.json payload that claims to belong to someone else');
 eq(L.Store.state().partnerData.name,before,'wrong-owner partner payload cannot overwrite Lizzie current partner cache');

 ok(requests.some(x=>x.name==='Lizzie'&&x.method==='PUT'&&/sync\/lizzie\.json/.test(x.url)),'network trace confirms Lizzie never writes Robert filename');
 ok(requests.some(x=>x.name==='Robert'&&x.method==='PUT'&&/sync\/robert\.json/.test(x.url)),'network trace confirms Robert never writes Lizzie filename');
 console.log(`\n${passed} Lizzie/Robert pair-symmetry checks passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
