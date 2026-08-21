# Design QA

**Comparison Target**

- Source visual truth: `design/reference-list-download.png` and `design/reference-demand-form.png`.
- Rendered implementation: `http://localhost:4173/`.
- Desktop evidence: `design/qa-desktop-1440.png` and `design/qa-demand-form-desktop.png`.
- Mobile evidence: `design/qa-mobile-390.png`, `design/qa-demand-form-mobile-390.png`, and `design/qa-demand-success-mobile.png`.
- Intermediate evidence: `design/qa-intermediate-900.png`.
- State: two cases selected with batch download enabled; application-request form open; success feedback after local submission.

**Viewport And Density**

- Source design-board images: 1536 × 1024 px, containing both desktop and mobile comps.
- Desktop CSS viewport: 1440 × 1024; browser content capture: 1425 × 1013 px.
- Mobile CSS viewport: 390 × 844; browser content capture: 375 × 811 px.
- Intermediate CSS viewport: 900 × 900; browser content capture: 885 × 885 px.
- Browser device pixel ratio reported 1.25; captures were compared at their native browser output without resampling. The source is a composite presentation board, so fidelity was judged on equivalent content regions and responsive state rather than treating the surrounding board as page chrome.

**Full-View Comparison Evidence**

- Desktop preserves the approved left facet rail, two-column card grid, blue search hierarchy, red outline request CTA, selected-card border, and batch download control.
- Mobile preserves the stacked header/search/request CTA, accordion facets, one-column compact cards, and bottom batch bar.
- The desktop modal and mobile full-screen request sheet match the source hierarchy, two-column-to-one-column transition, neutral field styling, blue local-data notice, privacy confirmation, and fixed actions.
- The implementation uses real generated instrument assets and the brand lockup rather than placeholder shapes or CSS artwork.

**Focused Region Comparison Evidence**

- Toolbar: default, disabled, selected-count, and running-copy states were inspected; selected count is readable and primary action hierarchy matches the source.
- Case cards: selection checkbox, image containment, tags, detail action, and PDF action were inspected at desktop and mobile sizes.
- Request form: required markers, field borders, attachment drop area, privacy confirmation, demo-data notice, and mobile fixed footer were inspected at readable scale.
- Success state: `design/qa-demand-success-mobile.png` confirms the exact success copy is visible after the sheet closes.

**Findings**

- No actionable P0, P1, or P2 visual mismatches remain.
- Fonts and typography: Noto Sans SC provides the intended compact enterprise hierarchy; weights, wrapping, small-label readability, and Chinese text rendering are consistent with the source.
- Spacing and layout rhythm: rail width, toolbar spacing, card gutters, radii, shadows, and modal rhythm remain faithful across all target viewports.
- Colors and visual tokens: deep navy, primary blue, restrained red CTA, cool neutral borders, and pale-blue metadata tokens map directly to the source palette.
- Image quality and asset fidelity: product images remain sharp and contained without stretching, clipping, or transparency halos.
- Copy and content: required public actions and demo-local-storage language match the specification; no case number, request number, public admin link, WeChat article link, or old-site integration appears.

**Open Questions**

- None for the current trial scope. The source combines desktop and mobile in one presentation board, while the live implementation is responsive; that framing difference is intentional.

**Comparison History**

1. Initial desktop comparison found a P2 image overflow: intrinsic product-image height extended below the image slot and crossed the title region. Fixed by constraining the image flex item, enabling clipping, and recapturing `design/qa-desktop-1440.png`; post-fix image and title bounds no longer overlap.
2. Initial selected-state mobile comparison found a P2 overlap of 7.2 px between the first card action row and the fixed batch bar. Fixed by tightening the mobile action-row height and spacing. The final measured overlap is 0 px in `design/qa-mobile-390.png`.

**Primary Interactions Tested**

- Keyword/filter state, individual selection, two-item selected state, select all current results, clear selection, disabled batch action, and mobile fixed batch action.
- Single-case detail, application-request open/cancel, required validation, privacy confirmation, local submit, success feedback, refresh persistence, request detail, and status change from 待跟进 to 已联系.
- Public route, `#/admin/cases`, and `#/admin/requests`.
- Console checked after desktop and mobile rendering: no errors or warnings.

**Implementation Checklist**

