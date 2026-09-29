/* InSync bundled cookbook catalog.
   Phase A ships a deterministic 1,440-record catalog contract: 120 recipes for
   each supported cuisine, evenly distributed across the four planner slots.
   Nutrition is calculated from ingredient reference values and deliberately
   marked draft-calculated until the culinary/nutrition review gate approves a
   record for production. No network or AI call is used at runtime. */
(function () {
  'use strict';

  var NUTRIENTS = window.InSyncNutrientRegistry || null;

  var FOOD = {
    egg:{name:'Large egg',kcal:143,protein:12.6,carbs:0.7,fat:9.5,fiber:0,sodium:142,unit:'large egg',unitG:50,allergens:['egg']},
    whites:{name:'Egg whites',kcal:52,protein:10.9,carbs:0.7,fat:0.2,fiber:0,sodium:166,unit:'cup',unitG:243,allergens:['egg']},
    chicken:{name:'Cooked chicken breast',kcal:165,protein:31,carbs:0,fat:3.6,fiber:0,sodium:74,unit:'ounce',unitG:28.35},
    turkey:{name:'Lean ground turkey',kcal:170,protein:29,carbs:0,fat:7,fiber:0,sodium:70,unit:'ounce',unitG:28.35},
    beef:{name:'Lean cooked beef',kcal:217,protein:26.1,carbs:0,fat:11.8,fiber:0,sodium:66,unit:'ounce',unitG:28.35},
    pork:{name:'Cooked pork loin',kcal:196,protein:29,carbs:0,fat:7.5,fiber:0,sodium:62,unit:'ounce',unitG:28.35},
    salmon:{name:'Cooked salmon',kcal:206,protein:22,carbs:0,fat:12,fiber:0,sodium:59,unit:'ounce',unitG:28.35,allergens:['fish']},
    shrimp:{name:'Cooked shrimp',kcal:99,protein:24,carbs:0.2,fat:0.3,fiber:0,sodium:111,unit:'ounce',unitG:28.35,allergens:['shellfish']},
    tofu:{name:'Firm tofu',kcal:144,protein:17.3,carbs:2.8,fat:8.7,fiber:2.3,sodium:14,unit:'cup',unitG:248,allergens:['soy']},
    beans:{name:'Cooked black beans',kcal:132,protein:8.9,carbs:23.7,fat:0.5,fiber:8.7,sodium:2,unit:'cup',unitG:172},
    chickpeas:{name:'Cooked chickpeas',kcal:164,protein:8.9,carbs:27.4,fat:2.6,fiber:7.6,sodium:7,unit:'cup',unitG:164},
    lentils:{name:'Cooked lentils',kcal:116,protein:9,carbs:20.1,fat:0.4,fiber:7.9,sodium:2,unit:'cup',unitG:198},
    yogurt:{name:'Plain nonfat Greek yogurt',kcal:59,protein:10.3,carbs:3.6,fat:0.4,fiber:0,sodium:36,unit:'cup',unitG:245,allergens:['milk']},
    cottage:{name:'Low-fat cottage cheese',kcal:82,protein:11.1,carbs:3.4,fat:2.3,fiber:0,sodium:364,unit:'cup',unitG:226,allergens:['milk']},
    rice:{name:'Cooked brown rice',kcal:123,protein:2.7,carbs:25.6,fat:1.6,fiber:1.6,sodium:4,unit:'cup',unitG:195},
    whiteRice:{name:'Cooked white rice',kcal:130,protein:2.7,carbs:28.2,fat:0.3,fiber:0.4,sodium:1,unit:'cup',unitG:158},
    quinoa:{name:'Cooked quinoa',kcal:120,protein:4.4,carbs:21.3,fat:1.9,fiber:2.8,sodium:7,unit:'cup',unitG:185},
    oats:{name:'Cooked rolled oats',kcal:71,protein:2.5,carbs:12,fat:1.5,fiber:1.7,sodium:49,unit:'cup',unitG:234,allergens:['wheat']},
    pasta:{name:'Cooked whole-wheat pasta',kcal:149,protein:6,carbs:30.1,fat:1.7,fiber:3.9,sodium:4,unit:'cup',unitG:140,allergens:['wheat']},
    tortilla:{name:'Whole-wheat tortilla',kcal:312,protein:9.6,carbs:52.1,fat:8.3,fiber:8.3,sodium:605,unit:'tortilla',unitG:45,allergens:['wheat']},
    bread:{name:'Whole-grain bread',kcal:247,protein:12.5,carbs:41.4,fat:3.4,fiber:6.8,sodium:430,unit:'slice',unitG:38,allergens:['wheat']},
    potato:{name:'Cooked potato',kcal:87,protein:1.9,carbs:20.1,fat:0.1,fiber:1.8,sodium:4,unit:'cup',unitG:156},
    sweetPotato:{name:'Cooked sweet potato',kcal:90,protein:2,carbs:20.7,fat:0.2,fiber:3.3,sodium:36,unit:'cup',unitG:200},
    greens:{name:'Mixed leafy greens',kcal:20,protein:2,carbs:3.5,fat:0.3,fiber:2,sodium:35,unit:'cup',unitG:36},
    broccoli:{name:'Broccoli florets',kcal:35,protein:2.4,carbs:7.2,fat:0.4,fiber:3.3,sodium:41,unit:'cup',unitG:156},
    pepper:{name:'Bell pepper',kcal:31,protein:1,carbs:6,fat:0.3,fiber:2.1,sodium:4,unit:'cup',unitG:149},
    tomato:{name:'Tomato',kcal:18,protein:0.9,carbs:3.9,fat:0.2,fiber:1.2,sodium:5,unit:'cup',unitG:180},
    onion:{name:'Onion',kcal:40,protein:1.1,carbs:9.3,fat:0.1,fiber:1.7,sodium:4,unit:'cup',unitG:160},
    cucumber:{name:'Cucumber',kcal:15,protein:0.7,carbs:3.6,fat:0.1,fiber:0.5,sodium:2,unit:'cup',unitG:104},
    carrot:{name:'Carrot',kcal:35,protein:0.8,carbs:8.2,fat:0.2,fiber:3,sodium:58,unit:'cup',unitG:128},
    cabbage:{name:'Shredded cabbage',kcal:25,protein:1.3,carbs:5.8,fat:0.1,fiber:2.5,sodium:18,unit:'cup',unitG:89},
    spinach:{name:'Spinach',kcal:23,protein:2.9,carbs:3.6,fat:0.4,fiber:2.2,sodium:79,unit:'cup',unitG:30},
    berries:{name:'Mixed berries',kcal:50,protein:0.8,carbs:12,fat:0.3,fiber:4,sodium:1,unit:'cup',unitG:140},
    apple:{name:'Apple',kcal:52,protein:0.3,carbs:13.8,fat:0.2,fiber:2.4,sodium:1,unit:'medium apple',unitG:182},
    banana:{name:'Banana',kcal:89,protein:1.1,carbs:22.8,fat:0.3,fiber:2.6,sodium:1,unit:'medium banana',unitG:118},
    avocado:{name:'Avocado',kcal:160,protein:2,carbs:8.5,fat:14.7,fiber:6.7,sodium:7,unit:'medium avocado',unitG:150},
    almonds:{name:'Almonds',kcal:579,protein:21.2,carbs:21.6,fat:49.9,fiber:12.5,sodium:1,unit:'ounce',unitG:28.35,allergens:['tree nuts']},
    peanut:{name:'Natural peanut butter',kcal:588,protein:25,carbs:20,fat:50,fiber:6,sodium:17,unit:'tablespoon',unitG:16,allergens:['peanut']},
    oliveOil:{name:'Olive oil',kcal:884,protein:0,carbs:0,fat:100,fiber:0,sodium:0,unit:'teaspoon',unitG:4.5},
    cheese:{name:'Reduced-fat shredded cheese',kcal:254,protein:24,carbs:4,fat:16,fiber:0,sodium:621,unit:'cup',unitG:113,allergens:['milk']},
    salsa:{name:'Fresh salsa',kcal:36,protein:1.5,carbs:7,fat:0.2,fiber:1.8,sodium:430,unit:'tablespoon',unitG:16},
    sauce:{name:'House seasoning sauce',kcal:80,protein:2,carbs:12,fat:3,fiber:1,sodium:480,unit:'tablespoon',unitG:16},
    herbs:{name:'Fresh herbs and spices',kcal:30,protein:1.5,carbs:5,fat:0.5,fiber:2,sodium:10,unit:'tablespoon',unitG:6}
  };

  var CUISINES = [
    ['Mexican','mexican',['chicken','beef','turkey','shrimp','beans','tofu'],'whiteRice','pepper','salsa','lime-cilantro'],
    ['Chinese','chinese',['chicken','beef','pork','shrimp','tofu','egg'],'whiteRice','broccoli','sauce','ginger-scallion'],
    ['Indian','indian',['chicken','turkey','shrimp','tofu','chickpeas','lentils'],'rice','spinach','sauce','garam-masala'],
    ['American','american',['chicken','beef','turkey','pork','salmon','beans'],'potato','broccoli','sauce','smoky-herb'],
    ['Italian','italian',['chicken','turkey','beef','shrimp','salmon','lentils'],'pasta','tomato','sauce','basil-garlic'],
    ['Mediterranean','mediterranean',['chicken','turkey','salmon','shrimp','chickpeas','lentils'],'quinoa','cucumber','sauce','lemon-herb'],
    ['Thai','thai',['chicken','beef','pork','shrimp','tofu','egg'],'whiteRice','cabbage','sauce','lime-basil'],
    ['Japanese','japanese',['chicken','beef','pork','salmon','shrimp','tofu'],'whiteRice','broccoli','sauce','ginger-sesame'],
    ['Korean','korean',['chicken','beef','pork','shrimp','tofu','egg'],'whiteRice','cabbage','sauce','garlic-scallion'],
    ['Greek','greek',['chicken','turkey','beef','salmon','shrimp','chickpeas'],'quinoa','cucumber','sauce','lemon-oregano'],
    ['Middle Eastern','middle-eastern',['chicken','turkey','beef','shrimp','chickpeas','lentils'],'rice','tomato','sauce','sumac-herb'],
    ['Cajun','cajun',['chicken','turkey','beef','pork','salmon','shrimp'],'rice','pepper','sauce','cajun-spice']
  ];
  var VARIANTS=['Sunrise','Garden','Roasted','Rustic','Weeknight','Trail'];
  var FORMATS={
    Breakfast:[['Egg Skillet','egg','potato'],['Breakfast Bowl','whites','oats'],['Morning Wrap','egg','tortilla'],['Savory Toast','egg','bread'],['Protein Bake','whites','sweetPotato']],
    Lunch:[['Grain Bowl',null,null],['Chopped Salad',null,'greens'],['Lunch Wrap',null,'tortilla'],['Hearty Soup',null,'potato'],['Power Plate',null,null]],
    Dinner:[['Family Skillet',null,null],['Sheet-Pan Dinner',null,'potato'],['Simmered Stew',null,'rice'],['Quick Saut\u00e9',null,null],['Dinner Plate',null,null]],
    Snack:[['Yogurt Cup','yogurt','berries'],['Cottage Cheese Bowl','cottage','tomato'],['Protein Toast','cottage','bread'],['Crunch Plate','yogurt','apple'],['Snack Bites','yogurt','oats']]
  };

  function round(v){return Math.round(v*10)/10;}
  function slug(v){return String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
  function ingredient(id, grams, section, displayName){
    var f=FOOD[id], amount=grams/f.unitG;
    var name=displayName||f.name;
    return {id:id,name:name,collection:'catalog',grams:round(grams),standard:{amount:round(amount),unit:f.unit},section:section||'Main',optional:false,allergens:(f.allergens||[]).slice(),sourceRef:'UNRESOLVED-'+id,preparationState:/cooked|prepared|ready/i.test(name)?'as described in ingredient name':(/raw/i.test(name)?'raw':'state not specified')};
  }
  function totals(items){
    if(NUTRIENTS&&typeof NUTRIENTS.calculate==='function')return NUTRIENTS.calculate(items,1);
    var n={kcal:0,protein:0,carbs:0,fat:0,fiber:0,sodium:0};
    items.forEach(function(it){var f=FOOD[it.id],factor=it.grams/100;Object.keys(n).forEach(function(k){n[k]+=f[k]*factor;});});
    Object.keys(n).forEach(function(k){n[k]=round(n[k]);}); return {nutrition:n,provenance:{calculationMethod:'Legacy embedded reference fallback',estimated:true,complete:false,sourceRecords:[],unresolvedMappings:items.map(function(it){return {ingredient:it.name,ingredientId:it.id,sourceRef:it.sourceRef,reason:'USDA registry was not loaded.'};})}};
  }
  function amounts(slot){
    if(slot==='Breakfast')return {protein:100,base:120,veg:70,sauce:20,oil:3};
    if(slot==='Lunch')return {protein:130,base:145,veg:100,sauce:24,oil:5};
    if(slot==='Dinner')return {protein:165,base:170,veg:120,sauce:28,oil:7};
    return {protein:170,base:90,veg:80,sauce:12,oil:0};
  }
  function build(profile,slot,formatIndex,variantIndex){
    var cuisine=profile[0],slugCuisine=profile[1],proteins=profile[2],baseId=profile[3],vegId=profile[4],sauceId=profile[5],season=profile[6];
    var form=FORMATS[slot][formatIndex], main=form[1]||proteins[variantIndex], base=form[2]||baseId, qty=amounts(slot);
    var items=[];
    if(slot==='Snack'){
      items.push(ingredient(main,qty.protein,'Protein'));
      items.push(ingredient(base,qty.base,'Produce or grain'));
      items.push(ingredient(variantIndex%2?'almonds':'berries',variantIndex%2?14:65,'Finish'));
      items.push(ingredient('herbs',4,'Seasoning',season.replace(/-/g,' ')+' seasoning'));
    } else {
      items.push(ingredient(main,qty.protein,'Protein'));
      items.push(ingredient(base,qty.base,'Grain or starch'));
      items.push(ingredient(vegId,qty.veg,'Produce'));
      items.push(ingredient(sauceId,qty.sauce,'Sauce',season.replace(/-/g,' ')+' sauce'));
      items.push(ingredient('oliveOil',qty.oil,'Pantry'));
    }
    var nutrientResult=totals(items),n=nutrientResult.nutrition,name=cuisine+' '+VARIANTS[variantIndex]+' '+form[0];
    var id='rcp-'+slugCuisine+'-'+slug(slot)+'-'+slug(form[0])+'-'+slug(VARIANTS[variantIndex]);
    return {
      id:id,version:1,name:name,summary:'A practical '+cuisine.toLowerCase()+'-inspired '+slot.toLowerCase()+' built for repeatable home cooking.',
      cuisine:cuisine,mealSlots:[slot],course:slot,proteins:[FOOD[main].name],baseServings:1,yieldLabel:'1 adult serving',
      nutrition:n,nutritionBasis:'per adult serving; calculated from mapped USDA ingredients, with unresolved ingredients omitted',nutritionProvenance:nutrientResult.provenance,ingredients:items,
      instructions:slot==='Snack'?
        ['Measure the ingredients for the selected number of eaters.','Combine or arrange the ingredients, add the '+season.replace(/-/g,' ')+' seasoning, and serve.']:
        ['Measure and prepare every ingredient before cooking.','Cook the '+FOOD[main].name.toLowerCase()+' safely until done, using the olive oil as needed.','Cook or warm the '+FOOD[base].name.toLowerCase()+' and '+FOOD[vegId].name.toLowerCase()+'.','Combine with the '+season.replace(/-/g,' ')+' sauce, taste, and serve immediately.'],
      time:{prepMinutes:12,cookMinutes:slot==='Snack'?3:(slot==='Breakfast'?15:25),totalMinutes:slot==='Snack'?15:(slot==='Breakfast'?27:37)},
      difficulty:'Easy',equipment:slot==='Snack'?['mixing bowl','measuring tools']:['knife','cutting board','skillet or saucepan','measuring tools'],
      dietary:{vegetarian:['tofu','beans','chickpeas','lentils','egg','whites','yogurt','cottage'].indexOf(main)>=0,vegan:['tofu','beans','chickpeas','lentils'].indexOf(main)>=0,glutenFree:['pasta','tortilla','bread','oats'].indexOf(base)<0,dairyFree:!items.some(function(it){return (it.allergens||[]).indexOf('milk')>=0;})},
      allergens:Array.from(new Set([].concat.apply([],items.map(function(it){return it.allergens||[];})))),
      tags:[slugCuisine,slot.toLowerCase(),'home-cooked','high-protein',formatIndex===0?'one-pan':'meal-prep-friendly'],
      flavor:[season.replace(/-/g,' '),variantIndex%2?'savory':'bright'],texture:[formatIndex%2?'tender':'hearty'],
      mealPrep:{suitable:true,refrigeratorDays:slot==='Snack'?2:3,freezerDays:slot==='Snack'?0:30,leftoverQuality:slot==='Snack'?'best fresh':'good',batchMaxServings:12},
      cost:{tier:main==='salmon'||main==='shrimp'?'premium':'moderate',estimated:false},
      scaling:{minimumServings:1,maximumServings:12,method:'linear',seasoningNote:'Scale seasonings to 75% first when cooking for more than four, then adjust to taste.'},
      substitutions:[],image:{asset:'',status:'needed',alt:name},
      provenance:{status:'draft-calculated',source:'USDA FoodData Central specific-record calculations with explicit unresolved mappings; InSync prototype formula',reviewedBy:'',reviewedAt:'',notes:'Estimated values omit unresolved ingredients. Requires culinary, nutrition, and independent release review before production approval.'}
    };
  }

  var recipes=[];
  CUISINES.forEach(function(profile){
    Object.keys(FORMATS).forEach(function(slot){
      FORMATS[slot].forEach(function(form,fi){VARIANTS.forEach(function(v,vi){recipes.push(build(profile,slot,fi,vi));});});
    });
  });
  window.INSYNC_RECIPES=recipes;
  window.INSYNC_COOKBOOK_META={schema:1,recipeCount:recipes.length,recipesPerCuisine:120,recipesPerCuisineSlot:30,status:'foundation-draft',nutritionSource:NUTRIENTS?'USDA FoodData Central specific record mappings with explicit unresolved composite blockers':'legacy embedded reference fallback',nutrientRegistryVersion:NUTRIENTS&&NUTRIENTS.version||null};
})();
