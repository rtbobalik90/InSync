/* Food sources: packaged products by barcode, and restaurant menus.
   Barcodes resolve against Open Food Facts, which is free and needs no key.
   Restaurant items are local so eating out still works with no signal. */
(function () {
  'use strict';

  var RESTAURANTS = [
    ['Chick-fil-A', [
      ['Grilled chicken sandwich', 390, 28, 44, 12],
      ['Grilled nuggets, 12 ct', 200, 38, 3, 5],
      ['Cobb salad, grilled', 510, 40, 27, 27],
      ['Market salad, grilled', 540, 28, 42, 30],
      ['Chicken sandwich', 440, 29, 40, 19],
      ['Waffle fries, medium', 420, 5, 45, 24]
    ]],
    ['Chipotle', [
      ['Chicken burrito bowl, rice and beans', 630, 45, 62, 20],
      ['Chicken salad, no rice', 405, 42, 18, 19],
      ['Steak burrito bowl', 650, 39, 63, 24],
      ['Barbacoa bowl, double meat', 720, 55, 60, 28],
      ['Carnitas bowl', 690, 38, 62, 30],
      ['Chicken burrito', 975, 55, 108, 35]
    ]],
    ['Panera', [
      ['Green goddess Cobb with chicken', 530, 42, 21, 31],
      ['Turkey chili, cup', 240, 17, 30, 6],
      ['Chicken and wild rice soup, cup', 250, 8, 20, 15],
      ['Mediterranean bowl with chicken', 630, 33, 68, 26],
      ['Ten vegetable soup, bowl', 130, 5, 25, 2],
      ['Bacon turkey bravo, whole', 750, 45, 82, 26]
    ]],
    ['Subway', [
      ['Oven roasted turkey, 6 in', 280, 19, 41, 4],
      ['Rotisserie chicken, 6 in', 310, 27, 41, 5],
      ['Steak and cheese, 6 in', 380, 26, 42, 12],
      ['Turkey protein bowl', 220, 24, 14, 7],
      ['Italian BMT, 6 in', 400, 20, 42, 17],
      ['Veggie delite, 6 in', 200, 8, 39, 2]
    ]],
    ["McDonald's", [
      ['Egg McMuffin', 310, 17, 30, 13],
      ['Quarter pounder with cheese', 520, 30, 42, 26],
      ['Six piece nuggets', 250, 14, 15, 15],
      ['Big Mac', 590, 25, 46, 34],
      ['Grilled chicken sandwich', 380, 37, 44, 7],
      ['Fries, medium', 320, 4, 43, 15]
    ]],
    ['Olive Garden', [
      ['Herb grilled salmon', 460, 46, 4, 28],
      ['Chicken margherita', 570, 62, 12, 30],
      ['Chicken alfredo', 1550, 66, 98, 97],
      ['Minestrone, bowl', 110, 5, 20, 1],
      ['Steak gorgonzola alfredo', 1080, 61, 84, 55],
      ['Breadstick, one', 140, 4, 26, 3]
    ]],
    ['Texas Roadhouse', [
      ['Sirloin, 8 oz', 400, 52, 2, 20],
      ['Grilled chicken breast', 320, 55, 3, 9],
      ['Grilled salmon, 8 oz', 480, 48, 2, 30],
      ['House salad, no dressing', 190, 9, 15, 11],
      ['Green beans', 170, 5, 12, 11],
      ['Sweet potato, plain', 380, 4, 88, 0]
    ]],
    ['Home cooked', [
      ['Chicken breast, 6 oz', 280, 52, 0, 6],
      ['Ground beef 90/10, 6 oz', 340, 46, 0, 17],
      ['Salmon fillet, 6 oz', 350, 40, 0, 20],
      ['White rice, 1 cup cooked', 205, 4, 45, 0],
      ['Two eggs, scrambled', 180, 12, 2, 13],
      ['Greek yoghurt, 1 cup', 150, 25, 9, 1]
    ]]
  ].map(function (r) {
    return {
      name: r[0],
      items: r[1].map(function (i) {
        return { name: i[0], kcal: i[1], protein: i[2], carbs: i[3], fat: i[4] };
      })
    };
  });

  function searchRestaurants(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return RESTAURANTS;
    return RESTAURANTS.map(function (r) {
      var hitName = r.name.toLowerCase().indexOf(q) >= 0;
      var items = hitName ? r.items : r.items.filter(function (i) {
        return i.name.toLowerCase().indexOf(q) >= 0;
      });
      return items.length ? { name: r.name, items: items } : null;
    }).filter(Boolean);
  }

  /* Open Food Facts. Returns a meal-shaped object, or an error saying what to do
     next. Two endpoints, because v2 answers 404 for products v0 still holds, and
     a timeout, because a phone on a weak signal must not hang on a lookup. */
  function lookupBarcode(code, cb) {
    code = String(code || '').replace(/\D/g, '');
    if (code.length < 8) return cb(new Error('That does not look like a barcode. It is 8 to 13 digits.'));

    function get(url) {
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
      return fetch(url, ctl ? { signal: ctl.signal } : undefined)
        .then(function (r) { clearTimeout(timer); return r.ok ? r.json() : null; })
        .catch(function () { clearTimeout(timer); return null; });
    }

    var v2 = 'https://world.openfoodfacts.org/api/v2/product/' + code +
      '.json?fields=product_name,brands,serving_size,nutriments';
    var v0 = 'https://world.openfoodfacts.org/api/v0/product/' + code + '.json';

    get(v2).then(function (a) {
      if (a && a.product) return a;
      return get(v0);
    }).then(function (j) {
      if (!j) {
        return cb(new Error('Could not reach Open Food Facts. Type the figures from the label below — it still counts.'));
      }
      if (j.status === 0 || !j.product) {
        return cb(new Error('Not in Open Food Facts. Type the figures from the label below — it still counts.'));
      }
      var p = j.product, n = p.nutriments || {};
      // Prefer per-serving where the product declares one.
      var per = n['energy-kcal_serving'] != null ? '_serving' : '_100g';
      var name = [p.brands ? String(p.brands).split(',')[0].trim() : '', p.product_name || '']
        .filter(Boolean).join(' ');
      cb(null, {
        name: name || 'Unnamed product',
        serving: per === '_serving' ? (p.serving_size || 'per serving') : 'per 100 g',
        kcal: Math.round(n['energy-kcal' + per] || 0),
        protein: Math.round(n['proteins' + per] || 0),
        carbs: Math.round(n['carbohydrates' + per] || 0),
        fat: Math.round(n['fat' + per] || 0)
      });
    });
  }

  window.Foods = {
    restaurants: RESTAURANTS,
    search: searchRestaurants,
    lookupBarcode: lookupBarcode
  };
})();
