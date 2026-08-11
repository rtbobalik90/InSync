'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(x,m){if(x){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
class LS{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const log=fs.readFileSync(path.join(ROOT,'log.js'),'utf8');
const cloud=fs.readFileSync(path.join(ROOT,'cloud.js'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');

ok(/function barcodePhoto\(\)[\s\S]*?Media\.capture\(function/.test(log),'barcode photo fallback uses the shared attached camera capture path');
ok(/Media\.shrink\(dataUrl, 1800, 0\.9/.test(log),'barcode camera image is converted and resized before vision upload');
ok(log.includes('Preparing the barcode photo')&&log.includes('Reading the barcode')&&log.includes('Barcode read. Looking up the food'),'barcode fallback exposes visible capture/read/lookup progress');
ok(log.includes("!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia") ,'live detector safely falls back when camera mediaDevices API is unavailable');
ok(cloud.includes("['image/jpeg','image/png','image/gif','image/webp']"),'barcode vision upload admits only image formats supported by the AI image path');
ok(sw.includes("insync-v10-35")&&app.includes("6.0.0-p6.2"),'hotfix bumps runtime and offline cache so installed phones receive the patch');

const ctx={console,localStorage:new LS(),Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,
 location:{hostname:'example.test',pathname:'/insync/',hash:'',protocol:'https:'},navigator:{},CustomEvent:function(){},UI:{esc:s=>String(s==null?'':s),asset:s=>s},window:null,
 btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')};
ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);
function run(f){vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f})}
run('store.js'); run('exercises.js'); run('onboarding.js'); run('cloud.js');
ctx.Store.setSecret('claudeKey','test-key');
let sent=null, fetches=0;
ctx.fetch=(url,opts)=>{fetches++;sent=JSON.parse(opts.body);return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({stop_reason:'end_turn',content:[{type:'text',text:'{"code":"0 12345-67890 5"}'}]})})};
function read(data){return new Promise(resolve=>ctx.Cloud.readBarcodePhoto(data,(err,code)=>resolve({err,code})))}
(async()=>{
  let r=await read('data:image/jpeg;base64,ZmFrZQ==');
  ok(!r.err,'prepared JPEG barcode photo reaches the AI vision request');
  eq(r.code,'012345678905','barcode photo response is normalized to digits');
  eq(sent.messages[0].content[0].source.media_type,'image/jpeg','vision request sends the normalized JPEG media type');
  const before=fetches;
  r=await read('data:image/heic;base64,ZmFrZQ==');
  ok(!!r.err&&/converted/.test(r.err.message)&&fetches===before,'unsupported raw HEIC is stopped before upload with a useful conversion error');
  console.log(`\n${passed} barcode hotfix checks passed, ${failed} failed`);
  if(failed)process.exitCode=1;
})();
