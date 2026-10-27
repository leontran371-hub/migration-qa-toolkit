# Decisions

| Date | Question | Answer |
|---|---|---|
| 2026-10-27 | Project location? | ~/Projects/migration-qa-toolkit |
| 2026-10-27 | Node 22 install method (Node 20 was installed)? | nvm, pinned with .nvmrc |
| 2026-10-27 | Install GitHub CLI? | Yes, via brew |
| 2026-10-27 | Update sf CLI from 2.139.6 to 2.154.4? | No, keep 2.139.6 |
| 2026-10-27 | Git commit email for the public repo? | GitHub noreply email |
| 2026-10-27 | Do D1-D4 add new target-only bookings or modify existing ones? | Add new target-only bookings |
| 2026-10-27 | D2 shape? | 3 bookings on one authorisation |
| 2026-10-27 | Does the D6 client have cases or bookings? | No, it has none |
| 2026-10-27 | Case, Practitioner, Funder and client status fields? | Proposed in /app/types.ts |
| 2026-10-27 | Playwright browsers? | Chromium only |
| 2026-10-27 | TypeScript 7.0.2 or 5.x? | Pin 5.x |
| 2026-10-27 | Approve proposed fields in /app/types.ts? | Approved |
| 2026-10-27 | Push was denied because git used another stored GitHub account. | This repo's local git config uses `gh auth git-credential`; global config untouched |
| 2026-10-27 | Add @types/node, @types/express, @types/better-sqlite3? | Yes, as dev dependencies |
| 2026-10-27 | Session handling? | HMAC-signed cookie with node:crypto, no new dependency |
| 2026-10-27 | How does CI get the test-user login? | GitHub repo secrets set with `gh secret set` |
| 2026-10-27 | Work through phases without stopping to ask to proceed? | Yes, continue all the way |
| 2026-10-27 | How does a clean clone start without .env? | app/env.ts loads .env first, then falls back to .env.example test-only values |
| 2026-10-27 | Which fields does R5 compare? | Every field in the /app/types.ts interface for that object |
| 2026-10-27 | Do target-only bookings (D1-D4) count as R5 findings? | No. R5 is one-directional (Salesforce to target), so each seeded defect yields exactly one finding |
| 2026-10-27 | D2 finding shape? | One R2 finding on the authorisation, not one per booking |
| 2026-10-27 | Brief conflict: 10 spare hours per authorisation vs 1-3h bookings means 3 bookings can't break R2. | D2 uses three 5h bookings; clean data keeps 1-3h bookings and >= 10 spare hours |
| 2026-10-27 | D5 change? | CLI-0004 lastName truncated (Richards -> Richard) |
| 2026-10-27 | Failed login HTTP status? | Re-render the form with 200 to avoid a browser console error; error shown in data-testid login-error |
| 2026-10-27 | Logout button label? | "Sign out" |
| 2026-10-27 | Salesforce org targeting? | Every sf script uses SF_ORG_ALIAS (default qa-dev) explicitly, never the CLI default org |
| 2026-10-27 | Salesforce field access for the API user? | Permission set Migration_QA deployed with the objects and assigned by `npm run sf:deploy` |
| 2026-10-27 | Funder name field in Salesforce? | Custom Funder_Name__c, mapped like every other domain field; Name holds a display name |
| 2026-10-27 | Generated load CSVs and exports in git? | data/sf-load and data/sf-export are gitignored; the CI fixture lives in data/sf-export-fixture |
| 2026-10-27 | What is one "check" in the compare summary? | One (rule, record) pair: R1, R3, R4 per target booking; R2 per target authorisation; R5 per Salesforce record |
| 2026-10-27 | How does --known match a finding? | Same rule, object, External ID and field (field only for R5 field mismatches) |
