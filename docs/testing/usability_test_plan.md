# Usability Test Plan — OPD Link

## Objectives and participants

Observe whether patients, hospital administrators and IT support users can complete common OPD Link tasks with limited help. Identify navigation, wording, feedback and accessibility problems. This is a plan; no participant results have been collected.

Recruit at least **5 participants**. Include patient proxy users, at least one person familiar with clinic work for admin tasks, and an IT-support proxy where available. Use fictional records and do not collect unnecessary health or identity data.

## Environment and measures

Use the same test build and seeded Firebase test project for each session. Primary device: Android phone, portrait orientation, stable Wi-Fi. Have a second client for real-time admin/patient tasks. Record device model, OS/build, app version, network and proxy role. Never use production patient records.

Give one task at a time and ask participants to think aloud. Do not guide unless blocked. Measure task success (Yes / With help / No), time in seconds, errors/backtracks, prompts and ease rating (1 very difficult to 5 very easy). Record observations and participant comments. Record service interruptions separately.

## Tasks

| Task ID | Task Scenario | Requirement Trace | Success Criteria | Metrics |
|---|---|---|---|---|
| T01 — Appointment Booking | Book an appointment with a specific doctor by selecting an available date and time, then confirm it. | FR01, FR02, FR03 | Selects doctor and available date/time and reaches confirmation without unnecessary help. | Completion, time, errors, prompts, ease 1–5 |
| T02 — Queue Status Check | Check current queue/token number and estimated consultation time. | FR04, FR05 | Finds own token, current/next position and any shown waiting estimate. | Completion, time, errors, ease 1–5 |
| T03 — Doctor Delay Check | Check whether the doctor is on time or delayed before travelling. | FR06 | Correctly identifies status and delay duration if shown. | Completion, time, errors, ease 1–5 |
| T04 — Language Preference | Find and change the app language preference. | NFR02 | Finds and changes language without help; note which screens actually change language. | Completion, time, errors, prompts |
| T05 — Appointment & Queue Monitoring (Admin) | View today's patient count, queue status and appointment list. | FR07, FR08 | Locates counts, queue and appointments; note report generation is not evident in the current implementation. | Completion, time, errors, prompts, ease 1–5 |
| T06 — Call Next Patient (Admin) | Call the next patient in an active OPD queue. | FR07 | Finds intended queue and completes its next-patient action. | Completion, time, errors, ease 1–5 |
| T07 — System Monitoring (IT) | Check whether critical system errors exist and open the log. | NFR04, NFR08 | Finds critical count and log details. | Completion, time, errors, prompts, ease 1–5 |
| T08 — Backup Verification (IT) | Check latest backup status and completion time. | NFR06 | Finds status/time and understands current manual action is a simulation. | Completion, time, errors, prompts, ease 1–5 |

## Per-participant observation sheet

| Participant | Role / proxy | Task | Completed (Y / Help / N) | Time (s) | Errors / backtracks | Prompts | Ease (1–5) | Notes |
|---|---|---|---|---:|---|---|---:|---|
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |

## System Usability Scale (SUS)

Rate each statement from **1 (Strongly disagree) to 5 (Strongly agree)**.

| # | Statement | Rating (1–5) |
|---:|---|---:|
| 1 | I think that I would like to use this system frequently. | |
| 2 | I found the system unnecessarily complex. | |
| 3 | I thought the system was easy to use. | |
| 4 | I think that I would need the support of a technical person to use this system. | |
| 5 | I found the various functions in this system were well integrated. | |
| 6 | I thought there was too much inconsistency in this system. | |
| 7 | I would imagine that most people would learn to use this system very quickly. | |
| 8 | I found the system very cumbersome to use. | |
| 9 | I felt very confident using the system. | |
| 10 | I needed to learn a lot of things before I could get going with this system. | |

### SUS scoring

For odd questions (1, 3, 5, 7, 9), subtract 1 from the response. For even questions (2, 4, 6, 8, 10), subtract the response from 5. Add the adjusted values and multiply by 2.5. The score is 0–100, not a percentage. Report individual scores and the sample mean; the mean alone does not prove usability.

## Usability issue log

| ID | Issue | Screen | Severity (Low / Medium / High) | Participants affected | Fix made / planned |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |
| | | | | | |
