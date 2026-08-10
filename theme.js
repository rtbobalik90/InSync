/* Theme loader foundation. The default world is complete today; expedition
   packs can register overrides later without changing screen markup. */
(function () {
  'use strict';

  var packs = Object.create(null);
  packs.base = {
    id: 'base',
    name: 'Base Camp',
    assets: {
      home: 'assets/art/camp-day.webp',
      coach: 'assets/art/coach-desk.webp',
      journey: 'assets/art/expedition-overlook.webp',
      train: 'assets/art/train-banner.webp',
      nutrition: 'assets/art/provisions.webp',
      together: 'assets/art/campfire.webp'
    }
  };

  function cleanPack(pack) {
    if (!pack || typeof pack !== 'object' || !/^[a-z0-9-]{1,80}$/.test(String(pack.id || ''))) return null;
    return {
      id: String(pack.id),
      name: String(pack.name || pack.id).slice(0, 100),
      assets: Object.assign({}, pack.assets || {}),
      palette: Object.assign({}, pack.palette || {}),
      meta: Object.assign({}, pack.meta || {})
    };
  }

  function register(pack) {
    var clean = cleanPack(pack);
    if (!clean) return false;
    packs[clean.id] = clean;
    return true;
  }

  function activeId() {
    if (window.Store && Store.state) {
      var s = Store.state();
      var id = s && s.expedition && s.expedition.routeId;
      if (id && packs[id]) return id;
    }
    return 'base';
  }

  function active() { return packs[activeId()] || packs.base; }
  function resolve(surface, fallback) {
    var p = active();
    return (p.assets && p.assets[surface]) || (packs.base.assets && packs.base.assets[surface]) || fallback || '';
  }
  function get(id) { return packs[id] || null; }

  /* Route packs begin as a Journey-only override. Phase 6 can add palette,
     Home, Coach, Training, Nutrition and arrival assets to the same manifest. */
  if (window.Journeys) Journeys.ORDER.forEach(function (id) {
    var r = Journeys.get(id);
    if (!r) return;
    register({ id: id, name: r.name, assets: { journey: r.banner || Journeys.hero(r) || packs.base.assets.journey } });
  });

  window.InSyncTheme = { version: 1, register: register, active: active, resolve: resolve, get: get };
})();
