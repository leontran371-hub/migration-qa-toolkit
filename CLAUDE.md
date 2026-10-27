# migration-qa-toolkit

Portfolio project for QA automation / test automation roles (NZ, AU, SG, MY). It shows end-to-end testing of a Salesforce-to-custom-system data migration.

## Golden rule: never assume

If anything is unclear, ambiguous or missing at ANY point (a requirement, a naming choice, a tool version, an unexplained error, a trade-off), STOP and ask. Give the options and a recommendation, then wait for an answer. Never guess, never pick a default silently. Record each decision in `/docs/decisions.md` (date, question, answer).

## Context

A healthcare services company is moving from Salesforce to a custom booking and billing system. During the transition both run side by side. The toolkit proves the data matches.

ALL data is fake. Never use real names, health info or anything from a real employer.

## Domain

Objects: Client, Practitioner, Funder, Authorisation, Case, Booking.

- Authorisation: a funder approves a number of HOURS for one client, with a start date, an end date and hours remaining.
- Booking: one client, one practitioner, one authorisation, a date and a duration in hours.
- Every record has an External ID shared by both systems: `CLI-0001`, `PRA-0001`, `FUN-0001`, `AUT-0001`, `CAS-0001`, `BKG-0001`.

Business rules:

- R1 A booking's date falls within its authorisation's start and end dates.
- R2 The sum of booking hours on an authorisation never exceeds the hours approved.
- R3 Every booking has an authorisation.
- R4 A booking's practitioner is active on the booking date.
- R5 Every Salesforce record exists in the target, with matching key fields (name, date of birth, funder, status, dates, hours).

Dates: all date logic uses a fixed `REFERENCE_DATE` from `.env` (default `2026-11-01`), never the real clock, so results are identical on every run and in CI.

## Single source of truth

- `/data/source/*.csv` holds the clean dataset, generated once by `npm run data:generate` from a fixed random seed.
- Salesforce gets the clean CSVs exactly.
- The target system gets the clean CSVs, then `/data/defects.ts` applies the seeded defects on top.
- So any difference between the two systems is a deliberate, documented defect.

## Stack (approved; ask before adding anything else)

Node 22 LTS, TypeScript, tsx, Express, EJS templates, better-sqlite3, dotenv, @faker-js/faker, Vitest (unit tests), Playwright Test, GitHub Actions, Salesforce CLI (`sf`), Salesforce Developer Edition org.

## Quality bar

- Playwright with the page object model, typed fixtures, no hard-coded waits, traces and screenshots on failure, HTML report.
- Typed test data and shared helpers. No copy-paste.
- Layered testing: UI, API and database checks on the same flow.
- Deterministic comparison checks with fixed rules and NO AI at runtime.
- CI runs everything on each push and publishes the reports.
- README with a test plan: scope, risks, what is NOT tested and why.
- Small commits using conventional commit messages (`feat:`, `test:`, `chore:`, `docs:`, `fix:`).

## How to work

- Work one phase at a time (see `PLAN.md`). Never start the next phase until the user says "continue".
- Use parallel sub-agents only where a phase says so. Give each sub-agent a written brief, the exact folders it owns, and the shared types it must use. `/app/types.ts` is written FIRST, by the lead, before sub-agents start. The lead reviews and merges their work.
- At each STOP, tell the user exactly what to type or click, then wait.
- Secrets (passwords, org IDs, tokens) live only in `.env`, which is gitignored. Commit a `.env.example` with placeholder values.
- A phase is finished ONLY when every DONE WHEN item is true and the proof has been shown (command output, file path or URL). If an item fails, fix it. Never skip it, weaken it or mark it done. If a criterion seems wrong, ask.
- End each phase with this report:

```
PHASE n: PASS/FAIL
Criteria: each item with a tick or cross, plus its proof
Commands I can run to see it myself
Commit hash and push status
Decisions made and open questions
```

## Folders

`/app` `/data` `/db` `/salesforce` `/compare` `/tests` `/docs`
