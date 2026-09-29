# STEMMate Namibia – A3 Team Accessible-Prototype Milestone

SDN621S Software Design | Semester 2, 2026 | NSSDL consultancy team: **[TEAM NAME]**
Prototype version: **v1.1.0** (29 September 2026). Planned after evaluation: v1.2.0.
Prototype link: **[PUBLIC LINK – e.g. https://<account>.github.io/stemmate-a3/]** | Repository: **[GITHUB LINK]** | Walkthrough video: **[LINK]**

> DRAFT. Items in [square brackets] must be completed by the team. Sections 8 and 10 must contain only real evaluation data.

## 1. Team and roles

| Student no. | Name | Practical group | Primary consultancy role(s) |
|---|---|---|---|
| 225022273 | Prince Ndeunyema | [ ] | [e.g. Development (prototype), Traceability] |
| 225024349 | Thomas Shitula | [ ] | [e.g. Requirements, Low-resource constraints] |
| [ ] | Himee Tjiwa Ngairorue | [ ] | [e.g. UX/UI, Accessibility testing] |
| 216070325 | Simanga Lisho | [ ] | [e.g. Architecture, Documentation] |
| [ ] | [Member 5 – required, teams need 5–8] | [ ] | [e.g. Project management, Evaluation lead] |

Team representative: **[NAME]**. Every required role must be assigned (one person may hold several): project management, requirements, architecture, UX/UI, development, testing and documentation.

## 2. Agreed prototype scope

The prototype shows STEMMate's highest-value facilitator workflows under low-resource conditions. It is a connected, clickable, early working prototype and not a production system.

| In scope (v1.1) | Deferred (with reason) |
|---|---|
| WF1: find and filter activities, then save one for offline use, including recovery from no results, being offline, full storage and an interrupted download | Equipment kit booking (FR-06). This extends A1 rather than belonging to the four-function MVP. It was deferred so evaluation time goes to the two priority workflows (see C9) |
| WF2: build a session plan offline with steps, timing, a materials checklist, safety notes, inclusion prompts and an expected learner count, with automatic draft saving and validation | Coordinator participation report (FR-07 reporting view). Only the numeric learner count is captured now. The reporting contract (see §6.4) is defined, but the screen is deferred |
| WF3: queue, synchronise, fail, retry automatically and manually, resolve a version conflict per field, and recover when the merged-plan upload fails | Multilingual labels (Thomas R10). This needs verified translators and cannot rely on unverified machine translation. Strings are short and centralised in the views so translation can be added later |
| Shared-device sign-in (profile and PIN), per-profile storage partition, sign-out and lock | Encryption at rest (Thomas R7, Himee PR-02). This is an implementation concern and cannot be shown meaningfully in a browser prototype. It stays a Must for the build phase |

Personas and scenarios carried forward from A1/A2: the primary persona is a facilitator preparing at home on Wi-Fi who delivers offline at a school (A1 E1, E5; Thomas A2 §8 steps 1–11). The secondary personas are a volunteer assistant sharing the same device and a coordinator who edits a plan on the server, which is the source of the conflict scenario.

## 3. Consolidated requirements baseline and change/selection record

### 3.1 Baseline (12 requirements, MoSCoW)

| ID | Requirement (acceptance check) | Priority | Sources (A1/A2 evidence) |
|---|---|---|---|
| FR-01 | Filter activities by level, topic, maximum duration, available materials and keywords. Results update live, and the count is announced. If nothing matches, no activity card is shown and the user can remove one filter at a time or clear all. (Check: T1, A-03b) | Must | A1 E1/E6; all four A2 baselines; lecturer feedback on Prince's A2 about the no-results path |
| FR-02 | Save an activity for full offline use. The download size is shown first and progress is visible. The save is atomic, so no partial files are kept. Offline, storage-full and interrupted failures each give a reason and a Retry that re-runs the same save. (Check: T1, A-04b/e) | Must | Prince FR-02; Thomas R2/R8; Himee FR-02; Simanga FR-02; lecturer feedback on "Retry back to saving" and on the storage-failure path in Thomas's A2 |
| FR-03 | Create a session plan with ordered steps and minutes, a materials checklist, safety notes and inclusion prompts. Steps can be reordered without dragging. (Check: T2) | Must | All four A2s; lecturer feedback: "add plan materials to the model and sync payload" |
| FR-04 | Save drafts automatically on the device about 0.7 s after each change, with a visible time-stamped status. If storage fails, the changes stay on screen and a Retry saving draft option is offered. (Check: T2, A-06c) | Must | Prince FR-04; Thomas R3; Himee QR-03; Simanga QR-02 |
| FR-05 | Queue plans that are ready. Sync automatically on reconnect. Failed uploads stay on the device and retry with backoff (20 s in the demo, up to 5 attempts), and Retry now is available. A server conflict is shown for review, one difference at a time, and never silently overwritten. A failure after a merged upload keeps the merged copy. (Check: T3, T4) | Must | Prince FR-05 (409 contract); Thomas R4/R9; Himee FR-04; Simanga FR-04 (priority raised, see C2); lecturer feedback on failure after a merged-plan upload |
| FR-06 | Equipment kit booking with overlap detection | Should, deferred | Prince FR-06; Thomas R6; Simanga FR-05 (see C9) |
| FR-07 | Record participation only as numbers (expected learners, 1–200). The coordinator report is deferred, but its contract is defined in §6.4 | Should, partly in scope | Prince FR-07; Thomas R5 |
| QR-01 | Work on low-specification devices and costly data: no web fonts, no framework, full prototype under 100 KB (measured 90.7 KB, 25.3 KB gzipped), download size shown before saving, and a data-saver mode that replaces pictures with text descriptions. The provisional response target (filtering within 3 s on a reference device) is an assumption to validate. (Check: A-09, T1) | Must | Thomas R8/R10; Himee QR-01; Simanga QR-01 (see C4) |
| QR-02 | No data loss: drafts, queued plans and merged plans stay on the device until the server confirms them. Every item ends Synced or visibly Failed/Conflict and is never dropped. (Check: T3, T4) | Must | Prince QR-02; Simanga QR-03; Thomas R9 |
| AR-01 | WCAG 2.2 Level AA where applicable: keyboard operation, logical focus, labels and instructions, 4.5:1 text contrast and 3:1 non-text contrast, status never shown by colour alone, reflow at 320 px, text resizing, meaningful text alternatives, identified errors with suggestions, targets of at least 24 px, no dragging required, and accessible authentication. (Checks: A-01 to A-14) | Must | All four A2s (Prince AR-01, Himee AR-01, Simanga AC-01); support video on W3C accessibility |
| PR-01 | Never collect learner names, photos or contact details. Only a number of learners is stored, and validation blocks email addresses and phone numbers in plan text. All content is synthetic. (Check: A-15, T2) | Must | Prince PR-01; Thomas R7; Himee PR-01; Simanga PR-03 |
| SR-01 | Shared device: per-profile PIN sign-in with a pause after 5 wrong attempts, per-profile storage partition, and sign-out and lock. A second profile cannot see the first profile's plans. (Check: T5, A-16) | Must | Prince SR-01; Himee SR-01; Simanga SR-01; lecturer feedback: "show local access checks" |

### 3.2 Change and selection record

| # | Conflict or difference between A2s | Team decision | Evidence and reason |
|---|---|---|---|
| C1 | Different ID schemes (Thomas R1–R10; others FR/QR/AR/PR/SR) | Adopt FR/QR/AR/PR/SR | Separates functional and quality concerns, as in the requirements video; three of four A2s already used it |
| C2 | Sync priority: Simanga FR-04 "Should" vs Must in the others | Must | Offline-first sync is part of the A1 four-function MVP; without it, plans never leave the device |
| C3 | Autosave timing: Thomas every 10 s; others automatic | Save about 0.7 s after each change (debounced) | Protects more work for almost no cost because the save is local; still meets Thomas's force-close check |
| C4 | Performance targets differ (<1.5 s, 3 s, 5 s) | Provisional 3 s filtering target, labelled as an assumption | Two of four A2s used 3 s. A1 feedback warned against invented numbers, so the target is marked for later validation |
| C5 | Storage ceiling 200 MB (Thomas, Himee) | Keep 200 MB as the production assumption. The prototype simulates a 6 MB quota so storage-full can be tested | Allows a real failure path in testing |
| C6 | Conflict strategy: Simanga used LastWriteWins by default; Prince and Thomas used manual review | Manual per-difference review behind a `ConflictResolver` strategy interface | Last-write-wins can silently overwrite, which breaks QR-02 and Scenario B. The Strategy interface from Simanga's A2 is kept so the rule can change later |
| C7 | Security approaches differ (roles, PIN, sign-out clear, AES-256) | PIN plus partition plus sign-out lock in the prototype. Encryption deferred to the build phase | Local access check requested in lecturer feedback. Encryption cannot be shown in a clickable prototype |
| C8 | Connectivity trigger: polling vs Observer | Observer (`ConnectivityMonitor` notifies `SyncCoordinator`) | Polling costs battery and data (Simanga's A2 rejection argument) |
| C9 | Kit booking: Thomas Must; Prince and Simanga Should | Deferred | Not part of the A1 four-function MVP. A3 asks for two priority workflows plus recovery, so depth was chosen over breadth |
| C10 | Class and method names differ across all four A2s | One naming set (see `diagrams/class-baseline.puml`) used in the class baseline, the sequence diagram, the sync contract and the prototype status labels | Direct response to lecturer feedback on both A2s: "use the same names and operations" |

## 4. Traceability matrix (bidirectional)

| Req | Evidence | Design element | Prototype element (screen/state) | Evaluation check | Status |
|---|---|---|---|---|---|
| FR-01 | A1 E1/E6; A2 feedback (no-results) | ActivityRepository.filter | S03 Find; S03b no results | T1; A-03b (0 result cards rendered) | Automated pass v1.1; participant [pending] |
| FR-02 | A1 E1/E5; A2 feedback (Retry) | ActivityRepository.saveForOffline | S04, S04b storage full, S04c progress, S04d saved, S04e interrupted, S04f offline unsaved | T1; A-04b/e (Retry re-enters save) | Automated pass; participant [pending] |
| FR-03 | A1 E3/E6; A2 feedback (materials) | SessionPlan, PlanStep, PlanMaterial | S06 plan editor | T2 | Automated pass; participant [pending] |
| FR-04 | A1 Scenario 1 (battery) | SessionPlanService.autoSaveDraft | S06 status "Draft saved…"; S06c storage full + retry | T2; A-06c | Automated pass; participant [pending] |
| FR-05 | Scenario B; A2 feedback (merged failure) | SyncCoordinator, ConflictResolver, RemoteSyncGateway | S07 outbox (queued, conflict, failed, synced); S08 review; S08b validation | T3, T4 | Automated pass; participant [pending] |
| FR-06 | A1 E4 | – | Deferred (C9) | – | Deferred |
| FR-07 | A1 E2 | SessionPlan.expectedLearners; §6.4 contract | S06 "Expected number of learners" | T2 (numbers only) | Partly in scope |
| QR-01 | A1 constraints | No framework, system fonts, data saver | S04 size label; S10 data saver | A-09 (bundle size); T1 | Measured |
| QR-02 | A1 E5 | SyncQueueItem, SessionPlanRepository | S07 history log; merged copy saved before upload | T3, T4 | Automated pass |
| AR-01 | Case constraint; W3C | Cross-cutting | All screens | A-01 to A-14 | 19 states, 0 axe violations (v1.1) |
| PR-01 | A1 E2 (ethical boundary) | No learner entity; validate() guard | S06 hint and validation | A-15; T2 | Automated pass |
| SR-01 | Shared device (A1) | AccessGuard | S01 sign in; header "Sign out and lock" | T5; A-16 | Automated pass (profile B cannot see A's plan) |

Reverse check: every screen in §5.2 maps to at least one requirement, and no screen adds out-of-scope functionality. The evaluator control panel (H) is test tooling, not product scope.

## 5. Interaction evidence

### 5.1 Annotated user flow

See `diagrams/user-flow.png` (editable source: `diagrams/user-flow.puml`). Alt text: activity diagram of sign-in, then WF1 (find → no-results branch → save with offline, storage-full and interrupted branches that loop back through Retry save), WF2 (edit → autosave success or storage-full retry → validate → queue), and WF3 (outbox → offline wait → upload with failure-and-retry, conflict review with a merged-upload failure branch, or synced), ending with sign-out and lock. Notes mark the three fixes from A2 feedback.

Supporting design models: `diagrams/class-baseline.png` and `diagrams/seq-plan-sync.png`. Every sequence message is an operation in the class baseline.

### 5.2 Screen inventory

| ID | Screen / state | Purpose | Requirements |
|---|---|---|---|
| S01 / S01b | Sign in; wrong-PIN error | Private space on a shared device | SR-01, AR-01 |
| S02 | Home | Connection status, continue draft, attention list | FR-04, FR-05 |
| S03 / S03b | Find activities; no results | Filter; recovery without selectable missing items | FR-01 |
| S04 a–f | Activity detail: ready, storage full, progress, saved, interrupted, offline-unsaved | Save for offline use and recover | FR-02, QR-01 |
| S05 | Saved on this device | Storage meter; remove to free space | FR-02, QR-01 |
| S06 / S06b / S06c | Plan editor; validation errors; draft storage full | Build plan offline | FR-03, FR-04, PR-01 |
| S07 a–d | Sync outbox: queued, conflict, failed (incl. after merge), synced | Sync status and recovery | FR-05, QR-02 |
| S08 / S08b | Review conflict; missing choice error | Per-difference merge | FR-05 |
| S09 | Session plans list | Status overview (icon + text) | FR-05 |
| S10 | Device and data | Text size, data saver, storage, sign out | QR-01, AR-01, SR-01 |
| S11 | Help and keyboard tips | Consistent help location (SC 3.2.6) | AR-01 |
| H | Evaluator test controls | Simulate network, storage, conflict, one-off failure; reset | Test tooling only |

Screenshots of every state are in `tests/out-v1.1/` (desktop 1280 px) and `R320-*.png` (320 px). These also serve as the fallback if a link fails.

### 5.3 Design rationale (how evidence shaped the interface)

- **Offline is the normal case, not an error.** The header always shows the connection state as an icon plus words. Catalogue filtering works offline because the activity index is local, while full guides need to be saved first (S04f explains this). This follows from the A1 constraint of intermittent connectivity and the persona who prepares at home and delivers offline.
- **Costly data.** The download size and "Uses about X of mobile data" appear before any download. Data saver hides illustrations and shows their descriptions. System fonts avoid any font download.
- **Nothing is lost and nothing is overwritten.** Drafts save themselves. Failed uploads stay visible with a retry time and a history log. The merged conflict copy is written to the device before upload (S07c). This answers the A2 feedback about failure after a merged upload.
- **Low digital confidence.** Plain verbs are used ("Save for offline use", "Mark ready and queue for sync"), there is one primary button per view, errors say what to do next, and steps are reordered with Move up and Move down buttons instead of dragging.
- **Shared devices.** Choosing a profile and entering a PIN keeps the next user out of the previous user's plans. "Sign out and lock" stays visible in the header.

## 6. Low-resource resilience and sustainability

### 6.1 Failure scenarios in the prototype

| Condition (test control) | Behaviour | Data safety |
|---|---|---|
| Offline | Saving is blocked with a reason; plans queue; the outbox says "waiting for connection" | Nothing is discarded |
| Unstable network | Download fails at 60% and partial files are discarded. Upload fails, with automatic retry after 20 s (up to 5) plus Retry now | Plan stays on the device |
| Storage full | Save shows the space needed and a Free up space link. Draft save shows "changes kept on screen" and Retry | On-screen data is preserved |
| Server conflict | Review shows both versions; every difference needs a choice | Neither copy is overwritten |
| Fail next upload (after merge) | Merged plan saved on the device, then "Upload failed: safe on this device" | Merged copy is kept |
| Real browser offline | The prototype listens to browser online/offline events | As above |

### 6.2 Low-specification devices

The prototype needs no framework and no build step: 90.7 KB total and 25.3 KB gzipped, with vanilla JavaScript. Layout reflows to 320 px with no horizontal scrolling on six key routes (A-07). Text can be scaled to 150% in the app, and the browser can zoom further.

### 6.3 Maintenance implications

- The code has no dependencies to patch and can be hosted anywhere as static files (for example GitHub Pages). A local technician only needs to replace files.
- Synthetic content lives in one file (`data.js`), so new activities can be added without touching the logic.
- Sync behaviour sits behind a single `syncOne` routine. It maps to `SyncCoordinator` in the design and can be replaced by a real `RemoteSyncGateway` without changing the screens.
- Known debt: storage is not encrypted; there is no service worker; retry and backoff values are shortened for the demo. All three are logged for the build phase.

### 6.4 Reporting contract (deferred screen, defined interface)

This answers the lecturer's A2 request to "define the reporting contract you refer to".
`GET /api/v1/reports/participation?from=YYYY-MM-DD&to=YYYY-MM-DD`. Caller: Coordinator token (SR-01). Output: `[{ period, activityTopic, level, plansDelivered, learnersTotal }]`, numeric aggregates only. The field allow-list rejects any other field (PR-01). Groups with fewer than 5 learners are suppressed to reduce re-identification risk. Errors: 400 (bad date range), 401/403 (not a coordinator), 503 (retry later).

## 7. Accessibility evidence (WCAG 2.2 AA)

Method: automated axe-core 4.13.0 checks (tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa and best-practice) run on 19 screen states during a scripted end-to-end run (`tests/e2e.js`). The run also covered keyboard tab order, focus destination after actions, reflow at 320 px, 150% text, and manual contrast calculations. Raw results are in `tests/out-v1.0/results.json` and `tests/out-v1.1/results.json`.

| Check | SC | How verified | Result v1.1 |
|---|---|---|---|
| A-01 Keyboard operability | 2.1.1 | Scripted run submitted forms with Enter; all controls are native buttons, links and inputs | Pass (manual NVDA pass [pending]) |
| A-02 Skip link and focus order | 2.4.1, 2.4.3 | Tab order captured: Skip link → brand → profile → PIN → Show PIN → Sign in | Pass after fix A11Y-02 |
| A-03 Focus after actions | 2.4.3, 3.2.2 | Route change → h1; error → error summary; save error → Retry; step move → same button | Pass |
| A-04 Visible and unobscured focus | 2.4.7, 2.4.11 | 3 px focus ring at 9.07:1; no sticky headers or footers | Pass |
| A-05 Labels and instructions | 1.3.1, 3.3.2, 4.1.2 | axe label rules; each step field has a label naming its step number | Pass |
| A-06 Error identification and suggestion | 3.3.1, 3.3.3 | Error summary with links, inline messages, aria-invalid and aria-describedby | Pass |
| A-07 Reflow | 1.4.10 | 6 routes at 320 px: 0 horizontal scroll | Pass |
| A-08 Text resize | 1.4.4 | 150% app scale at 1280 px: 0 horizontal scroll (browser 200% zoom [team to check]) | Pass |
| A-09 Contrast (text) | 1.4.3 | Calculated: body 15.67:1; muted 7.92:1; button 7.52:1; status pills 6.06–7.66:1 | Pass after fix A11Y-01 |
| A-10 Contrast (non-text) | 1.4.11 | Input border v1.0 2.88:1 (fail) → v1.1 5.68:1 | Pass after fix A11Y-04 |
| A-11 Not colour alone | 1.4.1 | Every status = icon + words + colour; invalid fields also get a thicker border and a text message | Pass |
| A-12 Text alternatives | 1.1.1 | Illustrations use role="img" with descriptive aria-label; data saver shows the same description as text | Pass |
| A-13 Target size and dragging | 2.5.8, 2.5.7 | Buttons at least 36 px (small) or 44 px; reordering by buttons, not drag | Pass |
| A-14 Accessible authentication and consistent help | 3.3.8, 3.2.6 | PIN field allows paste and password managers, with a Show PIN option; Help link in the same footer place on every page | Pass |
| A-15 Status messages | 4.1.3 | role="status" and role="alert" live regions for saves, sync results and filter counts | Pass |
| A-16 Privacy on a shared device | (SR-01) | Volunteer B signed in after A signed out: plan not visible | Pass |

### Issues found and fixed (v1.0 → v1.1, commits in repository)

| ID | Issue found in v1.0 | How found | Fix in v1.1 |
|---|---|---|---|
| A11Y-01 | "Plan a session with this activity" button inside the success notice rendered dark text on teal (contrast failure) | axe color-contrast on state S04d | `.notice a:not(.btn)`, so button links keep white-on-teal (7.52:1) |
| A11Y-02 | On first load the first Tab skipped "Skip to main content" because focus was moved into the page | Scripted tab-order capture | Focus moves to h1 only on later route changes |
| A11Y-03 | A heavy focus ring on programmatically focused headings looked like an input box | Screenshot review | A light dashed ring for headings only |
| A11Y-04 | Form-control borders at 2.88:1 against white | Manual contrast calculation | Solid #6b6660 border at 5.68:1 |

Remaining limitations: no manual screen-reader test yet [team to do]; date inputs rely on the browser's native picker; English only.

## 8. Early evaluation and iteration [TEAM TO COMPLETE WITH REAL DATA]

Method: task-based evaluation with [3–5] consenting adult classmates acting as simulated stakeholders in a controlled class or team setting, labelled P1–P5, on [date/venue]. No names, photos, audio or video were recorded. The protocol, consent script and task cards are in `docs/Evaluation_Kit.md`.

Tasks: T1 find and save (includes a no-results detour and storage-full recovery); T2 build a plan and fix a validation error; T3 queue offline and sync after reconnecting; T4 resolve a conflict and recover from the failed merged upload; T5 sign out and confirm privacy.

| Finding | Participants | Task | Severity (0–4) | Priority | Change (v1.2) | Req |
|---|---|---|---|---|---|---|
| [F1] | [e.g. P1, P3] | [ ] | [ ] | [ ] | [ ] | [ ] |
| [F2] | | | | | | |

Limitations: classmates are not real STEM facilitators; the setting is a controlled simulation on [device]; the sample is small; the evaluator control panel is visible.

## 9. Handover

- Prototype: [PUBLIC LINK], version v1.1.0 (v1.2.0 after evaluation), shown in the page footer.
- Viewing instructions: open the link in Chrome, Edge or Firefox on a phone or laptop. Sign in as Facilitator A (PIN 1234) or Volunteer B (PIN 2468). Open "Evaluator test controls" at the bottom of any page to simulate offline, unstable, storage-full, conflict or failed-upload conditions. Use "Reset all demo data" between participants.
- Repository: [GITHUB LINK]. Tag `v1.1.0` (and `v1.2.0`). No generated folders, credentials or personal data are included (`tests/node_modules` is excluded).
- Walkthrough (4–6 min): [LINK]. The script is in `docs/Walkthrough_Script.md`.
- Screenshot fallback: `tests/out-v1.1/*.png`.

## 10. Declarations

**Generative AI use (team).** Tool: Perplexity Computer. Purpose: reviewing the brief, rubric and A2 feedback; drafting the consolidated baseline, change record and traceability; generating the prototype code, PlantUML diagram sources, automated test script and document drafts. Output used: [state what was kept]. Verification: [each member states what they checked, e.g. ran every workflow, compared requirement wording with their own A2, reran `tests/e2e.js`]. Changes made: [list]. AI was not used to create participant feedback, evaluation results or contribution evidence.

**References**

- W3C (2023) Web Content Accessibility Guidelines (WCAG) 2.2. https://www.w3.org/TR/WCAG22/
- Deque Systems (2025) axe-core accessibility engine. https://github.com/dequelabs/axe-core
- Fowler, M. (2003) Repository. https://martinfowler.com/eaaCatalog/repository.html
- Nielsen, J. (1994) Severity ratings for usability problems. https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/
- Support videos listed in `docs/00_A3_Review_and_Plan.md` §3.
- Team A2 submissions: Ndeunyema (225022273), Shitula (225024349), Tjiwa Ngairorue, Lisho (216070325), SDN621S A2, NUST, 2026.