- [x] Desktop 1440 × 1024 visual comparison.
- [x] Mobile 390 × 844 visual comparison.
- [x] Intermediate 900 × 900 overflow check.
- [x] Selected, disabled, and running-state hierarchy.
- [x] Request form and success state.
- [x] No public identifiers or prohibited links.

**Follow-up Polish**

- None required for acceptance.

## CMS Case Editor Extension — 2026-08-21

**Comparison Target**

- Existing source visual truth remains `design/reference-list-download.png` and `design/reference-demand-form.png`; the admin extension deliberately reuses the same logo treatment, navy/blue hierarchy, neutral field borders, light panels, restrained radii, and compact enterprise typography.
- Desktop editor evidence: `design/qa-cms-editor-desktop.png` at a 1440 × 1024 CSS viewport.
- Mobile editor evidence: `design/qa-cms-editor-mobile-viewport.png` at a 390 × 844 CSS viewport; `design/qa-cms-editor-mobile.png` records the long-form flow.
- Classification evidence: `design/qa-taxonomy-desktop.png` and `design/qa-taxonomy-mobile-viewport.png`.

**Focused Findings**

- The former small edit modal is replaced with a dedicated CMS page. Basic content, application background, all five experimental-condition fields, results, contact information, rich article content, cover image, classification, completion status, and front-end preview are all visible and editable.
- The rich editor exposes heading levels, bold, italic, underline, links, lists, quotes, alignment, table insertion/editing, local image insertion, and undo/redo. A 3 × 3 table was inserted successfully during the interaction test.
- Desktop keeps structured content and real-time preview in a two-column layout. Mobile collapses to one column, removes the miniature preview, keeps a full preview action, and provides a fixed save bar without covering the final editor content.
- A mobile header-width issue that pushed “返回案例库” off-screen was found and fixed; the final 390 px viewport capture shows both logo and action fully visible.
- Classification management supports add, rename, reorder, and guarded deletion. Rename persistence was verified and the new value appeared in both the public filter and case-editor select. In-use classifications report their case count and are blocked from deletion.
- Experimental-condition persistence was verified by changing the column value, saving, reopening the case, and confirming the saved value; the original demonstration value was then restored.
- The full front-end preview was verified to include application background, experimental conditions, results/conclusion, and rich article content.
- Console checked after desktop and mobile rendering: no errors or warnings.

**Implementation Checklist**

- [x] Full CMS add/edit page replaces simple modal.
- [x] Ordered experimental-condition rows save and reload.
- [x] Rich formatting, table insertion, and image insertion controls.
- [x] Shared public-detail rendering for full preview.
- [x] Application industry, detector, and instrument management.
- [x] Desktop and mobile visual QA.
- [x] No actionable P0, P1, or P2 mismatch remains.

### Experimental-condition row CRUD extension

**Evidence**

- Source visual truth remains the approved second-direction CMS extension described above.
- Focused desktop evidence: `design/qa-conditions-crud-desktop-focused.png` at a 1440 × 1024 CSS viewport.
- Focused mobile evidence: `design/qa-conditions-crud-mobile.png` at a 390 × 844 CSS viewport.
- Interaction state: an existing legacy case was opened, a sixth row named “检测波长” with value “254 nm” was added, moved upward, saved, and reopened; the stored order and values were preserved. The row was then deleted and the demonstration case saved with its original five conditions.

**Findings**

- Each condition row exposes editable parameter-name and parameter-value fields plus move-up, move-down, and delete controls; the section-level action adds a new row.
- Desktop presents the controls as a compact data grid. Mobile stacks the two editable fields while preserving the order and delete actions without overlap with the fixed save bar.
- Legacy fixed condition objects are converted automatically when an existing case is opened, so previously entered experimental data remains editable.
- The same ordered rows drive the editor preview, public case detail, and PDF export. An eight-row export was verified to create a three-page PDF with an “实验条件（续）” page; the standard five-row case remains two pages.
- Save validation requires at least one complete row and rejects partially filled rows.
- No actionable P0, P1, or P2 visual mismatch remains.

**Interaction Checklist**

- [x] Add and edit a condition row.
- [x] Move a condition row up and preserve the order after save/reopen.
- [x] Delete a condition row.
- [x] Verify real-time preview and public detail use the current rows.
- [x] Verify PDF continuation pagination for more than five rows.
- [x] Verify 1440 × 1024 and 390 × 844 focused layouts.

## Official case-data replacement — 2026-08-21

