#!/usr/bin/env python3
"""Discover official USDA FoodData Central records for InSync ingredients.

This is a maintainer tool. It never runs in the browser and does not mutate the
bundled registry. Review its output before updating production data.
"""
from __future__ import annotations

import concurrent.futures
import json
import sys
import urllib.parse
import urllib.request

QUERIES = {
    "egg": "egg whole raw fresh",
    "whites": "egg white raw fresh",
    "chicken": "chicken breast meat only cooked roasted",
    "turkey": "turkey ground cooked",
    "beef": "beef ground 90 lean cooked",
    "pork": "pork loin cooked roasted lean",
    "salmon": "salmon Atlantic cooked dry heat",
    "shrimp": "shrimp cooked moist heat",
    "tofu": "tofu firm prepared with calcium",
    "beans": "beans black mature seeds cooked boiled without salt",
    "chickpeas": "chickpeas mature seeds cooked boiled without salt",
    "lentils": "lentils mature seeds cooked boiled without salt",
    "yogurt": "yogurt Greek plain nonfat",
    "cottage": "cheese cottage lowfat 2 percent milkfat",
    "rice": "rice brown long grain cooked",
    "whiteRice": "rice white long grain regular cooked",
    "quinoa": "quinoa cooked",
    "oats": "oats regular quick not fortified dry",
    "pasta": "spaghetti whole wheat cooked",
    "tortilla": "tortillas ready to bake or fry whole wheat",
    "bread": "bread whole wheat commercially prepared",
    "potato": "potatoes boiled cooked in skin flesh without salt",
    "sweetPotato": "sweet potato cooked baked in skin flesh without salt",
    "greens": "lettuce mixed greens raw",
    "broccoli": "broccoli cooked boiled drained without salt",
    "pepper": "peppers sweet red raw",
    "tomato": "tomatoes red ripe raw year round average",
    "onion": "onions raw",
    "cucumber": "cucumber with peel raw",
    "carrot": "carrots raw",
    "cabbage": "cabbage raw",
    "spinach": "spinach raw",
    "berries": "berries mixed frozen unsweetened",
    "apple": "apples raw with skin",
    "banana": "bananas raw",
    "avocado": "avocados raw all commercial varieties",
    "almonds": "nuts almonds",
    "peanutButter": "peanut butter smooth without salt",
    "oliveOil": "oil olive salad or cooking",
    "cheese": "cheese cheddar reduced fat",
    "salsa": "salsa ready to serve",
    "breadSauce": "sauce unspecified",
    "herbs": "spices mixed",
    "milk": "milk lowfat fluid 1 percent milkfat with added vitamin A and D",
    "blueberry": "blueberries raw",
    "flour": "wheat flour whole grain",
    "lemon": "lemon juice raw",
    "wildRice": "wild rice cooked",
    "celery": "celery raw",
    "blackBeans": "beans black mature seeds cooked boiled without salt",
    "corn": "corn sweet yellow cooked boiled drained without salt",
    "lime": "lime juice raw",
    "peas": "peas green cooked boiled drained without salt",
    "edamame": "edamame cooked prepared frozen",
    "honey": "honey",
    "besan": "chickpea flour besan",
    "paneer": "cheese paneer",
    "coconutMilk": "coconut milk canned light",
    "mango": "mangos raw",
    "soySauce": "soy sauce reduced sodium",
    "sesame": "seeds sesame whole dried",
    "miso": "miso",
    "mushroom": "mushrooms white raw",
    "seaweed": "seaweed wakame raw",
    "soba": "noodles Japanese soba cooked",
    "tuna": "fish tuna light canned in water drained solids",
    "fig": "figs dried uncooked",
    "walnuts": "nuts walnuts English",
    "feta": "cheese feta",
    "olive": "olives ripe canned jumbo super colossal",
    "greenBeans": "beans snap green cooked boiled drained without salt",
    "couscous": "couscous cooked",
    "tahini": "sesame butter tahini from raw and stone ground kernels",
}

BASE = "https://api.nal.usda.gov/fdc/v1/foods/search"


def search(item):
    key, query = item
    params = urllib.parse.urlencode({
        "api_key": "DEMO_KEY",
        "query": query,
        "pageSize": 8,
        "dataType": "Foundation,SR Legacy",
    })
    with urllib.request.urlopen(BASE + "?" + params, timeout=60) as response:
        payload = json.load(response)
    return key, [
        {"fdcId": food["fdcId"], "description": food["description"], "dataType": food["dataType"]}
        for food in payload.get("foods", [])
    ]


def main():
    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(search, item) for item in QUERIES.items()]
        for future in concurrent.futures.as_completed(futures):
            key, foods = future.result()
            results[key] = foods
            print(key, file=sys.stderr)
    print(json.dumps(results, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
