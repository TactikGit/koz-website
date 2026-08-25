# KOZ Transit — koz.co

Static trilingual (EN/FR/ES) website for KOZ Transit Inc., freight broker in Stanstead, QC.

- No build step — plain HTML/CSS/JS, deployed via GitHub Pages.
- `tools/wagon-snapshot.js` refreshes `data/stats.json` from the WagOn ops system (credentials live OUTSIDE this repo — see script header). `tools/coverage.json` is generated but gitignored (city-level data, not published).
- Design system: "Paperwork & Pavement" — see `_archive/` notes and the KOZ Design Dossier.
