/* InSync Curated Cookbook engine.
   Recipes ship with the app. AI may explain or suggest substitutions, but it
   is never required to scale a recipe, build a list, or display measurements. */
(function () {
  'use strict';

  var MODES = ['standard', 'weight'];
  var FRACTIONS = [
    [0.125, '\u215b'], [0.25, '\u00bc'], [0.333, '\u2153'], [0.375, '\u215c'],
    [0.5, '\u00bd'], [0.625, '\u215d'], [0.667, '\u2154'], [0.75, '\u00be'], [0.875, '\u215e']
  ];

  function text(v, n) { return String(v == null ? '' : v).trim().slice(0, n || 240); }
  function num(v, fallback) { v = +v; return Number.isFinite(v) ? v : (fallback || 0); }
  function round(v, places) { var p=Math.pow(10, places == null ? 1 : places); return Math.round(v*p)/p; }
  function clampInt(v, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(num(v, lo)))); }
  function recipeList() { return Array.isArray(window.INSYNC_RECIPES) ? window.INSYNC_RECIPES : []; }
  function pilotList() { return Array.isArray(window.INSYNC_PILOT_RECIPES) ? window.INSYNC_PILOT_RECIPES : []; }

  function fraction(value) {
    value=num(value,0); var whole=Math.floor(value), rem=value-whole;
    if (rem < 0.04) return String(whole);
    var best=FRACTIONS[0], distance=99;
    FRACTIONS.forEach(function (f) { var d=Math.abs(rem-f[0]); if(d<distance){best=f;distance=d;} });
    if (distance > 0.07) return round(value,1).toString();
    return (whole ? whole+' ' : '') + best[1];
  }

  function plural(unit, amount) {
    if (Math.abs(amount-1)<0.001) return unit;
    var map={cup:'cups',tablespoon:'tablespoons',teaspoon:'teaspoons',ounce:'ounces',piece:'pieces',slice:'slices',clove:'cloves',can:'cans'};
    return map[unit] || unit;
  }

  /* Every ingredient has a canonical mass or volume. Standard kitchen measures
     are display metadata, never the arithmetic source of truth. */
  function scaleIngredient(ingredient, factor, mode) {
    ingredient=ingredient||{}; factor=Math.max(0.1,num(factor,1)); mode=MODES.indexOf(mode)>=0?mode:'standard';
    var grams=Math.max(0,num(ingredient.grams,0)*factor);
    var milliliters=Math.max(0,num(ingredient.milliliters,0)*factor);
    var count=Math.max(0,num(ingredient.count,0)*factor);
    var display='';
    if (mode==='weight') {
      if (grams) display=(grams>=1000?round(grams/1000,2)+' kg':Math.round(grams)+' g');
      else if (milliliters) display=(milliliters>=1000?round(milliliters/1000,2)+' L':Math.round(milliliters)+' mL');
      else if (count) display=fraction(count)+' '+plural(text(ingredient.countUnit,30)||'piece',count);
    } else {
      var std=ingredient.standard||{}, amount=num(std.amount,0)*factor, unit=text(std.unit,30);
      if (amount && unit) display=fraction(amount)+' '+plural(unit,amount);
      else if (count) display=fraction(count)+' '+plural(text(ingredient.countUnit,30)||'piece',count);
      else if (grams) { var oz=grams/28.349523125; display=round(oz,1)+' oz'; }
      else if (milliliters) { var fl=milliliters/29.5735295625; display=round(fl,1)+' fl oz'; }
    }
    return { id:text(ingredient.id,100), name:text(ingredient.name,180)||'Ingredient', grams:round(grams,1), milliliters:round(milliliters,1), count:round(count,2), standardAmount:round(num(ingredient.standard&&ingredient.standard.amount,0)*factor,3), standardUnit:text(ingredient.standard&&ingredient.standard.unit,30), display:display, optional:!!ingredient.optional, section:text(ingredient.section,60), allergens:Array.isArray(ingredient.allergens)?ingredient.allergens.slice():[] };
  }

  function validate(recipe) {
    var errors=[]; recipe=recipe||{};
    if(!/^rcp-[a-z0-9-]+$/.test(text(recipe.id,120))) errors.push('invalid id');
    if(!text(recipe.name,180)) errors.push('missing name');
    if(!text(recipe.cuisine,60)) errors.push('missing cuisine');
    if(!Array.isArray(recipe.mealSlots)||!recipe.mealSlots.length) errors.push('missing meal slots');
    if(!Array.isArray(recipe.ingredients)||recipe.ingredients.length<2) errors.push('needs at least two ingredients');
    if(!Array.isArray(recipe.instructions)||recipe.instructions.length<1) errors.push('missing instructions');
    ['kcal','protein','carbs','fat','fiber','sodium'].forEach(function(k){if(!Number.isFinite(+(recipe.nutrition||{})[k])||+(recipe.nutrition||{})[k]<0)errors.push('invalid '+k);});
    (recipe.ingredients||[]).forEach(function(it,i){
      if(!text(it.id,100)||!text(it.name,180)) errors.push('ingredient '+(i+1)+' missing identity');
      if(!(num(it.grams,0)>0||num(it.milliliters,0)>0||num(it.count,0)>0)) errors.push('ingredient '+(i+1)+' missing canonical quantity');
      if(!it.standard||!(num(it.standard.amount,0)>0)||!text(it.standard.unit,30)) errors.push('ingredient '+(i+1)+' missing standard measure');
    });
    if(!recipe.provenance||!text(recipe.provenance.status,40)||!text(recipe.provenance.source,180)) errors.push('missing provenance');
    return {ok:!errors.length,errors:errors};
  }

  function find(id) { id=text(id,120); return recipeList().concat(pilotList()).find(function(r){return r.id===id;})||null; }
  function all() { return recipeList().slice(); }
  function forSlot(slot) { return recipeList().filter(function(r){return (r.mealSlots||[]).indexOf(slot)>=0;}); }
  function cuisines() { var seen={}; recipeList().forEach(function(r){seen[r.cuisine]=1;}); return Object.keys(seen).sort(); }

  function scaled(recipeOrId, eaters, mode, portionScale) {
    var recipe=typeof recipeOrId==='string'?find(recipeOrId):recipeOrId;
    if(!recipe)return null;
    eaters=clampInt(eaters,1,20); portionScale=Math.max(0.25,Math.min(3,num(portionScale,1))); var base=Math.max(1,num(recipe.baseServings,1)), factor=eaters*portionScale/base;
    var nutrition={}; Object.keys(recipe.nutrition||{}).forEach(function(k){nutrition[k]=round(num(recipe.nutrition[k],0)*factor,1);});
    return {recipe:recipe,eaters:eaters,mode:MODES.indexOf(mode)>=0?mode:'standard',factor:factor,
      ingredients:(recipe.ingredients||[]).map(function(it){return scaleIngredient(it,factor,mode);}),
      nutritionPerServing:Object.assign({},recipe.nutrition||{}),householdNutrition:nutrition};
  }

  function planIngredients(meal, mode) {
    meal=meal||{}; var recipe=meal.recipeId&&find(meal.recipeId), eaters=clampInt(meal.dinerCount||1,1,20);
    var portionMultiplier=Math.max(0.5,Math.min(2,num(meal.portionMultiplier,1)));
    if(recipe&&window.MealScaling&&MealScaling.scaleRecipe){
      var result=MealScaling.scaleRecipe(recipe,{peopleEating:eaters,portion:(meal.portionScale||1)*portionMultiplier,batchSource:!!meal.batchSource,servings:meal.servings||1,mode:mode});
      return result.ingredients.map(function(it){var exact=it.exact||{};return {id:it.id,name:it.name,grams:num(exact.grams,0),milliliters:num(exact.milliliters,0),count:num(exact.count,0),countUnit:text(exact.countUnit,30),standardAmount:num(exact.standardAmount,0),standardUnit:text(exact.standardUnit,30),display:it.display,optional:!!it.optional,section:text(it.section,60),allergens:Array.isArray(it.allergens)?it.allergens.slice():[]};});
    }
    if(recipe)return scaled(recipe,eaters*(meal.batchSource?Math.max(1,num(meal.servings,1)):1),mode,(meal.portionScale||1)*portionMultiplier).ingredients;
    return (meal.items||[]).map(function(it){return {id:text(it.id,100)||text(it.name,180).toLowerCase(),name:text(it.name,180),display:text(it.weight,100),grams:0,milliliters:0,count:0,optional:false,section:''};});
  }

  /* Portion size changes one person's plate. Diner count changes how many
     plates are prepared. Keeping those concepts separate prevents nutrition
     logs and household grocery quantities from drifting apart. */
  function resizeMeal(meal, nextMultiplier) {
    meal=Object.assign({},meal||{});
    nextMultiplier=Math.max(0.5,Math.min(2,num(nextMultiplier,1)));
    var current=Math.max(0.5,Math.min(2,num(meal.portionMultiplier,1)));
    var recipe=meal.recipeId&&find(meal.recipeId), values=['kcal','protein','carbs','fat','fiber','sodium'];
    if(recipe){
      var portion=Math.max(0.25,Math.min(3,num(meal.portionScale,1)));
      var personal=window.MealScaling&&MealScaling.scaleNutrition?MealScaling.scaleNutrition(recipe.nutrition,portion*nextMultiplier):null;
      values.forEach(function(k){if((recipe.nutrition||{})[k]!=null)meal[k]=round(num(personal?personal[k]:recipe.nutrition[k]*portion*nextMultiplier,0),1);});
    } else {
      var ratio=nextMultiplier/current;
      values.forEach(function(k){if(meal[k]!=null)meal[k]=round(num(meal[k],0)*ratio,1);});
    }
    meal.portionMultiplier=nextMultiplier;
    return meal;
  }
  function shoppingList(meals,prefs,mode){
    meals=meals||[];prefs=prefs||{};mode=MODES.indexOf(mode)>=0?mode:'standard';
    if(window.MealScaling&&MealScaling.aggregateGroceries){
      var canonical=meals.filter(function(meal){return meal&&meal.recipeId&&find(meal.recipeId);}).map(function(meal){
        return Object.assign({},meal,{portion:Math.max(0.25,Math.min(3,num(meal.portionScale,1)*Math.max(0.5,Math.min(2,num(meal.portionMultiplier,1)))))});
      });
      var rows=MealScaling.aggregateGroceries(canonical,{resolveRecipe:find,mode:mode,pantry:prefs.pantryInventory||prefs.pantry||'',includeOptional:false})
        .filter(function(row){return !row.fullyStocked;})
        .map(function(row){return {id:row.id,name:row.name,n:row.occurrences||1,amounts:[row.display],sections:row.sections||[],pantryUsed:row.pantryUsed||null};});
      var pantryText=text(prefs.pantry,1200).toLowerCase().split(/[,;\n]/).map(function(x){return x.trim();}).filter(Boolean);
      meals.filter(function(meal){return meal&&!meal.leftoverOf&&!(meal.recipeId&&find(meal.recipeId));}).forEach(function(meal){
        (meal.items||[]).forEach(function(it){var name=text(it.name,180),lower=name.toLowerCase();if(!name||pantryText.some(function(x){return lower.indexOf(x)>=0;}))return;
          var count=clampInt(meal.dinerCount||1,1,20)*(meal.batchSource?Math.max(1,num(meal.servings,1)):1),amount=text(it.weight,100);
          rows.push({id:'',name:name,n:1,amounts:[amount+(count>1?' x '+count:'')],sections:[],pantryUsed:null});
        });
      });
      return rows.sort(function(a,b){return a.name.localeCompare(b.name);});
    }
    var grouped={},pantry=(text(prefs&&prefs.pantry,1200).toLowerCase().split(/[,;\n]/).map(function(x){return x.trim();}).filter(Boolean));
    meals.forEach(function(meal){if(!meal||meal.leftoverOf)return;planIngredients(meal,mode).forEach(function(it){
      var lower=it.name.toLowerCase();if(pantry.some(function(x){return lower.indexOf(x)>=0;}))return;
      var key=it.id||lower,g=grouped[key]||(grouped[key]={name:it.name,n:0,grams:0,milliliters:0,count:0,standardAmount:0,standardUnit:it.standardUnit||''});
      g.n++;g.grams+=num(it.grams,0);g.milliliters+=num(it.milliliters,0);g.count+=num(it.count,0);
      if(!g.standardUnit||g.standardUnit===it.standardUnit)g.standardAmount+=num(it.standardAmount,0);
    });});
    return Object.keys(grouped).map(function(key){var g=grouped[key],display='';
      if(mode==='weight')display=g.grams?(g.grams>=1000?round(g.grams/1000,2)+' kg':Math.round(g.grams)+' g'):g.milliliters?(g.milliliters>=1000?round(g.milliliters/1000,2)+' L':Math.round(g.milliliters)+' mL'):fraction(g.count)+' pieces';
      else display=g.standardAmount&&g.standardUnit?fraction(g.standardAmount)+' '+plural(g.standardUnit,g.standardAmount):(g.grams?round(g.grams/28.349523125,1)+' oz':fraction(g.count)+' pieces');
      return {name:g.name,n:g.n,amounts:[display]};
    }).sort(function(a,b){return a.name.localeCompare(b.name);});
  }

  function audit() {
    var ids={}, errors=[]; recipeList().forEach(function(r,index){
      var v=validate(r); if(!v.ok)errors.push({index:index,id:r&&r.id,errors:v.errors});
      if(ids[r.id])errors.push({index:index,id:r.id,errors:['duplicate id']}); ids[r.id]=1;
    });
    return {ok:!errors.length,count:recipeList().length,cuisines:cuisines(),errors:errors};
  }

  function recipeText(r) { return [r.name,r.cuisine].concat(r.tags||[],r.flavor||[],(r.ingredients||[]).map(function(x){return x.name;})).join(' ').toLowerCase(); }
  function eligible(r, slot, prefs, disliked) {
    prefs=prefs||{}; if((r.mealSlots||[]).indexOf(slot)<0)return false;
    if((prefs.cuisines||[]).length&&(prefs.cuisines||[]).indexOf(r.cuisine)<0)return false;
    var hay=' '+recipeText(r).replace(/[^a-z0-9]+/g,' ')+' ';
    var blocked=[prefs.mustNot,prefs.avoid].join(',').toLowerCase().split(/[,;\n]/).map(function(x){return x.trim().replace(/[^a-z0-9]+/g,' ');}).filter(Boolean);
    if(blocked.some(function(x){return hay.indexOf(' '+x+' ')>=0;}))return false;
    if((disliked||[]).some(function(x){return text(x,200).toLowerCase()===r.name.toLowerCase();}))return false;
    if((prefs.proteins||[]).length){var p=(prefs.proteins||[]).map(function(x){return x.toLowerCase();});if(!p.some(function(x){var stem=x.replace(/s$/,'');return (x==='vegetarian'&&r.dietary&&r.dietary.vegetarian)||hay.indexOf(x)>=0||(stem&&hay.indexOf(stem)>=0);}))return false;}
    var dietMap={'Vegetarian':'vegetarian','Vegan':'vegan','Gluten-free':'glutenFree','Dairy-free':'dairyFree'};
    if((prefs.diets||[]).some(function(x){return !r.dietary||!r.dietary[dietMap[x]];}))return false;
    var allergens=(r.allergens||[]).map(function(x){return String(x).toLowerCase();});
    if((prefs.allergens||[]).some(function(x){return allergens.indexOf(String(x).toLowerCase())>=0;}))return false;
    return true;
  }
  function plannedFromRecipe(r,date,slot,targetKcal) {
    var baseKcal=Math.max(1,num(r.nutrition&&r.nutrition.kcal,1));
    var portion=Math.max(0.55,Math.min(2.25,targetKcal/baseKcal)), n={};
    Object.keys(r.nutrition||{}).forEach(function(k){n[k]=round(num(r.nutrition[k],0)*portion,1);});
    return {date:date,slot:slot,name:r.name,recipeId:r.id,portionScale:round(portion,3),portionMultiplier:1,dinerCount:1,kcal:Math.round(n.kcal),protein:Math.round(n.protein),carbs:Math.round(n.carbs),fat:Math.round(n.fat),fiber:round(n.fiber,1),sodium:Math.round(n.sodium),servings:1,prepMinutes:num(r.time&&r.time.totalMinutes,0),recipeNote:'Curated cookbook recipe · portions adjusted to this meal target.',cuisine:r.cuisine,proteins:(r.proteins||[]).slice(),instructions:(r.instructions||[]).slice(),items:(r.ingredients||[]).map(function(x){return Object.assign({},x);}),source:'catalog',batchId:'',leftoverOf:'',batchSource:false};
  }
  function buildWeek(weekOf, targets, prefs, options) {
    targets=targets||{};prefs=prefs||{};options=options||{};var map={},used={},disliked=options.disliked||[];
    var favoriteIds=(options.favorites||[]).map(function(x){return x&&x.recipeId;}).filter(Boolean);
    var allocation={Breakfast:0.24,Lunch:0.29,Dinner:0.35,Snack:0.12}, proteinAllocation={Breakfast:0.24,Lunch:0.29,Dinner:0.35,Snack:0.12}, slots=['Breakfast','Lunch','Dinner','Snack'];
    for(var d=0;d<7;d++){
      var date=window.Store&&Store.shift?Store.shift(weekOf,d):weekOf;
      slots.forEach(function(slot){
        var candidates=recipeList().filter(function(r){return eligible(r,slot,prefs,disliked)&&!used[r.id];});
        if(!candidates.length)candidates=recipeList().filter(function(r){return eligible(r,slot,Object.assign({},prefs,{cuisines:[],proteins:[]}),disliked)&&!used[r.id];});
        var target=Math.max(100,num(targets.calories,2000)*allocation[slot]),targetProtein=Math.max(5,num(targets.protein,140)*proteinAllocation[slot]);
        candidates.sort(function(a,b){
          var ak=Math.max(1,num(a.nutrition&&a.nutrition.kcal,1)),bk=Math.max(1,num(b.nutrition&&b.nutrition.kcal,1));
          var ap=num(a.nutrition&&a.nutrition.protein,0)*target/ak,bp=num(b.nutrition&&b.nutrition.protein,0)*target/bk;
          var sa=Math.max(0,targetProtein-ap)*100+Math.abs(ap-targetProtein);
          var sb=Math.max(0,targetProtein-bp)*100+Math.abs(bp-targetProtein);
          return sa-sb||a.id.localeCompare(b.id);
        });
        var strong=candidates.filter(function(r){var k=Math.max(1,num(r.nutrition&&r.nutrition.kcal,1));return num(r.nutrition&&r.nutrition.protein,0)*target/k>=targetProtein;});
        var pool=strong.length?strong:candidates;
        pool.sort(function(a,b){return (favoriteIds.indexOf(b.id)>=0?1:0)-(favoriteIds.indexOf(a.id)>=0?1:0);});
        var pick=pool[(d*3+slots.indexOf(slot))%Math.max(1,Math.min(pool.length,8))]||null;
        if(pick){used[pick.id]=1;map[date+'|'+slot]=plannedFromRecipe(pick,date,slot,target);}
      });
    }
    var days=[];for(var di=0;di<7;di++)days.push(window.Store&&Store.shift?Store.shift(weekOf,di):weekOf);
    var lunchDays=Math.max(0,Math.min(5,Math.round(num(prefs.lunchPrepDays,0))));
    if(lunchDays>1){
      var weekdayDates=days.filter(function(d){var n=new Date(d+'T12:00:00').getDay();return n>=1&&n<=5;}).slice(0,lunchDays);
      var lunchSource=weekdayDates[0]&&map[weekdayDates[0]+'|Lunch'];
      if(lunchSource){var lunchKey=weekdayDates[0]+'|Lunch',batch='catalog-lunch-'+weekOf;
        map[lunchKey]=Object.assign({},lunchSource,{servings:weekdayDates.length,batchId:batch,batchSource:true,leftoverOf:'',recipeNote:'Prepare '+weekdayDates.length+' servings together.'});
        weekdayDates.slice(1).forEach(function(d){map[d+'|Lunch']=Object.assign({},lunchSource,{date:d,servings:1,batchId:batch,batchSource:false,leftoverOf:lunchKey,source:'prep',recipeNote:'Prepared serving from '+weekdayDates[0]+'.'});});
      }
    }
    if(prefs.dinnerLeftovers&&Array.isArray(prefs.cookDays)&&prefs.cookDays.length){
      var last='',uses={},names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      days.forEach(function(d){var key=d+'|Dinner',dow=names[new Date(d+'T12:00:00').getDay()];
        if(prefs.cookDays.indexOf(dow)>=0||!last){last=key;uses[key]=uses[key]||[];return;}
        var source=map[last];if(!source)return;uses[last].push(key);map[key]=Object.assign({},source,{date:d,servings:1,batchId:'catalog-dinner-'+last.slice(0,10),batchSource:false,leftoverOf:last,source:'prep',recipeNote:'Leftover dinner from '+last.slice(0,10)+'.'});
      });
      Object.keys(uses).forEach(function(key){var source=map[key];if(!source)return;var count=1+uses[key].length;map[key]=Object.assign({},source,{servings:count,batchId:'catalog-dinner-'+key.slice(0,10),batchSource:true,leftoverOf:'',recipeNote:'Cook '+count+' household servings; '+uses[key].length+' are planned leftovers.'});});
    }
    return map;
  }

  window.Cookbook={modes:MODES.slice(),all:all,pilot:function(){return pilotList().slice();},pilotMeta:function(){return Object.assign({label:'48-Recipe Pilot Review Collection',productionApproved:false},window.INSYNC_PILOT_META||{});},find:find,forSlot:forSlot,cuisines:cuisines,eligible:eligible,validate:validate,audit:audit,scaled:scaled,scaleIngredient:scaleIngredient,planIngredients:planIngredients,resizeMeal:resizeMeal,shoppingList:shoppingList,buildWeek:buildWeek,normalizeEaters:function(v){return clampInt(v,1,20);}};
})();
