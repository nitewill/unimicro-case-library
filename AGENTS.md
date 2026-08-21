# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable design decisions for this prototype

- Use the approved second visual direction only: desktop left facet rail with two-column case cards; mobile accordion facets with one-column cards.
- Treat `design/reference-list-download.png` and `design/reference-demand-form.png` as the implementation source of truth.
- Brand language is white, deep navy/blue, and restrained red for the application-request CTA. Use thin neutral borders, light shadows, and generous whitespace.
- Public UI must never expose case identifiers, request identifiers, admin navigation, WeChat article links, or the old website.
- The prototype is standalone and local-first. Application requests and attachments stay in IndexedDB and are not transmitted.
- Desktop target is 1440x1024; mobile target is 390x844. Mobile batch actions are fixed at the bottom only while cases are selected and must not cover card actions.
- Case add/edit uses a dedicated CMS-style full page, not a small modal. It must edit every structured field shown on the public case detail and include a mature rich-text editor with headings, inline formatting, lists, links, tables, image insertion, and undo/redo.
- The case editor keeps a live preview and a full front-end preview using the same case-detail rendering as the public library. Rich text is stored locally with the case in IndexedDB; uploaded demo images remain in the current browser.
- Application industry, detector, and instrument options are managed in a dedicated admin taxonomy screen. Renames cascade to existing cases; in-use values cannot be deleted; order changes propagate to public filters and case-editor selects.
- Experimental conditions are per-case ordered rows, not a fixed five-field object. Editors can add, rename, edit, delete, and reorder rows; the same ordered rows drive public detail, preview, and PDF output, with legacy condition objects migrated automatically when opened.
- The application library is seeded from 20 real cases published in the official 通微 application-case section. A versioned IndexedDB migration replaces the former demonstration cases and classifications while preserving locally submitted application requests.
- The official-data classification set is seven application industries, five detector types, and four instrument types. Every seeded case must reference only these managed classifications so public filters, editor selects, and taxonomy usage counts remain aligned.
- Each case has an optional multiline `standardReference` for Chinese Pharmacopoeia, national-standard, or other explicitly cited method bases. Editors enter one standard per line; authored line breaks are preserved in the public detail, editor preview, and PDF, and the section is omitted when empty.
- Real case covers and representative chromatograms/electropherograms are stored locally under `public/assets/cases/`. PDF export supports both JPEG and PNG source images and uses the real representative image rather than a synthetic chart.
- Every official case must retain all meaningful source figures: equipment/method figures, chromatograms, electropherograms, linearity plots, and original result tables. Duplicate covers, section-title graphics, QR codes, logos, and generic promotional/configuration graphics are excluded. The complete figure set and result notes live inside editable rich content and are also included in PDF export, with two original figures per gallery page.
