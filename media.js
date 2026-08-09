/* Photographs. Two jobs: shrink what the camera gives us, and keep progress
   photos out of localStorage — a phone photo is several megabytes and the
   quota is five, so a dozen would break the whole store. Progress photos live
   in IndexedDB as blobs; only their dates are kept in the store. */
(function () {
  'use strict';

  var DB = 'insync-photos', SHELF = 'photos', db = null;
  var MAX_PHOTO_CHARS = 12 * 1024 * 1024;

  function validPhotoData(value) {
    return typeof value === 'string' && value.length > 30 && value.length <= MAX_PHOTO_CHARS &&
      /^data:image\/(?:jpeg|jpg|png|webp|gif|heic|heif);base64,/i.test(value);
  }
  function validatePhotoMap(map) {
    if (!map || Object.prototype.toString.call(map) !== '[object Object]') return new Error('The photograph backup is not valid.');
    var keys = Object.keys(map);
    if (keys.length > 2000) return new Error('That backup contains too many photographs to restore safely.');
    for (var i = 0; i < keys.length; i++) {
      if (!keys[i] || keys[i].length > 240 || !validPhotoData(map[keys[i]])) return new Error('That backup contains an invalid photograph.');
    }
    return null;
  }

  function open(cb) {
    if (db) return cb(null, db);
    if (!window.indexedDB) return cb(new Error('This browser cannot store photographs.'));
    var req = indexedDB.open(DB, 1);
    req.onupgradeneeded = function () {
      if (!req.result.objectStoreNames.contains(SHELF)) req.result.createObjectStore(SHELF);
    };
    req.onsuccess = function () {
      db = req.result;
      db.onversionchange = function () { try { db.close(); } catch (e) {} db = null; };
      cb(null, db);
    };
    req.onerror = function () { cb(new Error('Could not open the photo store.')); };
  }

  function put(id, dataUrl, cb) {
    if (!id || String(id).length > 240 || !validPhotoData(dataUrl)) return cb(new Error('That photograph is not a valid image.'));
    open(function (err, d) {
      if (err) return cb(err);
      var tx = d.transaction(SHELF, 'readwrite');
      tx.objectStore(SHELF).put(dataUrl, id);
      tx.oncomplete = function () { cb(null); };
      tx.onerror = function () { cb(new Error('Could not save that photograph.')); };
    });
  }

  function get(id, cb) {
    open(function (err, d) {
      if (err) return cb(err);
      var req = d.transaction(SHELF, 'readonly').objectStore(SHELF).get(id);
      req.onsuccess = function () { cb(null, req.result || null); };
      req.onerror = function () { cb(new Error('Could not read that photograph.')); };
    });
  }

  function del(id, cb) {
    open(function (err, d) {
      if (err) return cb(err);
      var tx = d.transaction(SHELF, 'readwrite');
      tx.objectStore(SHELF).delete(id);
      tx.oncomplete = function () { cb && cb(null); };
      tx.onerror = function () { cb && cb(new Error('Could not remove that photograph.')); };
    });
  }

  /* A camera frame is far larger than any screen here needs. Shrinking at the
     point of capture is what keeps the app usable over months of photographs. */
  function shrink(dataUrl, maxEdge, quality, cb) {
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth, h = img.naturalHeight;
      var scale = Math.min(1, maxEdge / Math.max(w, h));
      var cw = Math.round(w * scale), ch = Math.round(h * scale);
      var c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      c.getContext('2d').drawImage(img, 0, 0, cw, ch);
      try { cb(null, c.toDataURL('image/jpeg', quality || 0.78)); }
      catch (e) { cb(null, dataUrl); }
    };
    img.onerror = function () { cb(new Error('That file could not be read as a photograph.')); };
    img.src = dataUrl;
  }

  /* Opens the rear camera on a phone; falls back to the file picker elsewhere. */
  function capture(cb) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      document.body.removeChild(input);
      if (!file) return;
      var r = new FileReader();
      r.onload = function () { cb(null, r.result); };
      r.onerror = function () { cb(new Error('That photograph could not be read.')); };
      r.readAsDataURL(file);
    });
    input.click();
  }

  function all(cb) {
    open(function (err, d) {
      if (err) return cb(err);
      var tx = d.transaction(SHELF, 'readonly');
      var store = tx.objectStore(SHELF);
      var out = {};
      if (store.getAllKeys && store.getAll) {
        var kr = store.getAllKeys(), vr = store.getAll();
        tx.oncomplete = function () {
          var keys = kr.result || [], vals = vr.result || [];
          keys.forEach(function (k, i) { out[k] = vals[i]; });
          cb(null, out);
        };
        tx.onerror = function () { cb(new Error('Could not read the photo backup.')); };
        return;
      }
      var req = store.openCursor();
      req.onsuccess = function () {
        var cur = req.result;
        if (!cur) return cb(null, out);
        out[cur.key] = cur.value; cur.continue();
      };
      req.onerror = function () { cb(new Error('Could not read the photo backup.')); };
    });
  }

  function importAll(map, cb) {
    map = map || {};
    var validation = validatePhotoMap(map);
    if (validation) return cb && cb(validation);
    var keys = Object.keys(map);
    open(function (err, d) {
      if (err) return cb && cb(err);
      var tx = d.transaction(SHELF, 'readwrite'), st = tx.objectStore(SHELF);
      st.clear();
      keys.forEach(function (k) { st.put(map[k], k); });
      tx.oncomplete = function () { if (cb) cb(null); };
      tx.onerror = function () { if (cb) cb(new Error('Could not restore the photographs.')); };
      tx.onabort = function () { if (cb) cb(new Error('Could not restore the photographs.')); };
    });
  }


  function wipe(cb) {
    var settled = false;
    function done(err) {
      if (settled) return;
      settled = true;
      if (cb) cb(err || null);
    }
    if (!window.indexedDB) return done(null);
    try {
      if (db) { try { db.close(); } catch (e) {} db = null; }
      var req = indexedDB.deleteDatabase(DB);
      req.onsuccess = function () { done(null); };
      req.onerror = function () { done(new Error('Could not clear the photograph store.')); };
      req.onblocked = function () { done(new Error('Close any other open InSync tabs, then try Start over again.')); };
    } catch (e2) { done(new Error('Could not clear the photograph store.')); }
  }

  /* v8 could put meal photographs directly in localStorage. Move any data URLs
     into IndexedDB once, then leave only a small photo id in the meal record. */
  function migrateMealPhotos() {
    if (!window.Store) return;
    Object.keys(Store.state().days || {}).forEach(function (key) {
      (Store.state().days[key].meals || []).forEach(function (m) {
        if (!m || m.photoId || typeof m.photo !== 'string' || m.photo.indexOf('data:image/') !== 0) return;
        var id = 'meal-' + (m.id || (key.replace(/-/g, '') + Math.random().toString(36).slice(2, 6)));
        put(id, m.photo, function (err) {
          if (err) return;
          Store.updateMeal(m.id, { photoId: id, photo: '' });
        });
      });
    });
  }

  /* Fills every [data-photo] on screen. Rendering stays synchronous; the
     pictures arrive after, so a slow read never blocks the layout. */
  function paint(root) {
    (root || document).querySelectorAll('[data-photo]').forEach(function (el) {
      var id = el.getAttribute('data-photo');
      if (!id || el.getAttribute('data-photo-loaded') === id) return;
      get(id, function (err, url) {
        if (err || !url) return;
        if (el.classList.contains('photo')) {
          el.style.backgroundImage = 'linear-gradient(180deg,rgba(10,12,8,.68) 0%,rgba(10,12,8,.54) 18%,rgba(10,12,8,.3) 32%,rgba(10,12,8,.06) 46%,rgba(20,21,15,.72) 74%,#14150F 92%),url("' + String(url).replace(/"/g, '%22') + '")';
          el.classList.remove('blurred');
        } else {
          el.style.backgroundImage = 'url("' + String(url).replace(/"/g, '%22') + '")';
        }
        el.setAttribute('data-photo-loaded', id);
        el.classList.add('loaded');
      });
    });
  }

  window.Media = { put: put, get: get, del: del, all: all, importAll: importAll, wipe: wipe, migrateMealPhotos: migrateMealPhotos, shrink: shrink, capture: capture, paint: paint, validPhotoData: validPhotoData, validatePhotoMap: validatePhotoMap };
})();
