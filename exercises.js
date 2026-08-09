/* The exercise library. Every entry is backed by an animated WebP that exists in
   assets/exercises, so a plan can never name a movement with no picture. */
(function () {
  'use strict';

  // id, name, group, equipment, sets, reps
  var LIST = [
    ['dumbbell-chest-press', 'Dumbbell chest press', 'Chest', 'Dumbbell', 3, '8–10'],
    ['push-ups', 'Push-ups', 'Chest', 'Bodyweight', 3, '10–15'],

    ['pulldown-machine', 'Pulldown machine', 'Back', 'Machine', 3, '10–12'],
    ['lat-pulldown-cable', 'Lat pulldown', 'Back', 'Cable', 3, '10–12'],
    ['cable-row', 'Seated cable row', 'Back', 'Cable', 3, '10–12'],
    ['assisted-pull-up', 'Assisted pull-up', 'Back', 'Machine', 3, '6–10'],
    ['pull-up-bar', 'Pull-up', 'Back', 'Bodyweight', 3, 'to failure'],

    ['shoulder-press-machine', 'Shoulder press machine', 'Shoulders', 'Machine', 3, '8–10'],
    ['dumbbell-shoulder-press', 'Dumbbell shoulder press', 'Shoulders', 'Dumbbell', 3, '8–10'],
    ['smith-shoulder-press', 'Smith shoulder press', 'Shoulders', 'Barbell', 3, '8–10'],
    ['lateral-raise', 'Lateral raise', 'Shoulders', 'Dumbbell', 3, '12–15'],

    ['biceps-curl-machine', 'Biceps curl machine', 'Arms', 'Machine', 3, '10–12'],
    ['cable-curls', 'Cable curls', 'Arms', 'Cable', 3, '10–12'],
    ['hammer-curls', 'Hammer curls', 'Arms', 'Dumbbell', 3, '10–12'],
    ['alternating-curls', 'Alternating curls', 'Arms', 'Dumbbell', 3, '10–12'],
    ['incline-curls', 'Incline curls', 'Arms', 'Dumbbell', 3, '10–12'],
    ['preacher-curls', 'Preacher curls', 'Arms', 'Machine', 3, '10–12'],
    ['concentration-curls', 'Concentration curls', 'Arms', 'Dumbbell', 3, '12'],
    ['triceps-pushdown', 'Triceps pushdown', 'Arms', 'Cable', 3, '10–12'],
    ['triceps-machine', 'Triceps machine', 'Arms', 'Machine', 3, '10–12'],
    ['triceps-cable-extension', 'Triceps cable extension', 'Arms', 'Cable', 3, '12'],
    ['triceps-kickback', 'Triceps kickback', 'Arms', 'Dumbbell', 3, '12'],
    ['triceps-seated-extension', 'Seated triceps extension', 'Arms', 'Dumbbell', 3, '10–12'],

    ['horizontal-leg-press', 'Horizontal leg press', 'Legs', 'Machine', 3, '10–12'],
    ['linear-leg-press', 'Linear leg press', 'Legs', 'Machine', 3, '10–12'],
    ['leg-extension', 'Leg extension', 'Legs', 'Machine', 3, '12'],
    ['calf-extension', 'Calf extension', 'Legs', 'Machine', 3, '15'],
    ['glute-machine', 'Glute machine', 'Legs', 'Machine', 3, '12'],
    ['cable-hip-extension', 'Cable hip extension', 'Legs', 'Cable', 3, '12'],
    ['squats', 'Squats', 'Legs', 'Bodyweight', 3, '12–15'],
    ['lunges', 'Lunges', 'Legs', 'Bodyweight', 3, '10 each'],

    ['plank', 'Plank', 'Core', 'Bodyweight', 3, '45 sec'],
    ['elbow-to-knee', 'Elbow to knee', 'Core', 'Bodyweight', 3, '15 each'],
    ['side-bends', 'Side bends', 'Core', 'Dumbbell', 3, '15 each'],

    ['jumping-jacks', 'Jumping jacks', 'Warm-up', 'Bodyweight', 1, '60 sec'],
    ['high-knees', 'High knees', 'Warm-up', 'Bodyweight', 1, '30 sec'],
    ['butt-kickers', 'Butt kickers', 'Warm-up', 'Bodyweight', 1, '30 sec'],
    ['fast-feet', 'Fast feet', 'Warm-up', 'Bodyweight', 1, '30 sec'],
    ['arm-circles', 'Arm circles', 'Warm-up', 'Bodyweight', 1, '30 sec'],
    ['inchworm', 'Inchworm', 'Warm-up', 'Bodyweight', 1, '8'],
    ['windmills', 'Windmills', 'Warm-up', 'Bodyweight', 1, '10 each']
  ];

  var BY_ID = {}, BY_NAME = {};
  var ALL = LIST.map(function (e) {
    var o = {
      id: e[0], name: e[1], group: e[2], equipment: e[3],
      sets: e[4], reps: e[5],
      gif: 'assets/exercises/' + e[0] + '.webp'
    };
    BY_ID[o.id] = o;
    BY_NAME[o.name.toLowerCase()] = o;
    return o;
  });

  var GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Warm-up'];

  function get(id) { return BY_ID[id] || null; }
  function byName(name) { return BY_NAME[String(name || '').trim().toLowerCase()] || null; }
  function expand(ids) {
    return (ids || []).map(get).filter(Boolean);
  }
  /* Same group, same equipment where possible — what you reach for when
     someone is already on the machine. */
  function alternatives(id) {
    var e = get(id);
    if (!e) return [];
    return ALL.filter(function (x) { return x.group === e.group && x.id !== e.id; }).slice(0, 4);
  }
  function byGroup() {
    return GROUPS.map(function (g) {
      return { name: g, items: ALL.filter(function (e) { return e.group === g; }) };
    }).filter(function (g) { return g.items.length; });
  }

  window.Exercises = {
    all: ALL, get: get, byName: byName, expand: expand, alternatives: alternatives,
    byGroup: byGroup, groups: GROUPS
  };
})();
