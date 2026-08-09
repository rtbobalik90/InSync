# InSync

Two people, one trail. InSync is a local-first PWA for two people to track training, meals, body metrics, reflections, achievements and a shared expedition from two phones.

The complete personal log stays on the phone that created it. The two devices exchange only the shared Together payload through a **dedicated private GitHub repository**. Claude is optional and is called directly from the device for coaching, meal analysis and training-plan generation.

## Production architecture

```text
index.html            app shell and browser security policy
styles.css            styling
store.js              state, v5-v10 migration, scoring and local persistence
cloud.js              Claude + serialized two-device GitHub sync
ui.js                 shared header/nav/screen shell
media.js              camera compression + IndexedDB photograph storage
exercises.js          exercise library + animated WebP demonstrations
foods.js              quick-add food table + Open Food Facts lookup
badges.js             achievement rules
screens.js            rendered application screens
onboarding.js         first-run setup and starting targets/plan
log.js                meal/workout/morning/step logging sheets
app.js                router, actions, backup/restore and auto-sync hooks
sw.js                 PWA cache/update strategy
manifest.webmanifest  install metadata
assets/               artwork, badges, exercise media and app icons
tests/                release regression, sync-concurrency and render suites
```

There is no build step and no framework dependency. Deploy the folder as static files over HTTPS.

## Data and recovery rules

- Current application state is stored under `insync.v10`. Readable v5-v9 state migrates forward rather than being deleted.
- Each meaningful logged day freezes the targets and training requirement used for that day's score. Later target or plan changes therefore cannot rewrite historical scores.
- GitHub and Claude credentials are stored separately under `insync.secrets.v1` and are excluded from backups.
- Progress and meal photographs are stored in IndexedDB, not localStorage.
- **Create backup** exports normalized application state, the active workout session if one exists, and IndexedDB photographs. Connection keys are intentionally excluded.
- **Restore backup** validates and normalizes the backup before committing it. If the state commit fails, the prior state and prior photographs are restored.
- If the newest localStorage record is damaged but an older readable InSync record exists, InSync recovers the older copy and warns the user.
- If the only local copy is unreadable, InSync enters a blocking recovery screen and refuses ordinary writes until the damaged bytes are saved or the user explicitly starts over.
- Calendar-shaped but impossible dates and malformed imported structures are rejected during normalization.
- A storage write failure is surfaced to the user instead of being silently ignored.

## Two-phone setup

### 1. Deploy the app

Publish this project over HTTPS. On each iPhone, open the deployed URL in Safari and use **Add to Home Screen**.

### 2. Create a separate private sync repository

Create a second GitHub repository used only for InSync shared data:

- it must be **private**;
- it must **not** be the repository that publishes the PWA;
- initialize it with a README so the target branch exists;
- do not enable GitHub Pages on the sync repository.

Both phones use the same private repository and branch. InSync verifies that the repository is private and rejects repositories that look like the InSync application deployment.

Use a **fine-grained GitHub token** restricted to only this repository with **Contents: Read and write**. Recommended: create a separate token for each phone so one device can be revoked without disconnecting the other. No GitHub account is required on the second phone if you are using a token issued by the repository owner.

### 3. Configure both phones

On Phone A:

1. Complete onboarding for that person.
2. Set the partner name exactly as it appears on Phone B.
3. In **Settings → Connections**, enter the GitHub token, repository as `owner/repository`, and branch (normally `main`).
4. Optionally enter a Claude API key. The default model for this release is `claude-sonnet-5`; the model field remains editable.
5. Tap **Sync now** once and resolve any connection/privacy error shown in Settings.

Repeat on Phone B with the two profile/partner names reversed, using the same private sync repository and branch.

After the first successful setup, InSync schedules sync after meaningful local changes, when the app returns to the foreground, and when connectivity returns. GitHub writes and full sync rounds are serialized so overlapping edits cannot race repository content updates. SHA conflicts are retried with a fresh repository read.

## What crosses between the phones

Core Together state is shared so both phones stay logically aligned:

- profile name/initials;
- daily points and streak;
- earned badge IDs;
- notes intentionally written for the partner, including their authored date;
- expedition proposal/accept/counter/nudge state;
- current expedition route and leg identity;
- rolling point/logged history used for shared weekly views.

Privacy switches additionally control health detail:

- **Calories:** current daily calorie and protein totals.
- **Workouts:** current daily completed-session count.
- **Steps:** current daily steps plus expedition current/previous-leg mileage needed to reconcile the shared leg. Turning Steps off removes those mileage figures while route/leg identity still crosses.
- **Weight:** only a recent weight trend. Exact daily bodyweight is never sent.

Exact meals, exercise weights/reps, reflections, progress photographs and exact bodyweight never enter the partner sync file.

GitHub sync is **not** the full backup. Use **Settings → Your data → Create backup** for device recovery.

## Together messages and automatic sync

Together is a rolling two-person conversation. Tapping **Send** clears the composer immediately and places the message into the thread. Each phone owns the messages it authored; the private repository carries up to the latest 50 authored messages per person using sync schema 5.

