'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(v,m){if(v){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
const ui=fs.readFileSync(path.join(ROOT,'ui.js'),'utf8');
const screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
ok(screens.includes("photoHeight:'690px',screenClass:'train-screen'"),'Train landing hero extends through the card-transition region');
ok(!screens.includes("tab:'train',rest:310,restMeasure:true,photoHeight:'390px'"),'Old short Train hero is removed');
ok(ui.includes("rgba(10,12,8,0) 62%") && ui.includes("rgba(20,21,15,.10) 70%"),'Train fade begins low in the hero rather than mid-image');
ok(ui.includes("rgba(20,21,15,.62) 92%,#14150F 100%"),'Train fade still resolves into app ground at the bottom');
ok(screens.includes("tab: null, rest: 300, screenClass:'train-screen'"),'Workout-day screen stays crisp and uses the train-specific treatment');
ok(app.includes("version:'6.0.0-p5.8'"),'Runtime version is P5.7.2');
ok(sw.includes("CACHE = 'insync-v10-32'"),'Service-worker cache is bumped');
console.log(`\nP5.7.2 Train hero geometry checks: ${passed} passed, ${failed} failed.`); if(failed) process.exit(1);
