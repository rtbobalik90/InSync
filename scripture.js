/* InSync Scripture Library — verified, local-first Scripture surfaces.
   The app's daily verse catalog remains the base source. This module adds a
   small set of longer KJV passages used by the Faith/Journey experience.
   KJV 1769 text is public domain in the United States; longer passage text
   below was checked against the public-domain farskipper/aruljohn JSON source.
   No AI is allowed to fabricate Scripture text. */
(function () {
  'use strict';

  var LONG = {
    'ephesians-4-1-6': {
      id: 'ephesians-4-1-6', book: 'Ephesians', chapter: 4, start: 1, end: 6,
      ref: 'Ephesians 4:1–6', label: 'Walk worthy of the calling',
      verses: [
        { verse: 1, text: 'I therefore, the prisoner of the Lord, beseech you that ye walk worthy of the vocation wherewith ye are called,' },
        { verse: 2, text: 'With all lowliness and meekness, with longsuffering, forbearing one another in love;' },
        { verse: 3, text: 'Endeavouring to keep the unity of the Spirit in the bond of peace.' },
        { verse: 4, text: 'There is one body, and one Spirit, even as ye are called in one hope of your calling;' },
        { verse: 5, text: 'One Lord, one faith, one baptism,' },
        { verse: 6, text: 'One God and Father of all, who is above all, and through all, and in you all.' }
      ]
    },
    'romans-8-28': {
      id: 'romans-8-28', book: 'Romans', chapter: 8, start: 28, end: 28,
      ref: 'Romans 8:28', label: 'Called according to his purpose',
      verses: [
        { verse: 28, text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' }
      ]
    }
  };

  var CANON = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalm','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];

  function clean(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function parseRef(ref) {
    var m = clean(ref).match(/^(.+?)\s+(\d+):(\d+)(?:[–-](\d+))?$/);
    return m ? { book:m[1], chapter:+m[2], start:+m[3], end:+(m[4] || m[3]) } : null;
  }
  function dailyEntries() {
    if (!window.Store || !Store.verseList) return [];
    return Store.verseList().map(function (x, i) {
      var p = parseRef(x[1]);
      return {
        id:'daily-' + i, book:p ? p.book : '', chapter:p ? p.chapter : 0,
        start:p ? p.start : 0, end:p ? p.end : 0, ref:x[1], label:x[1],
        verses:[{ verse:p ? p.start : 0, text:x[0] }], source:'daily'
      };
    }).filter(function (x) { return !!x.book; });
  }
  function text(p) { return p && p.verses ? p.verses.map(function (v) { return v.text; }).join(' ') : ''; }
  function catalog() {
    var map = {}, out = [];
    Object.keys(LONG).forEach(function (id) { var p = LONG[id]; map[p.ref] = true; out.push(p); });
    dailyEntries().forEach(function (p) { if (!map[p.ref]) { map[p.ref] = true; out.push(p); } });
    return out;
  }
  function get(id) {
    if (LONG[id]) return LONG[id];
    return catalog().find(function (p) { return p.id === id; }) || null;
  }
  function byRef(ref) { return catalog().find(function (p) { return p.ref === ref; }) || null; }
  function books() {
    var seen = {};
    catalog().forEach(function (p) { seen[p.book] = true; });
    return CANON.filter(function (b) { return seen[b]; });
  }
  function chapters(book) {
    var seen = {};
    catalog().filter(function (p) { return p.book === book; }).forEach(function (p) { seen[p.chapter] = true; });
    return Object.keys(seen).map(Number).sort(function (a,b) { return a-b; });
  }
  function inChapter(book, chapter) {
    return catalog().filter(function (p) { return p.book === book && +p.chapter === +chapter; })
      .sort(function (a,b) { return a.start - b.start; });
  }
  function asMemory(p) { return p ? { ref:p.ref, text:text(p) } : null; }

  var WAYPOINT_REFS = [
    'Hebrews 12:1','Psalm 119:105','Isaiah 40:31','Proverbs 3:5','Galatians 6:9',
    'Psalm 37:23','Joshua 1:9','Romans 12:12','1 Peter 5:7','Ecclesiastes 4:9',
    'Psalm 27:14','Philippians 3:14','Proverbs 16:3','1 Thessalonians 5:11'
  ];
  function waypoint(routeId, legIndex) {
    var seed = 0, s = String(routeId || 'road');
    for (var i=0;i<s.length;i++) seed += s.charCodeAt(i) * (i + 3);
    var ref = WAYPOINT_REFS[(seed + (+legIndex || 0) * 5) % WAYPOINT_REFS.length];
    var p = byRef(ref) || catalog()[0];
    return p ? { ref:p.ref, text:text(p), passageId:p.id } : null;
  }

  window.ScriptureLibrary = {
    version:'1.0.0', translation:'KJV', catalog:catalog, get:get, byRef:byRef,
    books:books, chapters:chapters, inChapter:inChapter, text:text,
    asMemory:asMemory, waypoint:waypoint
  };
})();