A sent message is pushed immediately when connectivity is available. While InSync is visible, it performs a read-only partner refresh about once per minute, and opening Together requests an immediate refresh. Launching the app, returning it to the foreground, or regaining internet also triggers synchronization. iOS can suspend a Home Screen PWA in the background, so a suspended phone catches up when InSync is opened or resumed. **Sync now** remains available for troubleshooting but is not required for ordinary use.

## Expedition synchronization

Expedition progress and Together conversations use sync schema 5. The payload also carries each person's real InSync start date so pre-install days can never become phantom Together points. A partner payload identifies the route and leg that its mileage belongs to, preventing miles from a completed leg from leaking into the next leg when one phone advances first.

If one phone learns that the other has already advanced the same route, it follows the monotonic leg index and establishes a safe local step baseline. Stale partner files cannot move a route backward. A completed route has no current leg and cannot be advanced again.

The Store enforces arrival rules in addition to the UI: the combined distance must reach the leg target and each person must contribute at least one fifth of the leg.

## Daily scoring

The daily score is 10 points:

- 3 — follow the day's training requirement (scheduled session completed, scheduled walk reaches the step target, or planned recovery respected)
- 2 — protein target
- 2 — calories within 90%–105% of target
- 2 — step target
- 1 — weigh-in

A legitimate recovery day can earn 10/10. A day's score basis is frozen when meaningful activity is logged so changing future targets or replacing the weekly plan cannot rewrite completed history.

## Nutrition and weekly meal planning

Nutrition always presents four daily destinations: **Breakfast, Lunch, Dinner and Snack**. Each slot can hold multiple entries, and tapping a slot opens the logger already assigned to that meal rather than defaulting everything to Breakfast.

The Meal Planner is date-based and keeps separate weeks. It provides Previous / This week / Next navigation and 28 explicit slots per week (four meals × seven days). With Claude configured, **Build my week** generates a complete week around the current calorie/protein targets. Every generated planned meal includes nutrition, servings, prep time, ingredient amounts, a practical recipe note and step-by-step instructions. Opening a planned meal shows the recipe; a meal planned for today can be sent directly into the daily log. The shopping list is derived from the ingredient lists for the displayed week.

On Sunday, an untouched planner opens on the upcoming Monday-Sunday week so weekly preparation does not default to a nearly completed week. Existing weeks remain stored independently; rebuilding or clearing one displayed week does not erase other weeks.

## Journey start and weekly points

The Together weekly chart begins on the person's actual InSync start date. Dates before that boundary are blank rather than scored. This is important because a planned recovery day is worth three points: without an explicit start boundary, looking backward over a brand-new week could accidentally manufacture recovery points for days before the app existed. Sync schema 5 carries the start date to the partner phone and removes cached partner history from before that date.

## Training plans

Onboarding creates exactly the selected number of scheduled training days and keeps Sunday as recovery. Claude-generated plans are rejected unless they:

- contain exactly the selected number of unique weekdays;
- keep Sunday free;
- use only movements in the exercise library;
- contain 3–5 movements on lifting days;
- contain at most one walking day;
- preserve at least 48 hours before the same muscle group is trained again, including across the week boundary.

Starting calorie targets use weight, height, age, sex, goal and training frequency as inputs and are starting estimates rather than medical prescriptions.

## Claude behavior and privacy

Claude is optional. For this release the default model is `claude-sonnet-5`. InSync's Claude responses are deliberately short, so Sonnet 5 thinking is disabled for these requests to preserve the small response budgets and JSON contracts used by the UI.

The Claude key necessarily exists in the browser/device when direct Claude features are used. Request-relevant facts, and a meal photograph only when the user invokes the photo reader, are sent to Anthropic for that request. Keep the deployment trusted and use credentials intended for these devices.

## PWA/update behavior

Core application files are network-first so a deployed fix wins when a connection is available. Artwork/exercise media is stale-while-revalidate so cached visuals open immediately and refresh in the background. Runtime cache-write failures do not break the network response.

Service-worker shell installation is all-or-nothing: if a required core file is missing, the new worker fails installation instead of replacing a working worker with a partial offline shell.

The optimized asset directory is approximately 27 MiB, down from roughly 148 MiB in the originally reviewed project.

## Release verification

Run all four ship suites:

```bash
node tests/stabilization-tests.js
node tests/cloud-sync-tests.js
node tests/screen-smoke-tests.js
node tests/meal-planner-tests.js
```

App **5.3.0**, state schema **v10**, sync schema **5** currently passes:

- **469** stabilization/regression checks;
- **23** sync concurrency/reconciliation checks;
- **54** screen-render/malformed-state checks;
- **11** dedicated weekly meal-planner checks;
- **557 total checks, 0 failures**.

See `TEST_REPORT.md`, `CODE_REVIEW.md` and `RELEASE_NOTES.md` for the third-pass findings and the remaining real-iPhone acceptance gate.
