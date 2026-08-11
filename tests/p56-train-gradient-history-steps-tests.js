'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
const ui=fs.readFileSync(path.join(ROOT,'ui.js'),'utf8');
const screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const log=fs.readFileSync(path.join(ROOT,'log.js'),'utf8');
const store=fs.readFileSync(path.join(ROOT,'store.js'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');

ok(ui.includes("train: 'linear-gradient(180deg,rgba(10,12,8,0) 0%,rgba(10,12,8,0) 58%"),'Train scrim has no dark wash across the top 58 percent');
ok(ui.includes("rgba(20,21,15,.70) 91%,#14150F 100%"),'Train scrim still blends into the dark card stack at the bottom');
ok(screens.includes("scrim:UI.SCRIMS.train"),'Train landing uses the dedicated Train scrim');
ok(screens.includes("scrim: UI.SCRIMS.train"),'Train day uses the dedicated Train scrim');

const dayStart=screens.indexOf('  function trainDay() {'), dayEnd=screens.indexOf('\n\n  function walkClockText',dayStart);
const daySrc=screens.slice(dayStart,dayEnd);
ok(daySrc.includes('data-action="log-steps"')&&daySrc.includes('data-date="')&&daySrc.includes("(rec.steps ? 'Edit steps' : 'Add steps')"),'past/current Train day exposes an obvious Add/Edit steps action');
ok(daySrc.includes("if (!isFuture)"),'Train day keeps historical edit actions off future dates');
ok(daySrc.includes('You can correct this day later if your phone or watch syncs after the fact.'),'Train day explains late step corrections');
ok(screens.includes('<button class="btn ghost sm" data-action="log-steps" data-date="'+"' + esc(key) + '") || screens.includes('data-action="log-steps" data-date="'),'History day retains a dated steps edit action');
ok(app.includes("if (action === 'log-steps') { Log.open('steps', { date: editDate }); return; }"),'dated steps action passes the selected date into the logging sheet');
ok(log.includes("Store.setSteps(Math.round(nonneg(d.steps)), open.date);"),'steps sheet saves to its selected date rather than today');
ok(log.includes("var key = d._date || Store.todayKey();")&&log.includes("past ? 'Steps for this day' : 'Steps today'"),'steps sheet labels historical edits explicitly');
ok(app.includes("version:'6.0.0-p5.6'")&&sw.includes("CACHE = 'insync-v10-28'"),'P5.6 runtime and cache identifiers are current');

// Behavior check: Store.setSteps writes to the supplied prior date without touching today.
class LS{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const ls=new LS(),ctx={console,localStorage:ls,Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,CustomEvent:function(){},window:null};ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);vm.runInContext(store,ctx,{filename:'store.js'});
const today=ctx.Store.todayKey(), prior=ctx.Store.shift(today,-1);
ctx.Store.setSteps(12345,prior);
eq(ctx.Store.day(prior).steps,12345,'Store writes corrected steps to the requested prior day');
ok(!ctx.Store.day(today).steps,'historical step correction does not write those steps into today');

console.log(`\nP5.6 Train/steps regression checks: ${passed} passed, ${failed} failed.`); if(failed)process.exit(1);
