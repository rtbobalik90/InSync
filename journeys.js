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

  window.Journeys = { ROUTES: ROUTES, ORDER: ROUTE_ORDER, GRADES: GRADES, get: get, miles: miles, climb: climb, hero: hero };
})();
