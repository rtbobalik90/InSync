#!/usr/bin/env python3
"""Build the bundled InSync nutrient registry from official USDA CSV releases.

Mappings are deliberately explicit. Composite placeholders stay unresolved;
the generator never chooses a merely similar food to improve coverage numbers.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

FDC_ROOT = Path('/workspace/scratch/9cc900a6f9eb/tmp/fdc')
OUTPUT = Path(__file__).resolve().parents[1] / 'ingredient-nutrients.js'
DATASETS = {
    'Foundation': {
        'root': FDC_ROOT / 'foundation/FoodData_Central_foundation_food_csv_2026-04-30',
        'release': 'Foundation Foods, April 2026',
    },
    'SR Legacy': {
        'root': FDC_ROOT / 'sr/FoodData_Central_sr_legacy_food_csv_2018-04',
        'release': 'SR Legacy, April 2018',
    },
    'FNDDS': {
        'root': FDC_ROOT / 'fndds/FoodData_Central_survey_food_csv_2024-10-31',
        'release': 'FNDDS 2021-2023, October 2024',
    },
}

# Registry key -> (dataset, FDC ID). These selections match the food state in
# the corresponding key, not just the broad ingredient name.
MAPPINGS = {
    'eggRaw': ('SR Legacy', 171287),
    'eggCookedHardBoiled': ('SR Legacy', 173424),
    'eggWhiteRaw': ('SR Legacy', 172183),
    'chickenCooked': ('SR Legacy', 171477),
    'chickenRaw': ('SR Legacy', 171077),
    'turkeyCooked': ('SR Legacy', 172851),
    'turkeyRaw': ('SR Legacy', 172850),
    'salmonCooked': ('SR Legacy', 175168),
    'salmonRaw': ('SR Legacy', 175167),
    'shrimpCooked': ('SR Legacy', 171971),
    'shrimpRaw': ('SR Legacy', 174210),
    'tofuFirmRaw': ('SR Legacy', 172475),
    'blackBeansCooked': ('SR Legacy', 173735),
    'chickpeasCooked': ('SR Legacy', 173757),
    'lentilsCooked': ('SR Legacy', 172421),
    'greekYogurtNonfat': ('SR Legacy', 170894),
    'cottageCheeseLowfat': ('SR Legacy', 172182),
    'brownRiceCooked': ('SR Legacy', 169704),
    'whiteRiceCooked': ('SR Legacy', 169757),
    'quinoaCooked': ('SR Legacy', 168917),
    'oatsCooked': ('SR Legacy', 173905),
    'oatsDry': ('SR Legacy', 173904),
    'wholeGrainPastaCooked': ('SR Legacy', 168910),
    'wholeWheatTortilla': ('SR Legacy', 174081),
    'wholeWheatBread': ('SR Legacy', 172688),
    'potatoCooked': ('SR Legacy', 170440),
    'potatoRaw': ('SR Legacy', 170026),
    'sweetPotatoCooked': ('SR Legacy', 168484),
    'sweetPotatoRaw': ('SR Legacy', 168482),
    'broccoliCooked': ('SR Legacy', 169967),
    'broccoliRaw': ('SR Legacy', 170379),
    'redPepperRaw': ('SR Legacy', 170108),
    'tomatoRaw': ('SR Legacy', 170457),
    'onionRaw': ('SR Legacy', 170000),
    'cucumberRaw': ('SR Legacy', 168409),
    'carrotRaw': ('SR Legacy', 170393),
    'cabbageRaw': ('SR Legacy', 169975),
    'spinachRaw': ('SR Legacy', 168462),
    'blueberriesRaw': ('SR Legacy', 171711),
    'appleRaw': ('SR Legacy', 171688),
    'bananaRaw': ('SR Legacy', 173944),
    'mangoRaw': ('SR Legacy', 169910),
    'avocadoRaw': ('SR Legacy', 171705),
    'almondsRaw': ('SR Legacy', 170567),
    'walnutsRaw': ('SR Legacy', 170187),
    'peanutButterUnsalted': ('SR Legacy', 172470),
    'tahiniRoasted': ('SR Legacy', 170189),
    'sesameSeedsDried': ('SR Legacy', 170150),
    'feta': ('SR Legacy', 173420),
    'oliveOil': ('SR Legacy', 171413),
    'salsaReady': ('SR Legacy', 174524),
    'milkLowfat': ('SR Legacy', 170872),
    'wholeWheatFlour': ('SR Legacy', 168893),
    'lemonJuiceRaw': ('SR Legacy', 167747),
    'limeJuiceRaw': ('SR Legacy', 168156),
    'wildRiceCooked': ('SR Legacy', 168897),
    'celeryRaw': ('SR Legacy', 169988),
    'cornCooked': ('SR Legacy', 169999),
    'peasCooked': ('SR Legacy', 170420),
    'edamamePrepared': ('SR Legacy', 168411),
    'honey': ('SR Legacy', 169640),
    'chickpeaFlour': ('SR Legacy', 174288),
    'paneer': ('FNDDS', 2705740),
    'miso': ('SR Legacy', 172442),
    'mushroomRaw': ('SR Legacy', 169251),
    'tunaCannedWater': ('SR Legacy', 173709),
    'figsDried': ('SR Legacy', 174665),
    'olivesCanned': ('SR Legacy', 169094),
    'greenBeansCooked': ('SR Legacy', 169141),
}

UNRESOLVED = {
    'sauce': 'Cuisine-specific sauce is a recipe placeholder without a component formula.',
    'herbs': 'Cuisine-renamed seasoning blend has no defined component formula.',
    'spices': 'Generic herbs and spices varies by recipe and has no defined component formula.',
    'berries': 'Mixed berries has no specified fruit proportions or preparation state.',
    'coconutMilk': 'The recipe specifies light coconut milk; available generic records do not establish that formulation.',
    'couscous': 'The recipe specifies whole-wheat couscous; the available generic cooked couscous record is not equivalent.',
    'soba': 'The matching cooked soba record does not provide a complete core nutrient panel in the bundled USDA release.',
    'beef': 'Lean cooked beef does not define cut, fat trim, grade, or cooking method.',
    'pork': 'Cooked pork loin does not define cut, fat trim, enhancement, or cooking method.',
    'greens': 'Mixed leafy greens does not define species or proportions.',
    'cheese': 'Reduced-fat shredded cheese does not define the cheese variety or blend.',
    'seaweed': 'The recipe specifies rehydrated wakame, while the available record is raw wakame.',
    'soySauce': 'No generic record satisfies both the reduced-sodium and tamari claims.',
}

NUTRIENTS = {
    'protein': [1003], 'fat': [1004], 'carbs': [1005],
    'kcal': [1008, 2047, 2048], 'fiber': [1079], 'sugar': [2000],
    'saturatedFat': [1258], 'sodium': [1093], 'cholesterol': [1253],
    'calcium': [1087], 'iron': [1089], 'potassium': [1092],
}


def load_dataset(name):
    root = DATASETS[name]['root']
    foods = {}
    with (root / 'food.csv').open(newline='', encoding='utf-8-sig') as stream:
        for row in csv.DictReader(stream):
            foods[int(row['fdc_id'])] = row
    nutrient_names = {}
    nutrient_number_to_id = {}
    with (root / 'nutrient.csv').open(newline='', encoding='utf-8-sig') as stream:
        for row in csv.DictReader(stream):
            nutrient_names[int(row['id'])] = row
            try:
                nutrient_number = float(row['nutrient_nbr'])
                if nutrient_number.is_integer():
                    nutrient_number_to_id[int(nutrient_number)] = int(row['id'])
            except (TypeError, ValueError):
                pass
    values = {}
    with (root / 'food_nutrient.csv').open(newline='', encoding='utf-8-sig') as stream:
        for row in csv.DictReader(stream):
            fdc_id = int(row['fdc_id'])
            if fdc_id not in {fid for dataset, fid in MAPPINGS.values() if dataset == name}:
                continue
            amount = row.get('amount', '')
            if amount != '':
                raw_id = int(row['nutrient_id'])
                # The October 2024 FNDDS food_nutrient export identifies
                # nutrients by Nutrient Number (203, 204, 205...), while the
                # other releases use the FoodData Central nutrient ID.
                canonical_id = nutrient_number_to_id.get(raw_id, raw_id) if name == 'FNDDS' else raw_id
                values.setdefault(fdc_id, {})[canonical_id] = float(amount)
    return foods, nutrient_names, values


def nutrient_value(values, ids):
    for nutrient_id in ids:
        if nutrient_id in values:
            return round(values[nutrient_id], 4)
    return None


def build():
    loaded = {name: load_dataset(name) for name in DATASETS}
    records = {}
    for key, (dataset, fdc_id) in MAPPINGS.items():
        foods, _, all_values = loaded[dataset]
        if fdc_id not in foods:
            raise RuntimeError(f'{dataset} does not contain FDC {fdc_id} for {key}')
        row = foods[fdc_id]
        values = all_values.get(fdc_id, {})
        nutrients = {name: nutrient_value(values, ids) for name, ids in NUTRIENTS.items()}
        missing_core = [name for name in ('kcal', 'protein', 'carbs', 'fat', 'fiber', 'sodium') if nutrients[name] is None]
        if missing_core:
            raise RuntimeError(f'FDC {fdc_id} missing core nutrient(s): {missing_core}')
        records[key] = {
            'fdcId': fdc_id,
            'sourceRef': f'USDA-FDC-{fdc_id}',
            'description': row['description'],
            'dataType': row['data_type'],
            'publicationDate': row['publication_date'],
            'datasetRelease': DATASETS[dataset]['release'],
            'basis': 'per 100 g edible portion',
            'sourceUrl': f'https://fdc.nal.usda.gov/food-details/{fdc_id}/nutrients',
            'nutrients': nutrients,
        }
    return records


def write(records):
    records_json = json.dumps(records, indent=2, sort_keys=True)
    unresolved_json = json.dumps(UNRESOLVED, indent=2, sort_keys=True)
    source = f'''/* Generated from official USDA FoodData Central CSV releases.
   Do not hand-edit mapped nutrient values. Run tools/build_nutrient_registry.py.
   Composite placeholders remain explicitly unresolved and block release. */
(function (root) {{
  'use strict';

  var RECORDS = {records_json};
  var UNRESOLVED = {unresolved_json};
  var ALIASES = {{
    whites:'eggWhiteRaw', shrimp:'shrimpCooked',
    tofu:'tofuFirmRaw', beans:'blackBeansCooked', blackBeans:'blackBeansCooked',
    chickpeas:'chickpeasCooked', lentils:'lentilsCooked', yogurt:'greekYogurtNonfat',
    cottage:'cottageCheeseLowfat', rice:'brownRiceCooked', whiteRice:'whiteRiceCooked',
    quinoa:'quinoaCooked', pasta:'wholeGrainPastaCooked',
    tortilla:'wholeWheatTortilla', bread:'wholeWheatBread',
    pepper:'redPepperRaw', tomato:'tomatoRaw', onion:'onionRaw', cucumber:'cucumberRaw',
    carrot:'carrotRaw', cabbage:'cabbageRaw', spinach:'spinachRaw', blueberry:'blueberriesRaw',
    apple:'appleRaw', banana:'bananaRaw', mango:'mangoRaw', avocado:'avocadoRaw',
    almonds:'almondsRaw', walnuts:'walnutsRaw', peanut:'peanutButterUnsalted',
    peanutButter:'peanutButterUnsalted', tahini:'tahiniRoasted', sesame:'sesameSeedsDried',
    feta:'feta', oil:'oliveOil', oliveOil:'oliveOil',
    salsa:'salsaReady', milk:'milkLowfat', flour:'wholeWheatFlour', lemon:'lemonJuiceRaw',
    lime:'limeJuiceRaw', wildRice:'wildRiceCooked', celery:'celeryRaw', corn:'cornCooked',
    peas:'peasCooked', edamame:'edamamePrepared', honey:'honey', besan:'chickpeaFlour',
    paneer:'paneer', miso:'miso', mushroom:'mushroomRaw', tuna:'tunaCannedWater', fig:'figsDried',
    olive:'olivesCanned', greenBeans:'greenBeansCooked'
  }};
  var NUTRIENTS = ['kcal','protein','carbs','fat','fiber','sugar','saturatedFat','sodium','cholesterol','calcium','iron','potassium'];

  function text(value) {{ return String(value == null ? '' : value).trim(); }}
  function round(value) {{ return Math.round(value * 10) / 10; }}
  function registryKey(ingredient) {{
    var id = text(ingredient && ingredient.id);
    var state = text(ingredient && ingredient.preparationState).toLowerCase();
    var name = text(ingredient && ingredient.name).toLowerCase();
    var collection = text(ingredient && ingredient.collection);
    if (id === 'egg') return /cooked|peeled|boiled/.test(state) ? 'eggCookedHardBoiled' : 'eggRaw';
    if (id === 'oats') return collection === 'catalog' ? 'oatsCooked' : (collection === 'pilot' ? 'oatsDry' : '');
    if (id === 'broccoli') return collection === 'catalog' ? 'broccoliCooked' : (collection === 'pilot' ? 'broccoliRaw' : '');
    if (id === 'chicken') return /raw/.test(state) ? 'chickenRaw' : (/cooked/.test(state + ' ' + name) ? 'chickenCooked' : '');
    if (id === 'turkey') return /raw/.test(state) ? 'turkeyRaw' : (/cooked/.test(state) ? 'turkeyCooked' : '');
    if (id === 'potato') return collection === 'catalog' ? 'potatoCooked' : (/raw/.test(state) ? 'potatoRaw' : (/cooked/.test(name) && !/cubed/.test(state) ? 'potatoCooked' : ''));
    if (id === 'sweetPotato') return collection === 'catalog' ? 'sweetPotatoCooked' : (/raw/.test(state) ? 'sweetPotatoRaw' : (/cooked/.test(name) && !/cubed/.test(state) ? 'sweetPotatoCooked' : ''));
    if (id === 'salmon') return /raw/.test(state) ? 'salmonRaw' : (/cooked/.test(state + ' ' + name) ? 'salmonCooked' : '');
    if (id === 'shrimp') return /raw/.test(state) ? 'shrimpRaw' : 'shrimpCooked';
    return ALIASES[id] || '';
  }}
  function resolve(ingredient) {{
    var id = text(ingredient && ingredient.id);
    if (UNRESOLVED[id]) return {{ resolved:false, ingredientId:id, reason:UNRESOLVED[id] }};
    if (id === 'salsa' && !/salsa/i.test(text(ingredient && ingredient.name))) return {{resolved:false, ingredientId:id, reason:'The line is cuisine-renamed sauce, not the mapped ready-to-serve salsa record.'}};
    var key = registryKey(ingredient);
    var record = RECORDS[key];
    if (!record) return {{ resolved:false, ingredientId:id, reason:'No reviewed USDA mapping exists for this ingredient and preparation state.' }};
    return {{ resolved:true, ingredientId:id, registryKey:key, record:record }};
  }}
  function calculate(ingredients, servings) {{
    var totals = {{}}, supported = {{}}, sourceRecords = [], unresolved = [], mappedGrams = 0, totalGrams = 0;
    NUTRIENTS.forEach(function (key) {{ totals[key] = 0; supported[key] = true; }});
    (ingredients || []).forEach(function (ingredient) {{
      var grams = +ingredient.grams || 0, result = resolve(ingredient);
      totalGrams += grams;
      if (!result.resolved) {{
        ingredient.sourceRef = 'UNRESOLVED-' + text(ingredient.id);
        ingredient.nutrientMappingStatus = 'blocked';
        unresolved.push({{ingredient:ingredient.name || ingredient.id, ingredientId:ingredient.id, sourceRef:ingredient.sourceRef, grams:grams, reason:result.reason}});
        return;
      }}
      var record = result.record;
      ingredient.sourceRef = record.sourceRef;
      ingredient.nutrientMappingStatus = 'mapped';
      if (!text(ingredient.preparationState) || /^(as listed|as described in ingredient name|state not specified)$/i.test(text(ingredient.preparationState))) ingredient.preparationState = record.description;
      ingredient.nutrientSource = {{fdcId:record.fdcId, description:record.description, dataType:record.dataType, publicationDate:record.publicationDate, basis:record.basis, sourceUrl:record.sourceUrl}};
      mappedGrams += grams;
      sourceRecords.push({{ingredientId:ingredient.id, sourceId:record.sourceRef, fdcId:record.fdcId, description:record.description, dataType:record.dataType, grams:grams, basis:record.basis, sourceUrl:record.sourceUrl}});
      NUTRIENTS.forEach(function (key) {{
        var value = record.nutrients[key];
        if (typeof value !== 'number' || !Number.isFinite(value)) {{ supported[key] = false; return; }}
        totals[key] += value * grams / 100;
      }});
    }});
    servings = Math.max(1, +servings || 1);
    var nutrition = {{}};
    NUTRIENTS.forEach(function (key) {{ nutrition[key] = supported[key] ? round(totals[key] / servings) : null; }});
    var missingNutrients = NUTRIENTS.filter(function (key) {{ return nutrition[key] == null; }});
    var sourceMappingComplete = unresolved.length === 0;
    var nutrientPanelComplete = ['kcal','protein','carbs','fat','fiber','sugar','saturatedFat','sodium'].every(function (key) {{ return nutrition[key] != null; }});
    return {{
      nutrition:nutrition,
      provenance:{{
        calculatedAt:'2026-09-06',
        calculationMethod:'USDA FoodData Central nutrient values per 100 g multiplied by canonical ingredient grams, divided by base servings',
        estimated:true,
        complete:sourceMappingComplete && nutrientPanelComplete,
        sourceMappingComplete:sourceMappingComplete,
        nutrientPanelComplete:nutrientPanelComplete,
        missingNutrients:missingNutrients,
        mappedIngredientCount:sourceRecords.length,
        ingredientCount:(ingredients || []).length,
        mappedMassPercent:totalGrams ? round(mappedGrams / totalGrams * 100) : 0,
        sourceRecords:sourceRecords,
        sourceIds:sourceRecords.map(function (row) {{ return row.sourceId; }}),
        unresolvedMappings:unresolved,
        officialSources:['https://fdc.nal.usda.gov/data-documentation','https://fdc.nal.usda.gov/download-datasets.html']
      }}
    }};
  }}

  root.InSyncNutrientRegistry = {{
    version:1,
    records:RECORDS,
    aliases:ALIASES,
    unresolved:UNRESOLVED,
    nutrients:NUTRIENTS.slice(),
    resolve:resolve,
    calculate:calculate,
    metadata:{{
      authority:'USDA Agricultural Research Service, FoodData Central',
      releases:['Foundation Foods, April 2026','FNDDS 2021-2023, October 2024','SR Legacy, April 2018'],
      generatedAt:'2026-09-06',
      sourceDocumentation:'https://fdc.nal.usda.gov/data-documentation',
      downloadPage:'https://fdc.nal.usda.gov/download-datasets.html'
    }}
  }};
}})(typeof window !== 'undefined' ? window : globalThis);
'''
    OUTPUT.write_text(source, encoding='utf-8')


if __name__ == '__main__':
    write(build())
    print(OUTPUT)
