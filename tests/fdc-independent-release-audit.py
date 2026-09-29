#!/usr/bin/env python3
"""Independent USDA FoodData Central source audit for InSync recipes.

This test reads the official downloadable CSV releases directly. It does not
trust an application-maintained registry as evidence that an FDC ID exists or
that its nutrient values and preparation state match the recipe ingredient.
"""

from __future__ import annotations

import csv
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys


ROOT = Path(__file__).resolve().parent.parent
FDC_ROOT = Path(os.environ.get("INSYNC_FDC_ROOT", "/workspace/scratch/9cc900a6f9eb/tmp/fdc"))
SOURCE_PATTERN = re.compile(r"^USDA-FDC-(\d+)$")
NUTRIENT_IDS = {
    "protein": "1003",
    "fat": "1004",
    "carbs": "1005",
    "fiber": "1079",
    "sodium": "1093",
    "sugar": "2000",
    "saturatedFat": "1258",
}
ENERGY_IDS = ("1008", "2047", "2048")
REGISTRY_NUTRIENTS = {
    "protein": ("1003",), "fat": ("1004",), "carbs": ("1005",),
    "fiber": ("1079",), "sodium": ("1093",), "sugar": ("2000",),
    "saturatedFat": ("1258",), "cholesterol": ("1253",),
    "calcium": ("1087",), "iron": ("1089",), "potassium": ("1092",),
    "kcal": ENERGY_IDS,
}


def load_recipes() -> list[dict]:
    script = r"""
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=process.argv[1],ctx={console,window:null,globalThis:null,Number,Math,Object,Array,String,Date,JSON,Set};
ctx.window=ctx;vm.createContext(ctx);
ctx.globalThis=ctx;
for(const f of ['ingredient-nutrients.js','cookbook-data.js','pilot-recipes.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
process.stdout.write(JSON.stringify(ctx.INSYNC_RECIPES.concat(ctx.INSYNC_PILOT_RECIPES)));
"""
    completed = subprocess.run(
        ["node", "-e", script, str(ROOT)], check=True, capture_output=True, text=True
    )
    return json.loads(completed.stdout)


def load_registry() -> dict[str, dict]:
    source = ROOT / "ingredient-nutrients.js"
    if not source.exists():
        return {}
    script = r"""
const fs=require('fs'),vm=require('vm');
const ctx={console,window:null,globalThis:null,Number,Math,Object,Array,String,Date,JSON,Set};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),ctx,{filename:process.argv[1]});
process.stdout.write(JSON.stringify(ctx.InSyncNutrientRegistry.records));
"""
    completed = subprocess.run(
        ["node", "-e", script, str(source)], check=True, capture_output=True, text=True
    )
    return json.loads(completed.stdout)


def csv_paths(filename: str) -> list[Path]:
    return sorted(FDC_ROOT.glob(f"*/FoodData_Central_*/{filename}"))


def load_food_index() -> tuple[dict[str, dict], list[dict]]:
    index: dict[str, dict] = {}
    releases: list[dict] = []
    for path in csv_paths("food.csv"):
        source = path.parts[-3]
        rows = 0
        dates: list[str] = []
        with path.open(newline="", encoding="utf-8-sig") as handle:
            for row in csv.DictReader(handle):
                rows += 1
                fdc_id = row.get("fdc_id", "")
                index[fdc_id] = {
                    "description": row.get("description", ""),
                    "dataType": row.get("data_type", ""),
                    "publicationDate": row.get("publication_date", ""),
                    "sourceRelease": source,
                }
                if row.get("publication_date"):
                    dates.append(row["publication_date"])
        releases.append(
            {
                "source": source,
                "foodRows": rows,
                "publicationDateMinimum": min(dates) if dates else "",
                "publicationDateMaximum": max(dates) if dates else "",
            }
        )
    return index, releases


def load_referenced_nutrients(referenced: set[str]) -> dict[str, dict[str, float]]:
    results: dict[str, dict[str, float]] = {fdc_id: {} for fdc_id in referenced}
    if not referenced:
        return results
    desired = set(NUTRIENT_IDS.values()).union(ENERGY_IDS).union(
        nutrient_id for choices in REGISTRY_NUTRIENTS.values() for nutrient_id in choices
    )
    for path in csv_paths("food_nutrient.csv"):
        nutrient_number_to_id: dict[str, str] = {}
        nutrient_path = path.parent / "nutrient.csv"
        with nutrient_path.open(newline="", encoding="utf-8-sig") as nutrient_handle:
            for nutrient in csv.DictReader(nutrient_handle):
                number = nutrient.get("nutrient_nbr", "")
                if number:
                    number = number.strip()
                    if re.fullmatch(r"\d+\.0+", number):
                        number = number.split(".", 1)[0]
                    nutrient_number_to_id[number] = nutrient.get("id", "")
        with path.open(newline="", encoding="utf-8-sig") as handle:
            for row in csv.DictReader(handle):
                fdc_id = row.get("fdc_id", "")
                raw_nutrient_id = row.get("nutrient_id", "")
                nutrient_id = nutrient_number_to_id.get(raw_nutrient_id, raw_nutrient_id) if "survey_food" in str(path) else raw_nutrient_id
                if fdc_id not in referenced or nutrient_id not in desired:
                    continue
                try:
                    amount = float(row.get("amount", ""))
                except ValueError:
                    continue
                if math.isfinite(amount):
                    results[fdc_id][nutrient_id] = amount
    return results


