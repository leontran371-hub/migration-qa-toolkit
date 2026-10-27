# Seeded defects

| Defect | Rule broken | Object | External IDs involved | What was changed |
|---|---|---|---|---|
| D1 | R1 | Booking | BKG-0061, AUT-0001, CLI-0001, PRA-0001 | New target-only booking dated 2026-08-17, 7 days after AUT-0001 ends (2026-08-10). 2 hours. |
| D2 | R2 | Authorisation | AUT-0012, BKG-0062, BKG-0063, BKG-0064, CLI-0012, PRA-0001 | Three new target-only bookings of 5 hours each (2025-09-27 to 2025-09-29) on AUT-0012. Booked hours rise from 6 to 21, over the 20 approved. |
| D3 | R3 | Booking | BKG-0065, CLI-0003, PRA-0001 | New target-only booking on 2026-11-01 with no authorisation (authorisationId NULL). |
| D4 | R4 | Booking | BKG-0066, AUT-0002, CLI-0002, PRA-0005 | New target-only booking on 2026-10-16 with PRA-0005, who is inactive from 2026-10-15. |
| D5 | R5 | Client | CLI-0004 | lastName changed from "Richards" to "Richard". |
| D6 | R5 | Client | CLI-0020 | Client deleted from the target. |
