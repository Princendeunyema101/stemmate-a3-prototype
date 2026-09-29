# SDN621S A3 – Review and Action Plan

Prepared 29 September 2026 for the STEMMate team. Due: Friday 2 October 2026, 23:59 (eLearning).

## 1. What A3 actually rewards

| Rubric criterion | Marks | What gets "Excellent" | Where this pack covers it |
|---|---|---|---|
| Consolidated scope and traceability | 15 | Bounded scope, reconciled and prioritised requirements, evidence → requirement → prototype → evaluation links, justified conflicts and deferrals | Team pack §2–§4 |
| Accessible prototype and core workflows | 25 | Two complete priority workflows plus a meaningful failure/recovery workflow, realistic content, clear feedback | Prototype v1.1 (WF1, WF2, WF3) and team pack §5 |
| Accessibility and inclusive design | 15 | WCAG 2.2 AA evidence across keyboard/focus, labels, contrast, non-colour cues, reflow, alternatives, errors; barriers found and fixed | Team pack §7 plus `tests/` evidence |
| Low-resource resilience and sustainability | 10 | Offline, low bandwidth, shared device and failure assumptions visibly shape the prototype; recovery, data safety and maintenance are explicit | Team pack §6 |
| Evaluation and iteration | 10 | Ethical task-based evaluation with 3–5 adult classmates, prioritised findings, limitations, at least two evidence-led changes | Evaluation kit (team must run it) |
| Professional team evidence and handover | 5 | Correct team details, stable links, versioning, walkthrough, roles, declarations | Team pack §1, §9, walkthrough script |
| Individual contribution evidence | 20 | Dated artefacts, an owned design decision, reflection, peer ratings | Individual template (each student writes their own) |

Key marking note from the brief: "A polished interface cannot compensate for weak traceability, inaccessible interaction, fabricated evidence, untested claims or unsafe data practices."

## 2. Review of the four A2 submissions

| Member | Strengths to carry forward | Gaps to avoid repeating in A3 |
|---|---|---|
| Prince Ndeunyema (225022273) – 71/100 | Clear services and repositories; sequences cover local draft saving, failed downloads and version conflicts; sync API contract with a field allow-list; Repository compared with Active Record; honest assumption labels (14-day retention) | Lecturer: add plan materials to the model and sync payload; show local access checks; match sequence calls to class methods; define the reporting contract; fix the no-results path so a missing activity cannot be selected; connect Retry back to saving; show failure after a merged-plan upload; include editable diagram files |
| Thomas Shitula (225024349) | Measurable acceptance indicators (sync within 30 s, <50 KB payload, ≤200 MB cache); added device diversity, low-confidence users and multilingual labels; step-by-step interaction flow with battery-death recovery | Lecturer: missing plan-and-sync sequence; search sequence needs both successful save and storage-failure paths; repositories, storage interface and sync services missing from the class diagram and named inconsistently; traceability table incomplete; no pattern alternative; no references or AI statement |
| Himee Tjiwa Ngairorue | Specific contrast target (4.5:1) and non-colour status; local PIN authentication for shared devices; detailed `LocalStorageManager` error conditions (disk full, lock, encryption) | Several sections incomplete (no sequence B, pattern, traceability shown in extract); requirement IDs in the change table do not match the baseline (FR-06, QR-02 "100GB", AR-02, PR-02) |
| Simanga Lisho (216070325) | Strongest traceability table; Observer pattern for connectivity with polling rejected; Strategy for `ConflictResolver`; sign-out clears the shared device; minimal permissions (PR-02) | FR-04 sync marked "Should" although it is core; default `LastWriteWinsResolver` risks silent overwrite, which conflicts with QR-03 |

Team decisions based on this review are recorded in the team pack change/selection record (§3).

## 3. Support videos: what we took from each