def preparation_compatible(state: str, description: str) -> bool | None:
    state = state.lower().strip()
    description = description.lower()
    if not state or state == "as listed":
        return None
    raw_markers = ("raw", "uncooked")
    cooked_markers = ("cooked", "roasted", "baked", "boiled", "grilled", "broiled", "fried", "steamed")
    if "raw" in state:
        return any(marker in description for marker in raw_markers) and not any(marker in description for marker in cooked_markers)
    if any(marker in state for marker in cooked_markers):
        return any(marker in description for marker in cooked_markers)
    return None


def main() -> int:
    if not FDC_ROOT.exists():
        print(json.dumps({"verdict": "BLOCKED", "error": f"official FDC CSV root not found: {FDC_ROOT}"}, indent=2))
        return 1

    recipes = load_recipes()
    registry = load_registry()
    food_index, releases = load_food_index()
    ingredient_lines = [item for recipe in recipes for item in recipe.get("ingredients", [])]
    referenced_ids = {
        match.group(1)
        for item in ingredient_lines
        if (match := SOURCE_PATTERN.match(str(item.get("sourceRef", ""))))
    }
    registry_ids = {str(record.get("fdcId", "")) for record in registry.values() if record.get("fdcId")}
    nutrients = load_referenced_nutrients(referenced_ids.union(registry_ids))

    registry_id_mismatches = 0
    registry_description_mismatches = 0
    registry_value_mismatches = 0
    registry_mismatch_examples: list[dict] = []
    for key, record in registry.items():
        fdc_id = str(record.get("fdcId", ""))
        official = food_index.get(fdc_id)
        if not official or str(record.get("sourceRef", "")) != f"USDA-FDC-{fdc_id}":
            registry_id_mismatches += 1
            continue
        if str(record.get("description", "")) != official["description"]:
            registry_description_mismatches += 1
        official_nutrients = nutrients.get(fdc_id, {})
        for nutrient_name, registry_value in record.get("nutrients", {}).items():
            if registry_value is None:
                continue
            choices = REGISTRY_NUTRIENTS.get(nutrient_name, ())
            official_value = next((official_nutrients[candidate] for candidate in choices if candidate in official_nutrients), None)
            if official_value is None or not math.isclose(float(registry_value), float(official_value), rel_tol=0, abs_tol=0.0001):
                registry_value_mismatches += 1
                if len(registry_mismatch_examples) < 12:
                    registry_mismatch_examples.append({
                        "registryKey": key, "fdcId": fdc_id, "nutrient": nutrient_name,
                        "registryValue": registry_value, "officialValue": official_value,
                    })

    invalid_reference_lines = 0
    missing_fdc_rows = 0
    preparation_mismatches = 0
    preparation_unverifiable = 0
    incomplete_nutrient_rows = 0
    examples: list[dict] = []
    for recipe in recipes:
        for item in recipe.get("ingredients", []):
            source_ref = str(item.get("sourceRef", ""))
            match = SOURCE_PATTERN.match(source_ref)
            if not match:
                invalid_reference_lines += 1
                if len(examples) < 12:
                    examples.append({"recipeId": recipe["id"], "ingredientId": item.get("id"), "issue": "non-specific source", "sourceRef": source_ref})
                continue
            fdc_id = match.group(1)
            official = food_index.get(fdc_id)
            if not official:
                missing_fdc_rows += 1
                if len(examples) < 12:
                    examples.append({"recipeId": recipe["id"], "ingredientId": item.get("id"), "issue": "FDC ID absent from official releases", "fdcId": fdc_id})
                continue
            compatible = preparation_compatible(str(item.get("preparationState", "")), official["description"])
            if compatible is False:
                preparation_mismatches += 1
                if len(examples) < 12:
                    examples.append({"recipeId": recipe["id"], "ingredientId": item.get("id"), "issue": "preparation-state mismatch", "state": item.get("preparationState"), "fdcDescription": official["description"]})
            elif compatible is None:
                preparation_unverifiable += 1
            present = nutrients.get(fdc_id, {})
            has_energy = any(key in present for key in ENERGY_IDS)
            if not has_energy or any(nutrient_id not in present for nutrient_id in NUTRIENT_IDS.values()):
                incomplete_nutrient_rows += 1

    gate_open = not any(
        [invalid_reference_lines, missing_fdc_rows, preparation_mismatches,
         preparation_unverifiable, incomplete_nutrient_rows]
    ) and len(referenced_ids) > 0
    result = {
        "verdict": "PASS" if gate_open else "BLOCKED",
        "productionCertification": gate_open,
        "officialCsvRoot": str(FDC_ROOT),
        "officialReleases": releases,
        "recipesAudited": len(recipes),
        "ingredientLinesAudited": len(ingredient_lines),
        "uniqueNumericFdcIdsReferenced": len(referenced_ids),
        "registryEntriesCheckedAgainstOfficialCsv": len(registry),
        "registryIdMismatches": registry_id_mismatches,
        "registryDescriptionMismatches": registry_description_mismatches,
        "registryNutrientValueMismatches": registry_value_mismatches,
        "registryMismatchExamples": registry_mismatch_examples,
        "invalidOrNonSpecificSourceLines": invalid_reference_lines,
        "referencedIdsMissingFromOfficialCsv": missing_fdc_rows,
        "preparationStateMismatches": preparation_mismatches,
        "preparationStateUnverifiable": preparation_unverifiable,
        "referencedRowsMissingProductionNutrients": incomplete_nutrient_rows,
        "examples": examples,
    }
    print(json.dumps(result, indent=2))

    if gate_open:
        print("PASS: every referenced FDC ID and preparation state was independently verified")
    else:
        print("PASS: independent USDA source gate correctly refused production certification")
    return 0


if __name__ == "__main__":
    sys.exit(main())
