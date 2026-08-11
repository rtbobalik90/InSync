'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..'); let passed=0,failed=0;
function ok(x,m){if(x){passed++;console.log('PASS:',m)}else{failed++;console.error('FAIL:',m)}}
const rel=[
'assets/art/grand/sections/home-dawn.webp','assets/art/grand/sections/home-day.webp','assets/art/grand/sections/home-sunset.webp','assets/art/grand/sections/home-night.webp',
'assets/art/grand/sections/journey.webp','assets/art/grand/sections/train.webp','assets/art/grand/sections/nutrition.webp','assets/art/grand/sections/together.webp','assets/art/grand/sections/coach.webp','assets/art/grand/sections/base-camp.webp','assets/art/grand/sections/arrival.webp',
'assets/art/grand/travel/leg-01.webp','assets/art/grand/travel/leg-02.webp','assets/art/grand/travel/leg-03.webp','assets/art/grand/travel/leg-04.webp',
'assets/art/grand/checkpoints/checkpoint-00.webp','assets/art/grand/checkpoints/checkpoint-01.webp','assets/art/grand/checkpoints/checkpoint-02.webp','assets/art/grand/checkpoints/checkpoint-03.webp','assets/art/grand/checkpoints/checkpoint-04.webp'
];
for(const f of rel){
 const p=path.join(ROOT,f);
 ok(fs.existsSync(p),f+' exists');
 if(fs.existsSync(p)) ok(fs.statSync(p).size>70000,f+' is real production art, not the transparent placeholder');
}
const journeys=fs.readFileSync(path.join(ROOT,'journeys.js'),'utf8');
const screens=fs.readFileSync(path.join(ROOT,'screens.js'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
ok(journeys.includes("var HOME_TIME_PACKS = { grand:true }")&&journeys.includes("/sections/home-' + t + '.webp'"),'Grand Canyon declares a complete four-state Home art pack');
ok(screens.includes("surface === 'home' && Journeys.homeArt")&&screens.includes('Store.timeOfDay()'),'Home selects expedition artwork from the live time-of-day state');
ok(app.includes("version:'6.0.0-p6.0'")&&sw.includes("CACHE = 'insync-v10-33'"),'P5.4 runtime and cache invalidate previously cached transparent placeholders');
console.log(`\n${passed} Grand Canyon art-pack checks passed, ${failed} failed`);
if(failed)process.exitCode=1;