| Video | Key points applied in A3 |
|---|---|
| [Functional and non-functional requirements – Easy Engineering Classes](https://www.youtube.com/watch?v=QhJSlFWFICM) | Separate functional from quality requirements and keep each one testable. The baseline uses FR / QR / AR / PR / SR prefixes and gives each requirement one acceptance check |
| [Requirements Traceability Matrix – Software Testing Material](https://www.youtube.com/watch?v=BM7qCdobfbo) | The RTM maps requirement IDs to test IDs and is updated whenever a requirement or test changes. Use bidirectional traceability so every requirement has a check and no feature is outside scope. Team pack §4 is bidirectional: requirement → evidence → prototype element → check ID, and each check ID points back to a requirement |
| [UML Class Diagram Tutorial – Lucid Software](https://www.youtube.com/watch?v=UI6lqHOVHic) | Show attributes as `visibility name: type`, operations with parentheses, and association, composition and multiplicity. Applied in `diagrams/class-baseline.puml` |
| [How to Make a UML Sequence Diagram – Lucid Software](https://www.youtube.com/watch?v=pCK6prSq8aw) | Actor outside the system, objects left to right, lifelines, ordered messages, and alt fragments for alternatives. Applied in `diagrams/seq-plan-sync.puml`, where every call matches a class-diagram operation |
| [Build Wireframes and Low-Fidelity Prototypes – Google UX](https://www.youtube.com/watch?v=wJ3vof9Er5c) | Let personas, user stories and journeys drive ideation and information architecture. Avoid deceptive patterns and implicit bias. Applied in the screen inventory and design rationale (team pack §5) |
| [Introduction to Web Accessibility and W3C Standards – W3C WAI](https://www.youtube.com/watch?v=20SHvU2PKsM) | POUR principles: perceivable, operable, understandable, robust. Text alternatives, headings and labels in the code. Accessibility also helps with glare, noise and older devices. Applied in the accessibility evidence (team pack §7) |

## 4. What has been prepared and what the team must still do

Prepared (AI-assisted, so it must be declared, checked and owned by the team):

- Connected prototype v1.1 (HTML/CSS/JS, no build step, synthetic data) with three workflows and an evaluator control panel.
- Automated accessibility and workflow test script (Playwright + axe-core 4.13.0). Results for v1.0 and v1.1 are in `tests/out-v1.0/` and `tests/out-v1.1/`, with 40+ screenshots.
- Git history: v1.0 → v1.1 with four accessibility fixes.
- Editable PlantUML diagrams: annotated user flow, consolidated class baseline and plan–sync sequence.
- Team pack draft, evaluation kit, walkthrough script, and an individual evidence template.

Still needed from the team (these cannot be generated without fabricating evidence):

1. Team size. The brief requires 5–8 members, but only 4 A2s were supplied. Confirm the full member list, practical groups and the team representative.
2. Run the evaluation with 3–5 consenting adult classmates (about 20 minutes each) using the evaluation kit. Record real findings.
3. Make at least two changes based on the evaluation findings and release them as v1.2 (commit, then update the traceability and iteration log).
4. Run a manual screen-reader pass (NVDA on Windows or TalkBack on Android) and a 200% browser-zoom check, and record what you find.
5. Host the prototype on a public link that does not ask for access (GitHub Pages is recommended; see handover §9). Add screenshot fallbacks.
6. Record the 4–6 minute walkthrough using the script.
7. Each member writes their own 300–500 word statement, decision, reflection and peer ratings, with dated artefacts.
8. Export all documents to accessible PDFs: real headings, table headers, alt text, and no scanned images.

## 5. Suggested 3-day schedule

| Day | Work |
|---|---|
| Tue 29 Sep | Team reviews prototype and baseline; confirms roles and members; pushes repository to GitHub |
| Wed 30 Sep | Evaluation sessions (P1–P5); screen-reader check; triage findings |
| Thu 1 Oct | Implement v1.2 changes; update traceability and iteration log; record walkthrough; individual statements |
| Fri 2 Oct | Export PDFs; link check from a logged-out browser; representative uploads team ZIP; everyone uploads individual PDF before 23:59 |

Note: the brief's intermediate milestones (4, 11, 18 and 25 September) have passed. Record honestly in the change log when each item was actually done.