**Source and scope**

- Source truth: the official 通微 application-case list and its corresponding case detail pages.
- The former 12 demonstration cases were replaced by 20 real official cases. The active taxonomy contains 7 application industries, 5 detector types, and 4 instrument types, with every case linked to valid managed values.
- Official cover images and representative chromatograms/electropherograms are stored as local case assets; no public page exposes an old-site URL, article identifier, or WeChat link.

**Display and interaction findings**

- Public list reports exactly 20 results. Keyword search, industry filtering, detector filtering, and instrument filtering were rechecked with the official dataset.
- The optional “药典 / 标准依据” field is a separate one-line editor input and a separate public-detail/PDF row. Cases with no cited basis omit the row completely; searching a filled standard value returns the associated case.
- Experimental-condition rows remain independently editable and are populated with the structures available from each official case rather than a fixed generic template.
- Fresh-browser checks found no console errors or warnings. Desktop detail, mobile detail, case editor, and classification management were inspected after the data migration.

**Export and packaging checks**

- Single-case PDF: 2 pages with Chinese text, separate standard row, real case cover, real representative spectrum, condition table, conclusion, and contact panel.
- Batch ZIP: 20 independent PDFs, 0 failures, no internal UUIDs in PDF or ZIP filenames.
- Production build completed successfully; all 4 Sites packaging tests passed.

## Multiline standard-reference extension — 2026-08-21

- The case editor now uses a resizable multiline field with “one standard per line” guidance.
- Authored line breaks are preserved in the live preview and public case detail; an empty value still removes the complete standard-reference row.
- PDF wrapping was updated to respect explicit newlines. A three-standard example remained a two-page report, while an eight-standard example automatically added a dedicated standard-reference page without displacing the experimental-condition table.
- Production build and all 4 Sites packaging tests passed after the extension.

## Complete official result-content extension — 2026-08-21

**Source review and content coverage**

- All 20 official case articles were reviewed image by image. The source pages contained 138 image references; 91 meaningful result assets were retained after excluding duplicate covers, section-title graphics, QR codes, logos, and generic promotional graphics.
- Every case now contains its complete available result narrative plus 2–10 original result assets, including chromatograms, electropherograms, linearity plots, instrument/method figures, and original data tables where present. All 91 local result files exist and are non-empty.
- Three expired result images in the official DC18 article were recovered from the same 通微 vendor article mirrored on 仪器信息网, so the case is no longer left with broken source placeholders.

**Front-end and CMS checks**

- The first case detail displays its cover and all 3 result figures. The largest case, “URI-3000 RID 检测食品中五种糖”, displays its cover and all 10 result figures; the final figure is the lactose six-injection repeatability table.
- The dedicated CMS editor loads the complete result narrative, figure headings, captions, and images as editable rich content. The public search index also includes this detailed content.
- Public pages continue to omit official article IDs, old-site links, WeChat links, QR codes, logos, and promotional footer graphics.

**PDF and batch export checks**

- A single-case PDF now contains the structured method report, complete result narrative, and a paginated original-result gallery with two images per page.
- The complete 20-case ZIP generated 20 independent PDFs with 0 failures and no internal UUIDs in filenames. Representative reports with 3 and 10 result images generated 4 and 8 pages respectively; Chinese text, captions, page numbers, and spectrum/table clarity were visually inspected.
- Production data validation confirms 20 cases, 91 rich-content result images, 2–10 result images per case, and 0 missing local assets.

## Public browsing simplification and sticky navigation — 2026-08-21

- The bulk-selection feature is temporarily disabled through a retained feature switch. Select-all, per-case selection, clear-selection, desktop batch download, and mobile batch bar are absent from the public page while the underlying export implementation remains available for later re-enabling.
- Every case card now has a full-card detail hit area covering its image, title, summary, tags, and remaining whitespace. The explicit “查看详情” and single-case “下载 PDF” controls remain independently operable; downloading does not open the detail dialog.
- The public header is sticky at the top of the viewport. At desktop and intermediate widths, the left filter rail is sticky below the 88 px header, has its own viewport-height scroll area, and remains visible while the result grid scrolls.
- Browser QA confirmed 20 full-card detail controls, no visible bulk controls or per-case selection checkboxes, successful full-card navigation to the final case, and no detail-dialog collision when using single-case download.
- Production build and all 4 Sites packaging tests passed after the change.

final result: passed
