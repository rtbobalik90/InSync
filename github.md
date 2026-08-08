repo: rtbobalik90/InSync
branch: main

## Last sync
date: 2026-08-08T18:12:00Z

### Updated in this project
- Built the app shell: index.html, styles.css, store.js, ui.js, screens.js, app.js, sw.js, manifest.
- Five tabs live and store-driven — Home, Coach, Train, Nutrition, Together.
- One token layer replaces v4's four stacked `:root` blocks; 39 badges now carry real artwork.
- Remaining screens stubbed in the router, each naming the design file it ports from.

## Screen map
| Screen | File | Notes |
| --- | --- | --- |
| Home | home-time-states.dc.html | Four time states: dawn, day, sunset, night |
| Coach | Coach.dc.html | Today, Its working, Ask, Evening |
| Nutrition | nutrition-v2.dc.html | Running meal log |
| Meal scan | meal-scan.dc.html | 5 states: analysing → saved |
| Barcode scan | barcode-scan.dc.html | |
| Restaurant add | restaurant-add.dc.html | |
| Meal generator | meal-generator.dc.html | |
| Week planner | week-planner.dc.html | Plan drives the shopping list |
| Trends | trends-v2.dc.html | Six cards, one question each |
| Train | Train.dc.html | Session flow, machine library |
| Train records | Train - Records.dc.html | Per-exercise progression, PRs |
| Body | Body.dc.html | Morning entry, charts, photo timeline |
| Together | Together.dc.html | Expedition, challenges, badges, privacy |
| Handshake | Together - Handshake.dc.html | Invitation, waiting, counter, accepted, notifications |
| Reflection | reflection.dc.html | Evening journal against the morning verse |
| Settings | Settings.dc.html | Goal & targets, privacy, notifications, first run |

## Not yet designed
- Empty day-one Home
- Full badge set (6 of 50+ drawn, no detail view)
