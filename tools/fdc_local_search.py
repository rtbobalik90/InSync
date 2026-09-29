#!/usr/bin/env python3
"""Search the downloaded official USDA datasets for ingredient mappings."""
from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

ROOT = Path('/workspace/scratch/9cc900a6f9eb/tmp/fdc')
FOOD_FILES = [
    ROOT / 'foundation/FoodData_Central_foundation_food_csv_2026-04-30/food.csv',
    ROOT / 'sr/FoodData_Central_sr_legacy_food_csv_2018-04/food.csv',
    ROOT / 'fndds/FoodData_Central_survey_food_csv_2024-10-31/food.csv',
]
STOP = {'and', 'or', 'the', 'with', 'without', 'all', 'prepared', 'as'}


def tokens(value):
    return set(re.findall(r'[a-z0-9]+', value.lower())) - STOP


def main():
    query = ' '.join(sys.argv[1:]).strip()
    if not query:
        raise SystemExit('usage: fdc_local_search.py QUERY')
    wanted = tokens(query)
    rows = []
    for path in FOOD_FILES:
        dataset = 'Foundation' if '/foundation/' in str(path) else ('SR Legacy' if '/sr/' in str(path) else 'FNDDS')
        with path.open(newline='', encoding='utf-8-sig') as stream:
            for row in csv.DictReader(stream):
                description = row['description']
                available = tokens(description)
                overlap = wanted & available
                if not overlap:
                    continue
                precision = len(overlap) / max(1, len(available))
                recall = len(overlap) / max(1, len(wanted))
                score = (recall * 4) + precision
                rows.append((score, dataset, row['fdc_id'], description))
    for score, dataset, fdc_id, description in sorted(rows, reverse=True)[:15]:
        print(f'{score:.3f}\t{dataset}\t{fdc_id}\t{description}')


if __name__ == '__main__':
    main()
