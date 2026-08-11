/* Expedition catalog and route math. Phase 1 extraction: route content lives
   outside the screen renderer so Journey, Theme Engine, Base Camp rewards and
   future Field Guide data can share one source of truth. */
(function () {
  'use strict';

  var ROUTES = {
    camino: {
      name: 'Camino de Santiago', where: 'Navarre, Spain', grade: 'Moderate',
      banner: 'assets/art/camino/banner.webp',
      legs: [
        { from: 'Saint-Jean-Pied-de-Port', to: 'Roncesvalles', miles: 15.5, ft: 4100, art: 'assets/art/camino/saint-jean.webp' },
        { from: 'Roncesvalles', to: 'Zubiri', miles: 13.7, ft: 1300, art: 'assets/art/camino/roncesvalles.webp' },
        { from: 'Zubiri', to: 'Pamplona', miles: 13.0, ft: 1180, art: 'assets/art/camino/zubiri.webp' },
        { from: 'Pamplona', to: 'Puente la Reina', miles: 14.9, ft: 1700, art: 'assets/art/camino/pamplona.webp' },
        { from: 'Puente la Reina', to: 'Estella', miles: 13.7, ft: 1150, art: 'assets/art/camino/puente-la-reina.webp' },
        { from: 'Estella', to: 'Los Arcos', miles: 12.4, ft: 900, art: 'assets/art/camino/estella.webp' }
      ]
    },
    milford: {
      name: 'Milford Track', where: 'Fiordland, New Zealand', grade: 'Gentle',
      banner: 'assets/art/milford/banner.webp', climb: 3900,
      legs: [
        { from: 'Glade Wharf', to: 'Clinton Hut', miles: 3.1, art: 'assets/art/milford/glade-wharf.webp' },
        { from: 'Clinton Hut', to: 'Mintaro Hut', miles: 10.5, art: 'assets/art/milford/clinton-hut.webp' },
        { from: 'Mintaro Hut', to: 'Dumpling Hut', miles: 8.6, art: 'assets/art/milford/mintaro-hut.webp' },
        { from: 'Dumpling Hut', to: 'Sandfly Point', miles: 11.0, art: 'assets/art/milford/dumpling-hut.webp' }
      ]
    },
    grand: {
      name: 'Grand Canyon rim to rim', where: 'Arizona, United States', grade: 'Moderate',
      banner: 'assets/art/grand/banner.webp', climb: 10600,
      legs: [
        { from: 'North Rim', to: 'Cottonwood Camp', miles: 6.8, art: 'assets/art/grand/north-rim.webp' },
        { from: 'Cottonwood Camp', to: 'Phantom Ranch', miles: 7.2, art: 'assets/art/grand/cottonwood-camp.webp' },
        { from: 'Phantom Ranch', to: 'Indian Garden', miles: 4.7, art: 'assets/art/grand/phantom-ranch.webp' },
        { from: 'Indian Garden', to: 'South Rim', miles: 4.6, art: 'assets/art/grand/indian-garden.webp' }
      ]
    },
    inca: {
      name: 'Inca Trail to Machu Picchu', where: 'Cusco, Peru', grade: 'Moderate',
      banner: 'assets/art/inca/inca-trail-banner.webp',
      legs: [
        { from: 'Km 82', to: 'Wayllabamba', miles: 7.5, art: 'assets/art/inca/inca-trail-leg-1.webp' },
        { from: 'Wayllabamba', to: 'Pacaymayo', miles: 6.2, art: 'assets/art/inca/inca-trail-leg-2.webp' },
        { from: 'Pacaymayo', to: 'Wiñay Wayna', miles: 9.3, art: 'assets/art/inca/inca-trail-leg-3.webp' },
        { from: 'Wiñay Wayna', to: 'Machu Picchu', miles: 3.1, art: 'assets/art/inca/inca-trail-leg-4.webp' }
      ]
    },
    jesus: {
      name: 'Jesus Trail', where: 'Galilee, Israel', grade: 'Gentle',
      legs: [
        { from: 'Nazareth', to: 'Cana', miles: 8.7 },
        { from: 'Cana', to: 'Kibbutz Lavi', miles: 8.1 },
        { from: 'Lavi', to: 'Moshav Arbel', miles: 8.7 },
        { from: 'Arbel', to: 'Capernaum', miles: 14.5 }
      ]
    },
    sinai: {
      name: 'Mount Sinai', where: 'South Sinai, Egypt', grade: 'Moderate',
      legs: [
        { from: 'Saint Catherine’s Monastery', to: 'Elijah’s Basin', miles: 2.5 },
        { from: 'Elijah’s Basin', to: 'The summit', miles: 1.2 },
        { from: 'The summit', to: 'The Camel Path', miles: 4.3 }
      ]
    },
    montblanc: {
      name: 'Tour du Mont Blanc', where: 'France, Italy, Switzerland', grade: 'Hard',
      legs: [
        { from: 'Les Houches', to: 'Les Contamines', miles: 13.0 },
        { from: 'Les Contamines', to: 'Croix du Bonhomme', miles: 15.5 },
        { from: 'Croix du Bonhomme', to: 'Courmayeur', miles: 18.0 },
        { from: 'Courmayeur', to: 'Refuge Bonatti', miles: 12.4 },
        { from: 'Refuge Bonatti', to: 'La Fouly', miles: 14.9 },
        { from: 'La Fouly', to: 'Champex', miles: 13.7 },
        { from: 'Champex', to: 'Les Houches', miles: 17.5 }
      ]
    },
    muir: {
      name: 'John Muir Trail', where: 'Sierra Nevada, California', grade: 'Hard',
      legs: [
        { from: 'Happy Isles', to: 'Tuolumne Meadows', miles: 22 },
        { from: 'Tuolumne Meadows', to: 'Reds Meadow', miles: 37 },
        { from: 'Reds Meadow', to: 'Mono Creek', miles: 30 },
        { from: 'Mono Creek', to: 'Muir Trail Ranch', miles: 27 },
        { from: 'Muir Trail Ranch', to: 'LeConte Canyon', miles: 40 },
        { from: 'LeConte Canyon', to: 'Whitney Portal', miles: 55 }
      ]
    },
    paine: {
      name: 'Torres del Paine circuit', where: 'Patagonia, Chile', grade: 'Hard',
      legs: [
        { from: 'Laguna Amarga', to: 'Serón', miles: 8.7 },
        { from: 'Serón', to: 'Refugio Dickson', miles: 11.5 },
        { from: 'Dickson', to: 'John Gardner Pass', miles: 17.4 },
        { from: 'Grey Glacier', to: 'Paine Grande', miles: 18.5 },
        { from: 'Paine Grande', to: 'Base of the Towers', miles: 24.9 }
      ]
    },
    appalachian: {
      name: 'Appalachian Trail, southern section', where: 'Georgia to North Carolina', grade: 'Hard',
      legs: [
        { from: 'Springer Mountain', to: 'Hawk Mountain', miles: 8.1 },
        { from: 'Hawk Mountain', to: 'Neel Gap', miles: 23.5 },
        { from: 'Neel Gap', to: 'Unicoi Gap', miles: 20.5 },
        { from: 'Unicoi Gap', to: 'Dicks Creek Gap', miles: 17.3 },
        { from: 'Dicks Creek Gap', to: 'Bly Gap', miles: 10.9 },
        { from: 'Bly Gap', to: 'Standing Indian', miles: 12.4 },
        { from: 'Standing Indian', to: 'Wayah Bald', miles: 25.0 },
        { from: 'Wayah Bald', to: 'Nantahala Outdoor Center', miles: 19.3 }
      ]
    },
    kilimanjaro: {
      name: 'Kilimanjaro, Machame route', where: 'Tanzania', grade: 'Severe',
      legs: [
        { from: 'Machame Gate', to: 'Machame Camp', miles: 7.0 },
        { from: 'Machame Camp', to: 'Shira Camp', miles: 3.1 },
        { from: 'Shira Camp', to: 'Barranco', miles: 6.2 },
        { from: 'Barranco', to: 'Barafu', miles: 6.8 },
        { from: 'Barafu', to: 'Uhuru Peak', miles: 13.7 }
      ]
    },
    everest: {
      name: 'Everest Base Camp', where: 'Khumbu, Nepal', grade: 'Severe',
      legs: [
        { from: 'Lukla', to: 'Phakding', miles: 4.9 },
        { from: 'Phakding', to: 'Namche Bazaar', miles: 6.8 },
        { from: 'Namche Bazaar', to: 'Tengboche', miles: 6.2 },
        { from: 'Tengboche', to: 'Dingboche', miles: 7.1 },
        { from: 'Dingboche', to: 'Lobuche', miles: 5.0 },
        { from: 'Lobuche', to: 'Base Camp', miles: 8.1 },
        { from: 'Base Camp', to: 'Kala Patthar', miles: 10.0 },
        { from: 'Pheriche', to: 'Lukla', miles: 32 }
      ]
    }
  };


  /* Phase 5.3 — checkpoint/arrival asset manifest.
     The art paths below are intentionally reserved even before the files exist.
     UI.screen can layer a known-good fallback behind them, which lets the
     product ship now and lets finished art be dropped in later without another
     screen rewrite. Checkpoints are explicit because a few simplified routes
     have notable place-stops that are not one-to-one with leg endpoints. */
  var CHECKPOINT_CONFIG = {
    camino: [
      { name:'Saint-Jean-Pied-de-Port Trailhead', unlockAfterLeg:-1, primary:true },
      { name:'Roncesvalles', unlockAfterLeg:0, primary:true },
      { name:'Zubiri', unlockAfterLeg:1, primary:true },
      { name:'Pamplona', unlockAfterLeg:2, primary:true },
      { name:'Puente la Reina', unlockAfterLeg:3, primary:true },
      { name:'Estella', unlockAfterLeg:4, primary:true },
      { name:'Los Arcos', unlockAfterLeg:5, primary:true }
    ],
    milford: [
      { name:'Glade Wharf', unlockAfterLeg:-1, primary:true },
      { name:'Clinton Hut', unlockAfterLeg:0, primary:true },
      { name:'Mintaro Hut', unlockAfterLeg:1, primary:true },
      { name:'Dumpling Hut', unlockAfterLeg:2, primary:true },
      { name:'Sandfly Point', unlockAfterLeg:3, primary:true }
    ],
    grand: [
      { name:'North Rim Trailhead', unlockAfterLeg:-1, primary:true },
      { name:'Cottonwood Camp', unlockAfterLeg:0, primary:true },
      { name:'Phantom Ranch', unlockAfterLeg:1, primary:true },
      { name:'Indian Garden', unlockAfterLeg:2, primary:true },
      { name:'South Rim', unlockAfterLeg:3, primary:true }
    ],
    inca: [
      { name:'Km 82 Trailhead', unlockAfterLeg:-1, primary:true },
      { name:'Wayllabamba', unlockAfterLeg:0, primary:true },
      { name:'Pacaymayo', unlockAfterLeg:1, primary:true },
      { name:'Wiñay Wayna', unlockAfterLeg:2, primary:true },
      { name:'Machu Picchu', unlockAfterLeg:3, primary:true }
    ],
    jesus: [
      { name:'Nazareth Trail Start', unlockAfterLeg:-1, primary:true },
      { name:'Cana', unlockAfterLeg:0, primary:true },
      { name:'Kibbutz Lavi', unlockAfterLeg:1, primary:true },
      { name:'Moshav Arbel', unlockAfterLeg:2, primary:true },
      { name:'Capernaum', unlockAfterLeg:3, primary:true }
    ],
    sinai: [
      { name:"Saint Catherine’s Monastery Trail Start", unlockAfterLeg:-1, primary:true },
      { name:"Elijah’s Basin", unlockAfterLeg:0, primary:true },
      { name:'Mount Sinai Summit', unlockAfterLeg:1, primary:true },
      { name:'Camel Path', unlockAfterLeg:2, primary:true }
    ],
    montblanc: [
      { name:'Les Houches — Start', unlockAfterLeg:-1, primary:true },
      { name:'Les Contamines', unlockAfterLeg:0, primary:true },
      { name:'Croix du Bonhomme', unlockAfterLeg:1, primary:true },
      { name:'Courmayeur', unlockAfterLeg:2, primary:true },
      { name:'Refuge Bonatti', unlockAfterLeg:3, primary:true },
      { name:'La Fouly', unlockAfterLeg:4, primary:true },
      { name:'Champex', unlockAfterLeg:5, primary:true },
      { name:'Les Houches — Return', unlockAfterLeg:6, primary:true }
    ],
    muir: [
      { name:'Happy Isles Trailhead', unlockAfterLeg:-1, primary:true },
      { name:'Tuolumne Meadows', unlockAfterLeg:0, primary:true },
      { name:'Reds Meadow', unlockAfterLeg:1, primary:true },
      { name:'Mono Creek', unlockAfterLeg:2, primary:true },
      { name:'Muir Trail Ranch', unlockAfterLeg:3, primary:true },
      { name:'LeConte Canyon', unlockAfterLeg:4, primary:true },
      { name:'Whitney Portal', unlockAfterLeg:5, primary:true }
    ],
    paine: [
      { name:'Laguna Amarga', unlockAfterLeg:-1, primary:true },
      { name:'Serón', unlockAfterLeg:0, primary:true },
      { name:'Refugio Dickson', unlockAfterLeg:1, primary:true },
      { name:'John Gardner Pass', unlockAfterLeg:2, primary:true },
      { name:'Grey Glacier', unlockAfterLeg:2, primary:false },
      { name:'Paine Grande', unlockAfterLeg:3, primary:true },
      { name:'Base of the Towers', unlockAfterLeg:4, primary:true }
    ],
    appalachian: [
      { name:'Springer Mountain Trail Start', unlockAfterLeg:-1, primary:true },
      { name:'Hawk Mountain', unlockAfterLeg:0, primary:true },
      { name:'Neel Gap', unlockAfterLeg:1, primary:true },
      { name:'Unicoi Gap', unlockAfterLeg:2, primary:true },
      { name:'Dicks Creek Gap', unlockAfterLeg:3, primary:true },
      { name:'Bly Gap', unlockAfterLeg:4, primary:true },
      { name:'Standing Indian', unlockAfterLeg:5, primary:true },
      { name:'Wayah Bald', unlockAfterLeg:6, primary:true },
      { name:'Nantahala Outdoor Center', unlockAfterLeg:7, primary:true }
    ],
    kilimanjaro: [
      { name:'Machame Gate', unlockAfterLeg:-1, primary:true },
      { name:'Machame Camp', unlockAfterLeg:0, primary:true },
      { name:'Shira Camp', unlockAfterLeg:1, primary:true },
      { name:'Barranco', unlockAfterLeg:2, primary:true },
      { name:'Barafu', unlockAfterLeg:3, primary:true },
      { name:'Uhuru Peak', unlockAfterLeg:4, primary:true }
    ],
    everest: [
      { name:'Lukla — Start', unlockAfterLeg:-1, primary:true },
      { name:'Phakding', unlockAfterLeg:0, primary:true },
      { name:'Namche Bazaar', unlockAfterLeg:1, primary:true },
      { name:'Tengboche', unlockAfterLeg:2, primary:true },
      { name:'Dingboche', unlockAfterLeg:3, primary:true },
      { name:'Lobuche', unlockAfterLeg:4, primary:true },
      { name:'Everest Base Camp', unlockAfterLeg:5, primary:true },
      { name:'Kala Patthar', unlockAfterLeg:6, primary:true },
      { name:'Pheriche', unlockAfterLeg:6, primary:false },
      { name:'Lukla — Return', unlockAfterLeg:7, primary:true }
    ]
  };

  var SECTION_KEYS = ['home','journey','train','nutrition','together','coach','base-camp','arrival'];

  /* Optional time-aware Home packs. Routes stay on sections/home.webp until
     all four states are delivered; this prevents half-finished expeditions
     from falling through to missing art. Grand Canyon is the first complete
     time-aware Home pack. */
  var HOME_TIME_PACKS = { grand:true };

  function pad2(n) { return String(Math.max(0, Math.round(+n || 0))).padStart(2, '0'); }
  function sectionArt(routeId, surface) {
    routeId = String(routeId || ''); surface = String(surface || '');
    if (!ROUTES[routeId] || SECTION_KEYS.indexOf(surface) < 0) return '';
    return 'assets/art/' + routeId + '/sections/' + surface + '.webp';
  }
  function homeArt(routeId, timeOfDay) {
    routeId = String(routeId || '');
    if (!ROUTES[routeId]) return '';
    if (!HOME_TIME_PACKS[routeId]) return sectionArt(routeId, 'home');
    var t = String(timeOfDay || 'day');
    if (t !== 'dawn' && t !== 'day' && t !== 'sunset' && t !== 'night') t = 'day';
    return 'assets/art/' + routeId + '/sections/home-' + t + '.webp';
  }

  function travelArt(routeId, legIndex) {
    routeId = String(routeId || '');
    if (!ROUTES[routeId]) return '';
    legIndex = Math.max(0, Math.round(+legIndex || 0));
    if (!ROUTES[routeId].legs[legIndex]) return '';
    return 'assets/art/' + routeId + '/travel/leg-' + pad2(legIndex + 1) + '.webp';
  }
  function checkpoints(routeId) {
    routeId = String(routeId || '');
    var source = CHECKPOINT_CONFIG[routeId] || [];
    return source.map(function (cp, i) {
      return {
        index: i,
        name: cp.name,
        unlockAfterLeg: +cp.unlockAfterLeg,
        primary: cp.primary !== false,
        art: 'assets/art/' + routeId + '/checkpoints/checkpoint-' + pad2(i) + '.webp'
      };
    });
  }
  function checkpoint(routeId, index) {
    var list = checkpoints(routeId);
    index = Math.max(0, Math.round(+index || 0));
    return list[index] || null;
  }
  function checkpointsForLeg(routeId, legIndex) {
    legIndex = Math.round(+legIndex || 0);
    return checkpoints(routeId).filter(function (cp) { return cp.unlockAfterLeg === legIndex; });
  }
  function primaryCheckpointForLeg(routeId, legIndex) {
    var list = checkpointsForLeg(routeId, legIndex);
    return list.filter(function (cp) { return cp.primary; })[0] || list[0] || null;
  }
  function cumulativeMilesToCheckpoint(routeId, checkpointIndex) {
    var r = ROUTES[String(routeId || '')], cp = checkpoint(routeId, checkpointIndex);
    if (!r || !cp || cp.unlockAfterLeg < 0) return 0;
    return +r.legs.slice(0, Math.min(r.legs.length, cp.unlockAfterLeg + 1))
      .reduce(function (sum, leg) { return sum + (+leg.miles || 0); }, 0).toFixed(1);
  }

  var ROUTE_ORDER = ['camino', 'milford', 'grand', 'inca', 'jesus', 'sinai',
    'montblanc', 'muir', 'paine', 'appalachian', 'kilimanjaro', 'everest'];
  var GRADES = ['Gentle', 'Moderate', 'Hard', 'Severe'];

  function get(id) { return ROUTES[String(id || '')] || null; }
  function miles(routeOrId) {
    var r = typeof routeOrId === 'string' ? get(routeOrId) : routeOrId;
    return r && Array.isArray(r.legs) ? r.legs.reduce(function (sum, leg) { return sum + (+leg.miles || 0); }, 0) : 0;
  }
  function climb(routeOrId) {
    var r = typeof routeOrId === 'string' ? get(routeOrId) : routeOrId;
    if (!r || !Array.isArray(r.legs)) return null;
    var all = r.legs.length && r.legs.every(function (leg) { return typeof leg.ft === 'number'; });
    if (all) return r.legs.reduce(function (sum, leg) { return sum + leg.ft; }, 0);
    return typeof r.climb === 'number' ? r.climb : null;
  }
  function hero(routeOrId) {
    var r = typeof routeOrId === 'string' ? get(routeOrId) : routeOrId;
    return r ? ((r.legs && r.legs[0] && r.legs[0].art) || r.banner || null) : null;
  }

  window.Journeys = {
    version: 2,
    ROUTES: ROUTES, ORDER: ROUTE_ORDER, GRADES: GRADES,
    get: get, miles: miles, climb: climb, hero: hero,
    sectionArt: sectionArt, homeArt: homeArt, travelArt: travelArt,
    checkpoints: checkpoints, checkpoint: checkpoint,
    checkpointsForLeg: checkpointsForLeg, primaryCheckpointForLeg: primaryCheckpointForLeg,
    cumulativeMilesToCheckpoint: cumulativeMilesToCheckpoint
  };
})();
