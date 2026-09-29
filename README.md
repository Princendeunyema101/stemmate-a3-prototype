# STEMMate Namibia – SDN621S A3 accessible prototype

Version v1.1.0 (29 Sep 2026). Static HTML/CSS/JS with no build step. All data is synthetic.

- `prototype/` – open `index.html` directly or host it (GitHub Pages: Settings → Pages → deploy from branch, folder `/prototype` or copy to `/docs`).
- `diagrams/` – editable PlantUML sources (`.puml`) with rendered PNG and SVG.
- `tests/e2e.js` – Playwright + axe-core end-to-end and accessibility run. Serve `prototype/` on port 8765 (`python3 -m http.server 8765`), then run `npm i playwright axe-core && node e2e.js out-vX`.
- `tests/out-v1.0`, `tests/out-v1.1` – results.json plus screenshots (fallback evidence).
- `docs/` – review and plan, team pack draft, evaluation kit, walkthrough script, individual template.

Demo sign-in: Facilitator A PIN 1234 · Volunteer B PIN 2468. Evaluator test controls are in the footer.
AI-assisted: generated with Perplexity Computer. See the declarations in `docs/`.
