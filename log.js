/* Logging sheets — meals, workouts, weight, steps.
   Every sheet writes through Store; nothing here holds state of its own. */
(function () {
  'use strict';

  var esc = UI.esc, icon = UI.icon;
  var host = document.createElement('div');
  host.id = 'modal';
  document.body.appendChild(host);

  var open = null;   // { kind, draft }

  function nowTime() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function slotForNow() {
    var h = new Date().getHours();
    if (h < 10) return 'Breakfast';
    if (h < 15) return 'Lunch';
    if (h < 18) return 'Snack';
    return 'Dinner';
  }

  /* Meals eaten before, most frequent first. Re-logging is the common case. */
  function recentMeals() {
    var days = Store.state().days, seen = {}, out = [];
    Object.keys(days).sort().reverse().forEach(function (k) {
      (days[k].meals || []).forEach(function (m) {
        if (!m.name || !m.kcal) return;   // nothing to re-log
        var id = m.name.toLowerCase();
        if (seen[id]) { seen[id].n++; return; }
        seen[id] = { n: 1, meal: m };
        out.push(seen[id]);
      });
    });
    return out.sort(function (a, b) { return b.n - a.n; }).slice(0, 6).map(function (r) { return r.meal; });
  }

  function field(label, key, value, unit, mode) {
    return '<label class="field">' +
      '<span class="field-label">' + esc(label) + (unit ? ' <em>' + esc(unit) + '</em>' : '') + '</span>' +
      '<input class="field-input" data-draft="' + key + '" value="' + esc(value == null ? '' : value) + '" ' +
        'inputmode="' + (mode || 'decimal') + '" ' + (mode === 'text' ? 'type="text"' : 'type="text"') + ' />' +
    '</label>';
  }

  function energyField(key, kcal) {
    return field('Energy', key, Store.energyNum(kcal), Store.state().units.energy)
      .replace('data-draft="' + key + '"', 'data-draft="' + key + '" data-energy="1"');
  }

  function seg(key, options, active) {
    return '<div class="seg">' + options.map(function (o) {
      return '<button type="button" class="' + (o === active ? 'on' : '') + '" data-draft="' + key + '" data-value="' + esc(o) + '">' + esc(o) + '</button>';
    }).join('') + '</div>';
  }

  // ---------------- meal ----------------
  function mealSheet(d) {
    var recent = recentMeals();
    var ai = Cloud.hasClaude()
      ? '<div class="rulehead tight"><span class="kicker">Let the coach read it</span><span></span></div>' +
        '<div class="aibox">' +
          '<input type="text" class="field-input plain" data-draft="describe" value="' + esc(d.describe || '') + '" placeholder="Two eggs, oats, a handful of berries" autocomplete="off" />' +
          '<div class="btnrow" style="margin-top:9px">' +
            '<button type="button" class="btn ghost sm" data-ai="text">Read that</button>' +
            '<button type="button" class="btn ghost sm" data-ai="photo">Photograph it</button>' +
          '</div>' +
          (d.aiNote ? '<p class="small" style="margin:10px 0 0">' + esc(d.aiNote) + '</p>' : '') +
          (d.items && d.items.length
            ? '<div class="ailist">' + d.items.map(function (it) {
                return '<div class="airow"><span>' + esc(it.name) + (it.weight ? ' <em>' + esc(it.weight) + '</em>' : '') + '</span><span class="num">' + Store.energyNum(it.kcal || 0).toLocaleString() + '</span></div>';
              }).join('') + '</div>'
            : '') +
        '</div>'
      : '';

    return sheet('Log a meal', d.name || 'What did you eat?',
      (recent.length
        ? '<div class="rulehead tight"><span class="kicker">Logged before</span><span></span></div>' +
          '<div class="quickwrap">' + recent.map(function (m, i) {
            return '<button type="button" class="quick" data-quick="' + i + '">' +
              '<span class="quick-name">' + esc(m.name) + '</span>' +
              '<span class="quick-macros">' + Store.fmtEnergy(m.kcal) + ' &middot; ' + m.protein + ' g</span>' +
            '</button>';
          }).join('') + '</div>'
        : '') +
      ai +
      '<div class="rulehead tight"><span class="kicker">This meal</span><span></span></div>' +
      field('Name', 'name', d.name, '', 'text') +
      field('What is in it', 'ingredients', d.ingredients, 'for the shopping list', 'text') +
      '<div class="field"><span class="field-label">When</span>' + seg('slot', ['Breakfast', 'Lunch', 'Dinner', 'Snack'], d.slot) + '</div>' +
      '<div class="fieldgrid">' +
        energyField('kcal', d.kcal) +
        field('Protein', 'protein', d.protein, 'g') +
        field('Carbs', 'carbs', d.carbs, 'g') +
        field('Fat', 'fat', d.fat, 'g') +
      '</div>' +
      (d.note ? '<p class="small warn" style="margin:10px 2px 0">' + esc(d.note) + '</p>' : ''),
      'Save meal');
  }

  // ---------------- workout ----------------
  function todaysMachines() {
    var S = Store.state(), plan = S.plan || [];
    var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var name = DOW[new Date().getDay()];
    for (var i = 0; i < plan.length; i++) {
      if (plan[i].day === name && plan[i].name !== 'Walk') {
        var ids = plan[i].ex;
        var names = ids && ids.length
          ? Exercises.expand(ids).map(function (e) { return e.name; })
          : (plan[i].detail || '').split(' \u00b7 ').filter(Boolean);
        return { name: plan[i].name, machines: names };
      }
    }
    return null;
  }

  /* Last weight and reps logged on a machine, so the user types the change, not the number. */
  function lastFor(machine) {
    var days = Store.state().days, keys = Object.keys(days).sort().reverse();
    for (var i = 0; i < keys.length; i++) {
      var ws = days[keys[i]].workouts || [];
      for (var j = ws.length - 1; j >= 0; j--) {
        var ex = (ws[j].exercises || []).filter(function (e) { return e.name === machine; })[0];
        if (ex) return ex;
      }
    }
    return null;
  }

  function workoutSheet(d) {
    var rows = d.exercises.map(function (ex, i) {
      var last = lastFor(ex.name);
      return '<div class="exrow">' +
        '<div class="exname">' + esc(ex.name) +
          (last ? '<span class="exlast">last ' + Store.fmtLift(last.weight) + ' &times; ' + last.reps + '</span>' : '<span class="exlast">first time</span>') +
          '<button type="button" class="exdrop" data-exdrop="' + i + '" aria-label="Remove ' + esc(ex.name) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="exfields">' +
          '<label><span>' + Store.state().units.weight + '</span><input class="field-input sm" data-ex="' + i + '.weight" value="' + esc(ex.weight) + '" inputmode="decimal" /></label>' +
          '<label><span>reps</span><input class="field-input sm" data-ex="' + i + '.reps" value="' + esc(ex.reps) + '" inputmode="numeric" /></label>' +
          '<label><span>sets</span><input class="field-input sm" data-ex="' + i + '.sets" value="' + esc(ex.sets) + '" inputmode="numeric" /></label>' +
        '</div>' +
      '</div>';
    }).join('');

    /* The machine you meant to use is often taken. Anything in the library can
       be added, and a planned one you skipped can be dropped. */
    var picker = '<label class="field"><span class="field-label">Add a machine</span>' +
      '<select class="field-input" data-addex>' +
        '<option value="">Choose one\u2026</option>' +
        Exercises.byGroup().map(function (g) {
          return '<optgroup label="' + esc(g.name) + '">' +
            g.items.map(function (e) {
              return '<option value="' + esc(e.id) + '">' + esc(e.name) + '</option>';
            }).join('') + '</optgroup>';
        }).join('') +
      '</select></label>';

    return sheet('Log a session', d.name || 'Session',
      field('Session', 'name', d.name, '', 'text') +
      field('Minutes', 'minutes', d.minutes, 'min', 'numeric') +
      (rows
        ? '<div class="rulehead tight"><span class="kicker">Machines</span><span class="note">leave blank to skip</span></div>' + rows
        : '<p class="small" style="margin:4px 2px">Nothing planned for today. Add what you used, or log the time on its own.</p>') +
      picker +
      (d.note ? '<p class="small warn" style="margin:10px 2px 0">' + esc(d.note) + '</p>' : ''),
      'Save session');
  }

  // ---------------- morning ----------------
  function morningSheet(d) {
    var y = Store.state().days[Store.shift(Store.todayKey(), -1)];
    var lastW = y && y.weight;
    return sheet('This morning', 'Three numbers before breakfast.',
      field('Weight', 'weight', d.weight, Store.state().units.weight) +
      (lastW ? '<p class="small" style="margin:-4px 2px 12px">Yesterday ' + Store.fmtWeight(lastW) + '</p>' : '') +
      '<div class="fieldgrid">' +
        field('Resting heart rate', 'restingHr', d.restingHr, 'bpm', 'numeric') +
        field('Sleep', 'sleepHr', d.sleepHr, 'hours') +
      '</div>' +
      '<p class="small" style="margin:8px 2px 0">Skip any of them. A gap is shown as a gap, not smoothed over.</p>' +
      (d.note ? '<p class="small warn" style="margin:10px 2px 0">' + esc(d.note) + '</p>' : ''),
      'Save the morning');
  }

  // ---------------- steps ----------------
  function stepsSheet(d) {
    var t = Store.state().targets.steps;
    return sheet('Steps today', 'What does your phone say?',
      field('Steps', 'steps', d.steps, '', 'numeric') +
      '<p class="small" style="margin:8px 2px 0">Target is ' + t.toLocaleString() + '. Walking distance also moves the expedition.</p>',
      'Save steps');
  }

  // ---------------- shell ----------------
  function sheet(title, lede, body, cta) {
    return '<div class="modal-scrim" data-close></div>' +
      '<div class="modal-card" role="dialog" aria-modal="true">' +
        '<div class="modal-head">' +
          '<span class="kicker">' + esc(title) + '</span>' +
          '<button type="button" class="modal-x" data-close aria-label="Close">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<p class="lede" style="margin:0 0 16px">' + esc(lede) + '</p>' +
          body +
        '</div>' +
        '<div class="modal-foot">' +
          '<button type="button" class="btn block" data-save>' + esc(cta) + '</button>' +
        '</div>' +
      '</div>';
  }

  // ---------------- barcode ----------------
  function barcodeSheet(d) {
    var found = d.found;
    return sheet('Scan a barcode', found ? found.name : 'Type the number under the bars',
      '<div class="aibox">' +
        '<input type="text" class="field-input plain" data-draft="code" value="' + esc(d.code || '') + '" ' +
          'inputmode="numeric" placeholder="0 12345 67890 5" autocomplete="off" />' +
        '<div class="btnrow" style="margin-top:9px">' +
          '<button type="button" class="btn ghost sm" data-scanbar="1">' + icon('barcode') + ' Scan it</button>' +
          '<button type="button" class="btn ghost sm" data-lookup="1">Look it up</button>' +
        '</div>' +
        (d.note ? '<p class="small" style="margin:10px 0 0">' + esc(d.note) + '</p>' : '') +
        (found
          ? '<div class="ailist"><div class="airow"><span>' + esc(found.name) +
              ' <em>' + esc(found.serving || '') + '</em></span>' +
              '<span class="num">' + Store.energyNum(found.kcal).toLocaleString() + '</span></div></div>'
          : '') +
      '</div>' +
      '<p class="small" style="margin:4px 2px 0">Scanning works where the browser supports it. Otherwise photograph the label, or type the number beneath the bars.</p>' +
      '<div class="rulehead tight"><span class="kicker">This meal</span><span></span></div>' +
      field('Name', 'name', d.name, '', 'text') +
      field('What is in it', 'ingredients', d.ingredients, 'for the shopping list', 'text') +
      '<div class="field"><span class="field-label">When</span>' + seg('slot', ['Breakfast', 'Lunch', 'Dinner', 'Snack'], d.slot) + '</div>' +
      '<div class="fieldgrid">' +
        energyField('kcal', d.kcal) +
        field('Protein', 'protein', d.protein, 'g') +
        field('Carbs', 'carbs', d.carbs, 'g') +
        field('Fat', 'fat', d.fat, 'g') +
      '</div>' +
      (d.note ? '<p class="small warn" style="margin:10px 2px 0">' + esc(d.note) + '</p>' : ''),
      'Save meal');
  }

  // ---------------- restaurant ----------------
  function restaurantSheet(d) {
    var local = Foods.search(d.q);
    var groups = d.remote ? [d.remote] : local;

    var list = groups.length
      ? groups.map(function (r) {
          return '<div class="rulehead tight"><span class="kicker">' + esc(r.name || r.place) + '</span><span></span></div>' +
            r.items.map(function (i) {
              var id = (r.name || r.place) + '|' + i.name;
              var fit=window.Nutrition&&Nutrition.eatingOutFit?Nutrition.eatingOutFit(i):null;
              return '<button type="button" class="menurow' + (d.picked === id ? ' on' : '') + '" data-pick="' + esc(id) + '">' +
                '<span><span class="menuname">' + esc(i.name) + '</span>' +
                  '<span class="quick-macros">' + i.protein + ' g protein &middot; ' + i.carbs + ' g carbs &middot; ' + i.fat + ' g fat' + (fit ? ' &middot; ' + esc(fit.label) : '') + '</span></span>' +
                '<span class="num">' + Store.energyNum(i.kcal).toLocaleString() + '</span></button>';
            }).join('');
        }).join('')
      : '';

    var ask = Cloud.hasClaude()
      ? '<div class="btnrow" style="margin-top:9px">' +
          '<button type="button" class="btn ghost sm" data-finddish="1">Find this dish</button>' +
          '<button type="button" class="btn ghost sm" data-menu="1">' +
            (d.q.trim() ? 'Whole menu' : 'Ask for a menu') + '</button>' +
        '</div>'
      : '';

    var remaining=window.Nutrition&&Nutrition.eatingOutFit?Nutrition.eatingOutFit({kcal:0,protein:0}):null;
    return sheet('Eating out', d.name || 'Where are you?',
      (remaining ? '<div class="aibox"><div class="kicker">Fit it into today</div><p class="small" style="margin:8px 0 0">About ' + Store.fmtEnergy(remaining.kcalLeft) + ' and ' + remaining.proteinLeft + ' g protein remain in today&#39;s targets. Restaurant nutrition can be estimated, so review the numbers before saving.</p></div>' : '') +
      '<div class="aibox">' +
        '<input type="text" class="field-input plain" data-draft="q" value="' + esc(d.q || '') + '" ' +
          'placeholder="Cracker Barrel, Chipotle, the diner on Main" autocomplete="off" />' +
        '<input type="text" class="field-input plain" data-draft="dish" value="' + esc(d.dish || '') + '" ' +
          'placeholder="Grilled chicken tenders" autocomplete="off" style="margin-top:8px" />' +
        ask +
        (d.note ? '<p class="small" style="margin:10px 0 0">' + esc(d.note) + '</p>' : '') +
      '</div>' +
      (list
        ? '<div class="menulist">' + list + '</div>' +
          (d.remote ? '<p class="small" style="margin:2px 2px 8px">Estimated by the coach. Correct anything that looks off before saving.</p>' : '')
        : '<p class="small" style="margin:8px 2px">' +
            (Cloud.hasClaude()
              ? 'Nothing local matched. Ask the coach and it will work out the menu.'
              : 'Nothing matched, and there is no Claude key set. Type the dish into the fields below and it still counts.') +
          '</p>') +
      '<div class="rulehead tight"><span class="kicker">This meal</span><span></span></div>' +
      field('Name', 'name', d.name, '', 'text') +
      field('What is in it', 'ingredients', d.ingredients, 'for the shopping list', 'text') +
      '<div class="field"><span class="field-label">When</span>' + seg('slot', ['Breakfast', 'Lunch', 'Dinner', 'Snack'], d.slot) + '</div>' +
      '<div class="fieldgrid">' +
        energyField('kcal', d.kcal) +
        field('Protein', 'protein', d.protein, 'g') +
        field('Carbs', 'carbs', d.carbs, 'g') +
        field('Fat', 'fat', d.fat, 'g') +
      '</div>' +
      (d.note ? '<p class="small warn" style="margin:10px 2px 0">' + esc(d.note) + '</p>' : ''),
      'Save meal');
  }

  // ---------------- scan (photograph → pins on the plate) ----------------
  var CORNERS = [
    { key: 'tl', ax: 21, ay: 10 },
    { key: 'tr', ax: 79, ay: 10 },
    { key: 'bl', ax: 21, ay: 90 },
    { key: 'br', ax: 79, ay: 90 }
  ];

  /* Each pinned ingredient gets its own corner — the one in its own quadrant if it is
     free, otherwise the nearest one left. Labels never sit on the food. */
  function assignCorners(items) {
    var taken = {}, out = [];
    items.forEach(function (it) {
      var want = (it.y < 50 ? 't' : 'b') + (it.x < 50 ? 'l' : 'r');
      var pick = null;
      if (!taken[want]) pick = want;
      else {
        var best = Infinity;
        CORNERS.forEach(function (c) {
          if (taken[c.key]) return;
          var dx = c.ax - it.x, dy = c.ay - it.y, dist = dx * dx + dy * dy;
          if (dist < best) { best = dist; pick = c.key; }
        });
      }
      if (pick) { taken[pick] = 1; out.push(pick); } else out.push(null);
    });
    return out;
  }

  function scanSheet(d) {
    var pinned = d.items.filter(function (i) { return typeof i.x === 'number' && typeof i.y === 'number'; }).slice(0, 4);
    var corners = assignCorners(pinned);
    var byKey = {};
    corners.forEach(function (c, i) { if (c) byKey[c] = pinned[i]; });

    var leaders = CORNERS.map(function (c) {
      var it = byKey[c.key];
      if (!it) return '';
      var idx = pinned.indexOf(it);
      return '<line x1="' + c.ax + '%" y1="' + c.ay + '%" x2="' + it.x + '%" y2="' + it.y + '%" ' +
        'style="animation-delay:' + (idx * 0.55 + 0.2) + 's" />';
    }).join('');

    var dots = pinned.map(function (it, i) {
      return '<span class="scandot" style="left:' + it.x + '%;top:' + it.y + '%;animation-delay:' + (i * 0.55) + 's"></span>';
    }).join('');

    var labels = CORNERS.map(function (c) {
      var it = byKey[c.key];
      if (!it) return '';
      var idx = pinned.indexOf(it);
      return '<span class="scanlabel ' + c.key + '" style="animation-delay:' + (idx * 0.55 + 0.34) + 's">' +
        esc(it.name) + '</span>';
    }).join('');

    var rows = d.items.map(function (it, i) {
      return '<div class="ingwrap">' +
        '<button type="button" class="ingdel" data-drop="' + i + '">' + icon('trash') + ' Remove</button>' +
        '<div class="ingrow' + (d.swiped === i ? ' open' : '') + '" data-ing="' + i + '">' +
          '<div style="min-width:0">' +
            '<div class="ingname">' + esc(it.name) +
              (it.weight ? ' <em>' + esc(it.weight) + '</em>' : '') + '</div>' +
            '<div class="quick-macros">' + Math.round(it.protein || 0) + ' g protein &middot; ' +
              Math.round(it.carbs || 0) + ' g carbs &middot; ' + Math.round(it.fat || 0) + ' g fat</div>' +
          '</div>' +
          '<span class="num">' + Store.energyNum(it.kcal || 0).toLocaleString() + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    var ghosts = d.state === 'analysing'
      ? '<div class="ghostrows"><span></span><span></span></div>' : '';

    var heading = d.state === 'analysing'
      ? 'Found so far' : (d.items.length ? 'Ingredients' : 'Nothing read');
    var count = d.state === 'analysing'
      ? d.items.length + ' so far'
      : d.items.length + (d.items.length === 1 ? ' ingredient' : ' ingredients');

    return '<div class="modal-scrim" data-close></div>' +
      '<div class="modal-card scan" role="dialog" aria-modal="true">' +
        '<div class="scanwrap">' +
          '<div class="scanphoto" style="background-image:url(\'' + d.photo + '\')"></div>' +
          '<svg class="scanleaders" preserveAspectRatio="none">' + leaders + '</svg>' +
          dots + labels +
          (d.state === 'analysing'
            ? '<div class="scanreading"><span class="pulse"></span>Reading the plate</div>' : '') +
          '<button type="button" class="scanclose" data-close>' + icon('close') + '</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="scanhead">' +
            '<div style="min-width:0">' +
              '<div class="kicker">' + esc(d.slot) + '</div>' +
              '<h3 class="scanname">' + esc(d.name || 'Reading\u2026') + '</h3>' +
            '</div>' +
            '<div class="scantotal' + (d.state === 'analysing' ? ' dim' : '') + '">' +
              '<span class="num big">' + Store.energyNum(d.kcal || 0).toLocaleString() + '</span><span class="small">' + Store.state().units.energy + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="fieldgrid three">' +
            '<div class="mini"><span>Protein</span><b>' + (d.protein || 0) + 'g</b></div>' +
            '<div class="mini"><span>Carbs</span><b>' + (d.carbs || 0) + 'g</b></div>' +
            '<div class="mini"><span>Fat</span><b>' + (d.fat || 0) + 'g</b></div>' +
          '</div>' +
          '<div class="rulehead tight"><span class="kicker">' + esc(heading) + '</span>' +
            '<span class="small">' + esc(count) + '</span></div>' +
          '<div class="inglist">' + rows + ghosts + '</div>' +
          (d.state === 'analysing' ? '' :
            '<button type="button" class="btn ghost block sm" data-scanadd style="margin-top:12px">' +
              'Something missing?' +
            '</button>') +
          (d.state !== 'analysing' && !d.items.length
            ? '<p class="small" style="margin:10px 2px 0">That is all it could read. Add the rest by hand, ' +
              'or retake the photograph in better light.</p>'
            : '') +
          (d.note ? '<p class="small" style="margin:8px 2px 0">' + esc(d.note) + '</p>' : '') +
          '<div class="field"><span class="field-label">When</span>' +
            seg('slot', ['Breakfast', 'Lunch', 'Dinner', 'Snack'], d.slot) + '</div>' +
          '<div class="fieldgrid">' +
            energyField('kcal', d.kcal) +
            field('Protein', 'protein', d.protein, 'g') +
            field('Carbs', 'carbs', d.carbs, 'g') +
            field('Fat', 'fat', d.fat, 'g') +
          '</div>' +
        '</div>' +
        '<div class="modal-foot scanfoot">' +
          '<button class="btn block" data-save>Save meal</button>' +
          '<button class="btn ghost" data-retake>Retake</button>' +
        '</div>' +
      '</div>';
  }

  var BUILD = { meal: mealSheet, workout: workoutSheet, morning: morningSheet, steps: stepsSheet,
    barcode: barcodeSheet, restaurant: restaurantSheet, scan: scanSheet };

  function draftFor(kind) {
    var d = Store.day();
    if (kind === 'meal') return { name: '', slot: slotForNow(), kcal: '', protein: '', carbs: '', fat: '', describe: '', ingredients: '', items: [], aiNote: '', note: '' };
    if (kind === 'barcode') return { code: '', name: '', slot: slotForNow(), kcal: '', protein: '', carbs: '', fat: '', note: '', found: null };
    if (kind === 'restaurant') return { q: '', dish: '', picked: '', remote: null, note: '', name: '', slot: slotForNow(), kcal: '', protein: '', carbs: '', fat: '' };
    if (kind === 'scan') return { photo: '', state: 'analysing', name: '', slot: slotForNow(), kcal: '', protein: '', carbs: '', fat: '', items: [], note: '', swiped: -1 };
    if (kind === 'workout') {
      var t = todaysMachines();
      return {
        name: t ? t.name + ' day' : 'Session',
        minutes: '', note: '',
        exercises: (t ? t.machines : []).map(function (m) {
          var last = lastFor(m);
          return { name: m, weight: last ? Store.liftNum(last.weight) : '', reps: last ? last.reps : '', sets: last ? last.sets : 3 };
        })
      };
    }
    if (kind === 'morning') return { weight: d.weight == null ? '' : Store.weightNum(d.weight, Store.state().units.weight === 'kg' ? 1 : 0), restingHr: d.restingHr || '', sleepHr: d.sleepHr || '', note: '' };
    return { steps: d.steps || '' };
  }

  /* A refusal stops being true the moment the user changes something. Remove it from
     the page directly rather than repainting, which would drop the caret. */
  function clearNote() {
    if (!open || !open.draft || !open.draft.note) return;
    open.draft.note = '';
    var el = host.querySelector('.small.warn');
    if (el) el.remove();
  }

  var lastPaintKind = '';
  function paint() {
    var sameKind = !!open && lastPaintKind === open.kind;
    var oldBody = sameKind ? host.querySelector('.modal-body') : null;
    var oldMenu = sameKind ? host.querySelector('.menulist') : null;
    var bodyTop = oldBody ? oldBody.scrollTop : 0;
    var menuTop = oldMenu ? oldMenu.scrollTop : 0;

    if (!open) {
      host.innerHTML = '';
      host.classList.remove('on');
      lastPaintKind = '';
      return;
    }
    host.innerHTML = BUILD[open.kind](open.draft);
    host.classList.add('on');
    lastPaintKind = open.kind;

    /* Repainting a logging sheet after a picker/toggle/AI result used to reset
       both the sheet and nested restaurant menu to the top. Preserve those
       positions for same-kind repaints. Only a newly opened sheet receives the
       initial autofocus, because refocusing the first field on every repaint is
       another way iOS scrolls the modal back upward. */
    if (sameKind && (bodyTop || menuTop)) {
      requestAnimationFrame(function () {
        var body = host.querySelector('.modal-body');
        var menu = host.querySelector('.menulist');
        if (body && bodyTop) body.scrollTop = Math.min(bodyTop, Math.max(0, body.scrollHeight - body.clientHeight));
        if (menu && menuTop) menu.scrollTop = Math.min(menuTop, Math.max(0, menu.scrollHeight - menu.clientHeight));
      });
    }
    var first = host.querySelector('.field-input');
    if (!sameKind && first && open.kind !== 'workout') setTimeout(function () { first.focus(); }, 60);
  }

  function start(kind, opts) {
    open = { kind: kind, draft: draftFor(kind) };
    opts = opts || {};
    if (opts.slot && open.draft && Object.prototype.hasOwnProperty.call(open.draft, 'slot') &&
        ['Breakfast', 'Lunch', 'Dinner', 'Snack'].indexOf(opts.slot) >= 0) open.draft.slot = opts.slot;
    paint();
  }
  function close() { open = null; paint(); }

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function nonneg(v) { return Math.max(0, num(v)); }
  function anyNegative(values) { return values.some(function (v) { return v !== '' && num(v) < 0; }); }

  function commit() {
    var d = open.draft;
    if (open.kind === 'meal' || open.kind === 'barcode' || open.kind === 'restaurant' || open.kind === 'scan') {
      if (anyNegative([d.kcal, d.protein, d.carbs, d.fat])) {
        d.note = 'Energy and macros cannot be negative. Correct the figures before saving.';
        paint(); return;
      }
      if (!d.name.trim() && !num(d.kcal)) {
        d.note = 'Give it a name or a calorie figure, otherwise there is nothing to log.';
        paint(); return;
      }
      var mealData = {
        name: d.name.trim() || 'Meal', slot: d.slot, time: nowTime(),
        kcal: Math.round(nonneg(d.kcal)), protein: Math.round(nonneg(d.protein)),
        carbs: Math.round(nonneg(d.carbs)), fat: Math.round(nonneg(d.fat)),
        items: mealItems(d), source: open.kind === 'restaurant' ? 'restaurant' : (open.kind === 'barcode' ? 'barcode' : open.kind === 'scan' ? 'photo' : 'manual')
      };
      if (d.photo) {
        var mealPhotoId = 'meal-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
        Media.put(mealPhotoId, d.photo, function (photoErr) {
          if (photoErr) {
            d.note = 'The meal is ready, but its photograph could not be saved. Try the photograph again before saving.';
            paint(); return;
          }
          mealData.photoId = mealPhotoId;
          Store.addMeal(mealData);
          close();
        });
        return;
      }
      Store.addMeal(mealData);
    } else if (open.kind === 'workout') {
      var hasNegativeLift = anyNegative([d.minutes].concat(d.exercises.reduce(function (a, e) {
        return a.concat([e.weight, e.reps, e.sets]);
      }, [])));
      if (hasNegativeLift) {
        d.note = 'Workout minutes, weight, reps, and sets cannot be negative.';
        paint(); return;
      }
      var did = d.exercises.filter(function (e) { return nonneg(e.weight) > 0 || nonneg(e.reps) > 0; });
      if (!nonneg(d.minutes) && !did.length) {
        d.note = 'Log the minutes, or what you lifted on at least one machine.';
        paint(); return;
      }
      Store.addWorkout({
        name: d.name.trim() || 'Session',
        minutes: Math.round(nonneg(d.minutes)),
        exercises: did.map(function (e) { return { name: e.name, weight: Store.weightToLb(nonneg(e.weight)) || 0, reps: nonneg(e.reps), sets: nonneg(e.sets) || 3 }; })
      });
    } else if (open.kind === 'morning') {
      if (d.weight === '' && d.restingHr === '' && d.sleepHr === '') {
        d.note = 'Fill in at least one of the three.';
        paint(); return;
      }
      var weight = d.weight === '' ? null : Store.weightToLb(num(d.weight));
      var restingHr = d.restingHr === '' ? null : num(d.restingHr);
      var sleepHr = d.sleepHr === '' ? null : num(d.sleepHr);
      if (weight != null && (weight < 20 || weight > 1500)) { d.note = 'Enter a realistic weight in ' + Store.state().units.weight + '.'; paint(); return; }
      if (restingHr != null && (restingHr < 20 || restingHr > 300)) { d.note = 'Enter a resting heart rate between 20 and 300 bpm.'; paint(); return; }
      if (sleepHr != null && (sleepHr < 0 || sleepHr > 24)) { d.note = 'Sleep must be between 0 and 24 hours.'; paint(); return; }
      Store.setMorning({
        weight: weight,
        restingHr: restingHr == null ? null : Math.round(restingHr),
        sleepHr: sleepHr
      });
    } else {
      if (d.steps !== '' && num(d.steps) < 0) { d.note = 'Steps cannot be negative.'; paint(); return; }
      Store.setSteps(Math.round(nonneg(d.steps)));
    }
    close();
  }

  host.addEventListener('click', function (e) {
    if (!open) return;
    if (e.target.closest('[data-close]')) { close(); return; }
    if (e.target.closest('[data-save]')) { commit(); return; }

    var scanadd = e.target.closest('[data-scanadd]');
    if (scanadd) {
      var nm = prompt('What did it miss?');
      if (nm && nm.trim()) {
        open.draft.items.push({ name: nm.trim(), weight: '', kcal: 0, protein: 0, carbs: 0, fat: 0 });
        retotal();
        paint();
      }
      return;
    }

    var exdrop = e.target.closest('[data-exdrop]');
    if (exdrop) {
      open.draft.exercises.splice(+exdrop.getAttribute('data-exdrop'), 1);
      clearNote();
      paint();
      return;
    }

    var q = e.target.closest('[data-quick]');
    if (q) {
      var m = recentMeals()[+q.getAttribute('data-quick')];
      open.draft = { name: m.name, slot: slotForNow(), kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat };
      paint();
      return;
    }

    var s = e.target.closest('.seg button');
    if (s) { open.draft[s.getAttribute('data-draft')] = s.getAttribute('data-value'); paint(); return; }

    var pick = e.target.closest('[data-pick]');
    if (pick) {
      var parts = pick.getAttribute('data-pick').split('|');
      var pool = open.draft.remote
        ? [{ name: open.draft.remote.place || open.draft.remote.name, items: open.draft.remote.items }]
        : Foods.restaurants;
      var rs = pool.filter(function (r) { return r.name === parts[0]; })[0];
      var item = rs && rs.items.filter(function (i) { return i.name === parts[1]; })[0];
      if (item) {
        open.draft.picked = parts.join('|');
        open.draft.name = parts[0] + ' \u2014 ' + item.name;
        open.draft.kcal = item.kcal; open.draft.protein = item.protein;
        open.draft.carbs = item.carbs; open.draft.fat = item.fat;
        paint();
      }
      return;
    }

    var drop = e.target.closest('[data-drop]');
    if (drop) {
      open.draft.items.splice(+drop.getAttribute('data-drop'), 1);
      open.draft.swiped = -1;
      retotal();
      paint();
      return;
    }

    if (e.target.closest('[data-retake]')) { close(); pickPhoto(); return; }

    var ing = e.target.closest('[data-ing]');
    if (ing) {
      var n = +ing.getAttribute('data-ing');
      open.draft.swiped = open.draft.swiped === n ? -1 : n;
      paint();
      return;
    }

    var scan = e.target.closest('[data-scanbar]');
    if (scan) { scanBarcode(scan); return; }

    var find = e.target.closest('[data-finddish]');
    if (find) {
      var pl = (open.draft.q || '').trim(), dish = (open.draft.dish || '').trim();
      if (!pl || !dish) { open.draft.note = 'Both the place and the dish, then it can look.'; paint(); return; }
      find.disabled = true; find.textContent = 'Looking\u2026';
      Cloud.menuItem(pl, dish, function (err, data) {
        if (err) { open.draft.note = err.message; paint(); return; }
        var it = data.items[0];
        open.draft.remote = data;
        open.draft.note = '';
        open.draft.name = (data.place || pl) + ' \u2014 ' + it.name;
        open.draft.kcal = Math.round(it.kcal); open.draft.protein = Math.round(it.protein);
        open.draft.carbs = Math.round(it.carbs); open.draft.fat = Math.round(it.fat);
        open.draft.picked = (data.place || pl) + '|' + it.name;
        paint();
      });
      return;
    }

    var menu = e.target.closest('[data-menu]');
    if (menu) {
      var place = (open.draft.q || '').trim();
      if (!place) { open.draft.note = 'Type where you are first.'; paint(); return; }
      menu.disabled = true; menu.textContent = 'Working out the menu\u2026';
      Cloud.restaurantMenu(place, function (err, data) {
        if (err) { open.draft.note = err.message; open.draft.remote = null; paint(); return; }
        open.draft.remote = data;
        open.draft.note = '';
        paint();
      });
      return;
    }

    var lk = e.target.closest('[data-lookup]');
    if (lk) {
      var code = (open.draft.code || '').trim();
      lk.disabled = true; lk.textContent = 'Looking…';
      Foods.lookupBarcode(code, function (err, prod) {
        lk.disabled = false; lk.textContent = 'Look it up';
        if (err) { open.draft.note = err.message; open.draft.found = null; paint(); return; }
        open.draft.found = prod;
        open.draft.note = '';
        open.draft.name = prod.name;
        open.draft.kcal = prod.kcal; open.draft.protein = prod.protein;
        open.draft.carbs = prod.carbs; open.draft.fat = prod.fat;
        paint();
      });
      return;
    }

    var ai = e.target.closest('[data-ai]');
    if (ai) {
      if (ai.getAttribute('data-ai') === 'photo') return pickPhoto();
      var text = (open.draft.describe || '').trim();
      if (!text) return;
      runAi(ai, function (done) { Cloud.parseMeal(text, done); });
    }
  });

  function pickPhoto() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        Media.shrink(r.result, 1100, 0.8, function (err, small) { startScan(err ? r.result : small); });
      };
      r.readAsDataURL(f);
    };
    input.click();
  }

  function startScan(dataUrl) {
    open = { kind: 'scan', draft: draftFor('scan') };
    open.draft.photo = dataUrl;
    paint();
    Cloud.parseMealPhoto(dataUrl, function (err, data) {
      if (!open || open.kind !== 'scan') return;
      var d = open.draft;
      d.state = 'result';
      if (err) {
        d.note = err.message + ' Fill the fields in yourself \u2014 the photograph is still attached and will be saved with the meal.';
        d.name = d.name || 'Meal';
        paint();
        return;
      }
      d.name = data.name || 'Meal';
      d.items = (data.items || []).map(function (i) {
        return {
          name: i.name, weight: i.weight || '',
          kcal: nonneg(i.kcal), protein: nonneg(i.protein), carbs: nonneg(i.carbs), fat: nonneg(i.fat),
          x: typeof i.x === 'number' ? Math.max(7, Math.min(93, i.x)) : null,
          y: typeof i.y === 'number' ? Math.max(9, Math.min(91, i.y)) : null
        };
      });
      if (d.items.length) retotal();
      else {
        d.kcal = Math.round(nonneg(data.kcal)); d.protein = Math.round(nonneg(data.protein));
        d.carbs = Math.round(nonneg(data.carbs)); d.fat = Math.round(nonneg(data.fat));
        d.note = 'It could not name anything on the plate. The totals are its best estimate \u2014 correct them below.';
      }
      if (d.items.length === 1) d.note = 'That is all it could read. Add the rest by hand, or retake the photograph.';
      paint();
    });
  }

  /* Totals are the sum of the ingredients, so removing a wrong one actually changes them. */
  function retotal() {
    var d = open.draft;
    var t = d.items.reduce(function (a, i) {
      a.kcal += i.kcal || 0; a.protein += i.protein || 0; a.carbs += i.carbs || 0; a.fat += i.fat || 0;
      return a;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    d.kcal = Math.round(t.kcal); d.protein = Math.round(t.protein);
    d.carbs = Math.round(t.carbs); d.fat = Math.round(t.fat);
  }

  /* Barcode: use the browser's own detector where it exists, and fall back to
     photographing the label and letting Claude read the digits. Typing always works. */
  function scanBarcode(btn) {
    if (!('BarcodeDetector' in window)) return barcodePhoto();
    var stream, video, raf, det;
    try {
      det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
    } catch (e) { return barcodePhoto(); }

    var wrap = document.createElement('div');
    wrap.className = 'camwrap';
    wrap.innerHTML = '<video playsinline muted></video>' +
      '<div class="camframe"></div>' +
      '<p class="camhint">Hold the barcode inside the frame</p>' +
      '<button type="button" class="btn ghost sm camcancel">Type it instead</button>';
    document.body.appendChild(wrap);
    video = wrap.querySelector('video');

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }
    wrap.querySelector('.camcancel').onclick = stop;

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(function (s) {
        stream = s; video.srcObject = s; video.play();
        (function tick() {
          raf = requestAnimationFrame(tick);
          if (video.readyState !== 4) return;
          det.detect(video).then(function (codes) {
            if (!codes.length) return;
            var code = codes[0].rawValue.replace(/\D/g, '');
            stop();
            if (!open) return;
            open.draft.code = code;
            paint();
            var lk = host.querySelector('[data-lookup]');
            if (lk) lk.click();
          }).catch(function () {});
        })();
      })
      .catch(function () { stop(); barcodePhoto(); });
  }

  /* No detector, or camera refused: photograph the label instead. */
  function barcodePhoto() {
    if (!Cloud.hasClaude()) {
      if (open) { open.draft.note = 'This browser cannot scan barcodes. Type the number beneath the bars.'; paint(); }
      return;
    }
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
    input.onchange = function () {
      var f = input.files && input.files[0];
      if (!f || !open) return;
      var r = new FileReader();
      r.onload = function () {
        open.draft.note = 'Reading the label\u2026'; paint();
        Cloud.readBarcodePhoto(r.result, function (err, code) {
          if (!open) return;
          if (err) { open.draft.note = err.message; paint(); return; }
          open.draft.code = code; open.draft.note = ''; paint();
          var lk = host.querySelector('[data-lookup]');
          if (lk) lk.click();
        });
      };
      r.readAsDataURL(f);
    };
    input.click();
  }

  /* Swipe an ingredient left to reveal Remove. Tap does the same on a desktop. */
  var touchX = 0, touchRow = null;
  host.addEventListener('touchstart', function (e) {
    var row = e.target.closest('.ingrow');
    if (!row) return;
    touchRow = row; touchX = e.touches[0].clientX;
  }, { passive: true });

  host.addEventListener('touchmove', function (e) {
    if (!touchRow) return;
    var dx = e.touches[0].clientX - touchX;
    if (dx < 0) touchRow.style.transform = 'translateX(' + Math.max(-104, dx) + 'px)';
  }, { passive: true });

  host.addEventListener('touchend', function (e) {
    if (!touchRow) return;
    var dx = (e.changedTouches[0].clientX - touchX);
    var n = +touchRow.getAttribute('data-ing');
    touchRow.style.transform = '';
    open.draft.swiped = dx < -40 ? n : -1;
    touchRow = null;
    paint();
  });

  function runAi(btn, fn) {
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Reading…';
    fn(function (err, data) {
      btn.disabled = false;
      btn.textContent = label;
      applyAi(err, data);
    });
  }

  function applyAi(err, data) {
    if (err) { open.draft.aiNote = err.message; paint(); return; }
    var d = open.draft;
    d.name = data.name || d.name;
    d.kcal = Math.round(data.kcal || 0);
    d.protein = Math.round(data.protein || 0);
    d.carbs = Math.round(data.carbs || 0);
    d.fat = Math.round(data.fat || 0);
    d.items = data.items || [];
    d.aiNote = d.items.length
      ? d.items.length + (d.items.length === 1 ? ' ingredient read. Correct anything below before saving.' : ' ingredients read. Correct anything below before saving.')
      : 'Estimated. Correct anything below before saving.';
    paint();
  }

  /* Redraws just the menu list and the ask button, so typing keeps focus. */
  function refreshMenu() {
    var wrap = host.querySelector('.menulist');
    var d = open.draft;
    if (wrap && !d.remote) {
      wrap.innerHTML = Foods.search(d.q).map(function (r) {
        return '<div class="rulehead tight"><span class="kicker">' + esc(r.name) + '</span><span></span></div>' +
          r.items.map(function (i) {
            var id = r.name + '|' + i.name;
            return '<button type="button" class="menurow' + (d.picked === id ? ' on' : '') + '" data-pick="' + esc(id) + '">' +
              '<span><span class="menuname">' + esc(i.name) + '</span>' +
                '<span class="quick-macros">' + i.protein + ' g protein &middot; ' + i.carbs + ' g carbs &middot; ' + i.fat + ' g fat</span></span>' +
              '<span class="num">' + Store.energyNum(i.kcal).toLocaleString() + '</span></button>';
          }).join('');
      }).join('');
    }
    var ask = host.querySelector('[data-menu]');
    if (ask && !ask.disabled) {
      ask.textContent = d.q.trim() ? 'Whole menu' : 'Ask for a menu';
    }
  }

  host.addEventListener('change', function (e) {
    if (!open) return;
    var add = e.target.closest('[data-addex]');
    if (!add || !add.value) return;
    var ex = Exercises.get(add.value);
    add.value = '';
    if (!ex) return;
    var already = open.draft.exercises.some(function (r) { return r.name === ex.name; });
    if (already) { open.draft.note = ex.name + ' is already on the list.'; paint(); return; }
    var last = lastFor(ex.name);
    open.draft.exercises.push({
      name: ex.name,
      weight: last ? Store.liftNum(last.weight) : '', reps: last ? last.reps : '', sets: last ? last.sets : 3
    });
    clearNote();
    paint();
  });

  host.addEventListener('input', function (e) {
    if (!open) return;
    var el = e.target;
    clearNote();
    var k = el.getAttribute('data-draft');
    if (k) {
      open.draft[k] = el.hasAttribute('data-energy') ? Store.energyToKcal(el.value) : el.value;
      // Live-filter the local menu without repainting the sheet (which would drop focus).
      if (open.kind === 'restaurant' && k === 'q') refreshMenu();
      return;
    }
    var ex = el.getAttribute('data-ex');
    if (ex) {
      var parts = ex.split('.');
      open.draft.exercises[+parts[0]][parts[1]] = el.value;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (open && e.key === 'Escape') close();
  });


  /* ---- Planner: choose a meal for a slot -------------------------------- */
  var pendingSlot = null;

  function pickForSlot(slotKey) {
    pendingSlot = slotKey;
    location.hash = '#cookbook';
  }

  function assignPlanned(raw) {
    var meal;
    try { meal = JSON.parse(raw); } catch (e) { return; }
    if (!pendingSlot) {
      // Not planning — treat a cookbook tap as a quick re-log.
      Store.addMeal({
        name: meal.name, slot: meal.slot || 'Meal',
        kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat,
        items: meal.items || null
      });
      location.hash = '#nutrition';
      return;
    }
    var plan = Object.assign({}, Store.state().mealPlan || {});
    var parts = pendingSlot.split('|'), date = parts[0], slot = parts[1] || meal.slot || 'Dinner';
    meal = Object.assign({}, meal, { date: date, slot: slot, source: meal.source || 'saved', photoId: '' });
    plan[pendingSlot] = meal;
    Store.set('mealPlan', plan);
    if (date && Store.weekStart) Store.set('mealPlannerWeek', Store.weekStart(date));
    pendingSlot = null;
    location.hash = '#planner';
  }


  /* What goes on the shopping list. The scan finds ingredients; a typed
     description is split on commas; otherwise the dish stands for itself. */
  function mealItems(d) {
    if (d.items && d.items.length) {
      return d.items.map(function (it) {
        return {
          name: it.name, weight: it.weight || '',
          kcal: Math.round(nonneg(it.kcal)), protein: Math.round(nonneg(it.protein)),
          carbs: Math.round(nonneg(it.carbs)), fat: Math.round(nonneg(it.fat))
        };
      });
    }
    var text = (d.ingredients || '').trim() || (d.describe || '').trim();
    if (text) {
      var parts = text.split(/,| and | with /i)
        .map(function (p) { return p.trim().replace(/^(a|an|some|two|three|four|a handful of)\s+/i, ''); })
        .filter(function (p) { return p.length > 1; });
      if (parts.length) {
        return parts.map(function (p) {
          return { name: p.charAt(0).toUpperCase() + p.slice(1), weight: '', kcal: 0, protein: 0, carbs: 0, fat: 0 };
        });
      }
    }
    return null;
  }

  window.Log = {
    pickForSlot: pickForSlot, assignPlanned: assignPlanned, open: start, close: close,
    scan: startScan, photograph: pickPhoto };
})();
