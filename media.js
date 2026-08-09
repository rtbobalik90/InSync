/* Photographs. Two jobs: shrink what the camera gives us, and keep progress
   photos out of localStorage — a phone photo is several megabytes and the
   quota is five, so a dozen would break the whole store. Progress photos live
   in IndexedDB as blobs; only their dates are kept in the store. */
(function () {
  'use strict';

  var DB = 'insync-photos', SHELF = 'photos', db = null;

  function open(cb) {
    if (db) return cb(null, db);
    if (!window.indexedDB) return cb(new Error('This browser cannot store photographs.'));
    var req = indexedDB.open(DB, 1);
    req.onupgradeneeded = function () {
      if (!req.result.objectStoreNames.contains(SHELF)) req.result.createObjectStore(SHELF);
    };
    req.onsuccess = function () { db = req.result; cb(null, db); };
    req.onerror = function () { cb(new Error('Could not open the photo store.')); };
  }

  function put(id, dataUrl, cb) {
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

  /* Fills every [data-photo] on screen. Rendering stays synchronous; the
     pictures arrive after, so a slow read never blocks the layout. */
  function paint(root) {
    (root || document).querySelectorAll('[data-photo]').forEach(function (el) {
      var id = el.getAttribute('data-photo');
      if (!id || el.getAttribute('data-photo-loaded') === id) return;
      get(id, function (err, url) {
        if (err || !url) return;
        el.style.backgroundImage = 'url(' + url + ')';
        el.setAttribute('data-photo-loaded', id);
        el.classList.add('loaded');
      });
    });
  }

  window.Media = { put: put, get: get, del: del, shrink: shrink, capture: capture, paint: paint };
})();
