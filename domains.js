/* InSync 6.0 domain registry. This is deliberately small: it names product
   boundaries without forcing a framework rewrite. Screens can migrate into
   these domains one at a time while routing and navigation stay stable. */
(function () {
  'use strict';

  var primary = [
    { key: 'home', label: 'Home', purpose: 'Daily Camp' },
    { key: 'journey', label: 'Journey', purpose: 'The Road' },
    { key: 'train', label: 'Train', purpose: 'Physical Training' },
    { key: 'nutrition', label: 'Nutrition', purpose: 'Provisions' },
    { key: 'together', label: 'Together', purpose: 'Two-Person Journey' }
  ];

  var supporting = [
    { key: 'coach', label: 'Coach', purpose: 'InSync Intelligence' },
    { key: 'faith', label: 'Faith', purpose: 'Christian Formation' },
    { key: 'base-camp', label: 'Base Camp', purpose: 'Persistent World' },
    { key: 'achievements', label: 'Achievements', purpose: 'Milestones & Rewards' },
    { key: 'history', label: 'History', purpose: 'Living Record' }
  ];

  function find(key) {
    return primary.concat(supporting).find(function (d) { return d.key === key; }) || null;
  }

  window.InSyncDomains = {
    version: 1,
    primary: primary,
    supporting: supporting,
    primaryKeys: primary.map(function (d) { return d.key; }),
    find: find
  };
})();
