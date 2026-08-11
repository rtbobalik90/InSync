/* InSync Together 2.0 — shared-mode presentation, Duo Missions and Weekly Campfire.
   The view mode stays local. Only explicit mission/campfire data enters partner sync. */
(function () {
  'use strict';

  var MODES = [
    { id:'cooperative', name:'Cooperative', short:'Build the week together', detail:'Combined progress first. No need to beat each other.' },
    { id:'competitive', name:'Competitive', short:'A friendly scoreboard', detail:'Daily and weekly points stay visible as a fair contest.' },
    { id:'quiet', name:'Quiet Support', short:'Encouragement without a scoreboard', detail:'Hide comparisons and keep the focus on support, the road and shared plans.' }
  ];

  var MISSIONS = [
    { id:'trail-12', name:'Twelve Together', type:'trail-miles', target:12, unit:'mi', detail:'Walk 12 expedition miles between the two of you this week.' },
    { id:'train-6', name:'Training Team', type:'training-sessions', target:6, unit:'sessions', detail:'Close 6 training sessions between the two of you.' },
    { id:'strong-8', name:'Eight Strong Days', type:'strong-days', target:8, unit:'days', detail:'Combine for 8 days scored at 8 of 10 or better.' },
    { id:'perfect-4', name:'Four Full Days', type:'perfect-days', target:4, unit:'days', detail:'Combine for 4 complete 10-of-10 days.' }
  ];

  function state() { return Store.state(); }
  function iso() { return new Date().toISOString(); }
  function validWeek(k) { return /^\d{4}-\d{2}-\d{2}$/.test(String(k||'')); }
  function currentWeek() { return Store.weekStart(Store.todayKey()); }
  function nextWeek(base) { return Store.shift(base || currentWeek(), 7); }
  function modeDef(id) { return MODES.filter(function (x) { return x.id === id; })[0] || MODES[0]; }
  function missionDef(id) { return MISSIONS.filter(function (x) { return x.id === id; })[0] || null; }
  function cfg() { return state().together || {}; }
  function mode() { return modeDef(cfg().mode).id; }
  function setMode(id) {
    if (!modeDef(id) || !MODES.some(function (x) { return x.id === id; })) return false;
    Store.set('together.mode', id); return true;
  }

  function missionFor(weekOf) {
    var all = cfg().missions || {}, m = all[weekOf];
    return m && missionDef(m.id) ? m : null;
  }
  function setMission(weekOf, id) {
    if (!validWeek(weekOf) || !missionDef(id)) return false;
    var all = Object.assign({}, cfg().missions || {}), existing = all[weekOf] || {};
    all[weekOf] = { id:id, weekOf:weekOf, selectedAt:existing.selectedAt || iso(), updatedAt:iso() };
    Store.set('together.missions', all); return true;
  }
  function clearMission(weekOf) {
    var all = Object.assign({}, cfg().missions || {}); if (!all[weekOf]) return false;
    delete all[weekOf]; Store.set('together.missions', all); return true;
  }

  function dayWalkMiles(k) {
    var d = state().days[k] || {}, step = Store.miles(+d.steps || 0);
    var walk = Store.walkDistanceMilesForDay ? Store.walkDistanceMilesForDay(k) : 0;
    return Math.max(step, walk || 0);
  }
  function localProgress(mission) {
    if (!mission) return 0;
    var def = missionDef(mission.id); if (!def) return 0;
    var value = 0, today = Store.todayKey();
    for (var i=0;i<7;i++) {
      var k=Store.shift(mission.weekOf,i); if(k>today) break;
      var d=state().days[k]||{};
      if (def.type === 'trail-miles') value += dayWalkMiles(k);
      else if (def.type === 'training-sessions') value += (d.workouts||[]).length;
      else if (def.type === 'strong-days' && Store.activeOn(k) && Store.logged(k) && Store.points(k)>=8) value++;
      else if (def.type === 'perfect-days' && Store.activeOn(k) && Store.logged(k) && Store.points(k)>=10) value++;
    }
    return def.type === 'trail-miles' ? +value.toFixed(1) : Math.round(value);
  }
  function partnerMission(weekOf) {
    var pd=state().partnerData, rows=pd&&pd.together&&Array.isArray(pd.together.duoMissions)?pd.together.duoMissions:[];
    return rows.filter(function(m){return m.weekOf===weekOf && missionDef(m.id);})[0] || null;
  }
  function missionStatus(weekOf) {
    var mine=missionFor(weekOf), theirs=partnerMission(weekOf), def=mine&&missionDef(mine.id), mineProgress=mine?localProgress(mine):0;
    var agreed=!!(mine&&theirs&&mine.id===theirs.id), partnerProgress=agreed?Math.max(0,+theirs.progress||0):0;
    return { weekOf:weekOf, mine:mine, theirs:theirs, def:def, agreed:agreed, mineProgress:mineProgress, partnerProgress:partnerProgress,
      combined:def?+(mineProgress+partnerProgress).toFixed(def.type==='trail-miles'?1:0):0,
      done:def?(mineProgress+partnerProgress)>=def.target:false };
  }

  function campfireFor(weekOf) { var all=cfg().campfires||{}; return all[weekOf]||null; }
  function closedCampfires() {
    var all=cfg().campfires||{};
    return Object.keys(all).filter(function(k){return all[k]&&all[k].closedAt;}).sort().reverse().map(function(k){return all[k];});
  }
  function setCampfireIntent(weekOf, text) {
    if(!validWeek(weekOf)) return false; text=String(text||'').trim().slice(0,280);
    var all=Object.assign({},cfg().campfires||{}), r=Object.assign({},all[weekOf]||{});
    r.weekOf=weekOf; r.openedAt=r.openedAt||iso(); r.intent=text; r.intentUpdatedAt=iso(); all[weekOf]=r;
    Store.set('together.campfires',all); return true;
  }
  function closeCampfire(weekOf) {
    if(!validWeek(weekOf)) return false;
    var all=Object.assign({},cfg().campfires||{}), r=Object.assign({},all[weekOf]||{});
    r.weekOf=weekOf; r.openedAt=r.openedAt||iso(); r.closedAt=iso(); all[weekOf]=r;
    Store.set('together.campfires',all); return true;
  }
  function partnerCampfireIntent(weekOf) {
    var t=state().partnerData&&state().partnerData.together, c=t&&t.campfireIntent;
    return c&&c.weekOf===weekOf?c:null;
  }

  function weeklySummary(weekOf) {
    var st=window.Insights&&Insights.weekStats?Insights.weekStats(weekOf):null;
    if(!st) return null;
    var p=state().privacy||{};
    var out={weekOf:weekOf,points:Math.max(0,+st.points||0),loggedDays:Math.max(0,+st.loggedDays||0)};
    if(p.workouts) out.workouts=Math.max(0,+st.workouts||0);
    if(p.steps) { out.avgSteps=Math.max(0,+st.avgSteps||0); out.expeditionMiles=Math.max(0,+st.expeditionMiles||0); }
    if(p.calories) { out.avgProtein=Math.max(0,+st.avgProtein||0); }
    return out;
  }
  function partnerWeeklySummary(weekOf) {
    var t=state().partnerData&&state().partnerData.together, w=t&&t.weekSummary;
    return w&&w.weekOf===weekOf?w:null;
  }

  function sharePayload() {
    var c=cfg(), weeks=[currentWeek(),nextWeek()], missions=[];
    weeks.forEach(function(w){var m=missionFor(w); if(!m)return; missions.push({weekOf:w,id:m.id,progress:localProgress(m),updatedAt:m.updatedAt||m.selectedAt||''});});
    var reviewWeek=window.Insights&&Insights.reviewWeekKey?Insights.reviewWeekKey():Store.shift(currentWeek(),-7);
    var cf=campfireFor(reviewWeek), nextStatus=window.Insights&&Insights.nextWeekStatus?Insights.nextWeekStatus(reviewWeek):null;
    return {
      duoMissions:missions,
      weekSummary:weeklySummary(reviewWeek),
      campfireIntent:cf&&cf.intent?{weekOf:reviewWeek,text:String(cf.intent).slice(0,280),updatedAt:cf.intentUpdatedAt||'',closedAt:cf.closedAt||''}:null,
      nextWeek:nextStatus?{weekOf:nextStatus.weekOf,training:!!nextStatus.training,meals:!!nextStatus.meals,mealCount:Math.max(0,Math.min(28,+nextStatus.mealCount||0))}:null
    };
  }

  function sharedDinnerStatus() {
    var mine=window.Nutrition&&Nutrition.sharedDinnerProfile?Nutrition.sharedDinnerProfile():null;
    var theirs=state().partnerData&&state().partnerData.sharedDinnerProfile;
    return { mine:mine, theirs:theirs, ready:!!(mine&&theirs) };
  }

  window.InSyncTogether={ MODES:MODES, MISSIONS:MISSIONS, mode:mode, modeDef:modeDef, setMode:setMode,
    missionDef:missionDef, missionFor:missionFor, setMission:setMission, clearMission:clearMission, localProgress:localProgress,
    partnerMission:partnerMission, missionStatus:missionStatus, currentWeek:currentWeek, nextWeek:nextWeek,
    campfireFor:campfireFor, closedCampfires:closedCampfires, setCampfireIntent:setCampfireIntent, closeCampfire:closeCampfire, partnerCampfireIntent:partnerCampfireIntent,
    weeklySummary:weeklySummary, partnerWeeklySummary:partnerWeeklySummary, sharePayload:sharePayload, sharedDinnerStatus:sharedDinnerStatus };
})();
