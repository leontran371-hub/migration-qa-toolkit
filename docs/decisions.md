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
