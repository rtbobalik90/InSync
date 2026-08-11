'use strict';
process.env.TZ='America/Chicago';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
function eq(a,b,m){ok(a===b,`${m} (got ${JSON.stringify(a)})`)}
const screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
const ui=fs.readFileSync(path.join(ROOT,'ui.js'),'utf8');
const store=fs.readFileSync(path.join(ROOT,'store.js'),'utf8');
const styles=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');

ok(ui.includes('var SCRIMS = {')&&ui.includes('light:')&&ui.includes('medium:')&&ui.includes('heavy:')&&ui.includes('train:'),'visual system exposes scenic, utility and Train-specific expedition scrims');
ok(screens.includes('art: homeHero.art, artFallback: homeHero.fallback, scrim: UI.SCRIMS.light'),'Home uses the light scenic scrim');
ok(screens.includes('art: nutritionHero.art, artFallback: nutritionHero.fallback, scrim: UI.SCRIMS.medium'),'Nutrition uses the medium utility/scenic scrim');
ok(screens.includes("art:trainHero.art,artFallback:trainHero.fallback,photoPosition:'center 42%',scrim:UI.SCRIMS.train"),'Train uses its dedicated open-top / strong-bottom scrim');
ok(screens.includes('art: togetherHero.art, artFallback: togetherHero.fallback, scrim: UI.SCRIMS.light'),'Together lets more expedition artwork breathe');
ok(screens.includes('art: coachHero.art, artFallback: coachHero.fallback, scrim: UI.SCRIMS.light'),'Coach lets more expedition artwork breathe');
ok(screens.includes("art: art, artFallback: artFallback, scrim: UI.SCRIMS.medium"),'Journey uses the medium route scrim');
ok(screens.includes('art:cp.art, artFallback:fallback, scrim:UI.SCRIMS.light'),'unlocked checkpoint pages use the lighter arrival treatment');

const trainStart=screens.indexOf('  function train() {'), trainEnd=screens.indexOf('\n\n\n  /* The brief: \"Rest day',trainStart);
const trainSrc=screens.slice(trainStart,trainEnd);
ok(trainSrc.includes('trainingWeekCard(weekStartKey)'),'Train landing begins from the weekly navigator');
ok(!trainSrc.includes('readinessCard(Store.todayKey())')&&!trainSrc.includes("dailyWalkCard(Store.todayKey(), 'train')"),'Train landing no longer duplicates day-specific readiness/walk tools');
ok(trainSrc.indexOf('trainingWeekCard(weekStartKey)') < trainSrc.indexOf('planCard(weekStartKey)'),'This Week appears before Your Plan');
ok(trainSrc.indexOf('planCard(weekStartKey)') < trainSrc.indexOf('trainingToolsCard(weekStartKey)'),'Your Plan appears before records/library/body tools');
ok(screens.includes('aria-label="Previous training week"')&&screens.includes('aria-label="Next training week"'),'weekly workouts have previous and forward navigation');
ok(styles.includes('.train-week-arrow')&&styles.includes('.train-tool-row'),'weekly navigation and training tool rows have dedicated mobile styling');

const dayStart=screens.indexOf('  function trainDay() {'), dayEnd=screens.indexOf('\n\n  function walkClockText',dayStart);
const daySrc=screens.slice(dayStart,dayEnd);
ok(daySrc.includes('var body = readinessCard(key) + dailyWalkCard(key, false)'),'selected day owns readiness and walk timer in the requested order');
ok(daySrc.includes('Start the planned session'),'selected day exposes the planned workout start');
ok(daySrc.includes('Add another workout'),'selected day can also add an unplanned/manual workout');
ok(daySrc.includes("expeditionSurface('train', 'assets/art/train-banner.webp')"),'selected day retains the active expedition Train artwork');

ok(store.includes('d.morningCheckInAt = validTimestamp(d.morningCheckInAt)'),'morning completion marker is sanitized during state normalization');
ok(store.includes('d.morningCheckInAt = new Date().toISOString()'),'saving a morning check-in records completion explicitly');
ok(screens.includes("if (d.morningCheckInAt || d.weight != null || d.sleepHr != null || d.restingHr != null) return '';"),'completed morning check-in disappears from Home, including pre-P5.5 saved mornings');
ok(screens.includes("if (written) return '';"),'completed nightly review disappears from Home');
ok(screens.includes('data-action="log-morning" data-date=')&&screens.includes('Edit nightly review'),'History still provides correction/edit paths after Home prompts disappear');
ok(app.includes("version:'6.0.0-p5.6'")&&screens.includes('Version 6.0.0-p5.6')&&sw.includes("CACHE = 'insync-v10-28'"),'current runtime and cache are bumped for installed phones');

// Store behavior: setMorning must mark the day without changing local-state schema.
class LS{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const ls=new LS(),ctx={console,localStorage:ls,Date,Math,JSON,String,Number,Object,Array,RegExp,Intl,parseInt,parseFloat,isFinite,isNaN,setTimeout,clearTimeout,CustomEvent:function(){},window:null};ctx.window=ctx;ctx.window.dispatchEvent=()=>{};vm.createContext(ctx);vm.runInContext(store,ctx,{filename:'store.js'});
ctx.Store.setMorning({sleepHr:8},ctx.Store.todayKey());
ok(/^\d{4}-\d{2}-\d{2}T/.test(ctx.Store.day().morningCheckInAt||''),'morning save persists a real completion timestamp');
eq(ctx.Store.day().sleepHr,8,'morning values still persist normally');

console.log(`\nUI/Train refinement checks: ${passed} passed, ${failed} failed.`); if(failed)process.exit(1);
