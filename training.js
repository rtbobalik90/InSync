/* InSync Training 2.0 — deterministic coaching rules.
   Training decisions are derived from the local log, equipment profile and
   readiness. Claude may explain a plan, but it never invents progression. */
(function () {
  'use strict';

  var PROFILE_EQUIPMENT = {
    'planet-fitness': ['Bodyweight','Dumbbell','Machine','Cable','Smith'],
    'home': ['Bodyweight','Dumbbell'],
    'full-gym': ['Bodyweight','Dumbbell','Machine','Cable','Smith','Barbell'],
    'custom': []
  };

  function state() { return Store.state(); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function uniq(a) { var seen={}; return (a||[]).filter(function(x){x=String(x||'').trim();if(!x||seen[x])return false;seen[x]=1;return true;}); }

  function profile() {
    var p = state().trainingProfile || {};
    var type = PROFILE_EQUIPMENT[p.gymType] ? p.gymType : 'planet-fitness';
    var equipment = type === 'custom' ? uniq(p.customEquipment) : PROFILE_EQUIPMENT[type].slice();
    if (type === 'custom' && !equipment.length) equipment = ['Bodyweight'];
    return {
      gymType: type,
      equipment: equipment,
      customEquipment: uniq(p.customEquipment),
      advancedRIR: !!p.advancedRIR,
      autoRest: p.autoRest !== false,
      defaultRestSec: Math.max(30, Math.min(300, Math.round(+p.defaultRestSec || 90))),
      deloadWeekOf: String(p.deloadWeekOf || ''),
      deloadDismissedAt: String(p.deloadDismissedAt || '')
    };
  }

  function gymLabel(type) {
    return ({'planet-fitness':'Planet Fitness','home':'Home','full-gym':'Full gym','custom':'Custom equipment'})[type] || 'Gym';
  }

  function equipmentAllows(ex, p) {
    if (!ex) return false;
    p = p || profile();
    var eq = String(ex.equipment || 'Bodyweight');
    return p.equipment.indexOf(eq) >= 0;
  }
  function availableExercises() {
    var p=profile();
    return Exercises.all.filter(function(ex){ return equipmentAllows(ex,p); });
  }

  function readiness(key) {
    key = key || Store.todayKey();
    var d = state().days[key] || {};
    var r = d.readiness || {};
    return {
      energy: ['low','normal','high'].indexOf(r.energy)>=0 ? r.energy : '',
      soreness: ['none','some','a-lot'].indexOf(r.soreness)>=0 ? r.soreness : '',
      pain: r.pain === true,
      note: String(r.note || '').slice(0,240),
      at: String(r.at || '')
    };
  }
  function readinessComplete(key) {
    var r=readiness(key); return !!r.energy && !!r.soreness;
  }
  function readinessRecommendation(key) {
    var r=readiness(key);
    if (!r.energy || !r.soreness) return {kind:'check',label:'Check readiness',detail:'Ten seconds now gives the session better context.',mode:'planned'};
    if (r.pain) return {kind:'caution',label:'Review the session',detail:'You marked pain today. InSync will not diagnose it or push progression. Keep only movements that feel appropriate and use substitutions when needed.',mode:'lighter'};
    if (r.energy==='low' && r.soreness==='a-lot') return {kind:'lighter',label:'A lighter session fits today',detail:'Low energy plus a lot of soreness is a good reason to reduce volume. You can still keep the planned session if you choose.',mode:'lighter'};
    if (r.energy==='low' || r.soreness==='a-lot') return {kind:'lighter',label:'Consider a lighter session',detail:'Readiness is below normal today. Reduce one working set per movement and hold progression.',mode:'lighter'};
    if (r.energy==='high' && r.soreness==='none') return {kind:'ready',label:'Ready for the planned session',detail:'Energy is high and soreness is clear. Follow the plan; progression still depends on the actual lift history.',mode:'planned'};
    return {kind:'ready',label:'Ready for the planned session',detail:'Nothing in today’s check calls for an automatic reduction.',mode:'planned'};
  }

  function repRange(ex) {
    var nums=String(ex&&ex.reps||'').match(/\d+/g)||[];
    if(!nums.length || /sec|failure|each/i.test(String(ex&&ex.reps||''))) return null;
    var lo=+nums[0],hi=+(nums[nums.length-1]||nums[0]);
    return lo>0&&hi>=lo?{min:lo,max:hi}:null;
  }
  function historyFor(idOrName, limit) {
    var ex=Exercises.get(idOrName)||Exercises.byName(idOrName), name=ex?ex.name:String(idOrName||'');
    var keys=Object.keys(state().days||{}).sort().reverse(), out=[];
    for(var i=0;i<keys.length && out.length<(limit||8);i++){
      var ws=(state().days[keys[i]]&&state().days[keys[i]].workouts)||[];
      for(var j=ws.length-1;j>=0;j--){
        var items=ws[j].exercises||[];
        for(var n=items.length-1;n>=0;n--){
          var item=items[n];
          if((ex&&item.id===ex.id)||String(item.name||'').toLowerCase()===name.toLowerCase()){
            var sets=Array.isArray(item.workingSets)&&item.workingSets.length?item.workingSets:[{weight:+item.weight||0,reps:+item.reps||0,effort:item.effort||'',rir:item.rir}];
            out.push({date:keys[i],session:ws[j].name||'',sets:clone(sets),weight:+item.weight||0,reps:+item.reps||0});
            break;
          }
        }
      }
    }
    return out;
  }
  function setHard(set) {
    if (!set) return false;
    if (set.rir != null && isFinite(+set.rir)) return +set.rir <= 0;
    return set.effort === 'hard';
  }
  function setComfortable(set) {
    if (!set) return true;
    if (set.rir != null && isFinite(+set.rir)) return +set.rir >= 1;
    return set.effort !== 'hard';
  }
  function bestSet(session) {
    var sets=(session&&session.sets)||[], best=null;
    sets.forEach(function(s){
      if(!best || (+s.weight||0)>(+best.weight||0) || ((+s.weight||0)===(+best.weight||0)&&(+s.reps||0)>(+best.reps||0))) best=s;
    });
    return best||{weight:+(session&&session.weight)||0,reps:+(session&&session.reps)||0};
  }
  function incrementFor(ex) {
    if(!ex) return 5;
    if(/dumbbell/i.test(ex.equipment||'')) return 5;
    if(/bodyweight/i.test(ex.equipment||'')) return 0;
    return 5;
  }
  function recentDiscomfort(id) {
    var log=(state().exercisePrefs&&state().exercisePrefs.swapLog)||[];
    return log.slice(-12).some(function(x){return x&&x.fromId===id&&x.reason==='discomfort';});
  }

  function progressionFor(idOrName) {
    var ex=Exercises.get(idOrName)||Exercises.byName(idOrName), name=ex?ex.name:String(idOrName||'');
    var range=repRange(ex), hist=historyFor(idOrName,6), todayReady=readiness(Store.todayKey());
    var evidence=[];
    if(!hist.length){
      return {kind:'start',label:'Start controlled',detail:range?('Choose a load you can own for '+range.min+'–'+range.max+' reps.'):'Use a controlled first working set.',weight:null,reps:range&&range.min,evidence:['No prior working-set history']};
    }
    var last=bestSet(hist[0]), prev=hist[1]?bestSet(hist[1]):null, weight=+last.weight||0,reps=+last.reps||0;
    evidence.push(hist[0].date+': '+(weight?Store.fmtLift(weight)+' × ':'')+reps);
    if(hist[1]&&prev) evidence.push(hist[1].date+': '+(+prev.weight?Store.fmtLift(+prev.weight)+' × ':'')+(+prev.reps||0));

    if(ex&&recentDiscomfort(ex.id)) return {kind:'substitute',label:'Keep comfort first',detail:'This movement was recently swapped for discomfort. InSync will not progress it until you choose to use it comfortably again.',weight:weight||null,reps:reps||null,evidence:evidence.concat(['Recent discomfort swap'])};
    if(todayReady.pain) return {kind:'hold',label:'Hold progression today',detail:'You marked pain in today’s readiness check. Keep progression off and use a comfortable substitution if needed.',weight:weight||null,reps:reps||null,evidence:evidence.concat(['Readiness: pain marked'])};
    if(todayReady.energy==='low'||todayReady.soreness==='a-lot') return {kind:'hold',label:'Hold the load today',detail:'Today’s readiness is below normal. Repeat a comfortable load rather than forcing progression.',weight:weight||null,reps:range?Math.min(range.max,Math.max(range.min,reps)):reps,evidence:evidence.concat(['Readiness calls for reduced pressure'])};
    if(!range||weight<=0) return {kind:'repeat',label:'Build the same movement',detail:'Add a clean rep or better control before adding difficulty.',weight:weight||null,reps:reps?reps+1:null,evidence:evidence};

    var lastHard=(hist[0].sets||[]).some(setHard);
    if(lastHard && reps>=range.max) return {kind:'hold',label:'Own this load once more',detail:'You reached the top of the range, but the last session was marked hard. Repeat it before adding load.',weight:weight,reps:range.max,evidence:evidence.concat(['Last session included a hard / 0-RIR set'])};

    var bothTop=!!prev && +prev.weight===weight && +prev.reps>=range.max && reps>=range.max && setComfortable(last) && setComfortable(prev);
    if(bothTop){
      var step=incrementFor(ex);
      if(step>0) return {kind:'load',label:'Ready to add load',detail:'You reached the top of the rep range in two sessions without a hard finish. Try '+Store.fmtLift(weight+step)+' for '+range.min+' reps.',weight:weight+step,reps:range.min,evidence:evidence.concat(['Top of rep range twice'])};
    }
    if(reps<range.max) return {kind:'reps',label:'Add one clean rep',detail:'Keep the load and aim for '+Math.min(range.max,reps+1)+'.',weight:weight,reps:Math.min(range.max,reps+1),evidence:evidence};
    return {kind:'hold',label:'Own the top of the range',detail:'Repeat '+Store.fmtLift(weight)+' × '+range.max+' once more before adding load.',weight:weight,reps:range.max,evidence:evidence};
  }

  function deloadStatus() {
    var s=state(), today=Store.todayKey(), sessions=[];
    for(var i=20;i>=0;i--){
      var key=Store.shift(today,-i),d=s.days[key];
      (d&&d.workouts||[]).forEach(function(w){sessions.push({date:key,workout:w});});
    }
    var recent=sessions.filter(function(x){return x.date>=Store.shift(today,-9);});
    var hardSets=0,totalSets=0;
    recent.forEach(function(x){(x.workout.exercises||[]).forEach(function(e){(e.workingSets||[]).forEach(function(st){totalSets++;if(setHard(st))hardSets++;});});});
    var readinessDays=[];
    for(var d=0;d<7;d++){var k=Store.shift(today,-d),r=(s.days[k]||{}).readiness;if(r&&r.energy)readinessDays.push(r);}
    var strained=readinessDays.filter(function(r){return r.energy==='low'||r.soreness==='a-lot';}).length;
    var rate=totalSets?hardSets/totalSets:0;
    var suggest=(recent.length>=5&&rate>=0.35)||(recent.length>=4&&strained>=3);
    return {
      suggested:suggest,
      recentSessions:recent.length,
      hardSetRate:rate,
      strainedReadiness:strained,
      label:suggest?'A lighter week may help':'Recovery looks manageable',
      detail:suggest?'Recent training load plus effort/readiness signals justify proposing a lighter week. InSync will never apply it without your approval.':'There is not enough evidence to propose a deload right now.'
    };
  }

  function isDeloadWeek(key) {
    key=key||Store.todayKey();
    return profile().deloadWeekOf === Store.weekStart(key);
  }

  function restSecondsFor(idOrName) {
    var ex=Exercises.get(idOrName)||Exercises.byName(idOrName), p=profile();
    if(!ex) return p.defaultRestSec;
    if(ex.group==='Warm-up') return 30;
    if(['Chest','Back','Legs'].indexOf(ex.group)>=0) return Math.max(p.defaultRestSec,120);
    return p.defaultRestSec;
  }

  function warmupFor(items) {
    var groups={}; (items||[]).forEach(function(x){if(x&&x.group)groups[x.group]=1;});
    var ids=[];
    if(groups.Legs){ids.push('high-knees','butt-kickers');}
    else if(groups.Chest||groups.Back||groups.Shoulders||groups.Arms){ids.push('arm-circles','inchworm');}
    else ids.push('jumping-jacks','arm-circles');
    return ids.map(Exercises.get).filter(Boolean);
  }

  function walkDistanceMiles(key) {
    key=key||Store.todayKey();
    var d=state().days[key]||{},w=d.walk||{},elapsed=Store.dailyWalkElapsedMs?Store.dailyWalkElapsedMs(key):(+w.elapsedMs||0);
    var manual=+w.distanceMiles||0;
    var speed=+w.speedMph||0;
    var estimated=speed>0&&elapsed>0 ? speed*(elapsed/3600000) : 0;
    return Math.max(manual,estimated);
  }
  function movementMiles(key) {
    key=key||Store.todayKey();
    var d=state().days[key]||{};
    return Math.max(Store.miles(+d.steps||0),walkDistanceMiles(key));
  }

  window.Training = {
    profile:profile, gymLabel:gymLabel, availableExercises:availableExercises, equipmentAllows:equipmentAllows,
    readiness:readiness, readinessComplete:readinessComplete, readinessRecommendation:readinessRecommendation,
    progressionFor:progressionFor, historyFor:historyFor, deloadStatus:deloadStatus, isDeloadWeek:isDeloadWeek,
    restSecondsFor:restSecondsFor, warmupFor:warmupFor, walkDistanceMiles:walkDistanceMiles, movementMiles:movementMiles
  };
})();
