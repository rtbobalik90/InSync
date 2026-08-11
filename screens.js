/* Screens. Each returns HTML for the sheet body; UI.screen supplies the chrome.
   No screen invents a number — everything comes from Store. */
(function () {
  'use strict';

  var esc = UI.esc, icon = UI.icon;

  /* Expedition content is a shared domain now. Screens consume the catalog;
     Journey, Theme Engine and future Base Camp rewards can use the same data. */
  var ROUTES = Journeys.ROUTES;
  var ROUTE_ORDER = Journeys.ORDER;
  var GRADES = Journeys.GRADES;

  /* No route until the two of them agree one, so this can be null and every
     caller has to say what it does then. */
  function route() { return ROUTES[Store.state().expedition.routeId] || null; }
  function hasExpedition() { return !!route(); }
  function leg() {
    var e = Store.state().expedition, r = route();
    if (!r || e.legIndex >= r.legs.length) return null;
    return r.legs[e.legIndex];
  }

  /* Expedition art is now image-ready across the recurring app surfaces.
     Every path points at the v2 production slot; UI.screen keeps the old art
     underneath until that new file exists in the bundle. */
  function expeditionSurface(surface, fallback) {
    var id = Store.state().expedition.routeId;
    var art = fallback;
    if (id && window.Journeys) {
      if (surface === 'home' && Journeys.homeArt) art = Journeys.homeArt(id, Store.timeOfDay());
      else if (Journeys.sectionArt) art = Journeys.sectionArt(id, surface);
    }
    return { art: art, fallback: fallback };
  }
  function checkpointFallback(routeId, cp) {
    var r = ROUTES[routeId] || {};
    if (!cp) return r.banner || routeHero(routeId) || 'assets/art/expedition-overlook.webp';
    var li = cp.unlockAfterLeg < 0 ? 0 : Math.min(cp.unlockAfterLeg, Math.max(0, (r.legs || []).length - 1));
    var legArt = r.legs && r.legs[li] && r.legs[li].art;
    return legArt || r.banner || routeHero(routeId) || 'assets/art/expedition-overlook.webp';
  }
  function checkpointDate(rec) {
    if (!rec || !rec.at) return '';
    var d = new Date(rec.at);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' });
  }

  function timeWord() {
    return { dawn: 'camp at dawn', day: 'camp in daylight', sunset: 'camp at sunset', night: 'camp after dark' }[Store.timeOfDay()];
  }

  function ledgerCard() {
    var t = Store.totals(), d = Store.day(), tg = Store.state().targets;
    function foot(v, target, unit) {
      var left = target - v;
      if (left <= 0) return '<div class="foot ok">target met</div>';
      return '<div class="foot' + (left / target > 0.4 ? ' short' : '') + '">' +
        left.toLocaleString() + (unit || '') + ' to go</div>';
    }
    return '<article class="card">' +
      '<div class="cardhead">' +
        '<div class="title"><i></i>Day ' + Store.streak() + ' on the trail</div>' +
        '<div class="meta">' + esc(timeWord()) + '</div>' +
      '</div>' +
      '<div class="ledger">' +
        '<div><div class="label">Energy</div><div class="figure">' + Store.energyNum(t.kcal).toLocaleString() + '</div>' + foot(Store.energyNum(t.kcal), Store.energyNum(tg.calories), ' ' + Store.state().units.energy) + '</div>' +
        '<div><div class="label">Protein</div><div class="figure">' + t.protein + '<small>g</small></div>' + foot(t.protein, tg.protein, ' g') + '</div>' +
        '<div><div class="label">Steps</div><div class="figure">' + d.steps.toLocaleString() + '</div>' + foot(d.steps, tg.steps) + '</div>' +
      '</div>' +
    '</article>';
  }

  // The coach's own words when Claude is connected; the rule-based line otherwise.
  function coachSays() {
    var n = Store.nextStep();
    var c = Store.state().coachCache;
    if (c && c.date === Store.todayKey() && c.line) return { line: c.line, action: n.action, route: n.route, written: true };
    return { line: n.line, action: n.action, route: n.route, written: false };
  }

  function aiWhyBlock(key, title) {
    if (!window.InSyncIntelligence) return '';
    var e = InSyncIntelligence.evidence(key);
    if (!e || !e.items || !e.items.length) return '';
    return '<details class="aiwhy"><summary>' + esc(title || 'Why did Coach suggest this?') + '</summary>' +
      '<div class="aiwhybody">' + e.items.map(function (it) {
        return '<div class="aiwhyrow"><span>' + esc(it.label) + '</span><b>' + esc(it.value) + '</b></div>';
      }).join('') +
      '<p class="small">Evidence is computed by InSync from your saved data. Coach does not get to invent the figures.</p></div></details>';
  }

  function nextStepCard() {
    var n = coachSays();
    return '<article class="card pad">' +
      '<div style="display:flex;align-items:center;gap:9px;margin-bottom:11px">' +
        '<span style="width:15px;height:15px;color:var(--gold)">' + icon('flag') + '</span>' +
        '<span class="kicker">Next step today</span>' +
      '</div>' +
      '<p class="lede">' + esc(n.line) + '</p>' +
      '<div class="btnrow" style="margin-top:16px">' +
        '<button class="btn" data-route="' + n.route + '">' + esc(n.action) + '</button>' +
        '<button class="btn ghost auto" data-route="coach">Ask coach</button>' +
      '</div>' +
      (n.written ? aiWhyBlock('daily-next-step') : '') +
    '</article>';
  }

  function expeditionCard() {
    var r = route();
    if (!r) return noExpeditionCard();
    var l = leg(), e = Store.state().expedition;
    if (!l) {
      return '<article class="card pad accent">' +
        '<div class="kicker gold" style="margin-bottom:8px">Route complete</div>' +
        '<h3 style="font-family:var(--serif);font-size:22px;font-weight:500;margin:0 0 7px">' + esc(r.name) + '</h3>' +
        '<p class="small" style="margin:0">All ' + r.legs.length + ' legs are finished. Choose the next expedition together when you are ready.</p>' +
      '</article>';
    }
    var walked = Store.legMine() + Store.legHers();
    var pct = Math.min(100, Math.round((walked / l.miles) * 100));
    return '<article class="card pad">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px">' +
        '<div>' +
          '<div class="kicker sage" style="margin-bottom:6px">Leg ' + (e.legIndex + 1) + ' of ' + r.legs.length + ' &middot; ' + esc(r.name) + '</div>' +
          '<h3 style="font-family:var(--serif);font-size:22px;font-weight:500;margin:0">' + esc(l.from) + ' &rarr; ' + esc(l.to) + '</h3>' +
        '</div>' +
        '<div style="text-align:right;flex:none">' +
          '<div style="font-family:var(--serif);font-size:26px;line-height:1;color:var(--gold)">' + pct + '%</div>' +
        '</div>' +
      '</div>' +
      '<div class="track"><span style="width:' + pct + '%"></span></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--faint);margin-top:9px">' +
        '<span>' + Store.fmtDistance(walked) + ' walked together</span><span>' + Store.fmtDistance(l.miles) + '</span>' +
      '</div>' +
    '</article>';
  }

  /* Nothing chosen yet. This is the state a new pair opens the app in, and it
     asks for the one decision that unlocks the rest. */
  function noExpeditionCard() {
    var S = Store.state(), st = handshakeState();
    var line = st === 'waiting' ? 'Sent to ' + esc(Store.partnerName()) + '. Nothing starts until they answer.'
      : st === 'invited' ? esc(Store.partnerName()) + ' has proposed the ' + esc(S.invite.routeName) + '.'
      : st === 'accepted' ? esc(S.invite.routeName) + ' is agreed and ready to begin.'
      : 'Twelve real routes, three open to you now. Whichever you agree on, you walk it together.';
    return '<article class="card pad">' +
      '<div class="kicker" style="margin-bottom:11px">No expedition yet</div>' +
      '<p class="lede" style="margin:0 0 14px">' + line + '</p>' +
      '<button class="btn ghost block" data-route="handshake">' + esc(handshakeCta()) + '</button>' +
    '</article>';
  }

  // Only appears when there is something new from the partner.
  /* Only when there is something new from the partner. Yesterday's totals are not news,
     so a stale file leaves Home focused on the owner — which is what the brief asks for.
     A note is news whatever its age, until the owner has opened Together. */
  function partnerCard() {
    var S = Store.state(), p = Store.partnerRef(), pd = S.partnerData;
    if (!pd) return '';

    var fresh = pd.date === Store.todayKey();
    var unreadNote = !!pd.note && S.partnerNoteSeen !== ((pd.noteDate || pd.date) + '|' + pd.note);
    if (!fresh && !unreadNote) return '';

    var bits = [];
    if (pd.workouts) bits.push(pd.workouts === 1 ? 'workout done' : pd.workouts + ' workouts done');
    if (pd.steps != null) bits.push(pd.steps.toLocaleString() + ' steps');
    if (pd.protein != null) bits.push(pd.protein + ' g protein');
    var line = bits.length ? bits.join(' \u00b7 ') : 'synced, nothing shared today';

    return '<article class="card pad accent">' +
      '<div style="display:flex;align-items:center;gap:11px;margin-bottom:' + (unreadNote ? '12px' : '0') + '">' +
        '<div class="avatar her" style="width:32px;height:32px;flex:none">' + esc(pd.initials || p.initials) + '</div>' +
        '<div style="font-size:12.5px;color:var(--muted)">' + esc(pd.name || p.name) + ' &middot; ' + esc(line) + '</div>' +
      '</div>' +
      (unreadNote ? '<p style="font-family:var(--serif);font-style:italic;font-size:16.5px;line-height:1.5;margin:0;color:#EDE5D4;text-wrap:pretty">&ldquo;' + esc(pd.note) + '&rdquo;</p>' : '') +
      '<div class="btnrow" style="margin-top:15px">' +
        '<button class="btn ghost sm" data-route="together">Open Together</button>' +
      '</div>' +
    '</article>';
  }

  function homeRhythmCard() {
    var hour = new Date().getHours(), d = Store.day();
    if (hour >= 4 && hour < 12) {
      /* The priority card is a prompt, not permanent dashboard furniture.
         Once today's morning check-in has actually been saved it disappears;
         History remains the place to correct it later. */
      if (d.morningCheckInAt || d.weight != null || d.sleepHr != null || d.restingHr != null) return '';
      return '<article class="card pad home-rhythm" data-rest-anchor>' +
        '<div class="home-rhythm-head"><span class="kicker sage">Morning check-in</span>' +
          '<span class="small">Before the day gets moving</span></div>' +
        '<p class="lede" style="margin:0 0 8px">Set the baseline for today.</p>' +
        '<p class="note" style="margin:0 0 14px">Weight, sleep and resting heart rate. Skip anything you do not track.</p>' +
        '<button class="btn block" data-action="log-morning">Morning check-in</button>' +
      '</article>';
    }
    if (hour >= 18) {
      var written = (d.reflection || '').trim();
      /* Closing the day removes the prompt. The saved review remains editable
         from History instead of consuming Home after the task is complete. */
      if (written) return '';
      return '<article class="card pad home-rhythm" data-rest-anchor>' +
        '<div class="home-rhythm-head"><span class="kicker gold">Nightly review</span>' +
          '<span class="small">Before you close the day</span></div>' +
        '<p class="lede" style="margin:0 0 8px">Take a minute and close the day.</p>' +
        '<p class="note" style="margin:0 0 14px">Review what happened, what mattered, and anything you want to remember tomorrow.</p>' +
        '<button class="btn block" data-route="reflection">Review the day</button>' +
      '</article>';
    }
    return '';
  }

  // ---------------- Home ----------------
  function home() {
    /* One verse list, in the store — Home and Reflection must show the same
       morning, and the coach's own choice has to reach both. */
    var v = Store.verse();
    var hasData = Store.logged(Store.todayKey());
    var overlay =
      '<div class="eyebrow">Verse for the day</div>' +
      '<p class="verse">' + esc(v.text) + '</p>' +
      '<cite class="attrib">' + esc(v.ref) + '</cite>' +
      // The streak line lives in the ledger card header. Day one has no ledger card,
      // so the hero carries it only then.
      (hasData ? '' :
        '<div class="streakline"><i></i><span>Day one &middot; ' + timeWord() + '</span></div>');

    var rhythm = homeRhythmCard();
    var body = rhythm + (hasData
      ? ledgerCard() + nextStepCard() + coachPatternCard() + weeklyGoalsCard() + weeklyReviewTeaser() + expeditionCard() + partnerCard()
      : dayOneCard());
    body += '<button class="btn ghost block" data-route="calendar">History &amp; calendar</button>';

    var homeHero = expeditionSurface('home', UI.CAMP[Store.timeOfDay()]);
    return UI.screen({
      tab: 'home', rest: 551, restMeasure: true, overlay: overlay, body: body,
      art: homeHero.art, artFallback: homeHero.fallback, scrim: UI.SCRIMS.light,
      photoHeight: '690px'
    });
  }

  function dayOneCard() {
    var tg = Store.state().targets;
    return '<article class="card">' +
      '<div class="cardhead"><div class="title"><i></i>Nothing logged yet</div>' +
      '<div class="meta">Day one</div></div>' +
      '<div class="ledger">' +
        '<div><div class="label">Energy</div><div class="figure" style="color:#4E4A3E">&mdash;</div><div class="foot">of ' + Store.fmtEnergy(tg.calories) + '</div></div>' +
        '<div><div class="label">Protein</div><div class="figure" style="color:#4E4A3E">&mdash;</div><div class="foot">of ' + tg.protein + ' g</div></div>' +
        '<div><div class="label">Steps</div><div class="figure" style="color:#4E4A3E">&mdash;</div><div class="foot">of ' + tg.steps.toLocaleString() + '</div></div>' +
      '</div>' +
    '</article>' +
    '<article class="card pad">' +
      '<div class="kicker" style="margin-bottom:11px">Four ways in</div>' +
      '<div style="display:grid;gap:9px">' +
        '<button class="btn ghost block" data-route="nutrition">Photograph a meal</button>' +
        '<button class="btn ghost block" data-route="train">Start a session</button>' +
        '<button class="btn ghost block" data-action="log-morning">Weigh in</button>' +
        '<button class="btn ghost block" data-route="together">Invite ' + esc(Store.partnerName()) + '</button>' +
      '</div>' +
      '<p class="small" style="margin-top:14px">The coach needs a fortnight before it proposes targets. Until then these are starting numbers, not yours.</p>' +
    '</article>';
  }

  // ---------------- Journey ----------------
  /* Phase 1 makes Journey a first-class destination without pretending the
     later Theme Engine / Field Guide work is already finished. It uses the
     existing expedition truth and gives the route one coherent home. */
  function journey() {
    var S = Store.state(), r = route(), e = S.expedition;
    if (!r) {
      return UI.screen({
        tab: 'journey', rest: 420, restMeasure: true,
        art: 'assets/art/expedition-none.webp', photoPosition: 'center 42%',
        overlay:
          '<div class="eyebrow">Journey</div>' +
          '<p class="verse">Choose the road together.</p>' +
          '<p class="attrib" style="text-transform:none;letter-spacing:0">Your expedition becomes the world the rest of InSync moves through.</p>',
        body:
          noExpeditionCard() +
          '<article class="card pad">' +
            '<div class="kicker sage" style="margin-bottom:9px">The Road</div>' +
            '<p class="lede" style="margin:0 0 10px">One shared route. Both of your walking moves it.</p>' +
            '<p class="small">Pick the first expedition together. Travel art carries the active leg; reached checkpoints become permanent places you can open again.</p>' +
          '</article>' +
          '<button class="btn block" data-route="handshake">Choose an expedition</button>'
      });
    }

    var current = leg();
    var complete = !current;
    var total = routeMiles(r);
    var completedMiles = r.legs.slice(0, Math.min(e.legIndex, r.legs.length)).reduce(function (sum, x) { return sum + x.miles; }, 0);
    var mine = complete ? 0 : Store.legMine();
    var hers = complete ? 0 : Store.legHers();
    var currentWalked = complete ? 0 : Math.min(current.miles, mine + hers);
    var routeWalked = Math.min(total, completedMiles + currentWalked);
    var overallPct = total ? Math.min(100, Math.round(routeWalked / total * 100)) : 0;
    var currentPct = current && current.miles ? Math.min(100, Math.round(currentWalked / current.miles * 100)) : 100;

    /* The starting checkpoint gets a real place moment before the first mile.
       Once movement begins, the hero switches to the active Travel/Leg art.
       A completed route uses the Journey section art, while the separate
       expedition-complete route owns the heightened final Arrival art. */
    var startingCp = Journeys.checkpoint ? Journeys.checkpoint(e.routeId, 0) : null;
    var atTrailhead = !complete && e.legIndex === 0 && currentWalked <= 0 && startingCp;
    var artFallback = complete
      ? (r.banner || routeHero(e.routeId) || 'assets/art/expedition-overlook.webp')
      : (current.art || r.banner || routeHero(e.routeId) || 'assets/art/expedition-overlook.webp');
    var art = complete
      ? (Journeys.sectionArt ? Journeys.sectionArt(e.routeId, 'journey') : artFallback)
      : atTrailhead
        ? startingCp.art
        : (Journeys.travelArt ? Journeys.travelArt(e.routeId, e.legIndex) : artFallback);

    var overlay =
      '<div class="eyebrow">' + (complete ? 'Route complete' : atTrailhead ? 'At the trailhead' : 'Leg ' + (e.legIndex + 1) + ' of ' + r.legs.length) + '</div>' +
      '<p class="verse">' + esc(complete ? r.name : atTrailhead ? startingCp.name : current.to) + '</p>' +
      '<p class="attrib" style="text-transform:none;letter-spacing:0">' +
        esc(r.where) + ' · ' + esc(r.grade) + ' · ' + overallPct + '% of the route</p>';

    var progress =
      '<article class="card pad accent">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px">' +
          '<div><div class="kicker sage" style="margin-bottom:7px">Current expedition</div>' +
            '<h3 style="font-family:var(--serif);font-size:22px;font-weight:500;margin:0">' + esc(r.name) + '</h3></div>' +
          '<div style="font-family:var(--serif);font-size:28px;color:var(--gold);line-height:1">' + overallPct + '%</div>' +
        '</div>' +
        '<div class="track" style="margin-top:15px"><span style="width:' + overallPct + '%"></span></div>' +
        '<div style="display:flex;justify-content:space-between;gap:12px;margin-top:9px" class="small">' +
          '<span>' + Store.fmtDistance(routeWalked) + ' traveled</span><span>' + Store.fmtDistance(total) + '</span>' +
        '</div>' +
      '</article>';

    var legCard = complete
      ? '<article class="card pad"><div class="kicker gold" style="margin-bottom:9px">At the destination</div>' +
          '<p class="lede" style="margin:0 0 12px">Every leg of this route is complete. Every reached checkpoint stays open below.</p>' +
          '<button class="btn block" data-route="expedition-complete/' + esc(e.routeId) + '">View expedition completion</button>' +
          '<button class="btn ghost block" style="margin-top:9px" data-route="handshake">' + esc(handshakeCta()) + '</button></article>'
      : '<article class="card pad">' +
          '<div class="kicker" style="margin-bottom:9px">Current leg</div>' +
          '<h3 style="font-family:var(--serif);font-size:21px;font-weight:500;margin:0 0 7px">' + esc(current.from) + ' → ' + esc(current.to) + '</h3>' +
          '<p class="small" style="margin:0">' + Store.fmtDistance(currentWalked) + ' of ' + Store.fmtDistance(current.miles) +
            (current.ft ? ' · ' + Store.fmtClimb(current.ft) + ' climb' : '') + '</p>' +
          '<div class="track" style="margin-top:14px"><span style="width:' + currentPct + '%"></span></div>' +
          '<div class="journey-contrib">' +
            '<div><span class="kicker faint">You</span><strong>' + Store.fmtDistance(mine) + '</strong></div>' +
            '<div><span class="kicker faint">' + esc(Store.partnerName()) + '</span><strong>' + Store.fmtDistance(hers) + '</strong></div>' +
          '</div>' +
        '</article>';

    var checkpoints = Journeys.checkpoints ? Journeys.checkpoints(e.routeId) : [];
    var checkpointRows = checkpoints.map(function (cp) {
      var unlocked = Store.checkpointUnlocked ? Store.checkpointUnlocked(e.routeId, cp.index) :
        (cp.unlockAfterLeg < 0 || cp.unlockAfterLeg < e.legIndex);
      var next = !unlocked && !complete && cp.unlockAfterLeg === e.legIndex;
      var status = unlocked ? 'done' : next ? 'current' : 'ahead';
      var rec = Store.checkpointArrival ? Store.checkpointArrival(e.routeId, cp.index) : null;
      var reached = checkpointDate(rec);
      var cum = Journeys.cumulativeMilesToCheckpoint ? Journeys.cumulativeMilesToCheckpoint(e.routeId, cp.index) : 0;
      var subline = cp.unlockAfterLeg < 0
        ? 'Expedition begins here'
        : 'After leg ' + (cp.unlockAfterLeg + 1) + ' · ' + Store.fmtDistance(cum) + ' from the start';
      var right = unlocked
        ? (reached || 'Reached') + ' ' + icon('chev')
        : next
          ? (cp.primary ? currentPct + '%' : 'Along this leg')
          : icon('lock');
      var inner =
        '<span class="journey-marker">' + (unlocked ? icon('check') : next ? (cp.index + 1) : icon('lock')) + '</span>' +
        '<div class="journey-leg-copy"><strong>' + esc(cp.name) + '</strong><span>' + esc(subline) + '</span></div>' +
        '<span class="small checkpoint-state">' + right + '</span>';
      return unlocked
        ? '<button class="journey-leg checkpoint-row ' + status + '" data-route="checkpoint/' + esc(e.routeId) + '/' + cp.index + '" aria-label="Open ' + esc(cp.name) + '">' + inner + '</button>'
        : '<div class="journey-leg checkpoint-row ' + status + '">' + inner + '</div>';
    }).join('');

    var passportIds = (e.walked || []).slice();
    if (complete && passportIds.indexOf(e.routeId) < 0) passportIds.push(e.routeId);
    var passport = passportIds.length
      ? '<article class="card pad"><div class="kicker sage" style="margin-bottom:11px">Expedition passport</div>' +
          '<div class="passport-strip">' + passportIds.map(function (id) {
            var walkedRoute = Journeys.get(id);
            if (!walkedRoute) return '';
            return '<div class="passport-stamp"><span>' + icon('place') + '</span><strong>' + esc(walkedRoute.name) + '</strong></div>';
          }).join('') + '</div></article>'
      : '<article class="card pad"><div class="kicker faint" style="margin-bottom:8px">Expedition passport</div>' +
          '<p class="small">Your first completed route will leave its permanent stamp here.</p></article>';

    var nextRoad = e.next && Journeys.get(e.next)
      ? '<article class="card pad accent"><div class="kicker gold" style="margin-bottom:8px">Next road agreed</div>' +
          '<p class="lede" style="margin:0">' + esc(Journeys.get(e.next).name) + '</p>' +
          '<p class="small" style="margin-top:8px">It begins when this expedition ends.</p></article>'
      : '';

    return UI.screen({
      tab: 'journey', rest: 470, restMeasure: true,
      art: art, artFallback: artFallback, scrim: UI.SCRIMS.medium, photoPosition: 'center 44%', overlay: overlay,
      body:
        progress + legCard +
        '<div class="rulehead"><span class="kicker sage">Checkpoints</span><span></span><span class="note">' +
          checkpoints.length + ' places · ' + r.legs.length + ' legs</span></div>' +
        '<article class="card journey-map">' + checkpointRows + '</article>' +
        '<p class="small" style="margin:-2px 2px 2px">Reached places stay unlocked. Tap any one to reopen its scenic checkpoint page.</p>' +
        nextRoad + passport +
        '<button class="btn ghost block" data-route="handshake">' + esc(handshakeCta()) + '</button>'
    });
  }


  /* One reached place, reopened from the route map. The checkpoint record is
     deliberately small: the route catalog owns geography/distance, while Store
     keeps only the moment and contribution that actually happened. */
  function checkpoint() {
    var parts = (location.hash || '#checkpoint').replace(/^#/, '').split('/');
    var routeId = parts[1] || '', index = Math.max(0, parseInt(parts[2] || '0', 10) || 0);
    var r = Journeys.get(routeId), cp = Journeys.checkpoint ? Journeys.checkpoint(routeId, index) : null;
    if (!r || !cp) {
      return UI.screen({
        tab:null, rest:260, blur:true,
        header:{ back:'journey', title:'Checkpoint', right:'<div style="width:34px"></div>' },
        art:'assets/art/expedition-overlook.webp',
        overlay:'<p class="verse" style="font-size:25px">That checkpoint is not part of this route.</p>',
        body:'<article class="card pad"><button class="btn ghost block" data-route="journey">Back to Journey</button></article>'
      });
    }

    var unlocked = Store.checkpointUnlocked ? Store.checkpointUnlocked(routeId, index) : false;
    if (!unlocked) {
      var lockedFallback = checkpointFallback(routeId, cp);
      return UI.screen({
        tab:null, rest:320, restMeasure:true,
        header:{ back:'journey', title:'Checkpoint', right:'<div style="width:34px"></div>' },
        art: Journeys.sectionArt ? Journeys.sectionArt(routeId, 'journey') : lockedFallback,
        artFallback: lockedFallback, scrim: UI.SCRIMS.medium,
        photoPosition:'center 44%',
        overlay:
          '<div class="eyebrow">Still ahead</div>' +
          '<p class="verse" style="font-size:27px">' + esc(cp.name) + '</p>' +
          '<p class="attrib" style="text-transform:none;letter-spacing:0">Reach this checkpoint to unlock its place page.</p>',
        body:
          '<article class="card pad">' +
            '<div class="kicker faint" style="margin-bottom:9px">Locked checkpoint</div>' +
            '<p class="small" style="margin:0">The route name stays visible, but the scenic arrival artwork and checkpoint record remain hidden until you actually get there.</p>' +
          '</article>' +
          '<button class="btn ghost block" data-route="journey">Back to the road</button>'
      });
    }

    var rec = Store.checkpointArrival ? Store.checkpointArrival(routeId, index) : null;
    var date = checkpointDate(rec);
    var isStart = cp.unlockAfterLeg < 0;
    var routeMilesTotal = routeMiles(r);
    var cumulative = Journeys.cumulativeMilesToCheckpoint ? Journeys.cumulativeMilesToCheckpoint(routeId, index) : 0;
    var prevLeg = !isStart && r.legs[cp.unlockAfterLeg] ? r.legs[cp.unlockAfterLeg] : null;
    var fallback = checkpointFallback(routeId, cp);
    var reachedCopy = date ? 'Reached ' + date : (isStart ? 'Expedition trailhead' : 'Reached previously');

    var breakdown = isStart
      ? '<article class="card pad">' +
          '<div class="kicker sage" style="margin-bottom:9px">The beginning</div>' +
          '<p class="lede" style="margin:0 0 10px">This is where the ' + esc(r.name) + ' starts.</p>' +
          '<div class="checkpoint-facts">' +
            '<div><span class="note">Route</span><strong>' + Store.fmtDistance(routeMilesTotal) + '</strong></div>' +
            '<div><span class="note">Legs ahead</span><strong>' + r.legs.length + '</strong></div>' +
            '<div><span class="note">Location</span><strong>' + esc(r.where) + '</strong></div>' +
          '</div>' +
        '</article>'
      : '<article class="card pad">' +
          '<div class="kicker sage" style="margin-bottom:9px">Leg breakdown</div>' +
          '<h3 style="font-family:var(--serif);font-size:20px;font-weight:500;margin:0 0 7px">' +
            esc(prevLeg ? prevLeg.from : '') + ' → ' + esc(prevLeg ? prevLeg.to : cp.name) + '</h3>' +
          '<div class="checkpoint-facts">' +
            '<div><span class="note">This leg</span><strong>' + Store.fmtDistance(prevLeg ? prevLeg.miles : 0) + '</strong></div>' +
            '<div><span class="note">From start</span><strong>' + Store.fmtDistance(cumulative) + '</strong></div>' +
            (prevLeg && prevLeg.ft ? '<div><span class="note">Climb</span><strong>' + Store.fmtClimb(prevLeg.ft) + '</strong></div>' : '') +
          '</div>' +
        '</article>';

    var contribution = rec && rec.legIndex >= 0 && ((rec.milesMine || 0) + (rec.milesHers || 0) > 0)
      ? '<article class="card pad">' +
          '<div class="kicker" style="margin-bottom:10px">Who carried this leg</div>' +
          '<div class="journey-contrib" style="margin-top:0;padding-top:0;border-top:0">' +
            '<div><span class="kicker faint">You</span><strong>' + Store.fmtDistance(rec.milesMine || 0) + '</strong></div>' +
            '<div><span class="kicker faint">' + esc(Store.partnerName()) + '</span><strong>' + Store.fmtDistance(rec.milesHers || 0) + '</strong></div>' +
          '</div>' +
        '</article>'
      : '';

    var legacy = rec && rec.migrated && !date
      ? '<article class="card pad"><div class="kicker faint" style="margin-bottom:8px">Earlier checkpoint</div>' +
          '<p class="small" style="margin:0">This place was already unlocked before checkpoint history was added, so InSync will not invent an arrival date or contribution split.</p></article>'
      : '';

    return UI.screen({
      tab:null, rest:390, restMeasure:true, photoHeight:'560px',
      header:{ back:'journey', title:'Checkpoint', right:'<div style="width:34px"></div>' },
      art:cp.art, artFallback:fallback, scrim:UI.SCRIMS.light, photoPosition:'center 44%',
      overlay:
        '<div class="eyebrow">' + esc(isStart ? 'Starting point' : 'Checkpoint ' + index + ' of ' + (Journeys.checkpoints(routeId).length - 1)) + '</div>' +
        '<p class="verse" style="font-size:29px">' + esc(cp.name) + '</p>' +
        '<p class="attrib" style="text-transform:none;letter-spacing:0">' + esc(r.name) + ' · ' + esc(reachedCopy) + '</p>',
      body:
        breakdown +
        contribution +
        legacy +
        '<article class="card pad checkpoint-memory">' +
          '<div class="kicker faint" style="margin-bottom:8px">Place in the journey</div>' +
          '<p class="small" style="margin:0">This scenic checkpoint stays unlocked once reached. It is part of the permanent route memory, separate from the active travel artwork used while walking the leg.</p>' +
        '</article>' +
        '<button class="btn block" data-route="journey">Back to Journey</button>'
    });
  }

  // ---------------- Coach ----------------

  /* "protein and steps", "calories, protein and steps" */
  function listWords(a) {
    if (a.length === 1) return a[0];
    if (a.length === 2) return a[0] + ' and ' + a[1];
    return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }

  /* The coach's eyebrow names the day, not the camp. */
  function dayPart() {
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var tod = Store.timeOfDay();
    var part = tod === 'dawn' ? 'morning'
      : tod === 'day' ? (new Date().getHours() < 12 ? 'morning' : 'afternoon')
      : 'evening';
    return days[new Date().getDay()] + ' ' + part;
  }

  /* Coach. One scrolling screen; the top changes after dark, and the
     conversation is real when a key is set. Every figure here is computed. */
  function coach() {
    var n = coachSays(), t = Store.totals(), tg = Store.state().targets;
    var d = Store.day(), evening = Store.timeOfDay() === 'night';
    var gaps = [
      { name: 'protein', open: t.protein < tg.protein },
      { name: 'the session', open: !d.workouts.length },
      { name: 'steps', open: d.steps < tg.steps }
    ].filter(function (g) { return g.open; });

    var words = ['nothing', 'one thing', 'two things', 'three things'];
    var headline = gaps.length === 0
      ? (evening ? 'Everything closed. Write the day down before you sleep.'
                 : 'Nothing outstanding. The day is already clean.')
      : evening
        ? 'The day is nearly done, and ' + words[gaps.length] + ' still open: ' + listWords(gaps.map(function (g) { return g.name; })) + '.'
        : gaps.length === 1
          ? 'One thing stands between you and a clean day.'
          : words[gaps.length].charAt(0).toUpperCase() + words[gaps.length].slice(1) +
            ' stand between you and a clean day: ' + listWords(gaps.map(function (g) { return g.name; })) + '.';

    var overlay =
      '<div class="eyebrow">' + esc(dayPart()) + '</div>' +
      '<p class="verse" style="font-size:25px">' + esc(headline) + '</p>';

    /* Evidence states what is true, rather than asserting a shortfall. */
    var mealCount = d.meals.length;
    var proteinShort = Math.max(0, tg.protein - t.protein);
    var evidence = [
      { fig: t.protein + ' g', text: proteinShort
          ? 'of a ' + tg.protein + ' g target \u2014 ' + proteinShort + ' g still to find'
          : 'against a ' + tg.protein + ' g target, which is met' },
      { fig: mealCount + '', text: mealCount === 0
          ? 'meals logged, so there is nothing to read yet'
          : 'meal' + (mealCount === 1 ? '' : 's') + ' logged' + (proteinShort && mealCount ? ', averaging ' + Math.round(t.protein / mealCount) + ' g of protein each' : '') },
      { fig: Store.streak() + '', text: Store.streak() === 1
          ? 'day logged so far' : 'days unbroken' }
    ];
    if (d.workouts.length) {
      evidence.push({ fig: d.workouts.length + '', text: 'session' + (d.workouts.length === 1 ? '' : 's') + ' done today' });
    }

    var writeBtn = Cloud.hasClaude()
      ? '<button class="btn ghost auto" data-action="coach-write">' + (n.written ? 'Rewrite' : 'Ask the coach to write it') + '</button>'
      : '';

    var eveningCard = evening
      ? '<div class="rulehead"><span class="kicker">Before you sleep</span><span></span></div>' +
        '<article class="card pad">' +
          '<p class="lede">' + esc(Store.verse().text) + '</p>' +
          '<p class="small" style="margin:11px 0 0">' + esc(Store.verse().ref) + '</p>' +
          '<div class="btnrow" style="margin-top:16px">' +
            '<button class="btn" data-route="reflection">Write the day down</button>' +
          '</div>' +
        '</article>'
      : '';

    var coachHero = expeditionSurface('coach', 'assets/art/coach-desk.webp');
    return UI.screen({
      tab: 'coach', restMeasure: true, art: coachHero.art, artFallback: coachHero.fallback, scrim: UI.SCRIMS.light, photoPos: 'center 34%',
      overlay: overlay, blur: false,
      body:
        '<article class="card pad">' +
          '<div class="kicker" style="margin-bottom:11px">Next step today</div>' +
          '<p class="lede">' + esc(n.line) + '</p>' +
          '<div class="btnrow" style="margin-top:16px">' +
            '<button class="btn" data-route="' + n.route + '">' + esc(n.action) + '</button>' +
            writeBtn +
          '</div>' +
          (n.written ? aiWhyBlock('daily-next-step') : '') +
          (Cloud.hasClaude() ? '' : '<p class="small" style="margin-top:13px">Written from simple rules. Add a Claude key in Settings and the coach writes it in its own words.</p>') +
        '</article>' +
        eveningCard +
        '<div class="rulehead"><span class="kicker sage">Its working</span><span></span></div>' +
        '<article class="card pad">' +
          evidence.map(function (e, i) {
            return '<div style="display:flex;align-items:baseline;gap:12px;padding:11px 0' +
              (i === evidence.length - 1 ? '' : ';border-bottom:1px solid var(--rule)') + '">' +
              '<span style="font-family:var(--serif);font-size:17px;font-variant-numeric:tabular-nums;color:var(--gold-mid);flex:none;min-width:62px">' + esc(e.fig) + '</span>' +
              '<span class="note">' + esc(e.text) + '</span></div>';
          }).join('') +
        '</article>' +
        coachPatternsCard() +
        weeklyReviewTeaser(true) +
        askBlock() +
        chaptersBlock()
    });
  }

  /* The conversation. Persisted, so a question asked this morning is still
     there tonight; cleared by the day, not kept forever. */
  function chat() {
    var c = Store.state().coachChat;
    if (!c || c.date !== Store.todayKey()) return [];
    return c.messages || [];
  }

  function askBlock() {
    var msgs = chat();
    var suggestions = ['What should I eat tonight?', 'Why is my weight up this week?', 'Am I lifting enough?'];

    if (!Cloud.hasClaude()) {
      return '<div class="rulehead"><span class="kicker">Ask it something</span><span></span></div>' +
        '<article class="card pad">' +
          '<p class="note">The coach can only answer with a Claude key. Add one in Settings and this becomes a conversation.</p>' +
          '<div class="btnrow" style="margin-top:14px"><button class="btn ghost auto" data-route="settings">Open Settings</button></div>' +
        '</article>';
    }

    var thread = msgs.length
      ? '<div class="chat">' + msgs.map(function (m) {
          return '<div class="bubble ' + (m.role === 'coach' ? 'from-coach' : 'from-me') + '">' + esc(m.text) + '</div>';
        }).join('') + '</div>'
      : '';

    var pending = Store.state().coachPending
      ? '<div class="bubble from-coach thinking">Reading your day\u2026</div>' : '';

    return '<div class="rulehead"><span class="kicker">Ask it something</span>' +
        (msgs.length ? '<button class="btn ghost xs" data-action="chat-clear">Clear</button>' : '<span></span>') +
      '</div>' +
      '<article class="card pad">' +
        (msgs.length ? '' :
          '<div style="display:grid;gap:9px;margin-bottom:14px">' + suggestions.map(function (q) {
            return '<button class="btn ghost block" data-ask="' + esc(q) + '" style="justify-content:flex-start;text-transform:none;letter-spacing:0;font-size:13.5px">' + esc(q) + '</button>';
          }).join('') + '</div>') +
        thread + pending +
        '<div class="askrow">' +
          '<input type="text" class="field-input plain" data-chat-input placeholder="Ask the coach" autocomplete="off" />' +
          '<button class="btn sm" data-action="chat-send">Ask</button>' +
        '</div>' +
      '</article>';
  }


  /* "28 Jul – 3 Aug" — a range, without repeating the day counter at both ends. */
  function rangeLabel(from, to) {
    var m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    function part(k) {
      var d = new Date(k + 'T12:00:00');
      return d.getDate() + ' ' + m[d.getMonth()];
    }
    return part(from) + ' \u2013 ' + part(to);
  }

  /* Chapters: the coach looking back on a week. Written, stored, kept. */
  function chaptersBlock() {
    var list = (Store.state().chapters || []).slice().reverse();
    var thisWeek = Store.weekStart(Store.todayKey());
    var written = list.filter(function (c) { return c.from === thisWeek; })[0];

    var head = '<div class="rulehead"><span class="kicker sage">Chapters</span>' +
      (list.length ? '<span class="stamp">' + list.length + ' written</span>' : '<span></span>') + '</div>';

    if (!list.length) {
      return head + '<article class="card pad">' +
        '<p class="note">At the end of each week the coach writes what it saw. Nothing yet \u2014 the first one arrives once a week of logging is behind you.</p>' +
        (Cloud.hasClaude() && Store.streak() >= 3
          ? '<div class="btnrow" style="margin-top:14px"><button class="btn ghost auto" data-action="chapter-write">Write one now</button></div>' : '') +
      '</article>';
    }

    return head + list.map(function (c) {
      return '<article class="card pad">' +
        '<div class="kicker" style="margin-bottom:9px">' + esc(rangeLabel(c.from, c.to)) + '</div>' +
        '<p class="lede" style="font-size:17px">' + esc(c.text) + '</p>' +
      '</article>';
    }).join('') +
    (Cloud.hasClaude() && !written
      ? '<button class="btn ghost block" data-action="chapter-write">Write this week</button>' : '');
  }

  // ---------------- Nutrition ----------------
  function mealRow(m, opts) {
    opts = opts || {};
    var thumb = opts.noThumb ? '' :
      '<div class="thumb"' + (m.photoId ? ' data-photo="' + esc(m.photoId) + '"' : (m.photo ? ' style="background-image:url(\'' + UI.asset(m.photo) + '\')"' : '')) + '>' +
        ((m.photoId || m.photo) ? '' : esc((m.name || '?').slice(0, 1))) + '</div>';
    return '<button class="row tap' + (opts.noThumb ? ' nothumb' : '') +
      '" data-route="meal/' + UI.esc(m.id || '') + '">' + thumb +
      '<div style="min-width:0">' +
        '<div style="display:flex;align-items:baseline;gap:9px;margin-bottom:5px">' +
          '<span class="stamp">' + esc(m.time || '') + '</span>' +
          '<span class="stamp" style="color:var(--faint)">' + esc(m.slot || '') + '</span>' +
        '</div>' +
        '<h4>' + esc(m.name) + '</h4>' +
        '<div class="macros">' + m.protein + ' g protein &middot; ' + m.carbs + ' g carbs &middot; ' + m.fat + ' g fat</div>' +
      '</div>' +
      '<div class="kcal">' + Store.energyNum(m.kcal).toLocaleString() + '<small>' + Store.state().units.energy + '</small></div>' +
    '</button>';
  }

  /* Trends needs weeks behind it before it can say anything. */
  function trendsNote() {
    var days = Object.keys(Store.state().days || {}).length;
    return days < 7 ? days + (days === 1 ? ' day logged so far' : ' days logged so far')
                    : 'What the last few weeks are saying';
  }

  /* The planner's own state, said plainly, so the row is worth tapping. */
  function plannerNote() {
    var S = Store.state(), plan = S.mealPlan || {};
    var week = S.mealPlannerWeek || Store.weekStart(Store.todayKey());
    if (!S.mealPlannerWeek && new Date(Store.todayKey() + 'T12:00:00').getDay() === 0) week = Store.shift(week, 7);
    var end = Store.shift(week, 6);
    var n = Object.keys(plan).filter(function (k) {
      var date = k.slice(0, 10); return plan[k] && date >= week && date <= end;
    }).length;
    if (!n) return 'Nothing planned for the week';
    var shop = S.shopTicked || {};
    var ticked = Object.keys(shop).filter(function (k) { return shop[k]; }).length;
    return n + ' of 28 meals planned' + (ticked ? ' \u00b7 ' + ticked + ' bought' : '');
  }

  function nutrition() {
    var S = Store.state();
    var d = Store.day(), t = Store.totals(), tg = S.targets;
    var yd = Store.dayAt(-1);
    var gap = Math.max(0, tg.protein - t.protein);
    var kcalLeft = Math.max(0, tg.calories - t.kcal);
    var energyLeft = Store.energyNum(kcalLeft);

    var bars = [
      { label: 'Energy', value: Store.energyNum(t.kcal), target: Store.energyNum(tg.calories), unit: Store.state().units.energy, color: 'var(--gold)' },
      { label: 'Protein', value: t.protein, target: tg.protein, unit: 'g', color: 'var(--gold)' },
      { label: 'Carbs', value: t.carbs, target: Math.round(tg.calories * 0.4 / 4), unit: 'g', color: 'var(--sage)' },
      { label: 'Fat', value: t.fat, target: Math.round(tg.calories * 0.28 / 9), unit: 'g', color: 'var(--sage)' }
    ].map(function (b) {
      var pct = b.target ? Math.round((b.value / b.target) * 100) : 0;
      var left = b.target - b.value;
      return '<div class="macrobar">' +
        '<div class="mbhead"><span>' + b.label + '</span>' +
          '<span class="' + (left > 0 ? 'short' : 'ok') + '">' +
            (left > 0 ? left.toLocaleString() + (b.unit ? ' ' + b.unit : '') + ' left' : 'met') + '</span></div>' +
        '<div class="mbval">' + b.value.toLocaleString() + (b.unit ? '<small>' + b.unit + '</small>' : '') +
          '<span class="note">of ' + b.target.toLocaleString() + '</span></div>' +
        '<div class="mbtrack"><span style="width:' + Math.min(100, pct) + '%;background:' + b.color + '"></span></div>' +
      '</div>';
    }).join('');

    /* Photo needs the coach to read the plate. Without a key it stays in place —
       the grid is four — but says what it needs and routes to where you set it. */
    var canRead = window.Cloud && Cloud.hasClaude();
    var ways = [
      canRead
        ? ['action', 'photograph-meal', 'camera', 'Photo', '']
        : ['route', 'settings', 'camera', 'Photo', ' needskey'],
      ['action', 'scan-barcode', 'barcode', 'Barcode', ''],
      ['action', 'add-restaurant', 'place', 'Eating out', ''],
      ['route', 'cookbook', 'book', 'Cookbook', '']
    ].map(function (w) {
      return '<button class="wayin' + w[4] + '" data-' + w[0] + '="' + w[1] + '">' +
        '<span class="wayicon">' + icon(w[2]) + '</span>' +
        '<span>' + w[3] + '</span>' +
        (w[4] ? '<span class="waynote">needs the coach</span>' : '') +
      '</button>';
    }).join('');

    /* The day is four visible places, every day. The previous one-at-a-time
       "next slot" row made a fresh day look like Breakfast was the only meal
       the app understood. Multiple entries are still allowed inside a slot. */
    var slotOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    var todaySlots = slotOrder.map(function (slot) {
      var meals = byTime(d.meals.filter(function (m) { return m.slot === slot; }));
      var st = meals.reduce(function (a, m) {
        a.kcal += +m.kcal || 0; a.protein += +m.protein || 0; return a;
      }, { kcal: 0, protein: 0 });
      var label = slot === 'Snack' ? 'Add a snack' : 'Add ' + slot.toLowerCase();
      return '<article class="card mealslotcard">' +
        '<div class="cardhead"><div class="title"><i></i>' + slot + '</div>' +
          '<div class="meta">' + (meals.length ? Store.fmtEnergy(st.kcal) + ' · ' + st.protein + ' g' : 'open') + '</div></div>' +
        '<div class="rowlist">' +
          (meals.length
            ? meals.map(function (m) { return mealRow(m); }).join('')
            : '<div class="mealslotempty"><span class="note">Nothing logged here yet.</span></div>') +
          '<button class="row tap addmealrow" data-action="log-meal" data-slot="' + slot + '">' +
            '<span class="thumb dashed">' + icon('plus') + '</span>' +
            '<span style="min-width:0;text-align:left"><h4>' + label + '</h4>' +
              '<span class="macros">Log it directly into ' + slot.toLowerCase() + '.</span></span>' +
          '</button>' +
        '</div>' +
      '</article>';
    }).join('');

    var ydTotal = yd.meals.reduce(function (a, m) { return { k: a.k + m.kcal, p: a.p + m.protein }; }, { k: 0, p: 0 });

    var nutritionHero = expeditionSurface('nutrition', 'assets/art/provisions.webp');
    return UI.screen({
      tab: 'nutrition', restMeasure: true, photoHeight: '600px',
      art: nutritionHero.art, artFallback: nutritionHero.fallback, scrim: UI.SCRIMS.medium, photoPos: 'center 22%',
      overlay:
        '<span class="daytag">' + UI.dayLabel() + '</span>' +
        '<div class="bignum">' + (gap > 0 ? gap : t.protein) +
          '<span>g</span></div>' +
        '<p class="bigsub">' +
          (gap > 0
            ? 'of protein still open, with ' + energyLeft.toLocaleString() + ' ' + Store.state().units.energy + ' of energy left to spend on it.'
            : 'of protein logged. The day is carried.') +
        '</p>',
      body:
        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Where the day stands</div></div>' +
          '<div class="macrogrid">' + bars + '</div>' +
        '</article>' +

        '<div class="rulehead"><span class="kicker">Four ways in</span><span></span></div>' +
        '<div class="waygrid">' + ways + '</div>' +

        '<div class="rulehead"><span class="kicker">Today</span><span></span>' +
          '<span class="note">' + (d.meals.length ? d.meals.length + ' logged' : 'four meal slots open') + '</span></div>' +
        '<div class="mealslots">' + todaySlots + '</div>' +

        (yd.meals.length
          ? '<div class="rulehead"><span class="kicker sage">Yesterday</span><span></span>' +
              '<span class="note">' + Store.fmtEnergy(ydTotal.k) + ' &middot; ' + ydTotal.p + ' g protein</span></div>' +
            '<article class="card rowlist">' +
              byTime(yd.meals).map(function (m) { return mealRow(m, { noThumb: true }); }).join('') +
              '<div class="pad-x" style="padding:12px 17px 15px">' +
                '<button class="btn ghost block" data-route="history">Full meal history</button>' +
              '</div>' +
            '</article>'
          : '') +

        '<div class="rulehead"><span class="kicker">The kitchen</span><span></span></div>' +
        '<article class="card rowlist">' +
          [['planner', 'basket', 'Week planner', plannerNote()],
           ['trends', 'chart', 'Trends', trendsNote()]
          ].map(function (r) {
            return '<button class="row tap" data-route="' + r[0] + '">' +
              '<span class="thumb ghosticon">' + icon(r[1]) + '</span>' +
              '<span style="min-width:0;text-align:left"><h4>' + r[2] + '</h4>' +
                '<span class="macros">' + UI.esc(r[3]) + '</span></span>' +
              '<span class="chev">' + icon('chev') + '</span>' +
            '</button>';
          }).join('') +
        '</article>'
    });
  }

  // ---------------- Train ----------------
  function readinessCard(key) {
    if (!window.Training) return '';
    key = key || Store.todayKey();
    if (key !== Store.todayKey()) return '';
    var r = Training.readiness(key), rec = Training.readinessRecommendation(key);
    function chips(kind, options, current) {
      return '<div class="readiness-chips">' + options.map(function (o) {
        return '<button class="ob-chip' + (String(current) === String(o[0]) ? ' on' : '') + '" data-action="set-readiness" data-kind="' + kind + '" data-value="' + o[0] + '">' + o[1] + '</button>';
      }).join('') + '</div>';
    }
    return '<article class="card readiness-card">' +
      '<div class="cardhead"><div class="title"><i></i>Readiness</div><div class="meta">10 seconds</div></div>' +
      '<div class="pad-x readiness-body">' +
        '<div class="readiness-row"><div><strong>Energy</strong><span>How charged do you feel?</span></div>' + chips('energy', [['low','Low'],['normal','Normal'],['high','High']], r.energy) + '</div>' +
        '<div class="readiness-row"><div><strong>Soreness</strong><span>How much are you carrying?</span></div>' + chips('soreness', [['none','None'],['some','Some'],['a-lot','A lot']], r.soreness) + '</div>' +
        '<div class="readiness-row"><div><strong>Pain</strong><span>Different from ordinary training soreness.</span></div>' + chips('pain', [['false','No'],['true','Yes']], r.pain ? 'true' : 'false') + '</div>' +
        '<div class="readiness-callout ' + esc(rec.kind) + '"><strong>' + esc(rec.label) + '</strong><span>' + esc(rec.detail) + '</span></div>' +
        (Training.readinessComplete(key) && rec.mode === 'lighter'
          ? '<div class="btnrow"><button class="btn sm" data-action="begin" data-session-mode="lighter">Use lighter session</button><button class="btn ghost sm" data-action="begin" data-session-mode="planned">Keep planned</button></div>'
          : '') +
      '</div></article>';
  }

  function deloadCard() {
    if (!window.Training) return '';
    var d = Training.deloadStatus(), active = Training.isDeloadWeek(Store.todayKey()), p = Training.profile();
    if (active) return '<article class="card pad deload-card"><div class="kicker sage">Recovery week active</div><p class="lede" style="margin:8px 0 5px">Working sets are reduced by one this week.</p><p class="small" style="margin:0 0 13px">Load progression is held. Nothing else about the plan is silently changed.</p><button class="btn ghost sm" data-action="cancel-deload">Return to normal volume</button></article>';
    if (!d.suggested) return '';
    var dismissed = p.deloadDismissedAt && (Date.now() - Date.parse(p.deloadDismissedAt) < 3 * 86400000);
    if (dismissed) return '';
    return '<article class="card pad deload-card"><div class="kicker gold">Recovery signal</div><p class="lede" style="margin:8px 0 5px">' + esc(d.label) + '</p><p class="small" style="margin:0 0 13px">' + esc(d.detail) + ' Recent sessions: ' + d.recentSessions + ' · hard-set rate: ' + Math.round(d.hardSetRate * 100) + '%.</p><div class="btnrow"><button class="btn sm" data-action="accept-deload">Use lighter sessions this week</button><button class="btn ghost sm" data-action="dismiss-deload">Not now</button></div></article>';
  }

  function selectedTrainingWeek() {
    var parts = (location.hash || '#train').replace(/^#/, '').split('/');
    var candidate = parts[1] === 'week' ? parts[2] : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate || '')) return Store.weekStart(Store.todayKey());
    return Store.weekStart(candidate);
  }

  function trainingWeekLabel(weekStartKey) {
    var current = Store.weekStart(Store.todayKey());
    var next = Store.shift(current, 7), prev = Store.shift(current, -7);
    if (weekStartKey === current) return 'This week';
    if (weekStartKey === next) return 'Next week';
    if (weekStartKey === prev) return 'Last week';
    return dateLabel(weekStartKey) + ' - ' + dateLabel(Store.shift(weekStartKey, 6));
  }

  function historicalPlanLabel(key) {
    var d = Store.state().days[key] || {};
    if ((d.workouts || []).length) return d.workouts[0].name.replace(/ day$/i, '') || 'Session';
    if (d.scoreBasis && d.scoreBasis.planName) return d.scoreBasis.planName;
    return 'Rest';
  }

  function trainingWeekCard(weekStartKey) {
    var S = Store.state(), DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var currentWeek = Store.weekStart(Store.todayKey()), nextWeek = Store.shift(currentWeek, 7);
    var todayKey = Store.todayKey(), week = [], sessions = 0;
    for (var i=0;i<7;i++) {
      var k=Store.shift(weekStartKey,i), dt=new Date(k+'T12:00:00'), dayName=DOW[dt.getDay()];
      var scheduled=Store.planFor ? Store.planFor(k) : null;
      var rec=S.days[k] || {};
      var label=scheduled ? scheduled.name : (weekStartKey < currentWeek ? historicalPlanLabel(k) : 'Rest');
      var future=k>todayKey;
      var done=!future && (scheduled ? Store.trainingStatus(k).done : (rec.workouts||[]).length>0);
      if(done) sessions++;
      week.push({key:k,letter:dayName.charAt(0),label:label,done:done,today:k===todayKey,future:future});
    }
    var target=S.frequency||4;
    var prev=Store.shift(weekStartKey,-7), next=Store.shift(weekStartKey,7);
    var canNext=next<=nextWeek;
    var dateRange=dateLabel(weekStartKey)+' - '+dateLabel(Store.shift(weekStartKey,6));
    return '<article class="card training-week-card" data-rest-anchor>' +
      '<div class="train-week-head">' +
        '<button class="train-week-arrow" data-route="train/week/'+prev+'" aria-label="Previous training week">‹</button>' +
        '<div><div class="kicker sage">'+esc(trainingWeekLabel(weekStartKey))+'</div><div class="small">'+esc(dateRange)+'</div></div>' +
        (canNext ? '<button class="train-week-arrow" data-route="train/week/'+next+'" aria-label="Next training week">›</button>' : '<button class="train-week-arrow" disabled aria-label="No later prepared week">›</button>') +
      '</div>' +
      '<div class="cardhead train-week-score"><div class="title"><i></i>Training</div><div class="meta">'+sessions+' of '+target+'</div></div>' +
      '<div class="weekstrip">' + week.map(function(w){
        return '<button class="wk'+(w.done?' done':'')+(w.today?' today':'')+'" data-route="trainday/'+w.key+'">' +
          '<span class="wk-mark">'+(w.done?UI.icon('check'):'')+'</span>' +
          '<span class="wk-day">'+w.letter+'</span><span class="wk-plan">'+esc(w.label)+'</span></button>';
      }).join('') + '</div>' +
      '<p class="small pad-x train-week-copy">' +
        (weekStartKey===currentWeek
          ? (sessions>=target ? 'The week is met. Anything else is a bonus.' : (target-sessions)+' more to hit '+target+' this week.')
          : weekStartKey===nextWeek ? 'Open a day to preview what is prepared. Day-specific readiness and walk tools appear when that day arrives.'
          : 'Open any day to review what was recorded or add a correction to the history.') +
      '</p>' +
    '</article>';
  }

  function trainingToolsCard(weekStartKey) {
    var currentWeek=Store.weekStart(Store.todayKey());
    var add = weekStartKey===currentWeek
      ? '<button class="train-tool-row" data-action="start-session"><span>'+UI.icon('plus')+'</span><span><strong>Add a workout</strong><small>Log something that was not on the plan.</small></span>'+UI.icon('chev')+'</button>'
      : '';
    return '<article class="card train-tools">' +
      '<button class="train-tool-row" data-route="records"><span>'+UI.icon('chart')+'</span><span><strong>Records &amp; progression</strong><small>See strength trends and why the next load is recommended.</small></span>'+UI.icon('chev')+'</button>' +
      '<button class="train-tool-row" data-route="exercises"><span>'+UI.icon('train')+'</span><span><strong>Exercise library</strong><small>Every movement, equipment option and substitution.</small></span>'+UI.icon('chev')+'</button>' +
      '<button class="train-tool-row" data-route="body"><span>'+UI.icon('heart')+'</span><span><strong>Body</strong><small>Weight, progress photos, sleep and body history.</small></span>'+UI.icon('chev')+'</button>' + add +
    '</article>';
  }

  function train() {
    var S=Store.state(), weekStartKey=selectedTrainingWeek(), currentWeek=Store.weekStart(Store.todayKey());
    var weekDays=[];
    for(var i=0;i<7;i++){
      var k=Store.shift(weekStartKey,i), rec=S.days[k]||{};
      if((rec.workouts||[]).length) weekDays.push(rec.workouts.length);
    }
    var completed=weekDays.reduce(function(a,b){return a+b;},0), target=S.frequency||4;
    var headline=weekStartKey===currentWeek
      ? (completed ? completed+' session'+(completed===1?'':'s')+' recorded. '+Math.max(0,target-completed)+' still open this week.' : 'Your training week is ready. Open a day when you are ready to move.')
      : trainingWeekLabel(weekStartKey)+'. Open a day to see the full record and plan.';
    var trainHero=expeditionSurface('train','assets/art/train-banner.webp');
    var body=trainingWeekCard(weekStartKey) +
      '<div class="rulehead"><span class="kicker">Your plan</span><span></span></div>' +
      planCard(weekStartKey) +
      (weekStartKey===currentWeek ? deloadCard() : '') +
      '<div class="rulehead"><span class="kicker sage">Training record</span><span></span></div>' +
      trainingToolsCard(weekStartKey) +
      (window.Insights && Insights.avoidedExerciseIds().length && weekStartKey===currentWeek
        ? '<article class="card pad"><div class="kicker">Movement memory</div><p class="small" style="margin:8px 0 12px">These movements stay out of future coach plans because you marked them as a dislike or discomfort. Tap one if you want to allow it again.</p><div class="prefchips">' + Insights.avoidedExerciseIds().map(function(id){var ex=Exercises.get(id);return ex?'<button class="ob-chip" data-action="allow-exercise-again" data-exercise-id="'+esc(id)+'">↺ '+esc(ex.name)+'</button>':'';}).join('') + '</div></article>' : '');

    return UI.screen({
      tab:'train',rest:310,restMeasure:true,photoHeight:'390px',screenClass:'train-screen',
      art:trainHero.art,artFallback:trainHero.fallback,photoPosition:'center 42%',scrim:UI.SCRIMS.train,
      overlay:'<div class="eyebrow">Train</div><p class="verse" style="font-size:25px">'+esc(headline)+'</p>',
      body:body
    });
  }



  /* The brief: "Rest day: its own screen about what recovery is doing.
     Nothing to log." No session button here on purpose. */
  function restCard(S) {
    var last = null, k = Store.todayKey();
    for (var i = 1; i <= 7 && !last; i++) {
      var rec = Store.state().days[Store.shift(k, -i)];
      if (rec && rec.workouts && rec.workouts.length) last = { days: i, name: rec.workouts[0].name };
    }
    return '<article class="card pad">' +
      '<div class="kicker sage" style="margin-bottom:11px">Rest day</div>' +
      '<p class="lede">Nothing scheduled. This is the part where the work lands.</p>' +
      '<p class="small" style="margin:10px 0 0">' +
        (last
          ? 'Your ' + esc(last.name.toLowerCase()) + ' was ' + (last.days === 1 ? 'yesterday' : last.days + ' days ago') +
            '. Muscle rebuilds for two to three days after a session \u2014 today is that, not a gap in the week.'
          : 'Muscle rebuilds for two to three days after a session. Rest is the half of training that does not look like training.') +
      '</p>' +
      '<p class="small" style="margin:9px 0 0">Walking still counts. Steps carry the expedition on days you do not lift.</p>' +
    '</article>';
  }

  // ---------------- Notifications ----------------
  /* Grouped by whether it wants an answer from you. Every entry is derived
     from real state, so nothing appears here that has not actually happened.
     The daily logging reminder is deliberately absent — see the last card. */
  /* Where the current leg stands. Both conditions are real: the combined miles
     and a fifth of the leg from each of you. Null when no route is agreed. */
  function legProgress() {
    var e = Store.state().expedition, l = leg();
    if (!l) return null;
    var walked = Store.legMine() + Store.legHers();
    var both = Math.min(Store.legMine(), Store.legHers()) >= l.miles * 0.2;
    return {
      walked: walked,
      miles: l.miles,
      complete: walked >= l.miles && both,
      label: l.from + ' \u2192 ' + l.to
    };
  }

  function notifItems() {
    var S = Store.state(), pd = S.partnerData, out = [], n = S.notifs || {};
    var p = Store.partnerName();
    function add(key, item) { if (n[key] !== false) out.push(item); }

    if (S.invite && S.invite.from === 'partner' && !S.invite.accepted) {
      add('invite', { id: 'action:invite:' + (S.invite.date || '') + ':' + (S.invite.routeName || ''), g: 0, name: p + ' proposed an expedition',
        note: S.invite.routeName || 'They picked the route', route: 'handshake', when: S.invite.date });
    }
    if (S.invite && S.invite.accepted && S.invite.decidedBy === 'partner') {
      add('accept', { id: 'info:accept:' + (S.invite.updatedAt || S.invite.at || S.invite.date || '') + ':' + (S.invite.routeName || ''), g: 1, name: p + ' accepted the expedition',
        note: S.invite.routeName || 'The route is agreed', route: 'handshake', when: S.invite.date });
    }
    if (pd && pd.note && S.partnerNoteSeen !== ((pd.noteDate || pd.date) + '|' + pd.note)) {
      add('note', { id: 'action:note:' + ((pd.noteDate || pd.date) || '') + ':' + pd.note, g: 0, name: p + ' left you a note', note: '“' + pd.note + '”', route: 'together', when: pd.date });
    }
    if (S.proposal && !S.proposal.answered) {
      out.push({ id: 'action:proposal:' + (S.proposal.date || '') + ':' + (S.proposal.summary || ''), g: 0, name: 'The coach has a proposal',
        note: S.proposal.summary || 'New targets to approve', route: 'settings', when: S.proposal.date });
    }

    if (pd && pd.date === Store.todayKey()) {
      var bits = [];
      if (pd.steps != null) bits.push(pd.steps.toLocaleString() + ' steps');
      if (pd.workouts) bits.push(pd.workouts + (pd.workouts === 1 ? ' workout' : ' workouts'));
      out.push({ id: 'info:sync:' + pd.date, g: 1, name: p + ' synced today', note: bits.join(' · ') || 'Their shared totals are current',
        route: 'together', when: pd.date });
    }
    var lp = legProgress();
    if (lp && lp.complete) {
      add('leg', { id: 'info:leg:' + (S.expedition.routeId || '') + ':' + (S.expedition.legIndex || 0), g: 1, name: 'A leg is complete', note: lp.label,
        route: 'together', when: Store.todayKey() });
    }

    var now = new Date(), sunday = now.getDay() === 0;
    if (sunday) {
      add('challengeExpiring', { id: 'info:challenge:' + Store.todayKey(), g: 1, name: 'The weekly challenge ends tonight',
        note: 'Open Together for the current score.', route: 'together', when: Store.todayKey() });
    }

    if (n.badge !== false) {
      var earned = (S.earned || []).slice(-3).reverse();
      earned.forEach(function (id) {
        var b = Badges.find(id);
        if (!b) return;
        out.push({ id: 'quiet:badge:' + id, g: 2, name: b.name + ' earned', note: b.condition, route: 'badges/' + b.cat, when: '' });
      });
    }
    return out;
  }

  function notificationStatus() {
    var items = notifItems();
    var seen = Store.state().notificationInfoSeen || [];
    return {
      action: items.filter(function (i) { return i.g === 0; }).length,
      info: items.filter(function (i) { return i.g === 1 && i.id && seen.indexOf(i.id) < 0; }).length
    };
  }

  function pendingCount() { return notificationStatus().action; }

  function markInformationalRead() {
    var current = (Store.state().notificationInfoSeen || []).slice();
    var changed = false;
    notifItems().forEach(function (i) {
      if (i.g !== 1 || !i.id || current.indexOf(i.id) >= 0) return;
      current.push(i.id); changed = true;
    });
    if (changed) Store.set('notificationInfoSeen', current.slice(-200));
    return changed;
  }

  function notifications() {
    var items = notifItems();
    var groups = [
      { title: 'Needs you', cls: '', items: items.filter(function (i) { return i.g === 0; }) },
      { title: 'Worth knowing', cls: 'sage', items: items.filter(function (i) { return i.g === 1; }) },
      { title: 'Quiet', cls: 'faint', items: items.filter(function (i) { return i.g === 2; }) }
    ].filter(function (g) { return g.items.length; });

    var body = groups.length
      ? groups.map(function (g) {
          return '<div class="rulehead"><span class="kicker ' + g.cls + '">' + g.title + '</span><span></span>' +
              '<span class="note">' + g.items.length + '</span></div>' +
            '<article class="card rowlist">' +
              g.items.map(function (n) {
                return '<button class="row tap nothumb' + (n.g === 0 ? ' needsyou' : '') + '" data-route="' + n.route + '">' +
                  '<span style="min-width:0;text-align:left">' +
                    '<h4>' + UI.esc(n.name) + '</h4>' +
                    '<span class="macros">' + UI.esc(n.note) + '</span></span>' +
                  '<span class="chev">' + icon('chev') + '</span></button>';
              }).join('') +
            '</article>';
        }).join('')
      : '<article class="card"><div class="empty">' +
          '<p class="note">Nothing waiting. When ' + UI.esc(Store.partnerName()) +
          ' syncs or the coach has something to propose, it appears here.</p>' +
        '</div></article>';

    return UI.screen({
      tab: '', rest: 210, photoHeight: '300px', blur: true,
      art: 'assets/art/dispatch-day.webp', photoPos: 'center 40%',
      header: { back: true, title: 'Notifications' },
      overlay: '<span class="daytag">' + UI.dayLabel() + '</span>' +
        '<p class="bigsub" style="margin-top:6px">' +
          (items.filter(function (i) { return i.g === 0; }).length
            ? 'Something is waiting on you.'
            : 'Nothing is waiting on you.') + '</p>',
      body: body +
        '<article class="card">' +
          '<div class="cardhead"><div class="title sage"><i></i>Deliberately absent</div></div>' +
          '<p class="cardnote">There is no daily reminder to log. It would fire hardest on the days you were ' +
          'already struggling, and that is not a coach. Which notifications reach your phone is set in ' +
          '<button class="inlink" data-route="settings">Settings</button>.</p>' +
        '</article>'
    });
  }


  // ---------------- One meal ----------------
  /* Opened from any meal row. Everything about the entry is editable here,
     including the photograph, and this is the only place a meal is deleted. */
  function meal() {
    var id = (location.hash.split('/')[1] || '');
    var f = Store.findMeal(id);
    if (!f) {
      return UI.screen({
        tab: '', rest: 210, photoHeight: '300px', blur: true,
        art: 'assets/art/provisions.webp', photoPos: 'center 30%',
        header: { back: true, title: 'Meal' },
        overlay: '<p class="bigsub">That meal is no longer here.</p>',
        body: '<article class="card"><div class="empty">' +
          '<p class="note">It may have been deleted. The log is where the rest are.</p>' +
          '<button class="btn ghost sm" data-route="nutrition" style="margin-top:12px">Back to the log</button>' +
        '</div></article>'
      });
    }

    var m = f.meal, dayKey = f.key;
    var isToday = dayKey === Store.todayKey();
    var when = isToday ? 'Today' : UI.esc(new Date(dayKey + 'T12:00:00')
      .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }));

    var macroCells = [
      ['Energy', 'kcal', Store.energyNum(m.kcal), Store.state().units.energy, true],
      ['Protein', 'protein', m.protein, 'g', false],
      ['Carbs', 'carbs', m.carbs, 'g', false],
      ['Fat', 'fat', m.fat, 'g', false]
    ].map(function (c) {
      return '<label class="field">' +
        '<span class="field-label">' + c[0] + (c[3] ? ' <em>' + c[3] + '</em>' : '') + '</span>' +
        '<input class="field-input" data-meal-edit="' + c[1] + '"' + (c[4] ? ' data-energy="1"' : '') + ' inputmode="decimal" ' +
          'value="' + UI.esc(String(c[2] == null ? '' : c[2])) + '" />' +
      '</label>';
    }).join('');

    var slots = ['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(function (o) {
      return '<button type="button" class="' + (o === m.slot ? 'on' : '') +
        '" data-meal-slot="' + o + '">' + o + '</button>';
    }).join('');

    var items = (m.items && m.items.length)
      ? '<article class="card rowlist">' +
          m.items.map(function (it, i) {
            return '<div class="row nothumb">' +
              '<div style="min-width:0">' +
                '<h4>' + UI.esc(it.name) + (it.weight ? ' <span class="stamp">' + UI.esc(it.weight) + '</span>' : '') + '</h4>' +
                (it.protein || it.carbs || it.fat
                  ? '<div class="macros">' + (it.protein || 0) + ' g protein &middot; ' +
                    (it.carbs || 0) + ' g carbs &middot; ' + (it.fat || 0) + ' g fat</div>'
                  : '<div class="macros">No macros recorded for this line</div>') +
              '</div>' +
              '<button class="iconbtn sm danger" data-meal-dropitem="' + i + '" aria-label="Remove ' +
                UI.esc(it.name) + '">' + icon('trash') + '</button>' +
            '</div>';
          }).join('') +
        '</article>'
      : '<article class="card"><div class="empty">' +
          '<p class="note">No ingredients recorded. Adding them puts this meal on the shopping list when you plan it.</p>' +
        '</div></article>';

    return UI.screen({
      tab: '', rest: 300, photoHeight: '390px',
      art: m.photo ? UI.asset(m.photo) : 'assets/art/provisions.webp',
      photoId: m.photoId || '',
      photoPos: 'center 42%', blur: !(m.photo || m.photoId),
      header: { back: true, title: when },
      overlay:
        '<span class="daytag">' + UI.esc(m.slot || 'Meal') + (m.time ? ' \u00b7 ' + UI.esc(m.time) : '') + '</span>' +
        '<p class="bigsub" style="font-size:24px;margin-top:4px">' + UI.esc(m.name) + '</p>',
      body:
        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>The entry</div>' +
            '<span class="note">' + (isToday ? 'counts toward today' : 'counted on ' + when.toLowerCase()) + '</span></div>' +
          '<div class="pad">' +
            '<label class="field"><span class="field-label">Name</span>' +
              '<input class="field-input" data-meal-edit="name" value="' + UI.esc(m.name || '') + '" /></label>' +
            '<div class="field"><span class="field-label">When</span><div class="seg">' + slots + '</div></div>' +
            '<div class="fieldgrid">' + macroCells + '</div>' +
          '</div>' +
        '</article>' +

        '<div class="rulehead"><span class="kicker">The photograph</span><span></span></div>' +
        '<article class="card"><div class="pad">' +
          ((m.photoId || m.photo)
            ? '<div class="mealphoto"' + (m.photoId ? ' data-photo="' + esc(m.photoId) + '"' : ' style="background-image:url(\'' + UI.asset(m.photo) + '\')"') + '></div>' +
              '<div class="btnrow" style="margin-top:12px">' +
                '<button class="btn ghost sm" data-meal-photo>Replace it</button>' +
                '<button class="btn ghost sm danger" data-meal-photo-clear>Remove it</button>' +
              '</div>'
            : '<p class="cardnote" style="margin:0 0 12px">No photograph on this one.</p>' +
              '<button class="btn ghost block" data-meal-photo>Add a photograph</button>') +
        '</div></article>' +

        '<div class="rulehead"><span class="kicker">What is in it</span><span></span>' +
          '<span class="note">' + ((m.items && m.items.length) || 0) + '</span></div>' +
        items +
        '<button class="btn ghost block" data-meal-additem>Add an ingredient</button>' +

        '<div class="rulehead"><span class="kicker faint">Remove</span><span></span></div>' +
        '<article class="card"><div class="pad">' +
          '<p class="cardnote" style="margin:0 0 12px">Deleting takes ' + Store.fmtEnergy(m.kcal) +
            ' and ' + m.protein + ' g of protein back off ' +
            (isToday ? 'today' : 'that day') + '.</p>' +
          '<button class="btn ghost block danger" data-meal-delete>Delete this meal</button>' +
        '</div></article>'
    });
  }

  // ---------------- The handshake ----------------
  /* An expedition needs two yeses. Which of the four states you see is the
     proposal's own state, never a switch on this screen: no proposal is a
     proposal to make, an owner proposal unanswered is waiting, and a partner proposal unanswered is an
     invitation, and answered is agreed. There is no decline anywhere — the
     alternative to accepting is proposing somewhere else. */
  function routeMiles(r) {
    return r.legs.reduce(function (a, l) { return a + l.miles; }, 0);
  }
  /* Summed from the legs where every leg has a figure; the route's own number
     otherwise; nothing at all when the source does not say. */
  function routeClimb(r) {
    var all = r.legs.every(function (l) { return typeof l.ft === 'number'; });
    if (all) return r.legs.reduce(function (a, l) { return a + l.ft; }, 0);
    return r.climb || null;
  }
  function routeName(id) { return (ROUTES[id] || {}).name || ''; }
  function routeFacts(id) {
    var r = ROUTES[id], ft = routeClimb(r);
    return r.legs.length + ' legs · ' + Store.fmtDistance(routeMiles(r)) +
      (ft ? ' · ' + Store.fmtClimb(ft) + ' of climb' : '');
  }
  function routeHero(id) {
    var r = ROUTES[id] || {};
    return (r.legs && r.legs[0] && r.legs[0].art) || r.banner || null;
  }
  function expeditionDone() {
    var e = Store.state().expedition, r = route();
    return !r || e.legIndex >= r.legs.length;
  }

  /* Three open at a time, by difficulty. A grade opens once an easier
     expedition has been finished; neither the route underway nor one already
     on the table is on offer — countering with a route already refused would
     spend a counter and say nothing. */
  function tierOpen() {
    var walked = Store.state().expedition.walked || [];
    return Math.min(GRADES.length - 1, 1 + walked.length);
  }
  function openRoutes(exceptId) {
    var e = Store.state().expedition, walked = e.walked || [], tier = tierOpen(), out = [];
    ROUTE_ORDER.forEach(function (id) {
      if (out.length >= 3) return;
      if (id === e.routeId || id === e.next || id === exceptId || walked.indexOf(id) >= 0) return;
      if (GRADES.indexOf(ROUTES[id].grade) > tier) return;
      out.push(id);
    });
    return out;
  }

  function routeTile(id, action, sub) {
    var r = ROUTES[id];
    var tag = action ? 'button' : 'div';
    return '<' + tag + ' class="tile' + (action ? '' : ' static') + '"' +
        (action ? ' data-action="' + action + '" data-id="' + id + '"' : '') + '>' +
      (r.banner ? '<span class="tilebanner" style="background-image:linear-gradient(180deg,rgba(13,14,10,0) 52%,rgba(13,14,10,.78) 100%),url(\'' + r.banner + '\')"></span>' : '') +
      '<span class="tilebody">' +
        '<span class="tiletop">' +
          '<span style="min-width:0">' +
            '<span class="kicker faint" style="display:block;margin-bottom:6px">' + esc(r.where) + '</span>' +
            '<span class="tilename">' + esc(r.name) + '</span>' +
          '</span>' +
          '<span class="stampchip">' + esc(r.grade) + '</span>' +
        '</span>' +
        '<span class="tilefacts">' + routeFacts(id) + '</span>' +
        (sub ? '<span class="tilenote">' + esc(sub) + '</span>' : '') +
      '</span>' +
    '</' + tag + '>';
  }

  /* The nine that are not on offer, and why each one is not. */
  function lockedRoutesCard() {
    var e = Store.state().expedition, walked = e.walked || [], open = openRoutes(), tier = tierOpen();
    var rest = ROUTE_ORDER.filter(function (id) { return open.indexOf(id) < 0; });
    if (!rest.length) return '';
    return '<article class="card pad">' +
      '<div class="kicker faint" style="margin-bottom:6px">Not on offer yet</div>' +
      rest.map(function (id) {
        var r = ROUTES[id], note;
        if (id === e.routeId) note = 'Underway';
        else if (id === e.next) note = 'Agreed, waiting';
        else if (walked.indexOf(id) >= 0) note = 'Walked';
        else {
          var short = GRADES.indexOf(r.grade) - tier;
          note = short > 0
            ? r.grade + ' · ' + short + ' more to finish'
            : r.grade + ' · next in line';
        }
        return '<div class="lockrow"><span class="lockname">' + esc(r.name) + '</span>' +
          '<span class="small" style="flex:none">' + esc(note) + '</span></div>';
      }).join('') +
      '<p class="small" style="margin-top:13px">Three are open at a time. A harder grade opens once an easier expedition is finished.</p>' +
    '</article>';
  }

  function whenWord(key) {
    if (!key) return '';
    if (key === Store.todayKey()) return 'Today';
    if (key === Store.shift(Store.todayKey(), -1)) return 'Yesterday';
    var n = Math.round((new Date(Store.todayKey() + 'T12:00:00') - new Date(key + 'T12:00:00')) / 86400000);
    return n + ' days ago';
  }

  function counterLine(inv) {
    var left = Store.counterCap - (inv.counters || 0);
    if (left <= 1) return 'One counter has been used. Another and the app decides between the two routes on the table, and it takes the one neither of you has walked.';
    return 'That would be the first of two counters. After the second the app decides, and it takes the route neither of you has walked.';
  }

  function handshakeState() {
    var inv = Store.state().invite;
    if (!inv) return 'propose';
    if (inv.accepted) return 'accepted';
    if (inv.from !== 'partner') return 'waiting';
    return location.hash.split('/')[1] === 'counter' ? 'counter' : 'invited';
  }

  function handshakeCta() {
    var S = Store.state(), inv = S.invite, st = handshakeState();
    if (st === 'waiting') return 'Waiting on ' + Store.partnerName();
    if (st === 'invited' || st === 'counter') return Store.partnerName() + ' proposed the ' + inv.routeName;
    if (st === 'accepted') return inv.routeName + ' is agreed';
    return hasExpedition() ? 'Propose the next expedition' : 'Choose the first expedition';
  }

  function sub(text) {
    return '<p class="attrib" style="text-transform:none;letter-spacing:0;font-size:13px;color:rgba(243,237,225,.82)">' + text + '</p>';
  }

  function handshake() {
    var S = Store.state(), inv = S.invite, p = Store.partnerRef();
    var st = handshakeState();
    var r = inv ? ROUTES[inv.routeId] : null;
    var art, pos = 'center 32%', overlay, body;

    if (st === 'propose' || st === 'counter') {
      var countering = st === 'counter';
      var spent = countering ? (inv.trail || []).map(function (t) { return t.id; }) : [];
      var open = openRoutes(countering ? inv.routeId : null).filter(function (id) {
        return spent.indexOf(id) < 0;
      });
      art = 'assets/art/expedition-overlook.webp';
      pos = 'center 30%';
      overlay =
        '<div class="eyebrow">' + (countering ? 'Your turn to choose' : 'The next expedition') + '</div>' +
        '<p class="verse">' + (countering ? 'Somewhere else, then.' : 'Nothing starts until you both say yes.') + '</p>' +
        sub(countering
          ? 'Pick a route and it goes back to ' + esc(p.name) + ' as your proposal.'
          : 'Pick a route and it goes to ' + esc(p.name) + ' as a proposal.');
      body =
        (!countering && S.expedition.next
          ? '<article class="card pad accent">' +
              '<div class="kicker" style="margin-bottom:9px">Already agreed</div>' +
              '<p class="note">' + esc(routeName(S.expedition.next)) + ' begins when the ' +
                esc(route().name) + ' ends. Proposing another replaces it.</p>' +
            '</article>'
          : '') +
        '<div class="rulehead"><span class="kicker">Open now</span><span></span>' +
          '<span class="note">' + open.length + '</span></div>' +
        open.map(function (id) {
          return routeTile(id, countering ? 'counter-route' : 'propose-route');
        }).join('') +
        (countering
          ? '<article class="card pad accent">' +
              '<p class="note">' + counterLine(inv) + '</p>' +
            '</article>' +
            '<button class="btn ghost block" data-route="handshake">Back to their proposal</button>'
          : lockedRoutesCard() +
            '<article class="card pad">' +
              '<div class="kicker" style="margin-bottom:11px">How it goes</div>' +
              '<p class="note">' + esc(p.name) + ' sees the route, its distance and its climb, and answers with one of two things: they walk it, or they name somewhere else. There is no decline — the only way to say no is to propose.</p>' +
              '<p class="small" style="margin-top:12px">Two counters and the app settles it, and it takes the route neither of you has walked.</p>' +
            '</article>');
    }

    if (st === 'waiting') {
      art = routeHero(inv.routeId);
      var nudged = inv.nudgedAt && inv.nudgedAt.slice(0, 10) === Store.todayKey();
      var canNudge = inv.date !== Store.todayKey();
      overlay =
        '<div class="eyebrow">Waiting on ' + esc(p.name) + '</div>' +
        '<p class="verse">Proposed, not yet begun.</p>' +
        sub(esc(r.name) + ' is sent. Nothing starts until they say yes.');
      body =
        '<article class="card pad accent">' +
          '<div style="display:flex;align-items:baseline;gap:12px;margin-bottom:14px">' +
            '<span class="kicker">Sent to ' + esc(p.name) + '</span>' +
            '<span class="small" style="margin-left:auto">' + esc(whenWord(inv.date)) + '</span>' +
          '</div>' +
          '<h3 class="tilename" style="font-size:21px;margin:0">' + esc(r.name) + '</h3>' +
          '<p class="small" style="margin-top:8px">' + routeFacts(inv.routeId) + '</p>' +
          '<div style="display:flex;align-items:center;gap:11px;padding:14px 0;margin:15px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)">' +
            '<span class="avatar her" style="width:28px;height:28px;flex:none">' + esc(p.initials) + '</span>' +
            '<span class="note">No answer yet</span>' +
          '</div>' +
          (canNudge
            ? '<button class="btn ghost block"' + (nudged ? ' disabled' : '') + ' data-action="nudge">' +
                (nudged ? 'Nudged today' : 'Give them a nudge') + '</button>' +
              '<p class="small" style="margin-top:13px">They get one quiet line — ' + esc(S.profile.name) +
                ' is waiting on the ' + esc(r.name) + '. Nothing about how long it has been.</p>'
            : '<p class="small">A nudge opens tomorrow. Today it would only be impatience.</p>') +
        '</article>' +
        '<article class="card pad">' +
          '<div class="kicker faint" style="margin-bottom:10px">While you wait</div>' +
          '<p class="note">Your logging carries on as normal, and the distance you walk today still counts once the expedition begins. Only the route is on hold.</p>' +
        '</article>';
    }

    if (st === 'invited') {
      art = routeHero(inv.routeId);
      pos = 'center 34%';
      overlay =
        '<div class="eyebrow">' + esc(p.name) + ' proposed a route</div>' +
        '<p class="verse">They want to walk this with you.</p>' +
        sub(routeFacts(inv.routeId) + '.');
      body =
        routeTile(inv.routeId, '') +
        (inv.reply ? '<article class="card pad"><p class="quote">“' + esc(inv.reply) + '”</p></article>' : '') +
        '<div class="btnrow">' +
          '<button class="btn" data-action="accept-invite">Walk it together</button>' +
          '<button class="btn ghost auto" data-route="handshake/counter">Somewhere else</button>' +
        '</div>' +
        '<article class="card pad">' +
          '<p class="note">There is no way to say no here, only somewhere else. Pick another route and it goes back to them as your proposal.</p>' +
          '<p class="small" style="margin-top:12px">' + counterLine(inv) + '</p>' +
        '</article>';
    }

    if (st === 'accepted') {
      art = routeHero(inv.routeId);
      pos = 'center 30%';
      var now = expeditionDone();
      var cur = route();
      var left = cur ? Math.max(0, cur.legs.length - S.expedition.legIndex) : 0;
      var ftc = routeClimb(r);
      var who = inv.decidedBy === 'app' ? 'The app settled it'
        : inv.decidedBy === 'partner' ? esc(p.name) + ' accepted'
        : 'You accepted their route';
      var stats = [
        { label: 'Legs', value: r.legs.length },
        { label: 'Distance', value: Store.fmtDistance(routeMiles(r)) },
        { label: ftc ? 'Climb' : 'Grade', value: ftc ? Store.fmtClimb(ftc) : r.grade },
        { label: 'Starts', value: now ? 'Today' : 'After this one' }
      ];
      overlay =
        '<div class="eyebrow">Both of you are in</div>' +
        '<p class="verse">' + esc(r.name) + (now ? ' starts today.' : ' is agreed.') + '</p>' +
        sub(now ? 'From here it is only walking.' : left + ' leg' + (left === 1 ? '' : 's') + ' of the ' + esc(cur.name) + ' first.');
      body =
        '<article class="card pad accent">' +
          '<div style="display:flex;align-items:center;gap:11px">' +
            '<span class="avatar her" style="width:28px;height:28px;flex:none">' +
              esc(inv.decidedBy === 'app' ? '··' : p.initials) + '</span>' +
            '<span class="note" style="color:var(--ink)">' + who + '</span>' +
            '<span class="small" style="margin-left:auto">' + esc(whenWord(inv.date)) + '</span>' +
          '</div>' +
          (inv.decidedBy === 'app'
            ? '<p class="small" style="margin-top:13px">Two counters and neither of you moved, so the app took the route neither of you has walked.</p>'
            : inv.reply ? '<p class="quote" style="margin-top:14px">“' + esc(inv.reply) + '”</p>' : '') +
        '</article>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          stats.map(function (s) {
            return '<article class="card pad">' +
              '<div class="kicker faint" style="margin-bottom:8px">' + s.label + '</div>' +
              '<div style="font-family:var(--serif);font-size:20px;font-variant-numeric:tabular-nums">' + esc(String(s.value)) + '</div>' +
            '</article>';
          }).join('') +
        '</div>' +
        '<article class="card pad">' +
          '<div class="kicker faint" style="margin-bottom:10px">First leg</div>' +
          '<h4 class="tilename" style="margin:0">' + esc(r.legs[0].from) + ' → ' + esc(r.legs[0].to) + '</h4>' +
          '<p class="small" style="margin-top:8px">' + Store.fmtDistance(r.legs[0].miles) +
            (r.legs[0].ft ? ' · ' + Store.fmtClimb(r.legs[0].ft) + ' of climb' : '') + '</p>' +
        '</article>' +
        (now
          ? '<button class="btn block" data-action="begin-expedition" data-id="' + inv.routeId + '">Set out</button>'
          : '<button class="btn block" data-action="hold-expedition" data-id="' + inv.routeId + '">Keep it for when the ' + esc(cur.name) + ' ends</button>' +
            '<p class="small" style="text-align:center">The ' + esc(cur.name) + ' has ' + left + ' leg' + (left === 1 ? '' : 's') + ' left.</p>');
    }

    /* No header title on this screen: the route banners carry their own name
       set in type, and a second title over them collided with it. The overlay
       already says which state you are in. */
    return UI.screen({
      tab: '', rest: 330, restMeasure: true,
      art: art || undefined, photoPos: pos,
      header: { back: true },
      overlay: overlay,
      body: body
    });
  }

  // ---------------- Together ----------------
  /* Together. Every figure here is derived — partner data from the partner sync file,
     never a constant, and the week from the points each day actually earned. */
  function together() {
    var S = Store.state(), p = Store.partnerRef(), pd = S.partnerData;
    var today = Store.todayKey();
    var mine = Store.points();
    var herToday = pd && pd.date === today && typeof pd.points === 'number' ? pd.points : null;
    var evening = Store.timeOfDay() === 'night';

    var rows = Store.pointRows();
    var open = rows.filter(function (r) { return !r.done; }).sort(function (a, b) { return b.value - a.value; });
    var closer = open[0];

    var headline, sub;
    if (herToday === null) {
      headline = mine + ' of 10 today.';
      sub = pd
        ? esc(p.name) + ' has not synced today.'
        : 'Nothing from ' + esc(p.name) + ' yet.';
    } else {
      var gap = herToday - mine;
      headline = gap > 0 ? gap + ' point' + (gap === 1 ? '' : 's') + ' back.'
        : gap === 0 ? 'Level.' : Math.abs(gap) + ' ahead.';
      sub = gap > 0 && closer
        ? (closer.value >= gap ? esc(closer.label) + ' alone covers it.' : esc(closer.label) + ' is the biggest of what is left.')
        : gap === 0 ? 'Whatever either of you does next breaks it.'
        : open.length ? open.length + ' still open on your side.' : 'Nothing outstanding.';
    }

    var togetherFallback = evening ? 'assets/art/campfire.webp'
      : hasExpedition() ? ((leg() && leg().art) || routeHero(Store.state().expedition.routeId) || 'assets/art/expedition-overlook.webp')
      /* Nothing agreed yet: the desk the route gets chosen at, not a trail
         neither of them has committed to. */
      : 'assets/art/expedition-none.webp';
    var togetherHero = expeditionSurface('together', togetherFallback);
    return UI.screen({
      tab: 'together', rest: 470, restMeasure: true,
      art: togetherHero.art, artFallback: togetherHero.fallback, scrim: UI.SCRIMS.light,
      photoPosition: evening ? 'center 62%' : hasExpedition() ? 'center 46%' : 'center 42%',
      overlay: '<div class="eyebrow">' + (evening ? 'This evening' : 'Today') + '</div>' +
        '<p class="verse" style="font-size:26px">' + headline + '</p>' +
        '<p class="attrib" style="text-transform:none;letter-spacing:0;font-size:13px;color:rgba(243,237,225,.82)">' + sub + '</p>',
      body:
        expeditionCard() +
        unlockCard(S) +
        todayCard(rows, mine, herToday, p) +
        weekCard(S, p) +
        challengeCard(S, p, mine, herToday) +
        notesCard(S, p, pd) +
        activityCard(S, p, pd) +
        badgeStrip(S, p) +
        /* The no-expedition card already carries this button; two of them on
           one screen is the same request twice. */
        (hasExpedition() ? '<button class="btn ghost block" data-route="handshake">' + esc(handshakeCta()) + '</button>' : '') +
        '<button class="btn ghost block" data-route="notifications">Notifications</button>'
    });
  }

  function todayCard(rows, mine, herToday, p) {
    return '<article class="card">' +
      '<div class="cardhead"><div class="title"><i></i>Today\u2019s points</div>' +
        '<div class="meta">you ' + mine + (herToday === null ? '' : ' &middot; ' + esc(p.name) + ' ' + herToday) + '</div></div>' +
      '<p class="small pad-x" style="padding-top:13px;padding-bottom:4px">Five things are worth points each day. ' +
        'These are yours.</p>' +
      rows.map(function (r) {
        return '<div class="setrow">' +
          '<div class="setname" style="color:' + (r.done ? 'var(--ink)' : 'var(--faint)') + '">' + esc(r.label) + '</div>' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<span class="kicker" style="color:' + (r.done ? 'var(--gold-mid)' : 'var(--faint)') + '">' + (r.done ? 'earned' : 'not yet') + '</span>' +
            '<span style="font-family:var(--serif);font-size:17px;color:' + (r.done ? 'var(--gold)' : 'var(--dim)') + '">' + r.value + '</span>' +
          '</div></div>';
      }).join('') +
      '<p class="small pad-x" style="padding-top:13px;padding-bottom:15px">Ten a day, weighted the same for both of you \u2014 which is what lets two people ' +
        'with different targets have the same contest.</p>' +
    '</article>';
  }

  /* Seven paired days. Partner score is drawn only where a synced file exists for that
     day, so a blank column means the partner has not synced — not that nothing was done. */
  function weekCard(S, p) {
    var hist = S.partnerHistory || {}, today = Store.todayKey(), start = Store.weekStart(today);
    var mineStart = Store.startKey ? Store.startKey() : today;
    var partnerStart = S.partnerData && S.partnerData.startDate ? S.partnerData.startDate : '';
    var days = [];
    for (var i = 0; i < 7; i++) {
      var k = Store.shift(start, i), future = k > today;
      days.push({
        key: k,
        letter: new Date(k + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' }),
        mine: future || k < mineStart ? null : Store.points(k),
        hers: future || (partnerStart && k < partnerStart) ? null : (typeof hist[k] === 'number' ? hist[k] : null)
      });
    }
    var myWeek = days.reduce(function (a, d) { return a + (d.mine == null ? 0 : d.mine); }, 0);
    var known = days.filter(function (d) { return d.hers !== null; });
    var herWeek = known.reduce(function (a, d) { return a + d.hers; }, 0);

    return '<article class="card pad">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:14px;margin-bottom:14px">' +
        '<div class="kicker">Points each day this week</div>' +
        '<div class="small">you ' + myWeek + (known.length ? ' &middot; ' + esc(p.name) + ' ' + herWeek : '') + '</div>' +
      '</div>' +
      '<div class="pairbars">' + days.map(function (d) {
        return '<div class="pairday">' +
          '<div class="pairtrack">' +
            '<span class="mine' + (d.mine === null ? ' none' : '') + '" style="height:' + (d.mine === null ? 0 : Math.round((d.mine / 10) * 100)) + '%"></span>' +
            '<span class="hers' + (d.hers === null ? ' none' : '') + '" style="height:' +
              (d.hers === null ? 0 : Math.round((d.hers / 10) * 100)) + '%"></span>' +
          '</div>' +
          '<div class="pairlabel">' + esc(d.letter) + '</div>' +
        '</div>';
      }).join('') + '</div>' +
      '<div class="legendrow">' +
        '<span><i class="dot gold"></i>You</span>' +
        '<span><i class="dot sage"></i>' + esc(p.name) + '</span>' +
      '</div>' +
      (known.length < Math.min(7, Math.round((new Date(today + 'T12:00:00') - new Date(start + 'T12:00:00')) / 86400000) + 1)
        ? '<p class="small" style="margin:12px 0 0">Their side fills in from the rolling history on their next sync.</p>'
        : '') +
    '</article>';
  }

  /* Two conditions, both real: the leg needs the miles, and it needs both of
     you to have walked some of it. Either one short and the leg stays shut. */
  function unlockCard(S) {
    var l = leg(), e = S.expedition;
    if (!l) return '';
    var walked = Store.legMine() + Store.legHers();
    var milesPct = Math.min(100, Math.round((walked / l.miles) * 100));
    var bothPct = Math.min(100, Math.round((Math.min(Store.legMine(), Store.legHers()) / (l.miles * 0.2)) * 100));
    var milesDone = walked >= l.miles;
    var bothDone = Math.min(Store.legMine(), Store.legHers()) >= l.miles * 0.2;

    return '<article class="card pad">' +
      '<div class="kicker" style="margin-bottom:13px">What opens the next leg</div>' +
      '<div style="margin-bottom:15px">' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">' +
          '<span style="color:' + (milesDone ? 'var(--sage)' : 'var(--ink)') + '">The distance</span>' +
          '<span class="small">' + (milesDone ? 'met' : Store.fmtDistance(walked) + ' of ' + Store.fmtDistance(l.miles)) + '</span>' +
        '</div>' +
        '<div class="track"><span style="width:' + milesPct + '%' + (milesDone ? ';background:var(--sage)' : '') + '"></span></div>' +
      '</div>' +
      '<div>' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">' +
          '<span style="color:' + (bothDone ? 'var(--sage)' : 'var(--ink)') + '">Both of you walked it</span>' +
          '<span class="small">' + (bothDone ? 'met' : 'a fifth each') + '</span>' +
        '</div>' +
        '<div class="track"><span style="width:' + bothPct + '%' + (bothDone ? ';background:var(--sage)' : '') + '"></span></div>' +
      '</div>' +
      (milesDone && bothDone
        ? '<div style="margin-top:16px">' +
            '<p class="lede" style="margin:0 0 13px">Both conditions met. ' + esc(l.to) + ' is reached.</p>' +
            '<button class="btn block" data-action="advance-leg">Arrive at ' + esc(l.to) + '</button>' +
          '</div>'
        : '<p class="small" style="margin:14px 0 0">One of you cannot carry the leg alone. Each has to walk at least a fifth of it.</p>') +
    '</article>';
  }

  /* The week's contest, settled by the same points as everything else. */
  function challengeCard(S, p, mine, herToday) {
    var hist = S.partnerHistory || {}, today = Store.todayKey(), start = Store.weekStart(today);
    var myStart = Store.startKey ? Store.startKey() : today;
    var partnerStart = S.partnerData && S.partnerData.startDate ? S.partnerData.startDate : '';
    var myWeek = 0, herWeek = 0, known = 0;
    for (var i = 0; i < 7; i++) {
      var k = Store.shift(start, i);
      if (k > today) break;
      if (k >= myStart) myWeek += Store.points(k);
      if ((!partnerStart || k >= partnerStart) && typeof hist[k] === 'number') { herWeek += hist[k]; known++; }
    }
    var lead = myWeek - herWeek;
    var line = !known
      ? 'Nothing to settle until their history syncs.'
      : lead > 0 ? 'You are ' + lead + ' ahead this week.'
      : lead < 0 ? esc(p.name) + ' is ' + Math.abs(lead) + ' ahead this week.'
      : 'Dead level this week.';

    return '<article class="card pad">' +
      '<div class="kicker gold" style="margin-bottom:11px">This week’s challenge</div>' +
      '<p class="lede" style="margin:0 0 4px">Most points by Sunday night.</p>' +
      '<p class="small" style="margin:8px 0 0">' + line +
        (known ? ' Based on ' + known + ' synced day' + (known === 1 ? '' : 's') + ' so far.' : '') + '</p>' +
    '</article>';
  }


  function messageClock(m) {
    if (m.displayTime) return esc(m.displayTime);
    if (m.createdAt && !isNaN(Date.parse(m.createdAt))) {
      return esc(new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    }
    return dateLabel(m.date || Store.todayKey());
  }

  /* Conversation history is intentionally split by author in GitHub: this
     device owns sentMessages, the partner owns partnerData.messages. That means
     neither phone ever edits the other's message history, so normal sync cannot
     create a chat conflict. */
  function notesCard(S, p, pd) {
    var mine = Array.isArray(S.sentMessages) ? S.sentMessages.slice(-50) : [];
    var theirs = pd && Array.isArray(pd.messages) ? pd.messages.slice(-50) : [];

    /* One-version compatibility: a 5.2.2 partner only publishes `note`. */
    if (!theirs.length && pd && pd.note) {
      theirs = [{
        id: 'legacy-partner-' + (pd.noteDate || pd.date || ''),
        date: pd.noteDate || pd.date,
        text: pd.note,
        createdAt: (pd.noteDate || pd.date || Store.todayKey()) + 'T12:00:00',
        displayTime: ''
      }];
    }

    var thread = mine.map(function (m) {
      return { mine: true, id: m.id, date: m.date, text: m.text, createdAt: m.createdAt, sentAt: m.sentAt, displayTime: m.displayTime };
    }).concat(theirs.map(function (m) {
      return { mine: false, id: m.id, date: m.date, text: m.text, createdAt: m.createdAt, sentAt: m.sentAt, displayTime: m.displayTime };
    }));

    thread.sort(function (a, b) {
      var aa = a.createdAt && !isNaN(Date.parse(a.createdAt)) ? Date.parse(a.createdAt) : Date.parse((a.date || '1970-01-01') + 'T12:00:00');
      var bb = b.createdAt && !isNaN(Date.parse(b.createdAt)) ? Date.parse(b.createdAt) : Date.parse((b.date || '1970-01-01') + 'T12:00:00');
      return aa - bb;
    });
    thread = thread.slice(-60);

    var messages = thread.length
      ? '<div class="chat-thread">' + thread.map(function (m) {
          var meta = m.mine
            ? messageClock(m) + ' · ' + (m.sentAt ? 'sent' : 'waiting to sync')
            : esc(p.name) + ' · ' + messageClock(m);
          return '<div class="chat-row ' + (m.mine ? 'mine' : 'theirs') + '">' +
            '<div class="chat-bubble">' + esc(m.text) + '</div>' +
            '<div class="chat-meta">' + meta + '</div>' +
          '</div>';
        }).join('') + '</div>'
      : '<div class="chat-empty">No messages yet. Send the first one.</div>';

    return '<article class="card">' +
      '<div class="cardhead"><div class="title"><i></i>Messages</div>' +
        '<div class="meta">AUTO SYNC</div></div>' +
      '<div class="pad-x chat-compose">' +
        '<div class="kicker" style="margin-bottom:9px">Message ' + esc(p.name) + '</div>' +
        '<input type="text" class="keyinput plain" data-note-input value="" placeholder="Write a message…" maxlength="140" />' +
        '<div class="btnrow" style="margin-top:11px">' +
          '<button class="btn gold auto" data-action="note-send">Send</button>' +
        '</div>' +
        '<p class="small" style="margin:10px 0 0">Sent messages clear from this box and appear below. InSync checks automatically while the app is open and whenever it comes back to the foreground.</p>' +
      '</div>' +
      '<div class="chat-divider"></div>' +
      '<div class="pad-x" style="padding-top:15px;padding-bottom:18px">' +
        '<div class="kicker" style="margin-bottom:12px">Conversation</div>' +
        messages +
      '</div>' +
    '</article>';
  }

  /* What has actually happened, newest first. Nothing invented. */
  function activityCard(S, p, pd) {
    var mine = window.Insights ? Insights.localActivity(7) : [];
    var theirs = pd && Array.isArray(pd.activity) ? pd.activity.slice(-30) : [];
    var given = window.Insights ? Insights.reactionsGiven() : {};
    var received = pd && pd.reactions && typeof pd.reactions === 'object' ? pd.reactions : {};
    var reactions = window.Insights ? Insights.reactions : [];
    var items = mine.map(function (x) { return { mine:true, id:x.id, date:x.date, text:x.text, createdAt:x.createdAt||'' }; })
      .concat(theirs.map(function (x) { return { mine:false, id:x.id, date:x.date, text:x.text, createdAt:x.createdAt||'' }; }));
    items.sort(function (a,b) {
      var ad=Date.parse(a.createdAt||a.date+'T12:00:00')||0, bd=Date.parse(b.createdAt||b.date+'T12:00:00')||0;
      if (ad !== bd) return bd-ad;
      return String(b.id).localeCompare(String(a.id));
    });
    items=items.slice(0,12);
    function glyphFor(id) { var r=reactions.filter(function(x){return x.id===id;})[0]; return r ? r.glyph : ''; }
    return '<article class="card">' +
      '<div class="cardhead"><div class="title"><i></i>Trail moments</div><div class="meta">last 7 days</div></div>' +
      (items.length ? items.map(function (it) {
        var reaction = it.mine ? received[it.id] : given[it.id];
        return '<div class="activityrow"><div class="activitymain"><div class="setname">' + esc(it.text) + '</div><div class="small">' + (it.mine?'You':esc(p.name)) + ' · ' + dateLabel(it.date) + '</div></div>' +
          (it.mine ? (reaction ? '<div class="activityreaction"><span>' + glyphFor(reaction) + '</span><small>' + esc(p.name) + ' reacted</small></div>' : '<span></span>') :
            '<div class="reactionbar">' + reactions.map(function (r) { return '<button class="reactionbtn' + (reaction===r.id?' on':'') + '" aria-label="' + esc(r.label) + '" data-action="react" data-event-id="' + esc(it.id) + '" data-reaction="' + r.id + '">' + r.glyph + '</button>'; }).join('') + '</div>') +
        '</div>';
      }).join('') : '<p class="small pad-x" style="padding-top:14px;padding-bottom:14px">No shareable trail moments yet. They appear when either of you closes a target or completes training.</p>') +
    '</article>';
  }

  /* Earned badges are computed from the log, not stored — so this cannot
     drift from the Badges screen. Partner badges come from the partner sync file. */
  function badgeStrip(S, p) {
    var t = Badges.totals();
    var earned = Badges.all().filter(function (b) { return b.earned; }).slice(-6).reverse();
    var hers = (S.partnerData && S.partnerData.earned) || [];

    return '<article class="card">' +
      '<div class="cardhead"><div class="title"><i></i>Badges</div>' +
        '<div class="meta">' + t.earned + ' of ' + t.total + '</div></div>' +
      (earned.length
        ? '<div class="badgestrip">' + earned.map(function (b) {
            return '<button class="badgechip" data-route="badges/' + b.cat + '">' +
              '<img src="' + Badges.art(b.id) + '" alt="" loading="lazy" />' +
              '<span class="badgechip-name">' + esc(b.name) + '</span>' +
            '</button>';
          }).join('') + '</div>'
        : '<p class="small pad-x" style="padding-top:14px">None yet. They earn themselves as you log.</p>') +
      (hers.length ? '<p class="small pad-x" style="padding-top:12px">' + esc(p.name) + ' holds ' + hers.length + '.</p>' : '') +
      '<div class="pad-x" style="padding-top:13px;padding-bottom:15px">' +
        '<button class="btn ghost block" data-route="badges">Every badge</button>' +
      '</div>' +
    '</article>';
  }


  function coachPatternCard() {
    if (!window.Insights) return '';
    var rows = Insights.patternInsights();
    if (!rows.length) return '';
    var x = rows[0];
    return '<article class="card pad accent">' +
      '<div class="kicker sage">Coach noticed</div>' +
      '<p class="lede" style="margin:8px 0 7px">' + esc(x.title) + '</p>' +
      '<p class="small" style="margin:0 0 13px">' + esc(x.text) + '</p>' +
      '<button class="btn ghost block" data-route="' + esc(x.route) + '">Work on this</button>' +
    '</article>';
  }

  function coachPatternsCard() {
    if (!window.Insights) return '';
    var rows = Insights.patternInsights();
    return '<div class="rulehead"><span class="kicker sage">Patterns</span><span></span></div>' +
      '<article class="card">' +
      (rows.length ? rows.map(function (x) {
        return '<button class="setrow" data-route="' + esc(x.route) + '"><div><div class="setname">' + esc(x.title) + '</div><div class="small">' + esc(x.text) + '</div></div><span class="chev">›</span></button>';
      }).join('') : '<p class="small pad-x" style="padding-top:15px;padding-bottom:15px">The coach is still learning your patterns. A few consistently logged days are more useful than guesses.</p>') +
      '</article>';
  }

  function weeklyGoalsCard() {
    if (!window.Insights) return '';
    var week=Store.weekStart(Store.todayKey()), goals=Insights.goalProgress(week);
    if(!goals.length) return '';
    return '<article class="card pad"><div class="kicker">This week’s goals</div>'+
      goals.map(function(g){return '<div class="goalrow"><span>'+ (g.done?'✓ ':'') + esc(g.label)+'</span><b>'+g.value+'/'+g.target+'</b></div>';}).join('')+
      '</article>';
  }

  function weeklyReviewTeaser(onCoach) {
    if (!window.Insights) return '';
    var week = Insights.reviewWeekKey();
    if (!Insights.reviewReady(week)) return '';
    var review = Insights.reviewFor(week), stats = Insights.weekStats(week);
    return '<article class="card pad' + (onCoach ? '' : ' accent') + '">' +
      '<div class="kicker' + (onCoach ? '' : ' sage') + '">Weekly review ready</div>' +
      '<p class="lede" style="margin:8px 0 7px">' + (review ? esc(review.carry || review.summary) : stats.points + ' points · ' + stats.workouts + ' sessions · ' + Store.fmtDistance(stats.expeditionMiles) + ' walked') + '</p>' +
      '<p class="small" style="margin:0 0 13px">Close the week, notice the pattern, then set up training and meals for the next one.</p>' +
      '<button class="btn ghost block" data-route="weekly-review">Open weekly review</button>' +
    '</article>';
  }

  function weeklyReview() {
    var week = window.Insights ? Insights.reviewWeekKey() : Store.shift(Store.weekStart(Store.todayKey()), -7);
    var st = Insights.weekStats(week), review = Insights.reviewFor(week), next = Insights.nextWeekStatus(week);
    var nextGoals = Insights.goalProgress(next.weekOf), suggestedGoals = Insights.suggestedGoals(next.weekOf);
    var end = Store.shift(week, 6), label = dateLabel(week) + ' – ' + dateLabel(end);
    var ready = Insights.reviewReady(week), hasClaude = window.Cloud && Cloud.hasClaude && Cloud.hasClaude();
    var body = '<article class="card"><div class="cardhead"><div class="title"><i></i>Week in numbers</div><div class="meta">' + esc(label) + '</div></div>' +
      '<div class="ledger">' +
        '<div><div class="label">Points</div><div class="figure">' + st.points + '</div><div class="foot">of ' + (st.daysAvailable * 10) + ' available</div></div>' +
        '<div><div class="label">Sessions</div><div class="figure">' + st.workouts + '</div><div class="foot">training</div></div>' +
        '<div><div class="label">Distance</div><div class="figure">' + Store.fmtDistance(st.expeditionMiles) + '</div><div class="foot">from steps</div></div>' +
      '</div></article>' +
      '<article class="card pad"><div class="kicker">Recorded averages</div>' +
        '<div class="recipefacts" style="margin-top:12px">' +
          '<div><span class="note">Energy</span><strong>' + Store.fmtEnergy(st.avgCalories) + '</strong></div>' +
          '<div><span class="note">Protein</span><strong>' + st.avgProtein + ' g</strong></div>' +
          '<div><span class="note">Steps</span><strong>' + st.avgSteps.toLocaleString() + '</strong></div>' +
          '<div><span class="note">Logged days</span><strong>' + st.loggedDays + '</strong></div>' +
        '</div>' +
        '<p class="note" style="margin:10px 0 0">Nutrition averages use ' + st.nutritionDays + ' day' + (st.nutritionDays===1?'':'s') + ' with meals. Step average uses ' + st.stepDays + ' day' + (st.stepDays===1?'':'s') + ' with steps recorded.</p>' +
        '<div class="setrow" style="padding-left:0;padding-right:0;margin-top:10px"><div><div class="setname">Badges earned</div><div class="small">' +
          ((st.badgesEarned || []).length ? (window.Badges ? Badges.all().filter(function(b){ return st.badgesEarned.indexOf(b.id)>=0; }).map(function(b){ return esc(b.name); }).join(' · ') : (st.badgesEarned || []).length + ' this week') : 'None recorded this week') +
        '</div></div><b>' + (st.badgesEarned || []).length + '</b></div>' +
        '<div class="setrow" style="padding-left:0;padding-right:0"><div><div class="setname">Favorites added</div><div class="small">' + ((st.favoriteMealsAdded || []).length ? st.favoriteMealsAdded.map(esc).join(' · ') : 'None recorded this week') + '</div></div><b>' + (st.favoriteMealsAdded || []).length + '</b></div>' +
        '<div class="setrow" style="padding-left:0;padding-right:0"><div><div class="setname">Cookbook total</div><div class="small">Recipes currently saved to bring back into future plans.</div></div><b>' + st.favorites + '</b></div>' +
        (st.weightChange == null ? '' : '<p class="small" style="margin:13px 0 0">Weight moved ' + (st.weightChange > 0 ? '+' : '') + Store.weightNum(st.weightChange, 1) + ' ' + Store.state().units.weight + ' between the first and last weigh-in that week.</p>') +
      '</article>';
    if (review) {
      body += '<article class="card pad accent"><div class="kicker sage">Coach review</div><p class="lede" style="margin:9px 0 13px">' + esc(review.summary) + '</p>' +
        (review.win ? '<div class="setrow" style="padding-left:0;padding-right:0"><div><div class="setname">Win</div><div class="small">' + esc(review.win) + '</div></div></div>' : '') +
        (review.pattern ? '<div class="setrow" style="padding-left:0;padding-right:0"><div><div class="setname">Pattern</div><div class="small">' + esc(review.pattern) + '</div></div></div>' : '') +
        (review.carry ? '<div class="setrow" style="padding-left:0;padding-right:0"><div><div class="setname">Carry forward</div><div class="small">' + esc(review.carry) + '</div></div></div>' : '') +
        aiWhyBlock('weekly-review', 'What evidence did Coach use?') +
      '</article>';
    } else {
      body += '<article class="card pad"><div class="kicker">Read the week</div><p class="small" style="margin:9px 0 14px">The numbers above are already final. The coach can turn them into a short review without inventing anything.</p>' +
        (hasClaude && ready ? '<button class="btn block" data-action="generate-weekly-review" data-week="' + week + '">Write my weekly review</button>' :
          !hasClaude ? '<button class="btn ghost block" data-route="settings">Connect Claude to write it</button>' : '<p class="note">The current week is still in progress.</p>') + '</article>';
    }
    var nextPartial = (next.training || next.meals) && !(next.training && next.meals);
    body += '<article class="card pad"><div class="kicker sage">Next week</div><p class="lede" style="margin:9px 0 7px">' +
      (next.training && next.meals ? 'Training and all 28 meal slots are ready.' : nextPartial ? 'Part of next week is already saved. InSync will finish only what is missing.' : 'Set up the next week from the habits, preferences and progression InSync already knows.') + '</p>' +
      '<p class="small" style="margin:0 0 14px">Training: ' + (next.training ? 'ready' : 'not written') + ' · Meals: ' + next.mealCount + ' of 28 planned.</p>' +
      '<div style="border-top:1px solid var(--rule);padding-top:12px;margin-top:4px"><div class="kicker">Two goals</div>' +
        (nextGoals.length ? nextGoals : suggestedGoals.map(function(g){return {label:g.label,value:0,target:g.target,done:false};})).map(function(g){ return '<div class="goalrow"><span>' + (g.done ? '✓ ' : '') + esc(g.label) + '</span><b>' + g.value + '/' + g.target + '</b></div>'; }).join('') + '</div>' +
      (next.training && next.meals
        ? '<div class="btnrow" style="margin-top:14px"><button class="btn ghost" data-route="planner">View meals</button><button class="btn ghost" data-route="train">View training</button></div>'
        : hasClaude ? '<button class="btn block" style="margin-top:14px" data-action="setup-next-week" data-week="' + week + '">' + (nextPartial ? 'Finish setting up next week' : 'Set up my next week') + '</button>' : '<button class="btn ghost block" style="margin-top:14px" data-route="settings">Connect Claude to set it up</button>') +
      '</article>';
    return UI.screen({ tab:null, rest:300, blur:true, header:{back:'home',title:'Weekly review',right:'<div style="width:34px"></div>'},
      art:'assets/art/coach-desk.webp', photoPosition:'center 34%', overlay:'<div class="eyebrow">' + esc(label) + '</div><p class="verse" style="font-size:25px">Look back once. Then move the week forward.</p>', body:body });
  }

  // ---------------- Settings ----------------
  function relativeWhen(ms) {
    if (!ms) return 'not yet';
    var mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + ' min ago';
    if (mins < 1440) return Math.round(mins / 60) + ' hr ago';
    return Math.round(mins / 1440) + ' day' + (Math.round(mins / 1440) === 1 ? '' : 's') + ' ago';
  }

  function syncLine(c, S) {
    if (!window.Insights) return 'Sync status unavailable.';
    var h = Insights.syncHealth();
    if (!h.connected) return 'Not connected. Set a GitHub token and a dedicated private sync repository.';
    if (h.error) return h.error + ' InSync will retry automatically.';
    return h.status + '. Last successful exchange ' + relativeWhen(h.lastSync) + '.';
  }

  function syncHealthPanel() {
    if (!window.Insights) return '';
    var h = Insights.syncHealth(), S = Store.state(), partner = Store.partnerName();
    var badge = h.tone === 'good' ? '✓' : h.tone === 'bad' ? '!' : '•';
    var updateStatus = window.InSyncRuntime && InSyncRuntime.updateStatus ? InSyncRuntime.updateStatus : 'current build';
    return '<div class="sync-health ' + esc(h.tone) + '">' +
      '<div class="synctop"><strong>' + badge + ' ' + esc(h.status) + '</strong><span>6.0.0-p5.3 · ' + esc(updateStatus) + '</span></div>' +
      '<div class="syncfacts"><span>Last exchange <b>' + esc(relativeWhen(h.lastSync)) + '</b></span>' +
      '<span>' + esc(partner) + ' updated <b>' + esc(relativeWhen(h.partnerUpdated)) + '</b></span>' +
      '<span>' + esc(partner) + ' has your data through <b>' + esc(relativeWhen(h.partnerReceived)) + '</b></span></div>' +
      (h.error ? '<p class="small" style="margin:10px 0 0;color:var(--rust)">' + esc(h.error) + '</p>' : '') +
    '</div>';
  }

  var NOTIF_ROWS = [
    ['invite', 'They propose an expedition', 'Nothing starts until you answer'],
    ['accept', 'They accept yours', ''],
    ['note', 'They leave you a note', ''],
    ['challengeExpiring', 'The weekly challenge is ending', 'Sunday only'],
    ['leg', 'A leg opens', ''],
    ['badge', 'A badge is earned', '']
  ];

  function settings() {
    var S = Store.state();
    var c = S.connections || {};
    var githubToken = Store.secret('githubToken');
    var claudeKey = Store.secret('claudeKey');
    var shared = ['weight', 'calories', 'workouts', 'steps'].filter(function (k) { return S.privacy[k]; }).length;
    /* Counted from the rows on screen, never from the keys in storage —
       a retired key would otherwise be counted as one you can still see. */
    var notifOn = NOTIF_ROWS.filter(function (r) { return S.notifs[r[0]]; }).length;
    var prop = S.proposal && !S.proposal.answered ? S.proposal : null;

    function toggle(path, on) {
      return '<button class="sw' + (on ? ' on' : '') + '" data-toggle="' + path + '"><span></span></button>';
    }
    function row(label, note, right) {
      return '<div class="setrow"><div><div class="setname">' + esc(label) + '</div>' +
        (note ? '<div class="small">' + esc(note) + '</div>' : '') + '</div>' + right + '</div>';
    }
    function numField(path, value, suffix, unit) {
      return '<span style="display:flex;align-items:baseline;gap:6px;flex:none">' +
        '<input class="keyinput plain" data-set="' + path + '" data-num="1"' + (unit ? ' data-unit="' + unit + '"' : '') +
          ' inputmode="numeric" value="' + esc(String(value)) + '" ' +
          'style="width:88px;text-align:right;font-family:var(--serif);font-size:19px" />' +
        (suffix ? '<span class="small">' + esc(suffix) + '</span>' : '') +
      '</span>';
    }
    /* Two options, and which one is on is the state itself — no save step. */
    function unitRow(label, path, opts, current) {
      return '<div class="setrow"><div><div class="setname">' + esc(label) + '</div></div>' +
        '<div style="display:flex;gap:7px;flex:none">' +
          opts.map(function (o) {
            return '<button class="ob-chip' + (current === o ? ' on' : '') + '" style="flex:none;min-height:38px;padding:0 14px" ' +
              'data-action="set-unit" data-path="' + path + '" data-value="' + o + '">' + esc(o) + '</button>';
          }).join('') +
        '</div></div>';
    }
    function preferenceRow(label, note, action, opts, current) {
      return '<div class="setpref"><div><div class="setname">' + esc(label) + '</div>' +
        (note ? '<div class="small">' + esc(note) + '</div>' : '') + '</div>' +
        '<div class="setprefchips">' + opts.map(function (o) {
          return '<button class="ob-chip' + (current === o[0] ? ' on' : '') + '" data-action="' + action + '" data-value="' + esc(o[0]) + '">' + esc(o[1]) + '</button>';
        }).join('') + '</div></div>';
    }
    function aiPreferenceRow(label, note, key, opts, current) {
      return '<div class="setpref"><div><div class="setname">' + esc(label) + '</div>' +
        (note ? '<div class="small">' + esc(note) + '</div>' : '') + '</div>' +
        '<div class="setprefchips">' + opts.map(function (o) {
          return '<button class="ob-chip' + (current === o[0] ? ' on' : '') + '" data-action="set-ai-pref" data-pref="' + esc(key) + '" data-value="' + esc(o[0]) + '">' + esc(o[1]) + '</button>';
        }).join('') + '</div></div>';
    }
    function keyField(label, secretName, value, placeholder, note) {
      return '<div class="keyfield">' +
        '<label class="kicker">' + esc(label) + '</label>' +
        '<input type="password" class="keyinput" data-secret="' + secretName + '" data-set="secret.' + secretName + '" value="' + esc(value || '') + '" placeholder="' + esc(placeholder) + '" autocomplete="off" spellcheck="false" />' +
        (note ? '<div class="small">' + esc(note) + '</div>' : '') +
      '</div>';
    }

    return UI.screen({
      tab: null, rest: 210, blur: true,
      header: { back: true, title: 'Settings', right: '<div style="width:34px"></div>' },
      overlay: '<p class="verse" style="font-size:25px">Everything the app knows, and who else knows it.</p>',
      body:
        /* The only thing here asking a question goes first. */
        (prop
          ? '<article class="card pad accent">' +
              '<div class="kicker" style="margin-bottom:11px">The coach has a proposal</div>' +
              '<p class="lede" style="margin:0 0 14px">' + esc(prop.why || prop.summary || 'New targets to approve') + '</p>' +
              aiWhyBlock('target-proposal', 'What evidence did Coach use?') +
              '<div style="border:1px solid var(--rule);border-radius:2px;overflow:hidden;margin-bottom:15px">' +
                [['calories', 'Energy', ' ' + S.units.energy], ['protein', 'Protein', ' g'], ['steps', 'Steps', ''], ['weightGoal', 'Weight goal', ' ' + S.units.weight]]
                  .filter(function (f) { return prop.targets[f[0]] !== S.targets[f[0]]; })
                  .map(function (f) {
                    var currentValue = f[0] === 'weightGoal' ? Store.weightNum(S.targets.weightGoal, S.units.weight === 'kg' ? 1 : 0)
                      : f[0] === 'calories' ? Store.energyNum(S.targets.calories) : S.targets[f[0]];
                    var proposedValue = f[0] === 'weightGoal' ? Store.weightNum(prop.targets.weightGoal, S.units.weight === 'kg' ? 1 : 0)
                      : f[0] === 'calories' ? Store.energyNum(prop.targets.calories) : prop.targets[f[0]];
                    return '<div class="setrow" style="padding:11px 15px">' +
                      '<span class="small">' + f[1] + '</span>' +
                      '<span style="flex:none;font-size:12.5px"><span class="small">' + currentValue.toLocaleString() + f[2] + '</span>' +
                      ' &rarr; <span style="color:var(--gold)">' + proposedValue.toLocaleString() + f[2] + '</span></span>' +
                    '</div>';
                  }).join('') +
              '</div>' +
              '<div class="btnrow">' +
                '<button class="btn" data-action="accept-proposal">Use these</button>' +
                '<button class="btn ghost auto" data-action="dismiss-proposal">Keep mine</button>' +
              '</div>' +
            '</article>'
          : '') +

        '<article class="card pad">' +
          '<div class="profrow">' +
            '<div class="avatar big">' + esc(S.profile.initials) + '</div>' +
            '<div style="min-width:0">' +
              '<input class="keyinput plain" data-set="profile.name" data-name="1" value="' + esc(S.profile.name) + '" ' +
                'style="font-family:var(--serif);font-size:21px;padding:0;border:0;border-bottom:1px solid var(--rule)" />' +
              '<div class="small" style="margin-top:7px">' +
                [S.profile.heightIn ? Math.floor(S.profile.heightIn / 12) + ' ft ' + (S.profile.heightIn % 12) + ' in' : '',
                 S.profile.age || '',
                 S.profile.startDate ? 'walking since ' + esc(S.profile.startDate) : '']
                  .filter(Boolean).join(' &middot; ') + '</div>' +
            '</div>' +
          '</div>' +
          '<p class="small" style="margin-top:14px">No account and no sign-in. This device is yours; your partner’s device is theirs.</p>' +
        '</article>' +

        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Connections</div>' +
            '<div class="meta">' + ((githubToken ? 1 : 0) + (claudeKey ? 1 : 0)) + ' of 2 keys set</div></div>' +
          '<div class="pad-x" style="padding-top:14px;padding-bottom:4px">' +
            '<p class="small" style="margin:0 0 14px">Connection keys are stored separately on this device and are excluded from backups. They are sent only to the service they belong to.</p>' +
            keyField('Claude API key', 'claudeKey', claudeKey, 'sk-ant-...', 'Powers the coach, meal reader and plan writer. Browser-based API keys can be exposed by a compromised app, so keep this app private and trusted.') +
            keyField('GitHub token', 'githubToken', githubToken, 'ghp_...', 'Used only for the shared sync files in your dedicated private repository.') +
            '<div class="keyfield">' +
              '<label class="kicker">Dedicated private sync repository</label>' +
              '<input type="text" class="keyinput plain" data-set="connections.githubRepo" value="' + esc(c.githubRepo || '') + '" placeholder="owner/insync-sync" autocomplete="off" spellcheck="false" />' +
              '<div class="small" style="margin-top:6px">Must be private, separate from the repository publishing this app, and initialized with a README.</div>' +
            '</div>' +
            '<div class="keyfield">' +
              '<label class="kicker">Branch</label>' +
              '<input type="text" class="keyinput plain" data-set="connections.githubBranch" value="' + esc(c.githubBranch || 'main') + '" placeholder="main" autocomplete="off" spellcheck="false" />' +
            '</div>' +
            '<div class="keyfield">' +
              '<label class="kicker">Claude model</label>' +
              '<input type="text" class="keyinput plain" data-set="connections.claudeModel" value="' + esc(c.claudeModel || '') + '" placeholder="Claude model id" autocomplete="off" spellcheck="false" />' +
              '<div class="small" style="margin-top:6px">Editable so a retired model can be changed without rebuilding the app.</div>' +
            '</div>' +
            '<div class="keyfield">' +
              '<label class="kicker">Walking with</label>' +
              '<input type="text" class="keyinput plain" data-set="partner.name" data-partner-name="1" value="' + esc(Store.state().partner.name || '') + '" placeholder="Their name" autocomplete="off" spellcheck="false" />' +
              '<div class="small" style="margin-top:6px">Must match the name they entered on their device. It decides whose file you read.</div>' +
            '</div>' +
          '</div>' +
          '<div class="pad-x" style="padding-bottom:15px">' +
            syncHealthPanel() +
            '<button class="btn ghost block" data-action="sync-now">Sync now</button>' +
            '<p class="small" style="margin:11px 0 0">' + esc(syncLine(c, S)) + '</p>' +
          '</div>' +
        '</article>' +

        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Coach & Intelligence</div><div class="meta">Constitution v' + esc(window.InSyncIntelligence ? InSyncIntelligence.constitution.version : '—') + '</div></div>' +
          '<p class="small pad-x" style="padding-top:14px">Choose how Coach communicates. These are safe preferences, not access to the hidden instruction layer; truth, privacy, Christian guardrails and approval-before-change rules cannot be turned off.</p>' +
          aiPreferenceRow('Tone', 'The overall writing feel.', 'tone', [['grounded','Grounded'],['warm','Warmer'],['concise','Concise']], (S.aiPrefs||{}).tone) +
          aiPreferenceRow('Directness', 'How plainly Coach names a gap.', 'directness', [['gentle','Gentle'],['direct','Direct'],['firm','Firm']], (S.aiPrefs||{}).directness) +
          aiPreferenceRow('Meal complexity', 'How ambitious generated home cooking should be.', 'mealComplexity', [['simple','Simple'],['practical','Practical'],['adventurous','Adventurous']], (S.aiPrefs||{}).mealComplexity) +
          aiPreferenceRow('Training style', 'How readily Coach proposes progression when the log supports it.', 'trainingStyle', [['conservative','Conservative'],['balanced','Balanced'],['progressive','Progressive']], (S.aiPrefs||{}).trainingStyle) +
          '<p class="small pad-x" style="padding-bottom:15px">One Coach, multiple internal skills: Daily Coach, Trainer, Nutrition Planner, Weekly Planner, Expedition Guide and Couple Encouragement. Each receives only its allowed context.</p>' +
        '</article>' +

        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Training setup</div><div class="meta">' + esc(window.Training ? Training.gymLabel(Training.profile().gymType) : 'Gym') + '</div></div>' +
          preferenceRow('Where you train', 'Plans can only use movements supported by this equipment profile.', 'set-gym-type', [['planet-fitness','Planet Fitness'],['home','Home'],['full-gym','Full gym'],['custom','Custom']], (S.trainingProfile||{}).gymType) +
          ((S.trainingProfile||{}).gymType === 'custom' ? '<div class="setpref"><div><div class="setname">Available equipment</div><div class="small">Choose every type the planner may use.</div></div><div class="setprefchips">' + ['Bodyweight','Dumbbell','Machine','Cable','Smith','Barbell'].map(function(eq){var on=((S.trainingProfile||{}).customEquipment||[]).indexOf(eq)>=0;return '<button class="ob-chip' + (on?' on':'') + '" data-action="toggle-training-equipment" data-value="' + eq + '">' + eq + '</button>';}).join('') + '</div></div>' : '') +
          row('Advanced effort', 'Use Reps In Reserve instead of Easy / Right / Hard.', toggle('trainingProfile.advancedRIR', !!(S.trainingProfile||{}).advancedRIR)) +
          row('Automatic rest timer', 'Starts after every logged set and survives phone lock.', toggle('trainingProfile.autoRest', (S.trainingProfile||{}).autoRest !== false)) +
          preferenceRow('Default rest', 'Large compound patterns automatically use at least 2 minutes.', 'set-rest-default', [['60','1 min'],['90','1:30'],['120','2 min'],['180','3 min']], String((S.trainingProfile||{}).defaultRestSec || 90)) +
          '<p class="small pad-x" style="padding-bottom:15px">Changing equipment does not silently rewrite the active week. If the current plan no longer fits, Train will ask you to rewrite it.</p>' +
        '</article>' +

        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Goals & targets</div><div class="meta">Yours to change</div></div>' +
          preferenceRow('Primary goal', 'A goal change keeps this week intact and rebuilds any staged training week.', 'set-goal',
            [['lose-fat','Lose fat'],['build','Build'],['hold','Hold'],['strong','Stronger']], S.goal) +
          preferenceRow('Gym days', 'Your daily walk is separate. This number is lifting sessions per week.', 'set-frequency',
            [['2','2'],['3','3'],['4','4'],['5','5'],['6','6']], String(S.frequency)) +
          row('Daily energy', 'Goal: ' + esc(S.goal.replace(/-/g, ' ')), numField('targets.calories', Store.energyNum(S.targets.calories), S.units.energy, 'energy')) +
          row('Daily protein', '', numField('targets.protein', S.targets.protein, 'g')) +
          row('Daily steps', '', numField('targets.steps', S.targets.steps)) +
          row('Weight goal', '', numField('targets.weightGoal', Store.weightNum(S.targets.weightGoal, 0), S.units.weight, 'weight')) +
          '<p class="small pad-x" style="padding-bottom:15px">The coach watches these and proposes changes. Nothing moves without your tap — including yours.</p>' +
        '</article>' +

        '<article class="card">' +
          '<div class="cardhead"><div class="title sage"><i></i>What ' + esc(Store.partnerName()) + ' sees</div>' +
            '<div class="meta sage">' + shared + ' of 4 shared</div></div>' +
          row('Weight', 'Only the recent change; never your exact daily weight', toggle('privacy.weight', S.privacy.weight)) +
          row('Energy and protein', 'Daily totals only, never the meals', toggle('privacy.calories', S.privacy.calories)) +
          row('Workouts', 'That you trained, not what you lifted', toggle('privacy.workouts', S.privacy.workouts)) +
          row('Steps and walks', 'Daily total and distance', toggle('privacy.steps', S.privacy.steps)) +
          row('Progress photos', 'Never shared. There is no switch for this.', '<span class="lockmark">' + icon('lock') + '</span>') +
          '<p class="small pad-x" style="padding-bottom:15px">Core Together data — your name, points, streak, earned badges, notes you send, and the expedition route/leg — is shared so both phones stay in the same place. Exact meals, lifted weights, photographs and exact bodyweight never cross. Turning Steps off also pauses your shared expedition mileage.</p>' +
        '</article>' +

        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Notifications</div>' +
            '<div class="meta">' + notifOn + ' of ' + NOTIF_ROWS.length + ' on</div></div>' +
          NOTIF_ROWS.map(function (r) {
            return row(r[1], r[2], toggle('notifs.' + r[0], S.notifs[r[0]]));
          }).join('') +
          '<p class="small pad-x" style="padding-bottom:15px">These switches control the matching items in InSync’s notification centre. There is no daily reminder to log.</p>' +
        '</article>' +

        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Units</div>' +
            '<div class="meta">' + esc(S.units.weight + ' &middot; ' + S.units.distance) + '</div></div>' +
          unitRow('Weight', 'units.weight', ['lb', 'kg'], S.units.weight) +
          unitRow('Distance', 'units.distance', ['mi', 'km'], S.units.distance) +
          unitRow('Energy', 'units.energy', ['kcal', 'kJ'], S.units.energy) +
          '<p class="small pad-x" style="padding-bottom:15px">Everything is stored in pounds, miles and kilocalories and converted for display, so switching back and forth cannot round your history away.</p>' +
        '</article>' +

        '<article class="card">' +
          '<div class="cardhead"><div class="title sage"><i></i>Your data</div></div>' +
          row('Create backup', 'Log, plans, settings and photographs; connection keys excluded', '<button class="btn ghost tiny" data-action="export">Backup</button>') +
          row('Restore backup', 'Replace this device with a backup file', '<button class="btn ghost tiny" data-action="import">Restore</button>') +
          row('Start over', 'Clears this device and runs onboarding again', '<button class="btn ghost tiny danger" data-action="reset">Reset</button>') +
          '<p class="small pad-x" style="padding-bottom:15px">Your complete log and progress photos are stored on this device. GitHub sync sends only the shared fields above to the private sync repository. When you use a Claude feature, the facts or meal photo needed for that request are sent to Anthropic to produce the response.</p>' +
        '</article>' +

        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>About</div>' +
            '<div class="meta">Version 6.0.0-p5.6</div></div>' +
          '<p class="note pad-x" style="padding-top:14px">Two people, one trail. InSync is built for one couple: the complete log remains stored locally, GitHub receives only the Together fields you share, and optional Claude features send only the request-relevant facts or meal image when you invoke them.</p>' +
          row('Days walked', '', '<span class="num">' + Store.daysIn() + '</span>') +
          row('Stamps struck', '', '<span class="num">' + Badges.totals().earned + ' of ' + Badges.totals().total + '</span>') +
          '<p class="small pad-x" style="padding-bottom:15px">No account, no sign-out, no user switching. There is nothing to log in to.</p>' +
        '</article>'
    });
  }

  // ---------------- Body ----------------
  function series(field, n) {
    var out = [], k = Store.todayKey();
    for (var i = n - 1; i >= 0; i--) {
      var key = Store.shift(k, -i), rec = Store.state().days[key];
      out.push({ key: key, v: rec && rec[field] != null ? rec[field] : null });
    }
    return out;
  }

  /* Broken line where nothing was entered — a gap is shown as a gap. */
  function spark(points, w, h, colour) {
    var vals = points.filter(function (p) { return p.v != null; }).map(function (p) { return p.v; });
    if (vals.length < 2) return '<div class="empty"><p class="note">Not enough entries yet to draw a line.</p></div>';
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var pad = (hi - lo) * 0.2 || 1;
    lo -= pad; hi += pad;
    var segs = [], cur = [];
    points.forEach(function (p, i) {
      if (p.v == null) { if (cur.length > 1) segs.push(cur); cur = []; return; }
      cur.push([(i / (points.length - 1)) * w, h - ((p.v - lo) / (hi - lo)) * h]);
    });
    if (cur.length > 1) segs.push(cur);
    var paths = segs.map(function (s) {
      return '<path d="M' + s.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') +
        '" fill="none" stroke="' + colour + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    }).join('');
    var last = points.filter(function (p) { return p.v != null; }).pop();
    var li = points.indexOf(last);
    var lx = (li / (points.length - 1)) * w, ly = h - ((last.v - lo) / (hi - lo)) * h;
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" style="display:block;overflow:visible">' +
      paths + '<circle cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="3.5" fill="' + colour + '"/></svg>';
  }

  function body() {
    var d = Store.day(), S = Store.state(), u = S.units.weight;
    var wNum = Store.weightNum;
    var wSeries = series('weight', 30);
    var entered = wSeries.filter(function (p) { return p.v != null; });
    var first = entered[0], last = entered[entered.length - 1];
    var change = first && last && entered.length > 1 ? +(last.v - first.v).toFixed(1) : null;
    var toGoal = last ? +(last.v - S.targets.weightGoal).toFixed(1) : null;

    function cell(label, value, unit, action) {
      return '<div data-action="' + action + '" style="cursor:pointer">' +
        '<div class="label">' + label + '</div>' +
        '<div class="figure"' + (value == null ? ' style="color:#8A8371"' : '') + '>' +
          (value == null ? '&mdash;' : value) + (value != null && unit ? '<small>' + unit + '</small>' : '') +
        '</div></div>';
    }

    return UI.screen({
      tab: null, rest: 300, blur: true,
      header: { back: true, title: 'Body', right: '<div style="width:34px"></div>' },
      overlay: '<div class="eyebrow">This morning</div><p class="verse" style="font-size:25px">' +
        (d.weight != null ? 'Weighed in at ' + Store.fmtWeight(d.weight) + '.' : 'Nothing entered yet today.') + '</p>',
      body:
        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>The morning numbers</div>' +
          '<div class="meta">' + [d.weight, d.restingHr, d.sleepHr].filter(function (v) { return v != null; }).length + ' of 3</div></div>' +
          '<div class="ledger">' +
            cell('Weight', wNum(d.weight), ' ' + u, 'log-morning') +
            cell('Resting HR', d.restingHr, '', 'log-morning') +
            cell('Sleep', d.sleepHr, 'h', 'log-morning') +
          '</div>' +
          '<div class="pad-x" style="padding-top:14px;padding-bottom:15px">' +
            '<button class="btn block" data-action="log-morning">' + (d.weight != null ? 'Update the morning' : 'Enter the morning') + '</button>' +
          '</div>' +
        '</article>' +

        '<article class="card pad">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px">' +
            '<div><div class="kicker" style="margin-bottom:6px">Weight</div>' +
            '<div class="note">' + entered.length + ' entr' + (entered.length === 1 ? 'y' : 'ies') + ' in the last 30 days</div></div>' +
            (change != null
              ? '<div style="text-align:right;flex:none"><div style="font-family:var(--serif);font-size:24px;line-height:1;color:' + (change <= 0 ? 'var(--sage-lt)' : 'var(--gold-mid)') + '">' +
                (change > 0 ? '+' : '') + wNum(change) + '</div><div class="small" style="margin-top:4px">' + u + ' change</div></div>'
              : '') +
          '</div>' +
          spark(wSeries, 320, 78, '#C6A15D') +
          (toGoal != null
            ? '<p class="small" style="margin-top:12px">' +
              (toGoal > 0 ? Store.fmtWeight(toGoal) + ' to the ' + Store.fmtWeight(S.targets.weightGoal, 0) + ' goal.' : 'Goal reached.') + '</p>'
            : '') +
        '</article>' +

        '<article class="card pad">' +
          '<div class="kicker sage" style="margin-bottom:6px">Sleep</div>' +
          '<div class="note" style="margin-bottom:14px">Hours a night, last 30</div>' +
          spark(series('sleepHr', 30), 320, 62, '#8FA184') +
        '</article>' +

        photoStrip()
    });
  }

  /* ---- Progress photos --------------------------------------------------- */

  /* The four most recent, newest last, so the strip reads left to right the
     way the timeline does. Empty says what it needs rather than apologising. */
  function photoStrip() {
    var list = (Store.state().photos || []);
    if (!list.length) {
      return '<article class="card pad">' +
        '<div class="kicker" style="margin-bottom:11px">Progress photos</div>' +
        '<p class="lede" style="margin:0 0 13px">No photographs yet.</p>' +
        '<p class="small" style="margin:0 0 14px">One a fortnight, same spot, same light. The change is invisible day to day and obvious across two months.</p>' +
        '<button class="btn block" data-route="capture">Take the first one</button>' +
      '</article>';
    }
    var recent = list.slice(-4);
    return '<article class="card pad">' +
      '<div class="rowhead" style="margin-bottom:13px">' +
        '<div class="kicker">Progress photos</div>' +
        '<button class="linkbtn" data-route="photos">' + list.length + ' &mdash; see them all</button>' +
      '</div>' +
      '<div class="photostrip">' + recent.map(function (p) {
        return '<div><div class="photoframe" data-photo="' + esc(p.id) + '"></div>' +
          '<div class="photodate">' + dateLabel(p.date) + '</div></div>';
      }).join('') + '</div>' +
      '<button class="btn ghost block" style="margin-top:13px" data-route="capture">Take one today</button>' +
    '</article>';
  }

  /* Timeline. The first photograph stays pinned on the left, so every
     comparison is against the owner starting point rather than against last fortnight. */
  function photos() {
    var list = (Store.state().photos || []);
    var unit = Store.state().units.weight;

    if (!list.length) {
      return UI.screen({
        tab: null, rest: 260, photoHeight: '330px', blur: true,
        header: { back: 'body', title: 'Progress photos', right: '<div style="width:34px"></div>' },
        art: 'assets/art/camp-day.webp', photoPosition: 'center 40%',
        overlay: '<div class="eyebrow">Nothing yet</div>' +
          '<p class="verse" style="font-size:25px">The first one is the one that matters.</p>',
        body: '<article class="card pad">' +
          '<p class="lede" style="margin:0 0 13px">Every photograph after this is compared against the first.</p>' +
          '<p class="small" style="margin:0 0 14px">Same spot, same light, same time of day. Conditions matter more than the camera.</p>' +
          '<button class="btn block" data-route="capture">Take the first one</button>' +
        '</article>'
      });
    }

    var sel = Math.min(list.length - 1, Math.max(0, parseInt(location.hash.split('/')[1], 10) || (list.length - 1)));
    var first = list[0], current = list[sel];
    var wFirst = Store.weightNear(first.date), wSel = Store.weightNear(current.date);
    var days = Math.round((new Date(current.date + 'T12:00:00') - new Date(first.date + 'T12:00:00')) / 86400000);

    var note;
    if (sel === 0) note = 'This is the first photograph, so there is nothing to compare it against yet.';
    else if (wFirst && wSel) note = (wFirst - wSel).toFixed(1) + ' ' + unit + ' between these two. The weight beside each is the nearest morning entry to the day it was taken.';
    else note = 'No weight was entered near one of these, so there is no figure to put against them.';

    var stats = [
      ['Days apart', sel === 0 ? '—' : String(days), ''],
      [unit === 'lb' ? 'Pounds' : 'Kilos', (sel > 0 && wFirst && wSel) ? Store.weightNum(wFirst - wSel) : '—', ' sage'],
      ['Photograph', (sel + 1) + ' of ' + list.length, '']
    ];

    return UI.screen({
      tab: null, rest: 300, photoHeight: '340px', blur: true,
      header: { back: 'body', title: 'Progress photos', right: '<div style="width:34px"></div>' },
      art: 'assets/art/camp-day.webp', photoPosition: 'center 40%',
      overlay: '<div class="eyebrow">' + dateLabel(first.date) + ' to ' + dateLabel(list[list.length - 1].date) + '</div>' +
        '<p class="verse" style="font-size:25px">The same spot, ' + list.length + ' mornings apart.</p>',
      body:
        '<article class="card pad">' +
          '<div class="comparepair">' +
            '<div>' +
              '<div class="photoframe tall" data-photo="' + esc(first.id) + '"></div>' +
              '<div class="photometa"><span>' + dateLabel(first.date) + '</span>' +
                '<span>' + (wFirst ? Store.fmtWeight(wFirst) : '—') + '</span></div>' +
              '<div class="photocap">The first</div>' +
            '</div>' +
            '<div>' +
              '<div class="photoframe tall" data-photo="' + esc(current.id) + '"></div>' +
              '<div class="photometa"><span>' + dateLabel(current.date) + '</span>' +
                '<span>' + (wSel ? Store.fmtWeight(wSel) : '—') + '</span></div>' +
              '<div class="photocap">' + (sel === list.length - 1 ? 'The latest' : 'Selected') + '</div>' +
            '</div>' +
          '</div>' +
          (list.length > 1
            ? '<div class="scrub">' + list.map(function (p, i) {
                return '<button class="notch' + (i === sel ? ' on' : '') + '" data-route="photos/' + i + '" ' +
                  'aria-label="' + dateLabel(p.date) + '"><span></span></button>';
              }).join('') + '</div>'
            : '') +
          '<p class="small" style="margin:13px 0 0">' + esc(note) + '</p>' +
        '</article>' +

        '<article class="card">' +
          '<div class="statrow">' + stats.map(function (r) {
            return '<div class="statcell"><div class="statlabel">' + r[0] + '</div>' +
              '<div class="statvalue' + r[2] + '">' + r[1] + '</div></div>';
          }).join('') + '</div>' +
        '</article>' +

        '<div class="rulehead"><span class="kicker">Every photograph</span><span></span></div>' +
        '<article class="card pad">' +
          '<div class="photogrid">' + list.map(function (p, i) {
            return '<button class="photocell' + (i === sel ? ' on' : '') + '" data-route="photos/' + i + '">' +
              '<div class="photoframe" data-photo="' + esc(p.id) + '"></div>' +
              '<div class="photodate">' + dateLabel(p.date) + '</div>' +
            '</button>';
          }).join('') + '</div>' +
        '</article>' +

        '<button class="btn block" data-route="capture">Take one today</button>' +
        '<button class="btn ghost block danger" data-action="delete-photo" data-id="' + esc(current.id) + '">' +
          'Delete the ' + dateLabel(current.date) + ' photograph</button>' +

        '<article class="card pad">' +
          '<div class="kicker" style="margin-bottom:11px">These stay here</div>' +
          '<p class="small" style="margin:0">Progress photographs are never synced and never shared. There is no switch for it &mdash; they do not leave this device.</p>' +
        '</article>'
    });
  }

  /* One machine's progression. The chart is the point: every logged lift,
     the best one ringed and named, and the weights it was actually done at. */
  function record() {
    var want = decodeURIComponent(location.hash.split('/')[1] || '');
    var r = Store.records().filter(function (x) { return x.name === want; })[0];

    if (!r) {
      return UI.screen({
        tab: null, rest: 240, photoHeight: '300px', blur: true,
        header: { back: 'records', title: 'Machine', right: '<div style="width:34px"></div>' },
        art: 'assets/art/train-banner.webp', photoPosition: 'center 40%',
        overlay: '<p class="bigsub">Nothing logged on that machine.</p>',
        body: '<article class="card pad"><p class="lede" style="margin:0">Log it in a session and its line starts here.</p></article>'
      });
    }

    var ex = window.Exercises && Exercises.byName ? Exercises.byName(r.name) : null;
    var u = Store.state().units.weight;
    var delta = r.change > 0 ? '+' + Store.liftNum(r.change) : String(Store.liftNum(r.change));
    var headline = r.sessions < 2
      ? 'One session so far. The line starts at two.'
      : r.change > 0
        ? delta + ' ' + u + ' since the first time you touched it.'
        : r.change === 0
          ? 'Same weight as the first session.'
          : Store.fmtLift(Math.abs(r.change)) + ' below where you started.';

    return UI.screen({
      tab: null, rest: 300, photoHeight: '340px', blur: true,
      header: { back: 'records', title: r.name, right: '<div style="width:34px"></div>' },
      art: 'assets/art/train-banner.webp', photoPosition: 'center 40%',
      overlay: '<div class="eyebrow">' + r.sessions + ' session' + (r.sessions === 1 ? '' : 's') + '</div>' +
        '<p class="verse" style="font-size:25px">' + esc(headline) + '</p>',
      body:
        '<article class="card">' +
          '<div class="ledger">' +
            '<div class="cell"><div class="kicker">Best</div><div class="num">' + Store.liftNum(r.best.weight) + '</div>' +
              '<div class="foot">' + u + ' &middot; ' + dateLabel(r.best.date) + '</div></div>' +
            '<div class="cell"><div class="kicker">Latest</div><div class="num">' + Store.liftNum(r.latest.weight) + '</div>' +
              '<div class="foot">' + u + ' &middot; ' + dateLabel(r.latest.date) + '</div></div>' +
            '<div class="cell"><div class="kicker">Change</div><div class="num' + (r.change > 0 ? ' sage' : '') + '">' +
              (r.sessions > 1 ? delta : '\u2014') + '</div><div class="foot">' + u + '</div></div>' +
          '</div>' +
        '</article>' +

        '<article class="card pad">' +
          '<div class="kicker" style="margin-bottom:13px">Every lift</div>' +
          bigChart(r) +
        '</article>' +

        (ex
          ? '<button class="card exrow" data-route="exercise/' + ex.id + '" style="width:100%">' +
              '<img class="exgif" src="' + UI.asset(ex.gif) + '" alt="" loading="lazy" />' +
              '<span style="min-width:0;text-align:left">' +
                '<span class="exname">' + esc(ex.name) + '</span>' +
                '<span class="note">' + esc(ex.sets + ' \u00d7 ' + ex.reps + ' \u00b7 ' + ex.equipment) + '</span>' +
              '</span>' +
            '</button>'
          : '') +

        '<div class="rulehead"><span class="kicker">Session by session</span><span></span></div>' +
        '<article class="card">' +
          r.series.slice().reverse().map(function (p) {
            var isBest = p.date === r.best.date && p.weight === r.best.weight;
            return '<button class="row nothumb" data-route="trainday/' + p.date + '">' +
              '<span style="min-width:0;text-align:left">' +
                '<span class="rowname">' + dateLabel(p.date) + '</span>' +
                '<span class="note">' + p.sets + ' \u00d7 ' + p.reps + (isBest ? ' \u00b7 best' : '') + '</span>' +
              '</span>' +
              '<span class="rowright"><span class="num" style="font-size:18px">' + Store.liftNum(p.weight) + '</span>' +
                '<span class="foot">' + u + '</span></span>' +
            '</button>';
          }).join('') +
        '</article>'
    });
  }

  /* The full chart, not the thumbnail on the index. Grid lines are read from
     the range so the axis means something, and the best lift carries a label. */
  function bigChart(r) {
    var s = r.series;
    if (s.length < 2) {
      return '<p class="lede" style="margin:0">One session so far. A line needs two points &mdash; log this machine again and it begins.</p>';
    }
    var w = 320, h = 150, padL = 34, padB = 22, padT = 14;
    var vals = s.map(function (p) { return p.weight; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (hi === lo) { hi = lo + 5; lo = Math.max(0, lo - 5); }
    var pad = (hi - lo) * 0.15;
    lo = Math.max(0, lo - pad); hi = hi + pad;
    var px = function (i) { return padL + (i / (s.length - 1)) * (w - padL - 8); };
    var py = function (v) { return padT + (1 - (v - lo) / (hi - lo)) * (h - padT - padB); };

    var ticks = [lo, (lo + hi) / 2, hi].map(function (v) { return Math.round(v / 5) * 5; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; });

    var path = s.map(function (p, i) { return (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(p.weight).toFixed(1); }).join(' ');
    var bestIdx = s.reduce(function (a, p, i) { return p.weight > s[a].weight ? i : a; }, 0);

    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" style="display:block;overflow:visible">' +
      ticks.map(function (v) {
        return '<line x1="' + padL + '" y1="' + py(v).toFixed(1) + '" x2="' + w + '" y2="' + py(v).toFixed(1) +
          '" stroke="rgba(243,237,225,.09)" stroke-width="1"/>' +
          '<text x="' + (padL - 7) + '" y="' + (py(v) + 4).toFixed(1) + '" text-anchor="end" fill="#8A8371" ' +
          'font-family="Archivo, sans-serif" font-size="11">' + v + '</text>';
      }).join('') +
      '<path d="' + path + '" fill="none" stroke="#C6A15D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      s.map(function (p, i) {
        return '<circle cx="' + px(i).toFixed(1) + '" cy="' + py(p.weight).toFixed(1) + '" r="' +
          (i === bestIdx ? '5' : '3') + '" fill="' + (i === bestIdx ? '#C6A15D' : '#0D0E0A') +
          '" stroke="#C6A15D" stroke-width="2"/>';
      }).join('') +
      '<text x="' + px(bestIdx).toFixed(1) + '" y="' + (py(s[bestIdx].weight) - 12).toFixed(1) + '" ' +
        'text-anchor="' + (bestIdx > s.length - 3 ? 'end' : 'start') + '" fill="#D8B87C" ' +
        'font-family="Archivo, sans-serif" font-size="11" font-weight="600" letter-spacing="1">BEST</text>' +
      '<text x="' + padL + '" y="' + (h - 4) + '" fill="#8A8371" font-family="Archivo, sans-serif" font-size="11">' +
        dateLabel(s[0].date) + '</text>' +
      '<text x="' + w + '" y="' + (h - 4) + '" text-anchor="end" fill="#8A8371" font-family="Archivo, sans-serif" font-size="11">' +
        dateLabel(s[s.length - 1].date) + '</text>' +
    '</svg>';
  }

  /* Every session, newest first. Tapping one opens the day it was logged. */
  function workouts() {
    var S = Store.state(), rows = [];
    Object.keys(S.days).sort().reverse().forEach(function (k) {
      (S.days[k].workouts || []).forEach(function (w) { rows.push({ key: k, w: w }); });
    });
    var mins = rows.reduce(function (a, r) { return a + (r.w.minutes || 0); }, 0);

    return UI.screen({
      tab: null, rest: 300, photoHeight: '340px', blur: true,
      header: { back: 'records', title: 'Sessions', right: '<div style="width:34px"></div>' },
      art: 'assets/art/train-banner.webp', photoPosition: 'center 40%',
      overlay: '<div class="eyebrow">' + rows.length + ' logged</div>' +
        '<p class="verse" style="font-size:25px">' +
        (rows.length ? Math.round(mins / 60) + ' hours under the bar.' : 'No sessions yet.') + '</p>',
      body: !rows.length
        ? '<article class="card pad"><p class="lede" style="margin:0 0 14px">Nothing logged yet.</p>' +
            '<button class="btn block" data-action="start-session">Start a session</button></article>'
        : '<article class="card">' +
            rows.map(function (r) {
              var ex = (r.w.exercises || []).length;
              return '<button class="row nothumb" data-route="trainday/' + r.key + '">' +
                '<span style="min-width:0;text-align:left">' +
                  '<span class="rowname">' + esc(r.w.name || 'Session') + '</span>' +
                  '<span class="note">' + dateLabel(r.key) + ' \u00b7 ' +
                    (ex ? ex + ' machine' + (ex === 1 ? '' : 's') : 'no machines recorded') +
                    (r.w.walk && r.w.walk.seconds ? ' \u00b7 walk ' + Math.max(1, Math.round(r.w.walk.seconds / 60)) + ' min' : '') + '</span>' +
                '</span>' +
                '<span class="rowright"><span class="num" style="font-size:18px">' + (r.w.minutes || 0) + '</span>' +
                  '<span class="foot">min</span></span>' +
              '</button>';
            }).join('') +
          '</article>'
    });
  }

  /* Walking, by week. Steps are the record; miles and pace are read from them
     using the app's one conversion, so nothing here can disagree with a badge. */
  function cardio() {
    var S = Store.state(), weeks = [];
    for (var i = 7; i >= 0; i--) {
      var start = Store.shift(Store.todayKey(), -(i * 7 + 6));
      var steps = 0, days = 0;
      for (var j = 0; j < 7; j++) {
        var k = Store.shift(start, j);
        var d = S.days[k];
        if (d && d.steps) { steps += d.steps; days++; }
      }
      weeks.push({ start: start, steps: steps, days: days, miles: Store.miles(steps) });
    }
    var live = weeks.filter(function (w) { return w.days; });
    var totalMiles = weeks.reduce(function (a, w) { return a + w.miles; }, 0);
    var best = live.reduce(function (a, w) { return !a || w.miles > a.miles ? w : a; }, null);
    var thisWeek = weeks[weeks.length - 1];
    var lastWeek = weeks[weeks.length - 2];

    /* Only compare weeks that are actually comparable. A full week against a
       part-logged one reads as progress that did not happen. */
    var comparable = lastWeek && lastWeek.days === 7 && thisWeek.days === 7;
    var headline = !live.length
      ? 'No steps recorded yet.'
      : comparable
        ? (thisWeek.miles >= lastWeek.miles
            ? 'Up ' + Store.fmtDistance(thisWeek.miles - lastWeek.miles) + ' on last week.'
            : Store.fmtDistance(lastWeek.miles - thisWeek.miles) + ' behind last week.')
        : thisWeek.days
          ? Store.fmtDistance(thisWeek.miles) + ' this week, across ' + thisWeek.days + ' day' + (thisWeek.days === 1 ? '' : 's') + '.'
          : Store.fmtDistance(totalMiles) + ' walked so far.';

    var maxMiles = Math.max.apply(null, weeks.map(function (w) { return w.miles; }).concat([1]));

    return UI.screen({
      tab: null, rest: 300, photoHeight: '340px', blur: true,
      header: { back: 'records', title: 'Walking', right: '<div style="width:34px"></div>' },
      art: 'assets/art/camp-day.webp', photoPosition: 'center 44%',
      overlay: '<div class="eyebrow">Last eight weeks</div>' +
        '<p class="verse" style="font-size:25px">' + esc(headline) + '</p>',
      body: !live.length
        ? '<article class="card pad">' +
            '<p class="lede" style="margin:0 0 14px">Log your steps and the weeks fill in. They also carry the expedition forward.</p>' +
            '<button class="btn block" data-action="log-steps">Log today\u2019s steps</button>' +
          '</article>'
        : '<article class="card">' +
            '<div class="ledger">' +
              '<div class="cell"><div class="kicker">Total</div><div class="num">' + Store.fmtDistance(totalMiles, 0) + '</div>' +
                '<div class="foot">walking distance</div></div>' +
              '<div class="cell"><div class="kicker">This week</div><div class="num">' + Store.fmtDistance(thisWeek.miles) + '</div>' +
                '<div class="foot">walking distance</div></div>' +
              '<div class="cell"><div class="kicker">Best week</div><div class="num sage">' +
                (best ? Store.fmtDistance(best.miles) : '\u2014') + '</div><div class="foot">walking distance</div></div>' +
            '</div>' +
          '</article>' +

          '<article class="card pad">' +
            '<div class="kicker" style="margin-bottom:13px">Distance a week</div>' +
            '<div class="weekbars">' + weeks.map(function (w) {
              var pct = Math.round((w.miles / maxMiles) * 100);
              return '<div class="weekbar">' +
                '<div class="weekbar-track"><span style="height:' + pct + '%"></span></div>' +
                '<div class="weekbar-label">' + dateLabel(w.start).split(' ')[0] + '</div>' +
              '</div>';
            }).join('') + '</div>' +
            '<p class="small" style="margin:13px 0 0">' +
              (best ? 'Best week was ' + Store.fmtDistance(best.miles) + ', beginning ' + dateLabel(best.start) + '.' : '') +
            '</p>' +
          '</article>' +

          '<div class="rulehead"><span class="kicker">Week by week</span><span></span></div>' +
          '<article class="card">' +
            weeks.slice().reverse().map(function (w) {
              return '<div class="row nothumb static">' +
                '<span style="min-width:0;text-align:left">' +
                  '<span class="rowname">' + dateLabel(w.start) + '</span>' +
                  '<span class="note">' + (w.days ? w.days + ' day' + (w.days === 1 ? '' : 's') + ' logged' : 'nothing logged') + '</span>' +
                '</span>' +
                '<span class="rowright"><span class="num" style="font-size:18px">' +
                  (w.days ? Store.fmtDistance(w.miles).replace(/ .*$/, '') : '\u2014') + '</span><span class="foot">' + Store.state().units.distance + '</span></span>' +
              '</div>';
            }).join('') +
          '</article>'
    });
  }


  /* Whole-route completion is separate from the final checkpoint. The
     checkpoint says "you reached this place"; this says "you finished the
     expedition." That is why the art library has two different final images. */
  function expeditionComplete() {
    var parts = (location.hash || '#expedition-complete').replace(/^#/, '').split('/');
    var routeId = parts[1] || Store.state().expedition.routeId;
    var r = Journeys.get(routeId);
    if (!r) { location.hash = '#journey'; return ''; }
    var S = Store.state(), currentComplete = S.expedition.routeId === routeId && S.expedition.legIndex >= r.legs.length;
    var walked = (S.expedition.walked || []).indexOf(routeId) >= 0;
    if (!currentComplete && !walked) {
      return UI.screen({
        tab:null,rest:300,restMeasure:true,
        header:{back:'journey',title:'Expedition',right:'<div style="width:34px"></div>'},
        art:Journeys.sectionArt ? Journeys.sectionArt(routeId,'journey') : (r.banner || routeHero(routeId)),
        artFallback:r.banner || routeHero(routeId) || 'assets/art/expedition-overlook.webp',
        overlay:'<div class="eyebrow">Still on the road</div><p class="verse" style="font-size:27px">' + esc(r.name) + '</p>',
        body:'<article class="card pad"><p class="small" style="margin:0">The full completion ceremony unlocks only after the final leg is reached.</p></article>' +
          '<button class="btn ghost block" data-route="journey">Back to Journey</button>'
      });
    }

    var cps = Journeys.checkpoints ? Journeys.checkpoints(routeId) : [];
    var lastCp = cps[cps.length - 1] || null;
    var fallback = r.banner || checkpointFallback(routeId,lastCp) || routeHero(routeId) || 'assets/art/expedition-overlook.webp';
    var records = cps.map(function(cp){ return { cp:cp, rec:Store.checkpointArrival ? Store.checkpointArrival(routeId,cp.index) : null }; });
    var known = records.filter(function(x){ return x.cp.primary && x.rec && x.rec.legIndex >= 0 && !x.rec.migrated; });
    var mine = known.reduce(function(sum,x){return sum + (+x.rec.milesMine||0);},0);
    var hers = known.reduce(function(sum,x){return sum + (+x.rec.milesHers||0);},0);
    var latest = records.map(function(x){return x.rec;}).filter(function(x){return x&&x.at;})
      .sort(function(a,b){return String(a.at).localeCompare(String(b.at));}).pop();
    var completed = checkpointDate(latest);
    var routeTotal = routeMiles(r);

    var placeRows = cps.map(function(cp){
      return '<button class="passport-stop" data-route="checkpoint/' + esc(routeId) + '/' + cp.index + '">' +
        '<span class="journey-marker">' + icon('check') + '</span>' +
        '<span><strong>' + esc(cp.name) + '</strong><small>' +
          (cp.unlockAfterLeg < 0 ? 'Starting point' : Store.fmtDistance(Journeys.cumulativeMilesToCheckpoint(routeId,cp.index)) + ' from start') +
        '</small></span>' + icon('chev') + '</button>';
    }).join('');

    return UI.screen({
      tab:null,rest:430,restMeasure:true,photoHeight:'590px',
      header:{back:'journey',title:'Expedition complete',right:'<div style="width:34px"></div>'},
      art:Journeys.sectionArt ? Journeys.sectionArt(routeId,'arrival') : fallback,
      artFallback:fallback,scrim:UI.SCRIMS.light,photoPosition:'center 44%',
      overlay:
        '<div class="eyebrow">Expedition complete</div>' +
        '<p class="verse" style="font-size:30px">' + esc(r.name) + '</p>' +
        '<p class="attrib" style="text-transform:none;letter-spacing:0">' + esc(r.where) +
          (completed ? ' · completed ' + esc(completed) : '') + '</p>',
      body:
        '<article class="card pad accent">' +
          '<div class="kicker gold" style="margin-bottom:10px">The road you finished</div>' +
          '<div class="checkpoint-facts">' +
            '<div><span class="note">Distance</span><strong>' + Store.fmtDistance(routeTotal) + '</strong></div>' +
            '<div><span class="note">Legs</span><strong>' + r.legs.length + '</strong></div>' +
            '<div><span class="note">Places reached</span><strong>' + cps.length + '</strong></div>' +
          '</div>' +
        '</article>' +
        (known.length
          ? '<article class="card pad"><div class="kicker" style="margin-bottom:10px">Recorded contribution</div>' +
              '<div class="journey-contrib" style="margin-top:0;padding-top:0;border-top:0">' +
                '<div><span class="kicker faint">You</span><strong>' + Store.fmtDistance(mine) + '</strong></div>' +
                '<div><span class="kicker faint">' + esc(Store.partnerName()) + '</span><strong>' + Store.fmtDistance(hers) + '</strong></div>' +
              '</div><p class="small" style="margin:11px 0 0">These are the leg contributions recorded by checkpoint history; older migrated legs are never guessed.</p></article>'
          : '') +
        '<div class="rulehead"><span class="kicker sage">Places on this road</span><span></span></div>' +
        '<article class="card checkpoint-passport">' + placeRows + '</article>' +
        '<button class="btn block" data-route="handshake">' + esc(handshakeCta()) + '</button>' +
        '<button class="btn ghost block" data-route="journey">Back to Journey</button>'
    });
  }

  /* Arrival. The one screen that only appears the moment a leg is finished,
     and it names what each of you put into it rather than a shared total. */
  function arrival() {
    var S = Store.state(), a = S.lastArrival;
    if (!a) { location.hash = '#journey'; return ''; }
    var r = Journeys.get(a.routeId) || route();
    if (!r) { location.hash = '#journey'; return ''; }
    var done = r.legs[a.legIndex];
    var next = r.legs[a.legIndex + 1];
    var cp = Journeys.checkpoint ? Journeys.checkpoint(a.routeId, a.checkpointIndex) : null;
    if (!cp && Journeys.primaryCheckpointForLeg) cp = Journeys.primaryCheckpointForLeg(a.routeId, a.legIndex);
    var total = (a.milesMine || 0) + (a.milesHers || 0);
    var mine = Math.round(((a.milesMine || 0) / (total || 1)) * 100);
    var fallback = (done && done.art) || r.banner || routeHero(a.routeId) || UI.CAMP[Store.timeOfDay()];
    var cumulative = cp && Journeys.cumulativeMilesToCheckpoint
      ? Journeys.cumulativeMilesToCheckpoint(a.routeId, cp.index) : 0;

    return UI.screen({
      tab: null, rest: 420, photoHeight: '500px',
      header: { back: 'journey', title: 'Arrived', right: '<div style="width:34px"></div>' },
      art: cp ? cp.art : fallback, artFallback: fallback, scrim: UI.SCRIMS.light,
      photoPosition: 'center 46%',
      overlay: '<div class="eyebrow">Leg ' + (a.legIndex + 1) + ' complete</div>' +
        '<p class="verse" style="font-size:28px">You reached ' + esc(cp ? cp.name : (done ? done.to : 'the next checkpoint')) + '.</p>' +
        '<p class="attrib" style="text-transform:none;letter-spacing:0">Checkpoint unlocked · saved to the route</p>',
      body:
        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Who walked it</div>' +
            '<div class="meta">' + Store.fmtDistance(total) + '</div></div>' +
          '<div class="pad-x" style="padding-top:15px;padding-bottom:15px">' +
            '<div class="splitbar"><span class="mine" style="width:' + mine + '%"></span></div>' +
            '<div class="legendrow" style="justify-content:space-between">' +
              '<span><i class="dot gold"></i>You &middot; ' + Store.fmtDistance(a.milesMine || 0) + '</span>' +
              '<span><i class="dot sage"></i>' + esc(Store.partnerName()) + ' &middot; ' + Store.fmtDistance(a.milesHers || 0) + '</span>' +
            '</div>' +
          '</div>' +
        '</article>' +
        '<article class="card pad">' +
          '<div class="kicker sage" style="margin-bottom:9px">Leg complete</div>' +
          '<h3 style="font-family:var(--serif);font-size:21px;font-weight:500;margin:0 0 7px">' +
            esc(done ? done.from : '') + ' &rarr; ' + esc(done ? done.to : (cp ? cp.name : 'Checkpoint')) + '</h3>' +
          '<p class="small" style="margin:0">' + Store.fmtDistance(done ? done.miles : total) +
            (done && done.ft ? ' &middot; ' + Store.fmtClimb(done.ft) + ' of climbing' : '') +
            (cumulative ? ' &middot; ' + Store.fmtDistance(cumulative) + ' from the start' : '') + '</p>' +
        '</article>' +
        (cp
          ? '<button class="btn block" data-route="checkpoint/' + esc(a.routeId) + '/' + cp.index + '">Explore ' + esc(cp.name) + '</button>'
          : '') +
        (next
          ? '<article class="card pad">' +
              '<div class="kicker sage" style="margin-bottom:8px">Next</div>' +
              '<h3 style="font-family:var(--serif);font-size:22px;font-weight:500;margin:0 0 6px">' +
                esc(next.from) + ' &rarr; ' + esc(next.to) + '</h3>' +
              '<p class="small" style="margin:0">' + Store.fmtDistance(next.miles) +
                (next.ft ? ' &middot; ' + Store.fmtClimb(next.ft) + ' of climbing' : '') + '</p>' +
            '</article>'
          : '<article class="card pad accent">' +
              '<div class="kicker gold" style="margin-bottom:8px">Route complete</div>' +
              '<p class="lede" style="margin:0 0 14px">That was the final leg. The last checkpoint remains in Journey, and the whole expedition is ready to close.</p>' +
              '<button class="btn block" data-route="expedition-complete/' + esc(a.routeId) + '">Complete the expedition</button>' +
            '</article>') +
        '<button class="btn ghost block" data-route="journey">Back to the trail</button>'
    });
  }

  /* Lining up. A browser cannot draw guides over the phone's own camera, so
     the last photograph and the thirds sit here instead — looked at just
     before shooting, which is when they are useful. */
  function capture() {
    var list = (Store.state().photos || []);
    var last = list[list.length - 1];

    return UI.screen({
      tab: null, rest: 240, photoHeight: '300px', blur: true,
      header: { back: list.length ? 'photos' : 'body', title: 'New photograph', right: '<div style="width:34px"></div>' },
      art: 'assets/art/camp-day.webp', photoPosition: 'center 40%',
      overlay: '<div class="eyebrow">' + dateLabel(Store.todayKey()) + '</div>' +
        '<p class="verse" style="font-size:25px">' +
        (last ? 'Line up with the last one.' : 'This is the one everything else is measured against.') + '</p>',
      body:
        (last
          ? '<article class="card pad">' +
              '<div class="kicker" style="margin-bottom:11px">Last photograph &middot; ' + dateLabel(last.date) + '</div>' +
              '<div class="ghostwrap">' +
                '<div class="photoframe tall ghost" data-photo="' + esc(last.id) + '"></div>' +
                '<span class="third v" style="left:33.33%"></span>' +
                '<span class="third v" style="left:66.66%"></span>' +
                '<span class="third h" style="top:33.33%"></span>' +
                '<span class="third h" style="top:66.66%"></span>' +
              '</div>' +
            '</article>'
          : '') +

        '<article class="card pad">' +
          '<div class="kicker" style="margin-bottom:11px">Before you shoot</div>' +
          '<ul class="plainlist">' +
            '<li>Same spot, same light, same time of day.</li>' +
            '<li>Phone at chest height, arms relaxed at your sides.</li>' +
            '<li>Morning, before eating, is the most comparable.</li>' +
          '</ul>' +
          '<p class="small" style="margin:13px 0 0">Conditions matter more than the camera. Two photographs taken in different light will show a change that is not there.</p>' +
        '</article>' +

        '<button class="btn block" data-action="take-photo">Open the camera</button>' +

        '<article class="card pad">' +
          '<div class="kicker" style="margin-bottom:11px">Where it goes</div>' +
          '<p class="small" style="margin:0">Onto this device and nowhere else. Progress photographs are never synced and never shared &mdash; there is no switch for it.</p>' +
        '</article>'
    });
  }

  /* ---- Records: per-machine progression -------------------------------- */

  /* Most recent set logged on a named machine, for the "last 145 lb" hint. */
  function lastLift(name) {
    var days = Store.state().days, keys = Object.keys(days).sort().reverse();
    for (var i = 0; i < keys.length; i++) {
      var ws = days[keys[i]].workouts || [];
      for (var j = ws.length - 1; j >= 0; j--) {
        var ex = ws[j].exercises || [];
        for (var k = ex.length - 1; k >= 0; k--) {
          if (ex[k].name === name && ex[k].weight > 0) return ex[k];
        }
      }
    }
    return null;
  }




  /* A plain date, for labels that name a specific day rather than today. */
  function dateLabel(key) {
    var d = new Date(key + 'T12:00:00');
    var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return d.getDate() + ' ' + M[d.getMonth()];
  }

  /* ---- One day of training ---------------------------------------------- */
  /* Tapping a day in the week strip. Past days show what was lifted; today
     and the days ahead show what is scheduled. */
  function trainDay() {
    var key = location.hash.split('/')[1] || Store.todayKey();
    var S = Store.state();
    var rec = S.days[key] || { workouts: [], steps: 0 };
    var dt = new Date(key + 'T12:00:00');
    var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var dayName = DOW[dt.getDay()];
    var isToday = key === Store.todayKey();
    var isPast = key < Store.todayKey();
    var isFuture = key > Store.todayKey();

    var scheduled = Store.planFor ? Store.planFor(key) : null;

    var workouts = rec.workouts || [];
    var headline = workouts.length
      ? workouts[0].name + ' day. Done.'
      : scheduled
        ? (scheduled.name === 'Walk' ? 'Walking day.' : scheduled.name + ' day.')
        : 'Rest day.';

    var body = readinessCard(key) + dailyWalkCard(key, false);

    if (workouts.length) {
      body += workouts.map(function (w) {
        return '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>' + esc(w.name) + '</div>' +
            '<div class="meta">' + w.minutes + ' min</div></div>' +
          ((w.exercises || []).length
            ? w.exercises.map(function (x) {
                return '<div class="setrow pad-x" style="padding-top:12px;padding-bottom:12px">' +
                  '<span style="flex:1;min-width:0">' + esc(x.name) + '</span>' +
                  '<span class="setval">' + (x.weight ? Store.fmtLift(x.weight) + ' \u00d7 ' + x.reps : '\u2014') + '</span>' +
                  '<span class="note">' + (x.sets || 0) + ' set' + ((x.sets || 0) === 1 ? '' : 's') + '</span>' +
                '</div>';
              }).join('')
            : '<p class="small pad-x" style="padding-bottom:15px">Time logged, no machines recorded.</p>') +
          (((w.exercises || []).length) ? '<div style="height:10px"></div>' : '') +
        '</article>';
      }).join('');
    } else if (scheduled && scheduled.name === 'Walk') {
      body += '<article class="card pad">' +
        '<div class="kicker sage" style="margin-bottom:11px">Walking day</div>' +
        '<p class="lede">' + esc(scheduled.detail || 'Get the distance in.') + '</p>' +
      '</article>';
    } else if (scheduled) {
      var mv = scheduled.ex && scheduled.ex.length ? Exercises.expand(scheduled.ex) : [];
      body += '<article class="card">' +
        '<div class="cardhead"><div class="title"><i></i>' + esc(scheduled.name) + ' day</div>' +
          '<div class="meta">' + mv.length + ' movement' + (mv.length === 1 ? '' : 's') + '</div></div>' +
        mv.map(function (m, idx) {
          var last = lastLift(m.name);
          var prog = window.Insights ? Insights.progressionFor(m.id || m.name) : null;
          return '<button class="exrow" data-route="exercise/' + m.id + '">' +
            (m.gif ? '<img class="exgif" src="' + UI.asset(m.gif) + '" alt="" loading="lazy" />'
                   : '<span class="exnum">' + (idx + 1) + '</span>') +
            '<span style="min-width:0;text-align:left">' +
              '<span class="exname">' + esc(m.name) + '</span>' +
              '<span class="note">' + m.sets + ' \u00d7 ' + esc(String(m.reps)) +
                (last ? ' \u00b7 last ' + Store.fmtLift(last.weight) : '') + '</span>' +
              (prog ? '<span class="small" style="display:block;color:var(--sage);margin-top:4px">Next: ' + esc(prog.label) + '</span>' : '') +
            '</span>' +
            '<span class="exsets">' + esc(m.equipment || '') + '</span>' +
          '</button>';
        }).join('') +
        '<div style="height:10px"></div>' +
      '</article>';
    } else {
      body += '<article class="card pad">' +
        '<div class="kicker sage" style="margin-bottom:11px">Rest day</div>' +
        '<p class="lede">' + (isPast ? 'Nothing was scheduled.' : 'Nothing scheduled.') + '</p>' +
        '<p class="small" style="margin:10px 0 0">Muscle rebuilds for two to three days after a session. Rest is the half of training that does not look like training.</p>' +
      '</article>';
    }

    body += '<article class="card pad">' +
      '<div class="home-rhythm-head"><span class="kicker">Steps</span>' +
        (!isFuture ? '<button class="btn ghost sm" data-action="log-steps" data-date="' + esc(key) + '">' + (rec.steps ? 'Edit steps' : 'Add steps') + '</button>' : '') +
      '</div>' +
      '<p class="lede" style="margin-top:11px">' + (rec.steps ? rec.steps.toLocaleString() + ' walked.' : 'None recorded.') + '</p>' +
      (!isFuture ? '<p class="small" style="margin:8px 0 0">You can correct this day later if your phone or watch syncs after the fact.</p>' : '') +
    '</article>';

    if (isToday && !workouts.length && scheduled && scheduled.name !== 'Walk') {
      body += '<button class="btn block" data-action="begin" data-session-mode="' + (window.Training && Training.isDeloadWeek(key) ? 'lighter' : 'planned') + '">Start the planned session</button>';
    }
    if (!isFuture) {
      body += '<button class="btn ghost block" data-action="start-session" data-date="' + esc(key) + '">Add another workout</button>';
    }

    var dayTrainHero = expeditionSurface('train', 'assets/art/train-banner.webp');
    return UI.screen({
      tab: null, rest: 300, blur: true, screenClass:'train-screen',
      header: { back: 'train', title: FULL[dt.getDay()], right: '<div style="width:34px"></div>' },
      art: dayTrainHero.art, artFallback: dayTrainHero.fallback, scrim: UI.SCRIMS.train, photoPosition: 'center 40%',
      overlay: '<div class="eyebrow">' + dateLabel(key) + (isToday ? ' \u00b7 today' : '') + '</div>' +
        '<p class="verse" style="font-size:25px">' + esc(headline) + '</p>',
      body: body
    });
  }

  function walkClockText(ms) {
    var total = Math.max(0, Math.floor((ms || 0) / 1000));
    var h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), sec = total % 60;
    return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }
  function walkSummaryText(w) {
    if (!w || !w.seconds) return '';
    var mins = Math.floor(w.seconds / 60), secs = w.seconds % 60;
    var out = (mins ? mins + ' min' : '') + (secs ? (mins ? ' ' : '') + secs + ' sec' : '');
    if (w.distanceMiles) out += ' · ' + Store.fmtDistance(w.distanceMiles, 2);
    else if (w.speedMph) out += ' · ' + w.speedMph + ' mph';
    if (w.inclinePct) out += ' · ' + w.inclinePct + '% incline';
    if (w.pace) out += ' · ' + esc(w.pace);
    if (w.elevation) out += ' · ' + esc(w.elevation);
    return out || 'Walk logged';
  }


  function dailyWalkSummaryText(w, ms) {
    w = w || {};
    var total = Math.max(0, Math.round((ms != null ? ms : (w.elapsedMs || 0)) / 1000));
    var mins = Math.floor(total / 60), secs = total % 60;
    var out = (mins ? mins + ' min' : '') + (secs ? (mins ? ' ' : '') + secs + ' sec' : '');
    if (w.distanceMiles) out += ' · ' + Store.fmtDistance(w.distanceMiles, 2);
    else if (w.speedMph) out += ' · ' + w.speedMph + ' mph';
    if (w.inclinePct) out += ' · ' + w.inclinePct + '% incline';
    if (w.pace) out += ' · ' + esc(w.pace);
    if (w.elevation) out += ' · ' + esc(w.elevation);
    return out || 'No walk recorded';
  }

  function structuredWalkFields(w) {
    w = w || {};
    var distance = w.distanceMiles ? Store.distanceNum(w.distanceMiles, 2) : '';
    return '<div class="walk-metrics-grid">' +
      '<label class="field compact"><span class="field-label">Treadmill speed <em>mph</em></span><input class="field-input" data-walk-speed inputmode="decimal" value="' + esc(w.speedMph || '') + '" placeholder="3.5" /></label>' +
      '<label class="field compact"><span class="field-label">Incline <em>%</em></span><input class="field-input" data-walk-incline inputmode="decimal" value="' + esc(w.inclinePct || '') + '" placeholder="5" /></label>' +
      '<label class="field compact"><span class="field-label">Distance <em>' + esc(Store.state().units.distance) + '</em></span><input class="field-input" data-walk-distance inputmode="decimal" value="' + esc(distance) + '" placeholder="optional" /></label>' +
      '<label class="field compact"><span class="field-label">Elevation gained <em>ft</em></span><input class="field-input" data-walk-elevation-ft inputmode="decimal" value="' + esc(w.elevationFt || '') + '" placeholder="optional" /></label>' +
    '</div>' +
    '<details class="walk-notes"><summary>Notes / pace details</summary><div class="walk-metrics-grid">' +
      '<label class="field compact"><span class="field-label">Pace note</span><input class="field-input" data-walk-pace value="' + esc(w.pace || '') + '" placeholder="16:00 /mi" /></label>' +
      '<label class="field compact"><span class="field-label">Terrain / elevation note</span><input class="field-input" data-walk-elevation value="' + esc(w.elevation || '') + '" placeholder="hills, trail, treadmill" /></label>' +
    '</div></details>';
  }

  /* One walk clock for the whole day. It deliberately appears on lift days,
     completed days and recovery days. Only today's card can run live; past
     days stay editable as a manual correction instead of starting a timer in
     the wrong calendar day. */
  function dailyWalkCard(key, compact) {
    var mode = compact || '';
    compact = !!compact;
    var cardClass = 'card walk-card' + (compact ? ' compact' : '');
    key = key || Store.todayKey();
    var w = Store.dailyWalk ? Store.dailyWalk(key) : { startedAt: 0, elapsedMs: 0, pace: '', elevation: '' };
    var ms = Store.dailyWalkElapsedMs ? Store.dailyWalkElapsedMs(key) : (w.elapsedMs || 0);
    var running = !!w.startedAt;
    var hasWalk = ms > 0 || !!w.stoppedAt || !!w.pace || !!w.elevation || !!w.speedMph || !!w.distanceMiles || !!w.elevationFt;
    var today = Store.todayKey();
    var isToday = key === today;
    var activeSession = Store.session ? Store.session() : null;
    var liveAllowed = isToday || !!(activeSession && activeSession.date === key && key === Store.shift(today, -1));
    var state = running ? 'LIVE' : (hasWalk ? 'STOPPED' : 'READY');
    var title = mode === 'session' ? 'Workout walk' : 'Walk timer';

    if (key > today) {
      return '<article class="' + cardClass + '" data-walk-card data-walk-date="' + esc(key) + '">' +
        '<div class="cardhead"><div class="title"><i></i>Walk</div><div class="meta walk-state">UPCOMING</div></div>' +
        '<div class="walk-body"><div class="walk-clock">00:00</div>' +
        '<p class="small walk-copy">The walk timer will be ready when this day arrives.</p></div></article>';
    }

    if (!liveAllowed) {
      var mins = ms ? Math.round((ms / 60000) * 10) / 10 : '';
      return '<article class="' + cardClass + '" data-walk-card data-walk-date="' + esc(key) + '">' +
        '<div class="cardhead"><div class="title"><i></i>Walk</div><div class="meta walk-state ' + (hasWalk ? 'done' : '') + '">' + (hasWalk ? 'LOGGED' : 'PAST DAY') + '</div></div>' +
        '<div class="walk-body">' +
          '<div class="walk-clock">' + walkClockText(ms) + '</div>' +
          '<p class="small walk-copy">Past days cannot run a live timer. Add or correct the walk here if you need to fix the record.</p>' +
          '<div class="walk-details historical">' +
            '<label class="field compact"><span class="field-label">Duration <em>minutes</em></span>' +
              '<input class="field-input" data-walk-minutes inputmode="decimal" value="' + esc(String(mins)) + '" placeholder="30" /></label>' +
            structuredWalkFields(w) +
            '<div class="btnrow">' +
              '<button class="btn ghost sm" data-action="walk-manual-save" data-walk-date="' + esc(key) + '">Save correction</button>' +
              (hasWalk ? '<button class="btn ghost sm danger" data-action="walk-reset" data-walk-date="' + esc(key) + '">Clear walk</button>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</article>';
    }

    return '<article class="' + cardClass + '" data-walk-card data-walk-date="' + esc(key) + '">' +
      '<div class="cardhead"><div class="title"><i></i>' + title + '</div>' +
        '<div class="meta walk-state ' + (running ? 'live' : (hasWalk ? 'done' : '')) + '">' + state + '</div></div>' +
      '<div class="walk-body">' +
        '<div class="walk-clock" data-walk-clock data-walk-date="' + esc(key) + '">' + walkClockText(ms) + '</div>' +
        '<p class="small walk-copy">' +
          (running
            ? (compact ? 'Keeps counting until you stop — even if the phone locks.' : 'Keep moving. The clock is tied to the saved start time, so locking the phone or moving around InSync will not reset it.')
            : hasWalk
              ? (compact ? 'Stopped. Add pace and elevation below, or resume.' : 'Walk stopped. Add the pace and incline/elevation if you want the complete record, or resume if you are not finished.')
              : (compact ? 'Available every day. Start it when you begin.' : 'This is available every day — lift, walk or recovery. Start it when you begin and it keeps counting until you stop it.')) +
        '</p>' +
        (running
          ? '<button class="btn block walk-stop" data-action="walk-stop" data-walk-date="' + esc(key) + '">Stop walk</button>'
          : '<button class="btn block" data-action="walk-start" data-walk-date="' + esc(key) + '">' + (hasWalk ? 'Resume walk' : 'Start walk') + '</button>') +
        (hasWalk && !running
          ? '<div class="walk-details">' +
              structuredWalkFields(w) +
              '<div class="btnrow">' +
                '<button class="btn ghost sm" data-action="walk-save" data-walk-date="' + esc(key) + '">Save walk details</button>' +
                '<button class="btn ghost sm danger" data-action="walk-reset" data-walk-date="' + esc(key) + '">Reset walk</button>' +
              '</div>' +
            '</div>'
          : '') +
      '</div>' +
    '</article>';
  }

  /* ---- The session, as a list the user ticks off ------------------------- */
  /* The brief: "The workout is a list the user ticks off, tapping into an exercise
     to log each set" and "one tap to repeat the last set". State lives in the
     store, so locking the phone between sets loses nothing. */
  function session() {
    var sn = Store.session();
    if (!sn) { location.hash = '#train'; return ''; }

    var S = Store.state();
    var doneCount = sn.items.filter(function (i) { return i.sets.length >= i.targetSets; }).length;
    var loggedAny = sn.items.some(function (i) { return i.sets.length; });
    var elapsed = Math.max(1, Math.round((Date.now() - sn.startedAt) / 60000));
    var open = location.hash.split('/')[1];
    var walkCard = dailyWalkCard(sn.date || Store.todayKey(), 'session');
    var restTimer = (sn.restTimer && sn.restTimer.endsAt) ? '<article class="card rest-timer" data-rest-timer><div class="cardhead"><div class="title"><i></i>Rest</div><div class="meta">' + (sn.mode === 'lighter' ? 'lighter session' : 'between sets') + '</div></div><div class="rest-timer-body"><strong data-rest-clock>' + walkClockText(Store.restRemainingMs ? Store.restRemainingMs() : 0) + '</strong><div class="btnrow"><button class="btn ghost sm" data-action="rest-add">+30 sec</button><button class="btn ghost sm" data-action="rest-skip">Skip</button></div></div></article>' : '';

    var body = sn.items.map(function (it, idx) {
      var complete = it.sets.length >= it.targetSets;
      var isOpen = String(idx) === open;
      var last = lastLift(it.name);
      var prog = window.Insights ? Insights.progressionFor(it.id || it.name) : null;
      var prev = it.sets.length ? it.sets[it.sets.length - 1] : (last ? { weight: last.weight, reps: last.reps } : null);

      return '<article class="card' + (complete ? ' met' : '') + '">' +
        '<button class="exrow" data-route="session/' + (isOpen ? '' : idx) + '">' +
          (it.gif
            ? '<img class="exgif" src="' + UI.asset(it.gif) + '" alt="" loading="lazy" />'
            : '<span class="exnum">' + (idx + 1) + '</span>') +
          '<span style="min-width:0;text-align:left">' +
            '<span class="exname">' + esc(it.name) + (it.warmup ? ' <em class="note">warm-up</em>' : '') + '</span>' +
            '<span class="note">' + it.sets.length + ' of ' + it.targetSets + ' sets' +
              (prev ? ' \u00b7 ' + Store.fmtLift(prev.weight) + ' \u00d7 ' + prev.reps : '') + '</span>' +
          '</span>' +
          '<span class="exsets">' + (complete ? UI.icon('check') : (isOpen ? '\u2212' : '+')) + '</span>' +
        '</button>' +

        (isOpen
          ? '<div class="setbox">' +
              (it.sets.length
                ? '<div class="setlist">' + it.sets.map(function (st, si) {
                    return '<div class="setrow">' +
                      '<span class="setno">' + (si + 1) + '</span>' +
                      '<span class="setval">' + Store.fmtLift(st.weight) + '</span>' +
                      '<span class="setval">' + st.reps + ' reps</span>' +
                      '<span class="set-effort">' + (st.rir != null ? ('RIR ' + st.rir) : (st.effort ? esc(st.effort.charAt(0).toUpperCase() + st.effort.slice(1)) : '')) + '</span>' +
                      '<button class="linkbtn danger" data-action="drop-set" data-i="' + idx + '" data-s="' + si + '">Remove</button>' +
                    '</div>';
                  }).join('') + '</div>'
                : '<p class="small" style="margin:0 0 12px">Nothing logged on this yet.' +
                    (last ? ' Last time: ' + Store.fmtLift(last.weight) + ' \u00d7 ' + last.reps + '.' : '') + '</p>') +

              (prog ? '<div class="progression-box"><div class="kicker sage">Progression</div><p class="small" style="margin:6px 0 0">' + esc(prog.detail) + '</p>' + ((prog.evidence||[]).length ? '<details><summary>Why this?</summary><p class="small">' + prog.evidence.map(esc).join(' · ') + '</p></details>' : '') + '</div>' : '') +
              (!it.sets.length && !it.warmup ? '<button class="btn ghost block" style="margin-bottom:12px" data-route="swap-exercise/' + idx + '">Swap exercise</button>' : '') +
              '<div class="setentry">' +
                '<label class="field compact"><span class="field-label">Weight <em>' + Store.state().units.weight + '</em></span>' +
                  '<input class="field-input" data-set="w" data-i="' + idx + '" inputmode="decimal" value="' + (prev ? Store.liftNum(prev.weight) : '') + '" /></label>' +
                '<label class="field compact"><span class="field-label">Reps</span>' +
                  '<input class="field-input" data-set="r" data-i="' + idx + '" inputmode="numeric" value="' + (prev ? prev.reps : (String(it.targetReps).match(/\d+/) || [''])[0]) + '" /></label>' +
                ((S.trainingProfile||{}).advancedRIR
                  ? '<label class="field compact"><span class="field-label">Reps in reserve</span><select class="field-input" data-set="rir" data-i="' + idx + '">' + [0,1,2,3,4,5].map(function(v){return '<option value="' + v + '"' + (prev && prev.rir === v ? ' selected' : (v===2 && (!prev || prev.rir==null) ? ' selected' : '')) + '>' + v + '</option>';}).join('') + '</select></label>'
                  : '<label class="field compact"><span class="field-label">Effort</span><select class="field-input" data-set="effort" data-i="' + idx + '"><option value="easy"' + (prev && prev.effort==='easy'?' selected':'') + '>Easy</option><option value="right"' + (!prev || !prev.effort || prev.effort==='right'?' selected':'') + '>Right</option><option value="hard"' + (prev && prev.effort==='hard'?' selected':'') + '>Hard</option></select></label>') +
              '</div>' +
              '<div class="btnrow" style="margin-top:11px">' +
                '<button class="btn sm" data-action="add-set" data-i="' + idx + '">Log the set</button>' +
                (prev ? '<button class="btn ghost sm" data-action="repeat-set" data-i="' + idx + '">Same again</button>' : '') +
                '<button class="btn ghost sm danger" data-action="drop-item" data-i="' + idx + '">Skip it</button>' +
              '</div>' +
            '</div>'
          : '') +
      '</article>';
    }).join('');

    return UI.screen({
      header: { back: 'train', title: sn.name + ' day' },
      art: 'assets/art/train-banner.webp', photoHeight: '300px', photoPosition: 'center 40%',
      rest: 240,
      overlay: '<div class="eyebrow">In progress \u00b7 ' + elapsed + ' min' + (sn.mode === 'lighter' ? ' \u00b7 lighter volume' : '') + '</div>' +
        '<p class="verse" style="font-size:25px">' + doneCount + ' of ' + sn.items.length + ' finished.</p>',
      body: walkCard + restTimer + body +
        '<article class="card pad">' +
          '<label class="field" style="margin:0"><span class="field-label">Machine taken? Add another</span>' +
            '<select class="field-input" data-sessionadd>' +
              '<option value="">Choose one\u2026</option>' +
              Exercises.byGroup().map(function (g) {
                return '<optgroup label="' + esc(g.name) + '">' +
                  g.items.map(function (x) {
                    return '<option value="' + esc(x.id) + '">' + esc(x.name) + '</option>';
                  }).join('') + '</optgroup>';
              }).join('') +
            '</select></label>' +
        '</article>' +
        (loggedAny
          ? '<button class="btn block" data-action="finish-session">Finish the session</button>'
          : '<p class="small" style="text-align:center;margin:4px 0 0">Log a set before finishing.</p>') +
        '<button class="btn ghost block danger" data-action="abandon-session">Abandon it</button>'
    });
  }

  /* ---- What the session did --------------------------------------------- */
  function sessionDone() {
    var r = Store.state().lastFinish;
    if (!r) { location.hash = '#train'; return ''; }
    var S = Store.state(), e = S.expedition;

    return UI.screen({
      header: { back: 'train', title: 'Session complete' },
      art: 'assets/art/train-banner.webp', photoHeight: '330px', photoPosition: 'center 40%',
      rest: 270,
      overlay: '<div class="eyebrow">' + esc(r.name) + ' day</div>' +
        '<p class="verse" style="font-size:27px">' + r.minutes + (r.minutes === 1 ? ' minute. ' : ' minutes. ') + Store.fmtLift(r.volume) + ' moved.</p>',
      body:
        (r.walk && r.walk.seconds
          ? '<article class="card walk-card done-summary">' +
              '<div class="cardhead"><div class="title"><i></i>Workout walk</div><div class="meta">' + walkClockText(r.walk.seconds * 1000) + '</div></div>' +
              '<div class="walk-facts">' +
                '<div><span>Pace / speed</span><strong>' + esc(r.walk.pace || 'Not entered') + '</strong></div>' +
                '<div><span>Elevation / incline</span><strong>' + esc(r.walk.elevation || 'Not entered') + '</strong></div>' +
              '</div>' +
            '</article>'
          : '') +
        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>What you lifted</div>' +
            '<div class="meta">' + r.exercises.length + ' movement' + (r.exercises.length === 1 ? '' : 's') + '</div></div>' +
          r.exercises.map(function (x) {
            return '<div class="setrow pad-x" style="padding-top:12px;padding-bottom:12px">' +
              '<span style="flex:1;min-width:0">' + esc(x.name) + '</span>' +
              '<span class="setval">' + Store.fmtLift(x.weight) + ' \u00d7 ' + x.reps + '</span>' +
              '<span class="note">' + x.sets + ' set' + (x.sets === 1 ? '' : 's') + '</span>' +
            '</div>';
          }).join('') +
          (r.best
            ? '<p class="small pad-x" style="padding-bottom:15px">Heaviest of the session: ' + esc(r.best.name) +
              ' at ' + Store.fmtLift(r.best.weight) + '.</p>'
            : '<div style="height:10px"></div>') +
        '</article>' +

        '<article class="card pad">' +
          '<div class="kicker" style="margin-bottom:11px">What it earned</div>' +
          '<p class="lede">' + (r.pointsGained
              ? r.pointsGained + ' point' + (r.pointsGained === 1 ? '' : 's') + ' toward today. ' +
                Store.points() + ' of 10 so far.'
              : 'Today was already counted. The session still stands.') + '</p>' +
          '<p class="small" style="margin:10px 0 0">Points are how you and ' + esc(Store.partnerName()) +
            ' stay comparable on different targets.</p>' +
        '</article>' +

        expeditionCard() +
        '<button class="btn block" data-route="train">Back to Train</button>'
    });
  }


  /* Where the week's training came from, and how to have it rewritten. The
     coach picks from the library, so a written plan is as real as a template. */
  function planCard(weekStartKey) {
    var S=Store.state();
    weekStartKey=weekStartKey||Store.weekStart(Store.todayKey());
    var current=Store.weekStart(Store.todayKey()), next=Store.shift(current,7);
    var meta=weekStartKey===next ? (S.futurePlanMeta||{}) : (S.planMeta||{});
    var written=meta.weekOf===weekStartKey && meta.writtenBy==='coach';
    var freq=S.frequency||4, body='', action='';

    if (weekStartKey < current) {
      body='<p class="lede" style="margin:0 0 8px">This week is part of your training history.</p>' +
        '<p class="small" style="margin:0">Open a day above to see what was recorded or add a correction. InSync does not rewrite a finished week.</p>';
    } else if (weekStartKey === next) {
      var futureReady=meta.weekOf===next && Array.isArray(S.futurePlan) && S.futurePlan.length;
      body=futureReady
        ? (meta.note?'<p class="lede" style="margin:0 0 13px">'+UI.esc(meta.note)+'</p>':'') + '<p class="small" style="margin:0">Prepared for the week of '+dateLabel(next)+'. It becomes the active plan when that week begins.</p>'
        : '<p class="lede" style="margin:0 0 8px">Next week has not been prepared yet.</p><p class="small" style="margin:0">The Weekly Campfire will own next-week preparation. Until then, the current plan stays untouched.</p>';
    } else {
      if (written) {
        body=(meta.note?'<p class="lede" style="margin:0 0 13px">'+UI.esc(meta.note)+'</p>':'') +
          '<p class="small" style="margin:0 0 14px">Written for the week of '+dateLabel(meta.weekOf)+'. Progression uses what you actually log, not a generic increase.</p>';
      } else {
        body='<p class="lede" style="margin:0 0 13px">A standard split for '+freq+' days a week.</p>' +
          '<p class="small" style="margin:0 0 14px">The coach can rewrite the current week around your goal, equipment and recent lifting history.</p>';
      }
      action=Cloud.hasClaude()
        ? '<button class="btn '+(written?'ghost ':'')+'block" data-action="write-plan">'+(written?'Rewrite this week':'Have the coach write it')+'</button>'
        : '<button class="btn ghost block" data-route="settings">Needs the coach - add a key</button>';
    }
    return '<article class="card pad training-plan-card">'+body+action+'</article>';
  }


  /* ---- Exercise library ------------------------------------------------- */

  function exercises() {
    var groups = Exercises.byGroup();
    return UI.screen({
      tab: null, rest: 300, blur: true,
      header: { back: true, title: 'Exercises', right: '<div style="width:34px"></div>' },
      overlay: '<div class="eyebrow">Library</div>' +
        '<p class="verse" style="font-size:24px">' + Exercises.all.length + ' movements, every one on the gym floor.</p>',
      body: groups.map(function (g) {
        return '<div class="rulehead"><span class="kicker">' + esc(g.name) + '</span><span></span>' +
            '<span class="note">' + g.items.length + '</span></div>' +
          '<article class="card">' +
            g.items.map(function (e) {
              return '<button class="exrow" data-route="exercise/' + e.id + '">' +
                '<img class="exgif" src="' + UI.asset(e.gif) + '" alt="" loading="lazy" />' +
                '<span style="min-width:0;text-align:left">' +
                  '<span class="exname">' + esc(e.name) + '</span>' +
                  '<span class="note">' + e.sets + ' \u00d7 ' + esc(String(e.reps)) + '</span>' +
                '</span>' +
                '<span class="exsets">' + esc(e.equipment) + '</span>' +
              '</button>';
            }).join('') +
          '</article>';
      }).join('')
    });
  }

  function exercise() {
    var id = location.hash.split('/')[1];
    var e = Exercises.get(id);
    if (!e) { location.hash = '#exercises'; return ''; }
    var last = lastLift(e.name);
    var alts = Exercises.alternatives(id);

    return UI.screen({
      tab: null, rest: 300, blur: true,
      header: { back: true, title: e.group, right: '<div style="width:34px"></div>' },
      overlay: '<div class="eyebrow">' + esc(e.equipment) + '</div>' +
        '<p class="verse" style="font-size:26px">' + esc(e.name) + '</p>',
      body:
        '<article class="card">' +
          '<img class="exhero" src="' + UI.asset(e.gif) + '" alt="' + esc(e.name) + '" />' +
          '<div class="ledger">' +
            '<div class="cell"><div class="kicker">Sets</div><div class="num">' + e.sets + '</div></div>' +
            '<div class="cell"><div class="kicker">Reps</div><div class="num" style="font-size:21px">' + esc(String(e.reps)) + '</div></div>' +
            '<div class="cell"><div class="kicker">Last</div><div class="num">' +
              (last ? Store.liftNum(last.weight) + '<span>' + Store.state().units.weight + '</span>' : '&mdash;') + '</div></div>' +
          '</div>' +
        '</article>' +

        (last
          ? ''
          : '<article class="card pad"><p class="note">Nothing logged on this one yet. The number appears once you have used it.</p></article>') +

        '<button class="btn block" data-action="start-session">Log a session</button>' +

        (alts.length
          ? '<div class="rulehead"><span class="kicker">If it is taken</span><span></span></div>' +
            '<article class="card">' +
              alts.map(function (a) {
                return '<button class="exrow" data-route="exercise/' + a.id + '">' +
                  '<img class="exgif" src="' + UI.asset(a.gif) + '" alt="" loading="lazy" />' +
                  '<span style="min-width:0;text-align:left">' +
                    '<span class="exname">' + esc(a.name) + '</span>' +
                    '<span class="note">' + esc(a.equipment) + '</span>' +
                  '</span>' +
                '</button>';
              }).join('') +
            '</article>'
          : '')
    });
  }

  function sparkline(series, w, h, color) {
    if (series.length < 2) return '<div class="note">One session so far. The line starts at two.</div>';
    var vals = series.map(function (s) { return s.weight; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var span = (hi - lo) || 1;
    var pts = series.map(function (s, i) {
      var x = (i / (series.length - 1)) * (w - 8) + 4;
      var y = h - 6 - ((s.weight - lo) / span) * (h - 16);
      return { x: x, y: y, s: s };
    });
    var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' ');
    var best = pts.reduce(function (a, p) { return p.s.weight > a.s.weight ? p : a; }, pts[0]);
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" style="display:block">' +
      '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      pts.map(function (p) {
        return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="2.5" fill="' + color + '"/>';
      }).join('') +
      '<circle cx="' + best.x.toFixed(1) + '" cy="' + best.y.toFixed(1) + '" r="5" fill="none" stroke="' + color + '" stroke-width="1.5"/>' +
    '</svg>';
  }

  function records() {
    var list = Store.records();
    var improved = list.filter(function (r) { return r.change > 0; }).length;
    var prs = list.filter(function (r) { return r.isPr; }).length;

    var headline = !list.length
      ? 'Nothing to compare yet. Log two sessions on the same machine and the line begins.'
      : improved === list.length && list.length > 1
        ? 'All ' + list.length + ' machines are up since you started.'
        : improved + ' of ' + list.length + ' machines up since you started.';

    var body = !list.length
      ? '<article class="card pad">' +
          '<div class="kicker" style="margin-bottom:11px">No records yet</div>' +
          '<p class="lede">A record needs two points. Log a session, then log the same machine again next week.</p>' +
          '<button class="btn block" style="margin-top:16px" data-action="start-session">Log a session</button>' +
        '</article>'
      : '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Since you started</div>' +
          '<div class="meta">' + list.length + ' machine' + (list.length === 1 ? '' : 's') + '</div></div>' +
          '<div class="ledger">' +
            '<div class="cell"><div class="kicker">Improved</div><div class="num">' + improved + '</div>' +
              '<div class="foot">of ' + list.length + '</div></div>' +
            '<div class="cell"><div class="kicker">Sessions</div><div class="num">' +
              list.reduce(function (a, r) { return a + r.sessions; }, 0) + '</div>' +
              '<div class="foot">logged</div></div>' +
            '<div class="cell"><div class="kicker">At a best</div><div class="num">' + prs + '</div>' +
              '<div class="foot">right now</div></div>' +
          '</div>' +
        '</article>' +
        list.map(function (r) {
          var wu = Store.state().units.weight;
          var delta = r.change > 0 ? '+' + Store.liftNum(r.change) : String(Store.liftNum(r.change));
          return '<button class="card pad cardbtn" data-route="record/' + encodeURIComponent(r.name) + '">' +
            '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:13px">' +
              '<div>' +
                '<h3 style="font-family:var(--serif);font-size:19px;font-weight:500;margin:0 0 5px">' + esc(r.name) + '</h3>' +
                '<div class="note">' + r.sessions + ' session' + (r.sessions === 1 ? '' : 's') +
                  ' &middot; best ' + Store.fmtLift(r.best.weight) + '</div>' +
              '</div>' +
              '<div style="text-align:right;flex:none">' +
                '<div class="num" style="font-size:22px">' + Store.liftNum(r.latest.weight) + '</div>' +
                '<div class="foot" style="color:' + (r.change > 0 ? 'var(--sage)' : 'var(--muted)') + '">' +
                  (r.sessions > 1 ? delta + ' ' + wu : wu) + '</div>' +
              '</div>' +
            '</div>' +
            sparkline(r.series, 320, 64, r.isPr ? '#C6A15D' : '#8FA184') +
            (r.isPr ? '<div class="kicker" style="margin-top:11px">At your best right now</div>' : '') +
            (prog ? '<p class="small" style="margin:9px 0 0;color:var(--sage)">' + esc(prog.detail) + '</p>' : '') +
          '</button>';
        }).join('') +
        '<button class="btn ghost block" data-route="workouts">Every session logged</button>' +
        '<button class="btn ghost block" data-route="cardio">Walking and cardio</button>';

    return UI.screen({
      tab: null, rest: 300, blur: true,
      header: { back: true, title: 'Records', right: '<div style="width:34px"></div>' },
      overlay: '<div class="eyebrow">Progression</div><p class="verse" style="font-size:24px">' + esc(headline) + '</p>',
      body: body
    });
  }

  function swapExercise() {
    var parts = location.hash.split('/'), idx = +parts[1], reason = parts[2] || '';
    var sn = Store.session(), it = sn && sn.items && sn.items[idx];
    if (!it) return UI.screen({ tab:null, header:{back:'session',title:'Swap exercise'}, rest:220, body:'<article class="card pad"><p class="note">That exercise is no longer in the active session.</p></article>' });
    var reasonNames = { occupied:'Machine occupied', discomfort:'Does not feel right', dislike:'I do not like this movement' };
    if (!reason) {
      return UI.screen({ tab:null, rest:260, blur:true,
        header:{back:'session/'+idx,title:'Swap exercise',right:'<div style="width:34px"></div>'},
        art:'assets/art/train-banner.webp', photoPosition:'center 40%',
        overlay:'<div class="eyebrow">' + esc(it.name) + '</div><p class="verse" style="font-size:24px">Why are you swapping it?</p>',
        body:'<article class="card pad"><div style="display:grid;gap:9px">' +
          '<button class="btn ghost block" data-route="swap-exercise/' + idx + '/occupied">Machine occupied</button>' +
          '<button class="btn ghost block" data-route="swap-exercise/' + idx + '/discomfort">Does not feel right</button>' +
          '<button class="btn ghost block" data-route="swap-exercise/' + idx + '/dislike">I do not like this movement</button>' +
          '</div><p class="small" style="margin:14px 0 0">Occupied changes only today. “Does not feel right” and “I do not like it” teach the coach to keep this movement out of future written plans.</p></article>' });
    }
    var opts = window.Insights ? Insights.swapOptions(idx, reason) : [];
    return UI.screen({ tab:null, rest:290, blur:true,
      header:{back:'swap-exercise/'+idx,title:'Choose replacement',right:'<div style="width:34px"></div>'},
      art:'assets/art/train-banner.webp', photoPosition:'center 40%',
      overlay:'<div class="eyebrow">' + esc(reasonNames[reason] || 'Swap') + '</div><p class="verse" style="font-size:24px">Same training purpose. Different movement.</p>',
      body:'<article class="card">' + (opts.length ? opts.map(function (x) {
        var pr = Insights.progressionFor(x.id);
        return '<button class="exrow" data-action="swap-exercise" data-i="' + idx + '" data-new-id="' + esc(x.id) + '" data-reason="' + esc(reason) + '">' +
          (x.gif ? '<img class="exgif" src="' + UI.asset(x.gif) + '" alt="" loading="lazy" />' : '') +
          '<span style="min-width:0;text-align:left"><span class="exname">' + esc(x.name) + '</span><span class="note">' + esc(x.equipment || '') + ' · ' + x.sets + ' × ' + esc(String(x.reps)) + '</span>' +
          (pr ? '<span class="small" style="display:block;margin-top:4px;color:var(--sage)">' + esc(pr.label) + '</span>' : '') + '</span><span class="exsets">Use</span></button>';
      }).join('') : '<div class="empty"><p class="note">No clean substitute from the same movement group is available in this session. Skip it or choose another exercise from the session picker.</p></div>') + '<div style="height:10px"></div></article>'
    });
  }


  function monthShift(ym, delta) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
    var d = m ? new Date(+m[1], +m[2]-1 + delta, 1) : new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
  }

  function calendar() {
    var part = location.hash.split('/')[1] || Store.todayKey().slice(0,7);
    if (!/^\d{4}-\d{2}$/.test(part)) part = Store.todayKey().slice(0,7);
    var y = +part.slice(0,4), m = +part.slice(5,7)-1, first = new Date(y,m,1), count = new Date(y,m+1,0).getDate();
    var startPad = first.getDay(), cells = [], S = Store.state(), today = Store.todayKey(), startKey = Store.startKey();
    for (var pad=0;pad<startPad;pad++) cells.push('<div class="calday blank"></div>');
    var loggedDays=0, workoutCount=0, mealCount=0;
    for (var n=1;n<=count;n++) {
      var key = part + '-' + String(n).padStart(2,'0'), d=S.days[key], active=Store.activeOn(key), future=key>today;
      var logged=!!d && Store.logged(key); if(logged) loggedDays++;
      var w=d&&d.workouts?d.workouts.length:0, meals=d&&d.meals?d.meals.length:0; workoutCount+=w; mealCount+=meals;
      var dayPhotos=(S.photos||[]).filter(function(ph){return ph&&ph.date===key;}).length;
      var p=active&&!future?Store.points(key):0;
      var marks=(meals?'●':'')+(w?'▲':'')+(d&&d.reflection?'✎':'')+(d&&d.weight!=null?'◆':'')+(dayPhotos?'▣':'');
      if (key < startKey || future) cells.push('<div class="calday muted"><span>'+n+'</span></div>');
      else cells.push('<button class="calday'+(logged?' logged':'')+(key===today?' today':'')+'" data-route="day-history/'+key+'"><span class="calnum">'+n+'</span>'+
        (logged?'<strong>'+p+'</strong>':'<em>—</em>')+(marks?'<small>'+marks+'</small>':'')+'</button>');
    }
    while(cells.length%7) cells.push('<div class="calday blank"></div>');
    var monthName=first.toLocaleDateString(undefined,{month:'long',year:'numeric'});
    return UI.screen({tab:null,rest:260,blur:true,header:{back:'home',title:'History',right:'<div style="width:34px"></div>'},
      art:'assets/art/coach-desk.webp', photoPosition:'center 42%',
      overlay:'<div class="eyebrow">Your log</div><p class="verse" style="font-size:25px">'+esc(monthName)+'</p>',
      body:'<article class="card pad"><div class="weeknav"><button class="btn ghost sm" data-route="calendar/'+monthShift(part,-1)+'">Previous</button><button class="btn ghost sm" data-route="calendar/'+Store.todayKey().slice(0,7)+'">This month</button><button class="btn ghost sm" data-route="calendar/'+monthShift(part,1)+'">Next</button></div>'+
        '<div class="calendar-head">'+['S','M','T','W','T','F','S'].map(function(x){return '<span>'+x+'</span>';}).join('')+'</div><div class="calendar-grid">'+cells.join('')+'</div>'+
        '<p class="small" style="margin:13px 0 0">● meal · ▲ training · ✎ reflection · ◆ weigh-in · ▣ progress photo. A number is the score for that day.</p></article>'+
        '<article class="card"><div class="ledger"><div><div class="label">Logged</div><div class="figure">'+loggedDays+'</div><div class="foot">days</div></div><div><div class="label">Training</div><div class="figure">'+workoutCount+'</div><div class="foot">sessions</div></div><div><div class="label">Meals</div><div class="figure">'+mealCount+'</div><div class="foot">logged</div></div></div></article>'
    });
  }

  function dayHistory() {
    var key = location.hash.split('/')[1] || Store.todayKey(), x = window.Insights ? Insights.daySummary(key) : null;
    if (!x || !x.active) return UI.screen({tab:null,rest:230,blur:true,header:{back:'calendar',title:'Day history'},art:'assets/art/coach-desk.webp',overlay:'<p class="verse">No InSync day exists here.</p>',body:'<article class="card pad"><button class="btn ghost block" data-route="calendar">Back to calendar</button></article>'});
    var pretty=new Date(key+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    var rows=Store.pointRows(key), meals=x.meals||[], workouts=x.workouts||[], photos=x.photos||[];
    var body='<article class="card pad day-editor" data-rest-anchor><div class="home-rhythm-head"><span class="kicker sage">Edit this day</span><span class="small">Forgot something?</span></div>' +
      '<p class="note" style="margin:8px 0 14px">Past days stay editable. Corrections recalculate that day, and walking updates the active expedition when the date belongs to the current leg.</p>' +
      '<div class="history-edit-grid">' +
        '<button class="btn ghost sm" data-action="log-steps" data-date="'+esc(key)+'">Steps</button>' +
        '<button class="btn ghost sm" data-action="log-morning" data-date="'+esc(key)+'">Morning</button>' +
        '<button class="btn ghost sm" data-action="log-meal" data-date="'+esc(key)+'">Add meal</button>' +
        '<button class="btn ghost sm" data-action="start-session" data-date="'+esc(key)+'">Add workout</button>' +
        '<button class="btn ghost sm wide" data-route="reflection/'+esc(key)+'">Edit nightly review</button>' +
      '</div></article>' +
      '<article class="card"><div class="cardhead"><div class="title"><i></i>Score</div><div class="meta">'+x.points+' of 10</div></div>'+rows.map(function(r){return '<div class="setrow"><div><div class="setname">'+esc(r.label)+'</div><div class="small">'+r.value+' point'+(r.value===1?'':'s')+'</div></div><span class="tick">'+(r.done?icon('check'):'')+'</span></div>';}).join('')+'</article>';
    body+='<div class="rulehead"><span class="kicker sage">Meals</span><span></span><span class="note">'+meals.length+'</span></div><article class="card">'+(meals.length?meals.map(function(meal){return '<button class="setrow" data-route="meal/'+esc(meal.id||'')+'"><div><div class="setname">'+esc(meal.slot||'Meal')+' · '+esc(meal.name)+'</div><div class="small">'+Store.fmtEnergy(+meal.kcal||0)+' · '+Math.round(+meal.protein||0)+' g protein</div></div><span class="chev">›</span></button>';}).join(''):'<p class="small pad-x" style="padding-top:14px;padding-bottom:14px">No meals recorded.</p>')+'</article>';
    var histWalk=Store.dailyWalk?Store.dailyWalk(key):null, histWalkMs=Store.dailyWalkElapsedMs?Store.dailyWalkElapsedMs(key):0;
    body+='<div class="rulehead"><span class="kicker sage">Training &amp; movement</span><span></span></div><article class="card">'+(workouts.length?workouts.map(function(w){return '<div class="setrow"><div><div class="setname">'+esc(w.name)+'</div><div class="small">'+(w.minutes||0)+' min'+((w.exercises||[]).length?' · '+w.exercises.length+' movements':'')+'</div></div></div>';}).join(''):'<div class="setrow"><div><div class="setname">No training session</div></div></div>')+(histWalkMs||histWalk&&((histWalk.pace||'')||(histWalk.elevation||''))?'<div class="setrow"><div><div class="setname">Walk</div><div class="small">'+dailyWalkSummaryText(histWalk,histWalkMs)+'</div></div></div>':'')+'<div class="setrow"><div><div class="setname">Steps</div><div class="small">'+x.steps.toLocaleString()+'</div></div></div><div class="setrow"><div><div class="setname">Trail distance</div><div class="small">'+Store.fmtDistance(x.trailMiles)+' from that day’s logged steps</div></div></div></article>';
    body+='<article class="card pad"><div class="kicker">Body &amp; reflection</div><div class="recipefacts" style="margin-top:12px"><div><span class="note">Weight</span><strong>'+(x.weight==null?'—':Store.fmtWeight(x.weight))+'</strong></div><div><span class="note">Sleep</span><strong>'+(x.sleepHr==null?'—':x.sleepHr+' h')+'</strong></div><div><span class="note">Resting HR</span><strong>'+(x.restingHr==null?'—':x.restingHr+' bpm')+'</strong></div><div><span class="note">Verse</span><strong>'+(x.verseRead?'Read':'—')+'</strong></div></div>'+(x.reflection?'<div class="rulehead" style="margin-top:17px"><span class="kicker sage">Evening reflection</span><span></span></div><p class="small" style="white-space:pre-wrap">'+esc(x.reflection)+'</p>':'<p class="small" style="margin-top:14px">No evening reflection recorded.</p>')+'</article>';
    if (photos.length) body+='<div class="rulehead"><span class="kicker sage">Progress photos</span><span></span><span class="note">'+photos.length+'</span></div><article class="card pad"><div class="photogrid">'+photos.map(function(ph){return '<div class="photoframe" data-photo="'+esc(ph.id)+'"></div>';}).join('')+'</div></article>';
    return UI.screen({tab:null,rest:270,blur:true,header:{back:'calendar/'+key.slice(0,7),title:'Day history',right:'<div style="width:34px"></div>'},art:'assets/art/coach-desk.webp',photoPosition:'center 42%',overlay:'<div class="eyebrow">'+esc(pretty)+'</div><p class="verse" style="font-size:25px">'+x.points+' of 10 · '+Store.fmtEnergy(x.totals.kcal)+' · '+x.totals.protein+' g protein</p>',body:body});
  }

  /* ---- Badges ----------------------------------------------------------- */

  function badgeStamp(b, size) {
    var px = size || 78;
    if (b.earned) {
      return '<img src="' + Badges.art(b.id) + '" alt="" width="' + px + '" height="' + px + '" style="display:block;object-fit:contain" />';
    }
    return '<div style="width:' + px + 'px;height:' + px + 'px;border-radius:50%;border:1px dashed rgba(243,237,225,.22);display:grid;place-items:center">' +
      '<span style="width:' + Math.round(px * 0.3) + 'px;height:1px;background:rgba(243,237,225,.22)"></span></div>';
  }

  function badges() {
    var cats = Badges.byCategory(), t = Badges.totals();
    var open = location.hash.split('/')[1];
    var cat = open && cats.filter(function (c) { return c.key === open; })[0];

    if (cat) {
      return UI.screen({
        tab: null, rest: 280, blur: true,
        header: { back: true, title: cat.name, right: '<div style="width:34px"></div>' },
        overlay: '<div class="eyebrow">' + esc(cat.name) + '</div>' +
          '<p class="verse" style="font-size:24px">' + esc(cat.blurb) + '</p>',
        body:
          '<article class="card">' +
            '<div class="cardhead"><div class="title"><i></i>' + esc(cat.name) + '</div>' +
            '<div class="meta">' + cat.earned + ' of ' + cat.total + '</div></div>' +
            cat.badges.map(function (b) {
              return '<div class="badgerow">' +
                badgeStamp(b, 62) +
                '<div style="min-width:0">' +
                  '<div style="font-family:var(--serif);font-size:17px;margin-bottom:5px' +
                    (b.earned ? '' : ';color:var(--muted)') + '">' +
                    (b.earned ? esc(b.name) : 'Not earned') + '</div>' +
                  '<div class="note">' + (b.earned ? esc(b.condition) : 'Earn it and it appears here.') + '</div>' +
                '</div>' +
                (b.earned ? '<div class="tier ' + b.tier + '">' + esc(b.tierLabel) + '</div>' : '') +
              '</div>';
            }).join('') +
          '</article>'
      });
    }

    return UI.screen({
      tab: null, rest: 300, blur: true,
      header: { back: true, title: 'Badges', right: '<div style="width:34px"></div>' },
      overlay: '<div class="eyebrow">Collected</div>' +
        '<p class="verse" style="font-size:25px">' + t.earned + ' of ' + t.total + ' struck.</p>',
      body:
        '<article class="card">' +
          '<div class="cardhead"><div class="title"><i></i>Eight categories</div>' +
          '<div class="meta">' + t.earned + ' of ' + t.total + '</div></div>' +
          cats.map(function (c) {
            var b = c.badges.filter(function (x) { return x.earned; })[0];
            return '<button class="badgerow tap" data-route="badges/' + c.key + '">' +
              (b ? '<img src="' + Badges.art(b.id) + '" alt="" width="54" height="54" style="display:block;object-fit:contain" />'
                 : badgeStamp({ earned: false }, 54)) +
              '<div style="min-width:0;text-align:left">' +
                '<div style="font-family:var(--serif);font-size:17px;margin-bottom:5px">' + esc(c.name) + '</div>' +
                '<div class="note">' + esc(c.blurb) + '</div>' +
              '</div>' +
              '<div class="meta">' + c.earned + '/' + c.total + '</div>' +
            '</button>';
          }).join('') +
        '</article>' +
        '<article class="card pad">' +
          '<div class="kicker" style="margin-bottom:11px">Locked stamps</div>' +
          '<p class="note">Unearned badges show no name and no condition. The coach mentions one occasionally when you are near it.</p>' +
        '</article>'
    });
  }

  /* ---- The earning moment ------------------------------------------------
     A stamp is struck the moment its condition becomes true, so this screen
     interrupts once and never again: acknowledging it records what has been
     seen. Several can land together — seeding a month does exactly that — so
     it names the newest and counts the rest rather than queueing screens. */
  function earnedMoment() {
    var fresh = Badges.fresh();
    if (!fresh.length) { location.hash = '#badges'; return ''; }
    /* Several can land at once. Lead with the rarest \u2014 a hundred days should not\n       be announced underneath the first verse. */
    var RANK = { common: 0, hard: 1, rare: 2 };
    var lead = 0;
    fresh.forEach(function (x, i) { if (RANK[x.tier] > RANK[fresh[lead].tier]) lead = i; });
    var b = fresh[lead];
    var others = fresh.filter(function (x, i) { return i !== lead; });

    return UI.screen({
      tab: null, rest: 300, blur: true,
      art: 'assets/art/provisions.webp', photoPos: 'center 26%',
      header: { back: false, title: '', right: '<div style="width:34px"></div>' },
      overlay: '<div class="eyebrow">' + (fresh.length > 1 ? fresh.length + ' stamps struck' : 'A stamp struck') + '</div>' +
        '<p class="verse" style="font-size:26px">' + esc(b.name) + '</p>' +
        '<p class="attrib" style="text-transform:none;letter-spacing:0;font-size:13px;color:rgba(243,237,225,.82)">' + esc(b.condition) + '.</p>',
      body:
        '<article class="card pad" style="text-align:center">' +
          '<div style="display:grid;justify-items:center;gap:14px">' +
            badgeStamp(b, 108) +
            '<div>' +
              '<div style="font-family:var(--serif);font-size:21px;margin-bottom:6px">' + esc(b.name) + '</div>' +
              '<div class="tier ' + b.tier + '">' + esc(b.tierLabel) + '</div>' +
            '</div>' +
          '</div>' +
          '<p class="note" style="margin-top:15px">' + esc(b.condition) + '. It is on the shelf now, and it stays there.</p>' +
        '</article>' +
        (others.length
          ? '<article class="card">' +
              '<div class="cardhead"><div class="title"><i></i>Also struck</div>' +
                '<div class="meta">' + others.length + '</div></div>' +
              others.map(function (o) {
                return '<div class="badgerow">' + badgeStamp(o, 46) +
                  '<div style="min-width:0">' +
                    '<div style="font-family:var(--serif);font-size:16px;margin-bottom:4px">' + esc(o.name) + '</div>' +
                    '<div class="note">' + esc(o.condition) + '</div>' +
                  '</div>' +
                  '<div class="tier ' + o.tier + '">' + esc(o.tierLabel) + '</div>' +
                '</div>';
              }).join('') +
            '</article>'
          : '') +
        '<button class="btn block" data-action="ack-badge">Back to the trail</button>' +
        '<button class="btn ghost block" data-action="ack-badge" data-to="badges">See every badge</button>'
    });
  }

  /* ---- Reflection -------------------------------------------------------
     The morning's verse becomes the evening prompt. The page belongs to the owner; the
     day's numbers sit under it, present but not the point. Every past night
     carries the verse it was actually written against — Store.verse takes a
     date, so a night from Tuesday shows Tuesday's. */

  /* Whatever the day actually holds, in the order it happened. Nothing is
     invented: a figure with no entry behind it is left out. */
  function dayFacts(key) {
    var d = Store.day(key), t = Store.totals(key), out = [];
    if (d.weight != null) out.push({ label: 'Weighed', value: Store.fmtWeight(d.weight) });
    if (d.sleepHr != null) out.push({ label: 'Slept', value: d.sleepHr + ' hr' });
    if (t.kcal) out.push({ label: 'Energy', value: Store.fmtEnergy(t.kcal) });
    if (t.protein) out.push({ label: 'Protein', value: t.protein + ' g' });
    if (d.steps) out.push({ label: 'Steps', value: d.steps.toLocaleString() });
    if ((d.workouts || []).length) {
      out.push({ label: (d.workouts.length === 1 ? 'Session' : 'Sessions'), value: d.workouts.map(function (w) { return w.name; }).join(', ') });
    }
    return out;
  }

  /* The short line under a past night: what that day amounted to. */
  function factLine(key) {
    var d = Store.day(key), t = Store.totals(key), bits = [];
    if (d.steps) bits.push(d.steps.toLocaleString() + ' steps');
    if (t.protein) bits.push(t.protein + ' g protein');
    if ((d.workouts || []).length) bits.push(d.workouts.length === 1 ? 'one session' : d.workouts.length + ' sessions');
    return bits.join(' \u00b7 ');
  }

  function reflection() {
    var parts = location.hash.split('/');
    var requested = parts[1] || Store.todayKey();
    var key = /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested <= Store.todayKey() ? requested : Store.todayKey();
    var historical = key !== Store.todayKey();
    var v = Store.verse(key);
    var d = Store.day(key);
    var facts = dayFacts(key);
    var written = (d.reflection || '').trim();
    var nights = Object.keys(Store.state().days).sort().reverse()
      .filter(function (k) { return k !== key; });
    var past = historical ? [] : nights.slice(0, 6).map(function (k) { return { key: k, d: Store.state().days[k] }; });

    var count = Object.keys(Store.state().days).filter(function (k) {
      return (Store.state().days[k].reflection || '').trim();
    }).length;
    var savedLabel = written
      ? (d.reflectionAt ? 'Saved ' + esc(d.reflectionAt) : 'Saved')
      : (historical ? 'Nothing saved for this night' : 'Nothing saved tonight');
    var when = new Date(key + 'T12:00:00').toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });

    return UI.screen({
      tab: null, rest: 330,
      art: 'assets/art/camp-night.webp',
      header: { back: historical ? 'day-history/' + key : true, title: historical ? 'Edit review' : 'Reflection', right: '<div style="width:34px"></div>' },
      overlay:
        '<div class="eyebrow">' + (historical ? esc(when) : 'This morning\u2019s verse') + '</div>' +
        '<p class="verse">' + esc(v.text) + '</p>' +
        '<cite class="cite">' + esc(v.ref) + '</cite>' +
        (v.why ? '<p class="versewhy">' + esc(v.why) + '</p>' : ''),
      body:
        '<article class="card pad">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px">' +
            '<span class="kicker">' + (historical ? 'Nightly review' : 'Tonight') + '</span>' +
            '<span class="note" id="wordcount">' + (written ? written.split(/\s+/).length + ' words' : 'Blank page') + '</span>' +
          '</div>' +
          '<textarea id="reflect" class="reflect" rows="6" placeholder="What happened ' + (historical ? 'that day' : 'today') + '?">' + esc(d.reflection || '') + '</textarea>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px">' +
            '<span class="small">' + savedLabel + '</span>' +
            '<button class="btn sm" style="flex:none;padding:0 18px" data-action="save-reflection" data-date="' + esc(key) + '">' + (historical ? 'Save changes' : 'Close the day') + '</button>' +
          '</div>' +
        '</article>' +

        (facts.length
          ? '<article class="card pad">' +
              '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:13px">' +
                '<span class="kicker faint">Attached to this entry</span>' +
                '<span class="small">' + Store.points(key) + ' of 10</span>' +
              '</div>' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:11px 18px">' +
                facts.map(function (f) {
                  return '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px">' +
                    '<span class="small">' + esc(f.label) + '</span>' +
                    '<span style="font-size:12.5px;color:var(--ink);font-variant-numeric:tabular-nums;text-align:right">' + esc(String(f.value)) + '</span>' +
                  '</div>';
                }).join('') +
              '</div>' +
            '</article>'
          : '<article class="card pad">' +
              '<div class="kicker faint" style="margin-bottom:10px">Attached to this entry</div>' +
              '<p class="note">Nothing logged on this date yet, so the page stands on its own.</p>' +
            '</article>') +

        (past.length
          ? '<div class="rulehead"><span class="kicker">' + plural(nights.length, 'night') + ' on the trail</span><span></span>' +
              '<span class="note">' + count + ' written</span></div>' +
            past.map(function (p) {
              var txt = (p.d.reflection || '').trim();
              var pastWhen = new Date(p.key + 'T12:00:00')
                .toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
              var line = factLine(p.key);
              return '<article class="card pad">' +
                '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:11px">' +
                  '<span class="small" style="letter-spacing:.13em;text-transform:uppercase;color:#B8AF9B">' + esc(pastWhen) + '</span>' +
                  '<span class="small" style="flex:none">' + esc(Store.verse(p.key).ref) + '</span>' +
                '</div>' +
                (txt
                  ? '<p style="font-family:var(--serif);font-size:16px;line-height:1.55;margin:0;color:#D6CDBA;text-wrap:pretty">' +
                      esc(txt.length > 150 ? txt.slice(0, 150) + '\u2026' : txt) + '</p>'
                  : '<p style="font-family:var(--serif);font-style:italic;font-size:15.5px;line-height:1.5;margin:0;color:var(--faint)">' +
                      'Nothing written. ' + (line ? 'The numbers are still here if you want them.' : 'The page stayed blank.') + '</p>') +
                (line
                  ? '<div style="margin-top:12px;padding-top:11px;border-top:1px solid var(--rule)">' +
                      '<span class="small" style="font-variant-numeric:tabular-nums">' + line + '</span></div>'
                  : '') +
              '</article>';
            }).join('')
          : '')
    });
  }


  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  /* ---- Trends ------------------------------------------------------------ */


  function trendCard(o) {
    return '<article class="card pad trendcard">' +
      '<div class="kicker' + (o.sage ? ' sage' : '') + '">' + esc(o.question) + '</div>' +
      '<p class="answer">' + o.answer + '</p>' +
      (o.evidence && o.evidence.length
        ? '<div class="evidence">' + o.evidence.map(function (e) {
            return '<div class="erow"><span class="efig">' + e.figure + '</span>' +
              '<span class="etext">' + esc(e.text) + '</span></div>';
          }).join('') + '</div>'
        : '') +
      (o.action
        ? '<button class="btn ghost block" ' + (o.route ? 'data-route="' + o.route + '"' : 'data-action="' + o.action_id + '"') + '>' + esc(o.action) + '</button>'
        : '<p class="note nochange">Nothing to change here.</p>') +
    '</article>';
  }

  function trends() {
    var S = Store.state(), tg = S.targets;
    var days = [];
    for (var i = 27; i >= 0; i--) days.push({ off: -i, d: Store.dayAt(-i) });
    var logged = days.filter(function (x) { return (x.d.meals || []).length || x.d.steps || x.d.weight; });

    // 1. Where protein goes missing
    var slots = { Breakfast: [0, 0], Lunch: [0, 0], Snack: [0, 0], Dinner: [0, 0] };
    days.forEach(function (x) {
      (x.d.meals || []).forEach(function (m) {
        var k = slots[m.slot] ? m.slot : 'Snack';
        slots[k][0] += m.protein || 0; slots[k][1] += 1;
      });
    });
    var slotRows = Object.keys(slots).filter(function (k) { return slots[k][1]; })
      .map(function (k) { return { name: k, avg: Math.round(slots[k][0] / slots[k][1]), n: slots[k][1] }; })
      .sort(function (a, b) { return a.avg - b.avg; });
    var weakest = slotRows[0];

    // 2. Weight
    var ws = [];
    days.forEach(function (x) { if (x.d.weight) ws.push(x.d.weight); });
    var wChange = ws.length > 1 ? +(ws[ws.length - 1] - ws[0]).toFixed(1) : null;
    var wSwing = ws.length > 1 ? +(Math.max.apply(null, ws) - Math.min.apply(null, ws)).toFixed(1) : null;

    // 3. Which days hold
    var dow = [[], [], [], [], [], [], []];
    days.forEach(function (x) {
      var dt = new Date(); dt.setDate(dt.getDate() + x.off);
      var t = (x.d.meals || []).reduce(function (a, m) { return a + (m.protein || 0); }, 0);
      if ((x.d.meals || []).length) dow[dt.getDay()].push(t >= tg.protein ? 1 : 0);
    });
    var DOWN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var dowRates = dow.map(function (a, i) {
      return { name: DOWN[i], rate: a.length ? Math.round(a.reduce(function (p, c) { return p + c; }, 0) / a.length * 100) : null, n: a.length };
    }).filter(function (r) { return r.n; }).sort(function (a, b) { return a.rate - b.rate; });

    // 4. Training
    var weeks = [[], [], [], []];
    days.forEach(function (x) { weeks[Math.floor((27 + x.off) / 7)].push(x.d); });
    var wkRows = weeks.map(function (w, i) {
      var sessions = w.reduce(function (a, d) { return a + (d.workouts || []).length; }, 0);
      var hit = w.filter(function (d) {
        return (d.meals || []).reduce(function (a, m) { return a + (m.protein || 0); }, 0) >= tg.protein;
      }).length;
      return { label: i === 3 ? 'This week' : (4 - i) + ' weeks ago', sessions: sessions, hit: hit };
    }).filter(function (r) { return r.sessions || r.hit; });

    // 5. Logging
    var loggedCount = logged.length;
    var weekendMisses = days.filter(function (x) {
      var dt = new Date(); dt.setDate(dt.getDate() + x.off);
      var wknd = dt.getDay() === 0 || dt.getDay() === 6;
      return wknd && !(x.d.meals || []).length;
    }).length;
    var totalMisses = 28 - loggedCount;

    // 6. Expedition
    var e = S.expedition, r = route();
    var walked = Store.legMine() + Store.legHers();

    var cards = [];

    cards.push(trendCard({
      question: 'Where does the protein go missing?',
      answer: slotRows.length
        ? esc(weakest.name) + ' carries the least &mdash; an average of <strong>' + weakest.avg + ' g</strong> across ' + weakest.n + ' logged.'
        : 'Not enough logged yet to tell.',
      evidence: slotRows.map(function (r) {
        return { figure: r.avg + ' g', text: r.name + ', ' + r.n + ' logged' };
      }),
      action: slotRows.length ? 'Find a higher-protein ' + weakest.name.toLowerCase() : null,
      route: 'cookbook'
    }));

    cards.push(trendCard({
      question: 'Is the weight actually moving?',
      sage: true,
      answer: wChange == null
        ? 'Two weigh-ins are needed before a trend exists. You have ' + ws.length + '.'
        : (wChange < 0
            ? '<strong>' + Store.fmtWeight(Math.abs(wChange)) + ' down</strong> over ' + ws.length + ' weigh-ins.' +
              (wSwing > Math.abs(wChange) + 0.05
                ? ' The daily swing is ' + Store.fmtWeight(wSwing) + ', so ignore any single morning.'
                : ' Every entry has been lower than the last.')
            : '<strong>' + Store.fmtWeight(wChange) + '</strong> over ' + ws.length + ' weigh-ins. The swing between highest and lowest is ' + Store.fmtWeight(wSwing) + '.'),
      evidence: ws.length > 1 ? [
        { figure: ws[0] + '', text: 'first entry in this window' },
        { figure: ws[ws.length - 1] + '', text: 'most recent' },
        { figure: wSwing + '', text: 'spread between highest and lowest' }
      ] : [],
      action: null
    }));

    cards.push(trendCard({
      question: 'Which days hold, and which do not?',
      answer: dowRates.length > 1
        ? '<strong>' + esc(dowRates[0].name) + '</strong> is the weakest at ' + dowRates[0].rate + '%. ' +
          esc(dowRates[dowRates.length - 1].name) + ' is the strongest at ' + dowRates[dowRates.length - 1].rate + '%.'
        : 'Not enough days logged to compare.',
      evidence: dowRates.slice(0, 4).map(function (r) {
        return { figure: r.rate + '%', text: r.name + ' &mdash; protein target hit, ' + r.n + ' logged' };
      }),
      action: dowRates.length > 1 ? 'Plan ' + dowRates[0].name + ' ahead' : null,
      route: 'planner'
    }));

    cards.push(trendCard({
      question: 'Does training more actually help?',
      sage: true,
      /* Whether training more helps is a question about this data, not a maxim.
         Compare the busiest week against the quietest and say what happened. */
      answer: (function () {
        if (wkRows.length < 2) return 'One week of sessions so far. The comparison starts at two.';
        var byS = wkRows.slice().sort(function (a, b) { return a.sessions - b.sessions; });
        var few = byS[0], many = byS[byS.length - 1];
        var last = wkRows[wkRows.length - 1];
        var tail = '<strong>' + last.sessions + (last.sessions === 1 ? ' session' : ' sessions') +
          '</strong> this week, ' + plural(last.hit, 'day') + ' on target.';
        if (few.sessions === many.sessions) {
          return 'Every week has had the same number of sessions, so there is nothing to compare yet. ' + tail;
        }
        if (many.hit > few.hit) {
          return 'Your busiest week (' + many.sessions + ') held protein on ' + plural(many.hit, 'day') +
            '; your quietest (' + few.sessions + ') managed ' + few.hit + '. ' + tail;
        }
        if (many.hit < few.hit) {
          return 'More sessions has not meant more protein &mdash; your busiest week (' + many.sessions +
            ') held it on ' + plural(many.hit, 'day') + ', your quietest (' + few.sessions + ') on ' + few.hit + '. ' + tail;
        }
        return 'Busy weeks and quiet weeks have landed the same, ' + plural(many.hit, 'day') +
          ' on protein either way. ' + tail;
      })(),
      evidence: wkRows.map(function (r) {
        return { figure: r.sessions + '\u00d7', text: r.label + ' &mdash; ' + plural(r.hit, 'day') + ' on protein' };
      }),
      action: null
    }));

    cards.push(trendCard({
      question: 'How consistent is the logging?',
      answer: '<strong>' + loggedCount + ' of 28</strong> days logged.' +
        (totalMisses && weekendMisses
          ? ' ' + weekendMisses + ' of the ' + totalMisses + ' missed ' + (totalMisses === 1 ? 'day was' : 'days were') + ' a weekend.'
          : ''),
      evidence: [
        { figure: loggedCount + '', text: 'days with something logged' },
        { figure: totalMisses + '', text: 'days with nothing' },
        { figure: weekendMisses + '', text: 'of those were Saturday or Sunday' }
      ],
      action: weekendMisses ? 'Plan the weekend ahead' : null,
      route: 'planner'
    }));

    if (r) {
      var currentLeg = leg();
      cards.push(trendCard({
        question: 'How is the expedition going?',
        sage: true,
        answer: currentLeg
          ? 'Leg ' + (e.legIndex + 1) + ' of ' + r.legs.length + ' on the ' + esc(r.name) + '. ' +
              (walked >= currentLeg.miles
                ? '<strong>' + Store.fmtDistance(currentLeg.miles) + '</strong> walked &mdash; this leg is done.'
                : '<strong>' + Store.fmtDistance(walked) + '</strong> of ' + Store.fmtDistance(currentLeg.miles) + ' walked on this leg.')
          : '<strong>' + esc(r.name) + '</strong> is complete. All ' + r.legs.length + ' legs are finished.',
        evidence: currentLeg ? [
          { figure: Store.fmtDistance(Store.legMine()), text: 'your distance on this leg' },
          { figure: Store.fmtDistance(Store.legHers()), text: Store.partnerName() + '&rsquo;s distance' },
          { figure: (e.legIndex) + '', text: 'legs finished' }
        ] : [
          { figure: r.legs.length + '', text: 'legs finished' },
          { figure: Store.fmtDistance(routeMiles(r)), text: 'route distance completed' }
        ],
        action: null
      }));
    }

    return UI.screen({
      tab: null, rest: 300, blur: true,
      header: { back: true, title: 'Trends', right: '<div style="width:34px"></div>' },
      art: 'assets/art/provisions.webp', photoPosition: 'center 22%',
      overlay:
        '<div class="eyebrow">Last four weeks</div>' +
        '<p class="verse">Six questions, and what the log says about each.</p>',
      body: cards.join('')
    });
  }

  /* ---- Cookbook ---------------------------------------------------------- */

  /* A meal with no calories is a note to self, not a recipe — it cannot be
     cooked, planned, or put on a list. It stays in history; it stays out of here. */
  function knownMeals() {
    var days = Store.state().days, seen = {};
    Object.keys(days).forEach(function (k) {
      (days[k].meals || []).forEach(function (m) {
        if (!m.name || !m.kcal) return;
        var key = m.name.toLowerCase();
        if (!seen[key]) seen[key] = { name: m.name, slot: m.slot, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, items: m.items || null, n: 0 };
        seen[key].n++;
        if (m.items && !seen[key].items) seen[key].items = m.items;
      });
    });
    return Object.keys(seen).map(function (k) { return seen[k]; })
      .sort(function (a, b) { return b.n - a.n || b.protein - a.protein; });
  }

  function cookbook() {
    var S = Store.state(), tg = S.targets;
    var mine = knownMeals();
    var ideas = S.mealIdeas || [];
    var favorites = S.mealFavorites || [];
    var disliked = (S.mealDislikedMeals || []).map(function (x) { return String(x).toLowerCase(); });
    mine = mine.filter(function (m) { return disliked.indexOf(String(m.name).toLowerCase()) < 0; });
    ideas = ideas.filter(function (m) { return disliked.indexOf(String(m.name).toLowerCase()) < 0; });
    var hasKey = !!Store.secret('claudeKey');

    function card(m, opts) {
      return '<div class="row recipe nothumb" data-action="' + (opts.action || 'plan-meal') + '" data-meal="' + esc(JSON.stringify(m)).replace(/"/g, '&quot;') + '">' +
        '<div style="min-width:0">' +
          '<div class="macros">' + esc(m.slot || 'Meal') + (m.n ? ' &middot; eaten ' + m.n + '&times;' : '') + '</div>' +
          '<h4>' + esc(m.name) + '</h4>' +
          '<div class="macros">' + m.protein + ' g protein &middot; ' + m.carbs + ' g carbs &middot; ' + m.fat + ' g fat</div>' +
        '</div>' +
        '<div class="kcal">' + Store.energyNum(m.kcal).toLocaleString() + '<small>' + Store.state().units.energy + '</small></div>' +
      '</div>';
    }

    var best = mine.filter(function (m) { return m.protein >= Math.round(tg.protein / 4); });

    return UI.screen({
      tab: null, rest: 300, blur: true,
      header: { back: true, title: 'Cookbook', right: '<div style="width:34px"></div>' },
      art: 'assets/art/provisions.webp', photoPosition: 'center 34%',
      overlay:
        '<div class="eyebrow">The kitchen</div>' +
        '<p class="verse">What you already eat, and what the coach suggests next.</p>',
      body:
        (favorites.length
          ? '<div class="rulehead"><span class="kicker">Favorites</span><span></span><span class="note">' + favorites.length + '</span></div>' +
            '<article class="card rowlist">' + favorites.slice().reverse().slice(0, 12).map(function (m) { return card(m, {}); }).join('') + '</article>'
          : '') +
        (best.length
          ? '<div class="rulehead"><span class="kicker">Carries its weight</span><span></span>' +
              '<span class="note">' + best.length + '</span></div>' +
            '<article class="card rowlist">' + best.slice(0, 8).map(function (m) { return card(m, {}); }).join('') + '</article>'
          : '') +

        (mine.length > best.length
          ? '<div class="rulehead"><span class="kicker sage">Everything else</span><span></span></div>' +
            '<article class="card rowlist">' +
              mine.filter(function (m) { return best.indexOf(m) < 0; }).slice(0, 10).map(function (m) { return card(m, {}); }).join('') +
            '</article>'
          : '') +

        (!mine.length
          ? '<article class="card pad"><p class="note">Nothing logged yet, so there is nothing to cook from. Log a few meals and they collect here.</p></article>'
          : '') +

        '<div class="rulehead"><span class="kicker">Ideas</span><span></span></div>' +
        (ideas.length
          ? '<article class="card rowlist">' + ideas.map(function (m) { return card(m, {}); }).join('') + '</article>'
          : '') +
        (hasKey
          ? '<button class="btn block" data-action="generate-meals">Ask the coach for ideas</button>' +
            '<p class="note" style="margin:10px 2px 0">It reads your targets and what you already eat, then suggests meals that fill the gaps.</p>'
          : '<article class="card pad"><p class="note">Add a Claude key in Settings and the coach will suggest meals built around your targets and the gaps in your week.</p></article>')
    });
  }

  /* ---- Week planner and shopping list ------------------------------------ */

  var PLAN_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  var PLAN_CUISINES = ['Mexican','Chinese','Indian','American','Italian','Mediterranean','Thai','Japanese','Korean','Greek','Middle Eastern','Cajun'];
  var PLAN_PROTEINS = ['Chicken','Beef','Turkey','Pork','Fish','Shrimp','Eggs','Vegetarian'];

  function planKey(date, slot) { return date + '|' + slot; }
  function mealNameKey(name) { return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function isFavoriteMeal(name) {
    var key = mealNameKey(name);
    return (Store.state().mealFavorites || []).some(function (m) { return mealNameKey(m.name) === key; });
  }

  function defaultPlannerWeek(S) {
    if (S.mealPlannerWeek && /^\d{4}-\d{2}-\d{2}$/.test(S.mealPlannerWeek)) return S.mealPlannerWeek;
    var start = Store.weekStart(Store.todayKey());
    /* On Sunday an untouched planner should open on tomorrow's week. That is
       when this screen is most commonly used and avoids offering to generate
       six days that have already happened. */
    if (new Date(Store.todayKey() + 'T12:00:00').getDay() === 0) return Store.shift(start, 7);
    return start;
  }

  function planner() {
    var S = Store.state(), plan = S.mealPlan || {};
    var weekOf = defaultPlannerWeek(S), currentWeek = Store.weekStart(Store.todayKey());
    var dates = [], planned = [];
    for (var di = 0; di < 7; di++) dates.push(Store.shift(weekOf, di));
    dates.forEach(function (date) {
      PLAN_SLOTS.forEach(function (sl) {
        var m = plan[planKey(date, sl)];
        if (m) planned.push({ date: date, slot: sl, meal: m });
      });
    });

    var totalSlots = dates.length * PLAN_SLOTS.length;
    var weekEnd = Store.shift(weekOf, 6);
    var weekName = weekOf === currentWeek ? 'This week'
      : weekOf === Store.shift(currentWeek, 7) ? 'Next week'
      : new Date(weekOf + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
        ' – ' + new Date(weekEnd + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    // Shopping list is derived only from this displayed week's recipes.
    var shop = {};
    planned.forEach(function (p) {
      if (p.meal.leftoverOf) return;
      var items = p.meal.items && p.meal.items.length ? p.meal.items : [{ name: p.meal.name, weight: '' }];
      items.forEach(function (it) {
        var name = String(it.name || '').trim();
        if (!name) return;
        if (window.Nutrition && Nutrition.isPantryItem && Nutrition.isPantryItem(name, S.mealPrefs || {})) return;
        var k = name.toLowerCase();
        if (!shop[k]) shop[k] = { name: name, n: 0, amounts: [] };
        shop[k].n++;
        var amount = String(it.weight || '').trim();
        if (amount && p.meal.batchSource && (+p.meal.servings || 1) > 1) amount += ' × ' + (+p.meal.servings || 1);
        if (amount && shop[k].amounts.indexOf(amount) < 0) shop[k].amounts.push(amount);
      });
    });
    var shopList = Object.keys(shop).map(function (k) { return shop[k]; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    var ticked = S.shopTicked || {};
    var weekVerification = (planned.length === totalSlots && window.Nutrition && Nutrition.validateWeek) ? Nutrition.validateWeek(plan, weekOf, S.targets, S.mealPrefs || {}) : null;
    var prepTimeline = window.Nutrition && Nutrition.prepTimeline ? Nutrition.prepTimeline(plan, weekOf) : [];

    var grid = dates.map(function (date) {
      var dt = new Date(date + 'T12:00:00');
      var full = dt.toLocaleDateString(undefined, { weekday: 'long' });
      var shortDate = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      var dayMeals = PLAN_SLOTS.map(function (sl) { return plan[planKey(date, sl)]; }).filter(Boolean);
      var dayKcal = dayMeals.reduce(function (a, m) { return a + (+m.kcal || 0); }, 0);
      var dayProtein = dayMeals.reduce(function (a, m) { return a + (+m.protein || 0); }, 0);
      var dv = (dayMeals.length === 4 && window.Nutrition && Nutrition.validateDay) ? Nutrition.validateDay(plan, date, S.targets, S.mealPrefs || {}) : null;
      return '<div class="planday">' +
        '<div class="pdhead"><span>' + full + ' <em>' + shortDate + '</em></span>' +
          '<span class="note">' + (dayMeals.length ? Store.fmtEnergy(dayKcal) + ' · ' + dayProtein + ' g' + (dv ? (dv.ok ? ' · ✓ verified' : ' · needs repair') : '') : 'open') + '</span></div>' +
        PLAN_SLOTS.map(function (sl) {
          var key = planKey(date, sl), m = plan[key];
          return m
            ? '<button class="planslot filled" data-route="planned-meal/' + date + '/' + encodeURIComponent(sl) + '">' +
                '<span class="pslabel">' + sl + '</span>' +
                '<span class="psmeal">' + esc(m.name) + '</span>' +
                '<span class="pskcal">' + Store.fmtEnergy(+m.kcal || 0) + ' · ' + Math.round(+m.protein || 0) + ' g protein' +
                  (m.prepMinutes ? ' · ' + m.prepMinutes + ' min' : '') +
                  (m.leftoverOf ? ' · LEFTOVER' : m.batchSource ? ' · BATCH PREP' : '') + '</span>' +
              '</button>'
            : '<button class="planslot" data-action="plan-slot" data-slot="' + key + '">' +
                '<span class="pslabel">' + sl + '</span><span class="psempty">Choose a meal</span>' +
              '</button>';
        }).join('') +
      '</div>';
    }).join('');

    var prefs = S.mealPrefs || { cuisines: [], proteins: [], likes: '', avoid: '', mustNot: '', pantry: '', sharedDinnerShare: false };
    var prep = window.Insights ? Insights.mealPrepPrefs() : { lunchPrepDays: 0, dinnerLeftovers: false, cookDays: [] };
    var favoriteCount = (S.mealFavorites || []).length, dislikedCount = (S.mealDislikedMeals || []).length;
    function prefChips(values, selected, kind) {
      return '<div class="prefchips">' + values.map(function (v) {
        return '<button class="ob-chip' + (selected.indexOf(v) >= 0 ? ' on' : '') + '" data-action="meal-pref-chip" data-pref-kind="' + kind + '" data-pref-value="' + esc(v) + '">' + esc(v) + '</button>';
      }).join('') + '</div>';
    }
    var preferencesCard =
      '<article class="card pad mealprefs">' +
        '<div class="kicker">Plan preferences</div>' +
        '<p class="small" style="margin:8px 0 16px"><strong>Home-cooked only.</strong> Fast food, restaurant takeout, drive-thru meals and chain-brand meals are blocked from generated weeks.</p>' +
        '<div class="preflabel">Cuisines <span>pick any that sound good this week</span></div>' +
        prefChips(PLAN_CUISINES, prefs.cuisines || [], 'cuisines') +
        '<div class="preflabel">Proteins <span>leave blank for any</span></div>' +
        prefChips(PLAN_PROTEINS, prefs.proteins || [], 'proteins') +
        '<label class="preftext"><span>Things I like</span><input type="text" data-meal-pref-text="likes" value="' + esc(prefs.likes || '') + '" placeholder="spicy, rice bowls, garlic, crunchy…"></label>' +
        '<label class="preftext"><span>Prefer not to include</span><input type="text" data-meal-pref-text="avoid" value="' + esc(prefs.avoid || '') + '" placeholder="mushrooms, olives, mayo…"></label>' +
        '<label class="preftext"><span>Must never include <em>hard exclusion</em></span><input type="text" data-meal-pref-text="mustNot" value="' + esc(prefs.mustNot || '') + '" placeholder="allergies, religious restrictions, absolute no-go foods…"></label>' +
        '<label class="preftext"><span>Pantry staples already on hand</span><input type="text" data-meal-pref-text="pantry" value="' + esc(prefs.pantry || '') + '" placeholder="olive oil, salt, pepper, garlic powder…"></label>' +
        '<div class="preflabel">Shared Dinner <span>share only a dinner-sized target with ' + esc((S.partner && S.partner.name) || 'your partner') + '</span></div>' +
        '<div class="prefchips"><button class="ob-chip' + (prefs.sharedDinnerShare ? ' on' : '') + '" data-action="toggle-shared-dinner-share">' + (prefs.sharedDinnerShare ? 'Sharing dinner target' : 'Keep dinner target private') + '</button></div>' +
        '<div class="preflabel">Batch-prep lunches <span>cook once, repeat on weekdays</span></div>' +
        '<div class="prefchips">' + [0,2,3,4,5].map(function (n) { return '<button class="ob-chip' + (prep.lunchPrepDays === n ? ' on' : '') + '" data-action="meal-prep-lunches" data-count="' + n + '">' + (n ? n + ' days' : 'Off') + '</button>'; }).join('') + '</div>' +
        '<div class="preflabel">Dinner leftovers <span>cook on selected nights, reheat between</span></div>' +
        '<div class="prefchips"><button class="ob-chip' + (prep.dinnerLeftovers ? ' on' : '') + '" data-action="meal-prep-leftovers">' + (prep.dinnerLeftovers ? 'On' : 'Off') + '</button></div>' +
        (prep.dinnerLeftovers ? '<div class="preflabel">Cooking nights <span>Monday starts the week with a fresh batch</span></div><div class="prefchips">' + ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(function (d) { return '<button class="ob-chip' + (prep.cookDays.indexOf(d) >= 0 ? ' on' : '') + '" data-action="meal-prep-cookday" data-day="' + d + '"' + (d === 'Mon' ? ' disabled aria-disabled="true"' : '') + '>' + d + '</button>'; }).join('') + '</div>' : '') +
        '<div class="prefmemory"><span>★ ' + favoriteCount + ' favorite' + (favoriteCount === 1 ? '' : 's') + '</span><span>Not for me: ' + dislikedCount + '</span></div>' +
        (dislikedCount ? '<div class="preflabel" style="margin-top:14px">Not-for-me memory <span>tap to let a meal return</span></div><div class="prefchips">' + (S.mealDislikedMeals || []).slice(-12).map(function (name) { return '<button class="ob-chip" data-action="allow-meal-again" data-meal-name="' + esc(name) + '">↺ ' + esc(name) + '</button>'; }).join('') + '</div>' : '') +
        '<p class="note" style="margin:10px 0 0">Favorites return when they fit. Thumbs-downed meals stay out until you allow them again. Batch prep changes servings and the shopping list so leftovers are not purchased twice.</p>' +
      '</article>';

    var canBuild = window.Cloud && Cloud.hasClaude && Cloud.hasClaude();
    var planButton = canBuild
      ? '<button class="btn block" data-action="build-meal-week" data-week="' + weekOf + '">' +
          (planned.length ? 'Rebuild this week' : 'Build my week') + '</button>' +
        '<p class="note" style="margin:10px 2px 0">The coach fills all 28 slots, then code verifies every day against your calorie/protein targets and repairs only days that fail.</p>'
      : '<article class="card pad"><p class="note">Add your Claude key in Settings to build a complete week automatically. You can still tap any empty slot and choose from your Cookbook.</p></article>';

    return UI.screen({
      tab: null, rest: 320, blur: true,
      header: { back: 'nutrition', title: 'Meal planner', right: '<div style="width:34px"></div>' },
      art: 'assets/art/provisions.webp', photoPosition: 'center 42%',
      overlay:
        '<div class="eyebrow">' + esc(weekName) + ' · ' + planned.length + ' of ' + totalSlots + ' meals planned</div>' +
        '<p class="verse">Breakfast, lunch, dinner and a snack — every day, with the recipe attached.</p>',
      body:
        preferencesCard +
        '<article class="card pad plannercontrols">' +
          '<div class="weeknav">' +
            '<button class="btn ghost sm" data-action="planner-week" data-week="' + Store.shift(weekOf, -7) + '">Previous</button>' +
            '<button class="btn ghost sm" data-action="planner-week" data-week="' + currentWeek + '">This week</button>' +
            '<button class="btn ghost sm" data-action="planner-week" data-week="' + Store.shift(weekOf, 7) + '">Next</button>' +
          '</div>' +
          '<div style="margin-top:13px">' + planButton + '</div>' +
        '</article>' +

        (weekVerification ? '<article class="card pad ' + (weekVerification.ok ? 'accent' : '') + '"><div class="kicker ' + (weekVerification.ok ? 'sage' : '') + '">Plan verification</div><p class="lede" style="margin:8px 0 0">' + (weekVerification.ok ? 'All seven days are mathematically verified for four meal slots, calorie range, protein target, and hard exclusions.' : weekVerification.invalid.length + ' day' + (weekVerification.invalid.length === 1 ? '' : 's') + ' currently need repair before this week is considered ready.') + '</p></article>' : '') +

        '<article class="card pad">' +
          '<div class="kicker">' + esc(weekName) + '</div>' +
          '<div class="plangrid">' + grid + '</div>' +
        '</article>' +

        (prepTimeline.length ? '<div class="rulehead"><span class="kicker">Prep timeline</span><span></span><span class="note">when to cook</span></div><article class="card rowlist">' + prepTimeline.map(function(day){ var dt=new Date(day.date+'T12:00:00').toLocaleDateString(undefined,{weekday:'long'}); return '<div class="row"><span class="thumb ghosticon">' + icon('fork') + '</span><span style="min-width:0"><h4>' + esc(dt) + (day.totalMinutes ? ' · ' + day.totalMinutes + ' min' : '') + '</h4><span class="macros">' + day.tasks.map(function(t){ return esc(t.name) + (t.batch ? ' · ' + t.servings + ' servings' : ''); }).join(' · ') + '</span></span></div>'; }).join('') + '</article>' : '') +

        '<div class="rulehead"><span class="kicker sage">Shopping list</span><span></span>' +
          '<span class="note">' + (shopList.length ? shopList.length + ' ingredients' : 'empty') + '</span></div>' +
        '<article class="card rowlist">' +
          (shopList.length
            ? shopList.map(function (it) {
                var on = !!ticked[it.name.toLowerCase()];
                var detail = it.amounts.length ? it.amounts.slice(0, 3).join(' + ') : (it.n > 1 ? it.n + ' meals' : '1 meal');
                return '<button class="shoprow' + (on ? ' done' : '') + '" data-action="tick-shop" data-item="' + esc(it.name) + '">' +
                  '<span class="tick">' + (on ? icon('check') : '') + '</span>' +
                  '<span class="shopname">' + esc(it.name) + '</span>' +
                  '<span class="note">' + esc(detail) + '</span>' +
                '</button>';
              }).join('')
            : '<div class="empty"><p class="note">Nothing on the list yet. Build the week or choose meals above and the ingredients collect here automatically. Pantry staples are left off the shopping list.</p></div>') +
        '</article>' +

        (planned.length
          ? '<button class="btn ghost block" data-action="clear-plan" data-week="' + weekOf + '">Clear this week</button>'
          : '')
    });
  }

  function plannedMeal() {
    var parts = location.hash.split('/');
    var date = decodeURIComponent(parts[1] || ''), slot = decodeURIComponent(parts[2] || '');
    var S=Store.state(), key = planKey(date, slot), m = (S.mealPlan || {})[key];
    if (!m) {
      return UI.screen({
        tab: null, rest: 240, blur: true,
        header: { back: 'planner', title: 'Recipe' },
        art: 'assets/art/provisions.webp', photoPosition: 'center 42%',
        overlay: '<p class="bigsub">That planned meal is no longer here.</p>',
        body: '<article class="card pad"><button class="btn ghost block" data-route="planner">Back to the week</button></article>'
      });
    }
    var when = new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    var items = m.items || [], steps = m.instructions || [];
    var canRecipe = window.Cloud && Cloud.hasClaude && Cloud.hasClaude();
    var favorite = isFavoriteMeal(m.name);
    var sharedTargets = window.Nutrition && Nutrition.sharedDinnerTargets ? Nutrition.sharedDinnerTargets() : null;
    var sharedCard = '';
    if (slot === 'Dinner') {
      if (m.sharedDinner && m.sharedDinner.portions) {
        var mep=m.sharedDinner.portions.me||{}, pp=m.sharedDinner.portions.partner||{};
        sharedCard='<article class="card pad accent"><div class="kicker sage">Shared Dinner</div><p class="lede" style="margin:8px 0 14px">One recipe. Two portions.</p><div class="recipefacts"><div><span class="note">Your portion</span><strong>'+Store.fmtEnergy(+mep.kcal||0)+' · '+Math.round(+mep.protein||0)+' g</strong></div><div><span class="note">'+esc(m.sharedDinner.partnerName||'Partner')+'&#39;s portion</span><strong>'+Store.fmtEnergy(+pp.kcal||0)+' · '+Math.round(+pp.protein||0)+' g</strong></div></div><p class="small" style="margin:12px 0 0">'+esc((mep.note||'Your personalized serving.')+' '+(pp.note||''))+'</p></article>';
      } else if (canRecipe) {
        sharedCard='<article class="card pad"><div class="kicker">Shared Dinner</div><p class="small" style="margin:8px 0 13px">Turn this into one household recipe with a portion for you and a portion for '+esc((S.partner&&S.partner.name)||'your partner')+'. '+(sharedTargets&&sharedTargets.partner?'Both dinner targets are available.':'Your partner must opt in to sharing a dinner-sized target first.')+'</p><button class="btn ghost block" data-action="build-shared-dinner" data-plan-key="'+esc(key)+'"'+(sharedTargets&&sharedTargets.partner?'':' disabled aria-disabled="true"')+'>Build Shared Dinner</button></article>';
      }
    }
    var photoCard =
      '<article class="card pad">' +
        '<div class="kicker">Finished plate</div>' +
        (m.photoId
          ? '<div class="mealprep-photo" data-photo="' + esc(m.photoId) + '"></div>' +
            '<div class="recipeactions"><button class="btn ghost sm" data-action="add-planned-photo" data-plan-key="' + esc(key) + '">Replace photo</button>' +
            '<button class="btn ghost sm" data-action="remove-planned-photo" data-plan-key="' + esc(key) + '">Remove photo</button></div>'
          : '<p class="small" style="margin:9px 0 13px">Once you make it, add your own finished photo. It stays on this device and is included in your private backup.</p>' +
            '<button class="btn ghost block" data-action="add-planned-photo" data-plan-key="' + esc(key) + '">Add finished photo</button>') +
      '</article>';
    return UI.screen({
      tab: null, rest: 320, blur: true,
      header: { back: 'planner', title: slot, right: '<div style="width:34px"></div>' },
      art: 'assets/art/provisions.webp', photoPosition: 'center 42%',
      overlay:
        '<div class="eyebrow">' + esc(when) + ' · ' + esc(slot) + '</div>' +
        '<p class="verse">' + esc(m.name) + '</p>' +
        '<p class="attrib" style="text-transform:none;letter-spacing:0">' + Store.fmtEnergy(+m.kcal || 0) + ' · ' + Math.round(+m.protein || 0) + ' g protein' +
          (m.prepMinutes ? ' · ' + m.prepMinutes + ' min' : '') + (m.cuisine ? ' · ' + esc(m.cuisine) : '') + '</p>',
      body:
        sharedCard +
        (m.leftoverOf ? '<article class="card pad accent"><div class="kicker sage">Leftover meal</div><p class="lede" style="margin:8px 0 0">Already cooked as part of ' + esc(m.leftoverOf) + '. Reheat and log it — no second grocery run.</p></article>' :
          m.batchSource ? '<article class="card pad accent"><div class="kicker sage">Batch prep</div><p class="lede" style="margin:8px 0 0">Cook ' + (m.servings || 1) + ' servings now. The extra portions are already placed into the week.</p></article>' : '') +
        '<article class="card pad">' +
          '<div class="kicker">Nutrition</div>' +
          '<div class="recipefacts">' +
            [['Energy', Store.fmtEnergy(+m.kcal || 0)], ['Protein', Math.round(+m.protein || 0) + ' g'],
             ['Carbs', Math.round(+m.carbs || 0) + ' g'], ['Fat', Math.round(+m.fat || 0) + ' g']].map(function (r) {
              return '<div><span class="note">' + r[0] + '</span><strong>' + r[1] + '</strong></div>';
            }).join('') +
          '</div>' +
          '<p class="small" style="margin:14px 0 0">' + (m.servings || 1) + ' planned serving' + ((m.servings || 1) === 1 ? '' : 's') +
            (m.recipeNote ? ' · ' + esc(m.recipeNote) : '') + '</p>' +
        '</article>' +

        '<article class="card pad">' +
          '<div class="kicker" style="margin-bottom:12px">Ingredients</div>' +
          (items.length
            ? '<div class="ingredientlist">' + items.map(function (it) {
                return '<div class="ingredientrow"><span>' + esc(it.name) + '</span><span class="note">' + esc((it.weight || '') + (m.batchSource && (m.servings || 1) > 1 ? ' × ' + m.servings : '')) + '</span></div>';
              }).join('') + '</div>'
            : '<p class="note">No ingredient list is attached yet.</p>') +
        '</article>' +

        '<article class="card pad">' +
          '<div class="kicker" style="margin-bottom:12px">Make it</div>' +
          (steps.length
            ? '<ol class="recipe-steps">' + steps.map(function (step) { return '<li>' + esc(step) + '</li>'; }).join('') + '</ol>'
            : '<p class="note">This saved meal does not have cooking steps yet.</p>' +
              (canRecipe ? '<button class="btn ghost block" data-action="write-planned-recipe" data-plan-key="' + esc(key) + '" style="margin-top:14px">Write the recipe</button>' : '')) +
        '</article>' +

        photoCard +
        '<div class="recipeactions full">' +
          '<button class="btn ghost" data-action="favorite-planned-meal" data-plan-key="' + esc(key) + '">' + (favorite ? '★ Favorited' : '☆ Favorite') + '</button>' +
          '<button class="btn ghost" data-action="dislike-planned-meal" data-plan-key="' + esc(key) + '">Not for me</button>' +
        '</div>' +
        (date === Store.todayKey()
          ? '<button class="btn block" data-action="log-planned-meal" data-plan-key="' + esc(key) + '">Log this meal today</button>'
          : '') +
        '<button class="btn ghost block" data-action="replace-planned-meal" data-plan-key="' + esc(key) + '">Replace this meal</button>' +
        '<button class="btn danger block" data-action="remove-planned-meal" data-plan-key="' + esc(key) + '">Remove from the week</button>'
    });
  }

  /* A day's meals read in the order they happened, not the order they were typed. */
  function byTime(meals) {
    return (meals || []).slice().sort(function (a, b) {
      return String(a.time || '').localeCompare(String(b.time || ''));
    });
  }

  /* ---- Meal history ------------------------------------------------------ */

  function history() {
    var days = Store.state().days;
    var keys = Object.keys(days).filter(function (k) { return (days[k].meals || []).length; }).sort().reverse();

    var total = keys.reduce(function (a, k) { return a + days[k].meals.length; }, 0);

    var blocks = keys.slice(0, 30).map(function (k) {
      var d = days[k];
      var t = d.meals.reduce(function (a, m) {
        return { k: a.k + (m.kcal || 0), p: a.p + (m.protein || 0) };
      }, { k: 0, p: 0 });
      var dt = new Date(k + 'T12:00:00');
      var label = dt.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
      return '<div class="rulehead"><span class="kicker">' + esc(label) + '</span><span></span>' +
          '<span class="note">' + Store.fmtEnergy(t.k) + ' &middot; ' + t.p + ' g</span></div>' +
        '<article class="card rowlist">' +
          byTime(d.meals).map(function (m) { return mealRow(m, { noThumb: true }); }).join('') +
        '</article>';
    }).join('');

    return UI.screen({
      tab: null, rest: 300, blur: true,
      header: { back: true, title: 'Meal history', right: '<div style="width:34px"></div>' },
      art: 'assets/art/provisions.webp', photoPosition: 'center 22%',
      overlay:
        '<div class="eyebrow">' + total + ' meals logged</div>' +
        '<p class="verse">' + (keys.length ? 'Across ' + keys.length + ' days.' : 'Nothing logged yet.') + '</p>',
      body: blocks || '<article class="card pad"><p class="note">Nothing logged yet.</p></article>'
    });
  }

  window.Screens = {
    notifications: notifications, pendingCount: pendingCount, notificationStatus: notificationStatus, markInformationalRead: markInformationalRead, meal: meal,
    handshake: handshake, routeName: routeName, earnedMoment: earnedMoment,
    legCount: function () { var r = route(); return r ? r.legs.length : 0; },
    legCountFor: function (id) { var r = ROUTES[id]; return r ? r.legs.length : 0; },
    home: home, journey: journey, coach: coach, nutrition: nutrition, train: train, together: together,
    settings: settings, body: body, photos: photos, capture: capture,
    record: record, workouts: workouts, cardio: cardio, arrival: arrival, checkpoint: checkpoint, expeditionComplete: expeditionComplete,
    records: records, badges: badges, reflection: reflection,
    trends: trends, planner: planner, plannedMeal: plannedMeal, cookbook: cookbook, history: history, calendar: calendar, dayHistory: dayHistory, weeklyReview: weeklyReview, swapExercise: swapExercise,
    exercises: exercises, exercise: exercise, session: session, sessionDone: sessionDone, trainDay: trainDay,
    route: route, leg: leg, verse: Store.verse
  };
})();
