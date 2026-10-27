# PLAN

## Phase 0. Setup

Do:
- [x] git init
- [x] .gitignore (node_modules, .env, /reports, *.db, test-results, playwright-report)
- [x] package.json
- [x] tsconfig (strict mode)
- [x] Folders /app /data /db /salesforce /compare /tests /docs
- [x] /app/types.ts with the domain types
- [x] STOP: user runs `gh auth login`
- [x] `gh repo create migration-qa-toolkit --public --source=. --push`

DONE WHEN:
- [x] `npm install` and `npx tsc --noEmit` both run with zero errors.
- [x] CLAUDE.md, PLAN.md, .env.example and /docs/decisions.md exist.
- [x] The public GitHub repo URL is shown, and the first commit is visible there.

## Phase 1. Data and target system

Sub-agents in parallel after types.ts: A = data and database, B = app and API.

Do (A):
- [x] `npm run data:generate` writes the clean CSVs: 20 clients, 5 practitioners (1 inactive from 2026-10-15), 3 funders, 25 authorisations, 20 cases, 60 bookings
- [x] `npm run seed` builds a fresh /db/target.db from the CSVs, then applies the defects
- [x] D1 booking dated after its authorisation's end date (breaks R1)
- [x] D2 bookings that push an authorisation over its approved hours (breaks R2)
- [x] D3 booking with no authorisation (breaks R3)
- [x] D4 booking with the inactive practitioner after 2026-10-15 (breaks R4)
- [x] D5 client whose last name differs from Salesforce (breaks R5)
- [x] D6 client that exists in Salesforce but is missing from the target (breaks R5)
- [x] The clean CSVs satisfy R1 to R5 with zero violations

Do (B):
- [x] Express app on port 3000
- [x] Single test user (credentials from .env), login and logout
- [x] List and detail pages for clients, authorisations and bookings
- [x] Search box on the client list
- [x] JSON endpoints GET /api/clients, /api/clients/:externalId, /api/authorisations, /api/bookings, each requiring login
- [x] Every key element has a data-testid

DONE WHEN:
- [x] On a clean clone: `npm run data:generate && npm run seed && npm start` works, and the app is at http://localhost:3000.
- [x] Running data:generate twice gives identical CSVs (checksum shown).
- [x] Login, logout and every page work with no browser console errors.
- [x] Each API endpoint returns JSON matching its type in /app/types.ts, and returns 401 when logged out.
- [x] /docs/seeded-defects.md lists D1 to D6, each with its rule and the External IDs involved.

## Phase 2. Salesforce source

Do:
- [x] STOP: user signs up for a free Developer Edition org, then runs `sf org login web --alias qa-dev`
- [x] Custom objects Client__c, Practitioner__c, Funder__c, Authorisation__c, Case__c (label "Service Case") and Booking__c as source metadata in /salesforce
- [x] Each object has External_Id__c (unique, external ID) and lookup fields between objects
- [x] Deploy with `sf project deploy start`
- [x] Load the clean CSVs with `sf data import bulk`, in dependency order
- [x] `npm run sf:export` queries every object into /data/sf-export/*.json
- [x] `npm run sf:reset` deletes all records so the load can be repeated

DONE WHEN:
- [x] The deploy succeeds, and its output is shown.
- [x] A count query per object matches the CSV row counts exactly.
- [x] `npm run sf:export` produces one JSON file per object, and the counts match.
- [x] reset, load and export run twice in a row with identical results.
- [x] `git grep` shows no org ID, username or token in the repo.

## Phase 3. Comparison engine

Do:
- [x] `npm run compare` reads /data/sf-export and /db/target.db, matches on External ID, checks R1 to R5
- [x] Writes /reports/compare.html and /reports/compare.json
- [x] Exit code 0 when there are no failures, otherwise 1
- [x] `--known docs/known-defects.json` marks listed defects as KNOWN, not FAILED

DONE WHEN:
- [x] Exactly the 6 seeded defects are reported (D1 to D6), each with object, External ID, rule, expected value and actual value.
- [x] Zero findings on any other record.
- [x] With --known listing all 6, the exit code is 0. With one removed, it is 1.
- [x] Vitest unit tests cover every rule with at least one pass case and one fail case, and `npm test` is green.
- [x] The HTML report shows a summary (total checked, passed, failed, known), then a table of findings.

## Phase 4. Playwright

Sub-agents in parallel: A = page objects and UI tests, B = API and DB helpers plus cross-layer tests.

Do:
- [ ] Page objects in /tests/pages: LoginPage, ClientListPage, ClientDetailPage, BookingListPage
- [ ] Fixture that logs in once and reuses the saved state
- [ ] Playwright webServer config starts the app automatically
- [ ] A: UI tests for valid login, invalid login, logout, client search, client detail fields, booking pages showing defective bookings
- [ ] B: helpers for the API and the SQLite database
- [ ] B: tests that check one record through UI, API and DB in a single test (at least 3 records, including one defect)
- [ ] Every test tagged @smoke or @regression

DONE WHEN:
- [ ] At least 12 tests, all green.
- [ ] `npx playwright test --repeat-each=3` passes with zero flaky results.
- [ ] `grep -r "waitForTimeout" tests` returns nothing.
- [ ] Locators use getByRole, getByLabel or getByTestId, never long CSS or XPath chains.
- [ ] A forced failure saves a trace and a screenshot (demonstrated once, then reverted).
- [ ] `npx playwright test --grep @smoke` runs only the smoke tests.

## Phase 5. CI

Do:
- [ ] .github/workflows/ci.yml on push and pull request
- [ ] Steps: install, type-check, data:generate, seed, unit tests, compare against /data/sf-export-fixture with --known, then Playwright
- [ ] Commit the SF export fixture in /data/sf-export-fixture
- [ ] Upload the Playwright and compare reports as artifacts, even when the run fails
- [ ] Status badge in the README

DONE WHEN:
- [ ] The workflow is green on GitHub, and the run URL is shown.
- [ ] Both reports can be downloaded from the run's artifacts.
- [ ] Removing one entry from known-defects.json turns CI red (red run URL shown, then reverted to green).
- [ ] The README badge shows passing.

## Phase 6. Polish

Do:
- [ ] README: one-paragraph pitch
- [ ] README: Mermaid architecture diagram
- [ ] README: quick start (5 commands or fewer)
- [ ] README: test plan (scope, approach per layer, risks, out of scope and why)
- [ ] README: seeded defects table
- [ ] README: "what I'd do next"
- [ ] Screenshots of the compare report and the Playwright report in /docs/images
- [ ] STOP: ask the user whether they want to record a demo GIF themselves

DONE WHEN:
- [ ] A fresh clone in a new folder, following only the README, reaches green tests.
- [ ] The README renders correctly on GitHub, including the Mermaid diagram and the images.
- [ ] PLAN.md is fully ticked.
- [ ] Final report: test counts per layer, the CI link, and 3 talking points for an interview.
