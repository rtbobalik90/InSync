/* InSync Nutrition 2.0 — deterministic verification and household planning helpers.
   AI may propose food. This module proves whether the proposed week is usable. */
(function () {
  'use strict';

  var SLOTS = ['Breakfast','Lunch','Dinner','Snack'];

  function cleanText(v, n) { return String(v == null ? '' : v).slice(0, n || 1200).trim(); }
  function terms(text) {
    return cleanText(text, 1200).toLowerCase().split(/[,;\n]/).map(function (x) {
      return x.replace(/[^a-z0-9 '\-]/g,' ').replace(/\s+/g,' ').trim();
    }).filter(function (x) { return x.length >= 2; }).slice(0, 60);
  }
  function mealText(meal) {
    return ' ' + [meal && meal.name || ''].concat((meal && meal.items || []).map(function (it) { return it && it.name || ''; }))
      .join(' ').toLowerCase().replace(/[^a-z0-9 '\-]/g,' ').replace(/\s+/g,' ').trim() + ' ';
  }
  function forbiddenIngredient(meal, mustNot) {
    var hay = mealText(meal), list = Array.isArray(mustNot) ? mustNot : terms(mustNot);
    for (var i=0;i<list.length;i++) {
      var t=String(list[i]||'').toLowerCase().replace(/[^a-z0-9 '\-]/g,' ').replace(/\s+/g,' ').trim();
      if (t && hay.indexOf(' '+t+' ') >= 0) return list[i];
    }
    return '';
  }
  function dayMeals(map, date) {
    map = map || {};
    return SLOTS.map(function (slot) { return map[date+'|'+slot] || null; }).filter(Boolean);
  }
  function dayTotals(map, date) {
    return dayMeals(map,date).reduce(function (a,m) {
      a.kcal += +m.kcal || 0; a.protein += +m.protein || 0; a.carbs += +m.carbs || 0; a.fat += +m.fat || 0;
      return a;
    }, {kcal:0,protein:0,carbs:0,fat:0});
  }
  function targetRange(targets) {
    targets = targets || {};
    var kcal=Math.max(1,+targets.calories||1), protein=Math.max(1,+targets.protein||1);
    return { kcalMin:Math.round(kcal*0.90), kcalMax:Math.round(kcal*1.05), proteinMin:Math.round(protein) };
  }
  function validateDay(map, date, targets, prefs) {
    prefs=prefs||{}; var missing=[], issues=[], range=targetRange(targets), total=dayTotals(map,date);
    SLOTS.forEach(function(slot){ if(!map || !map[date+'|'+slot]) missing.push(slot); });
    if(missing.length) issues.push('missing '+missing.join(', '));
    if(!missing.length) {
      if(total.kcal < range.kcalMin) issues.push('calories are '+Math.round(range.kcalMin-total.kcal)+' kcal below the verified range');
      if(total.kcal > range.kcalMax) issues.push('calories are '+Math.round(total.kcal-range.kcalMax)+' kcal above the verified range');
      if(total.protein < range.proteinMin) issues.push('protein is '+Math.round(range.proteinMin-total.protein)+' g below target');
    }
    var forbidden='';
    dayMeals(map,date).some(function(m){ forbidden=forbiddenIngredient(m,prefs.mustNot||''); return !!forbidden; });
    if(forbidden) issues.push('contains the absolute exclusion “'+forbidden+'”');
    return { ok:!issues.length, date:date, missing:missing, totals:total, range:range, issues:issues, reason:issues.join('; ') };
  }
  function validateWeek(map, weekOf, targets, prefs) {
    var days=[], invalid=[];
    for(var i=0;i<7;i++) {
      var d=Store.shift(weekOf,i), v=validateDay(map,d,targets,prefs); days.push(v); if(!v.ok) invalid.push(v);
    }
    return {ok:!invalid.length, days:days, invalid:invalid};
  }
  function pantryTerms(prefs) { return terms((prefs||{}).pantry||''); }
  function isPantryItem(name,prefs) {
    var n=' '+String(name||'').toLowerCase().replace(/[^a-z0-9 '\-]/g,' ').replace(/\s+/g,' ').trim()+' ';
    return pantryTerms(prefs).some(function(t){ return n.indexOf(' '+t+' ')>=0; });
  }
  function prepTimeline(map, weekOf) {
    var out=[];
    for(var i=0;i<7;i++) {
      var date=Store.shift(weekOf,i), tasks=[];
      SLOTS.forEach(function(slot){
        var m=(map||{})[date+'|'+slot]; if(!m || m.leftoverOf) return;
        var mins=Math.max(0,Math.round(+m.prepMinutes||0));
        if(m.batchSource || slot==='Dinner' || mins>=20) tasks.push({slot:slot,name:m.name,minutes:mins,servings:Math.max(1,+m.servings||1),batch:!!m.batchSource});
      });
      if(tasks.length) out.push({date:date,tasks:tasks,totalMinutes:tasks.reduce(function(a,t){return a+t.minutes;},0)});
    }
    return out;
  }
  function dinnerTarget(targets) {
    targets=targets||{};
    return {kcal:Math.max(300,Math.round((+targets.calories||2000)*0.32)),protein:Math.max(25,Math.round((+targets.protein||140)*0.32))};
  }
  function sharedDinnerProfile() {
    var s=Store.state(), prefs=s.mealPrefs||{};
    if(!prefs.sharedDinnerShare) return null;
    var t=dinnerTarget(s.targets||{});
    return {name:cleanText(s.profile&&s.profile.name,80),kcal:t.kcal,protein:t.protein};
  }
  function sharedDinnerTargets() {
    var s=Store.state(), meTarget=dinnerTarget(s.targets||{}), pd=s.partnerData&&s.partnerData.sharedDinnerProfile;
    return {
      me:{name:cleanText(s.profile&&s.profile.name,80)||'Me',kcal:meTarget.kcal,protein:meTarget.protein},
      partner:pd && +pd.kcal>0 && +pd.protein>0 ? {name:cleanText(pd.name,80)||cleanText(s.partner&&s.partner.name,80)||'Partner',kcal:Math.round(+pd.kcal),protein:Math.round(+pd.protein)} : null
    };
  }
  function validateSharedDinner(raw) {
    if(!raw || Object.prototype.toString.call(raw)!=='[object Object]') return {ok:false,error:'Shared dinner was not an object.'};
    if(!raw.name || !Array.isArray(raw.items) || raw.items.length<2 || !Array.isArray(raw.instructions) || !raw.instructions.length) return {ok:false,error:'Shared dinner recipe is incomplete.'};
    if(!raw.portions || !raw.portions.me || !raw.portions.partner) return {ok:false,error:'Shared dinner needs both portions.'};
    var targets=sharedDinnerTargets(); if(!targets.partner) return {ok:false,error:'Partner dinner target is not available.'};
    var p=[['me',targets.me],['partner',targets.partner]];
    for(var i=0;i<p.length;i++) {
      var key=p[i][0], target=p[i][1], portion=raw.portions[key]||{}, kcal=+portion.kcal||0, protein=+portion.protein||0;
      if(kcal < target.kcal*0.85 || kcal > target.kcal*1.15) return {ok:false,error:key+' portion is outside the dinner calorie range.'};
      if(protein < target.protein*0.90) return {ok:false,error:key+' portion is below the dinner protein target.'};
    }
    var forbidden=forbiddenIngredient(raw,(Store.state().mealPrefs||{}).mustNot||'');
    if(forbidden) return {ok:false,error:'Shared dinner contains the absolute exclusion “'+forbidden+'”.'};
    return {ok:true,value:raw};
  }
  function eatingOutFit(item) {
    item=item||{}; var t=Store.totals(), tg=Store.state().targets||{}, r=Store.calorieRange?Store.calorieRange(Store.todayKey()):{max:tg.calories};
    var kcalLeft=Math.max(0,(r.max||tg.calories)-t.kcal), proteinLeft=Math.max(0,(+tg.protein||0)-t.protein), kcal=+item.kcal||0, protein=+item.protein||0;
    var score=0;
    if(kcalLeft>0) score += Math.max(0,1-Math.abs(kcal-kcalLeft)/Math.max(kcalLeft,300));
    if(proteinLeft>0) score += Math.min(1,protein/Math.max(proteinLeft,1)); else score += protein>20?0.5:0;
    return {score:score,kcalLeft:kcalLeft,proteinLeft:proteinLeft,label:score>=1.35?'Strong fit':score>=0.8?'Possible fit':'Check the numbers'};
  }

  window.Nutrition = {
    slots:SLOTS.slice(), terms:terms, forbiddenIngredient:forbiddenIngredient,
    dayMeals:dayMeals, dayTotals:dayTotals, targetRange:targetRange,
    validateDay:validateDay, validateWeek:validateWeek,
    pantryTerms:pantryTerms, isPantryItem:isPantryItem, prepTimeline:prepTimeline,
    dinnerTarget:dinnerTarget, sharedDinnerProfile:sharedDinnerProfile, sharedDinnerTargets:sharedDinnerTargets,
    validateSharedDinner:validateSharedDinner, eatingOutFit:eatingOutFit
  };
})();
