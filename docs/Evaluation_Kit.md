# STEMMate A3 – Evaluation Kit (adult classmates / simulated stakeholders only)

Use this kit unchanged for every participant. Record only anonymous labels (P1–P5). Do not record names, student numbers, photos, audio, video or contact details. Do not recruit anyone outside the class.

## 1. Set-up (5 minutes before each session)

1. Open the prototype link. Select "Reset all demo data" in Evaluator test controls.
2. Device used: [laptop / phone model – no personal details]. Browser: [ ].
3. Roles: facilitator (reads the script), observer (fills the sheet), timekeeper (may be the same person as the observer).
4. Close the Evaluator test controls panel. The facilitator operates it only when a task card says so.

## 2. Consent script (read aloud)

"Thank you for helping. You are a classmate acting as a simulated STEM facilitator. You are not a real facilitator, and nothing you do is a test of you. We are testing the design. The session takes about 20 minutes. We will write down what happens on screen and anything you say about the design, using only the label P[number]. We will not record your name, face or voice. You can stop at any time without giving a reason. Do you agree to take part?"

Record: P__ consented verbally: yes / no. Time: __:__. Adult classmate: yes.

## 3. Task cards (give one at a time; do not explain the interface)

**T1 – Find and save (FR-01, FR-02).** "You are preparing at home on Wi-Fi. Find a Physics activity for Grade 8–9 that takes 45 minutes or less and uses only plastic bottles, straws, water and tape. Save it so you can use it at school without internet."
- Before the participant saves, the facilitator switches on "Device storage full". Observe whether the participant understands the message and recovers. Switch storage full off when they look for a way out.
- Optional detour: ask them to also filter for Chemistry at Junior secondary level (no results). Observe whether they recover.

**T2 – Build a plan (FR-03, FR-04, PR-01).** "You are now at school with no connection." (Facilitator sets Network to Offline.) "Create a plan for next Thursday from the activity you saved. Change step 2 to take 15 minutes, tick the materials you have, and queue the plan so it will be sent later."
- Leave the date empty in the task wording, so a validation error is likely. Observe how they find and fix it.

**T3 – Sync after reconnecting (FR-05, QR-02).** Facilitator sets Network to Online. "You are back in town. Make sure your plan reached the server." Observe whether they notice the status change and where they look.

**T4 – Conflict and failed upload (FR-05).** Facilitator creates a second queued plan (or re-queues by editing), ticks "Server has a newer copy" and "Fail the next upload only", and sets Online. "Your coordinator also changed this plan. Decide what to keep and make sure it is saved." Observe their understanding of both versions and of the failed merged upload, and whether they find Retry.

**T5 – Shared device (SR-01).** "Your colleague needs the tablet. Hand it over safely." Then: "As the colleague (Volunteer B, PIN 2468), check whether you can see the first person's plan."

## 4. Observation sheet (one per participant)

| Task | Completed? (yes / with help / no) | Time (mm:ss) | Errors or hesitations observed | Participant comments on the design (paraphrase, no identifying detail) | Ease 1–7 (asked after the task: "How easy was that?") |
|---|---|---|---|---|---|
| T1 | | | | | |
| T2 | | | | | |
| T3 | | | | | |
| T4 | | | | | |
| T5 | | | | | |

Accessibility probes (ask at least 2 participants): complete T1 using only the keyboard (Tab, Enter, Space); set Text size to Extra large and repeat one step; turn Data saver on and say whether the picture description is enough.

## 5. Severity scale (Nielsen)

0 not a problem · 1 cosmetic · 2 minor · 3 major (fix before release) · 4 catastrophe (must fix now). Priority for v1.2 = severity × number of participants affected.

## 6. Findings to change log (fill after all sessions)

| Finding ID | Evidence (who / which task / what happened) | Severity | Decision (fix in v1.2 / defer + reason) | Change made | Commit / date | Requirement |
|---|---|---|---|---|---|---|
| F1 | | | | | | |
| F2 | | | | | | |
| F3 | | | | | | |

At least two findings must lead to real prototype changes (v1.2.0). Re-run `node tests/e2e.js tests/out-v1.2` after the changes and keep the results.

## 7. Things to watch for (to guide observation, not to predict results)

These are risk areas from the design review. Only report them if participants actually show them.

- Whether "Queued: waiting for connection" is understood as safe.
- Whether the "Upload failed: safe on this device" message causes worry or is trusted.
- Whether the conflict table's "Your version" and "Server version" wording is clear.
- Whether participants find the Sync outbox without prompting.
- Whether the step Move up and Move down buttons are discoverable.

## 8. Data handling

Keep the completed sheets in the team repository as `evaluation/P1.md`, `evaluation/P2.md` and so on, containing only anonymous labels. Delete any stray personal notes. Report limitations: the participants are not facilitators, the sample is small, the setting is simulated, and the facilitator operated the test controls.
