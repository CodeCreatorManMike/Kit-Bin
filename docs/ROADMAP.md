# Roadmap

**Current phase: Phase 3 in progress — Phases 1 and 2 fully shipped and live in production at
kit-bin.com.** All 47 tools listed below across PDF/Image/Audio/Video/Data/Dev are live, plus
the homepage, all category hubs, the `/guides/` content layer (16 guides), and HilltopAds
monetization (banners, processing-state ad, pre-download gate). Update this line as work
progresses — this file, not `CLAUDE.md`, is the source of truth for what phase the project is
actually in.

## Phase 1 — MVP — SHIPPED

Original target list, all live:
- `/pdf/merge`, `/pdf/split`, `/pdf/compress`
- `/image/heic-to-jpg`, `/image/compress`, `/image/resize`
- `/audio/mp3-to-wav`

Also shipped: homepage + all category hubs, `/guides/` content layer (now 16 guides, not the
original 6), Cloudflare Web Analytics. **Not yet done from this phase's original list: AdSense
application** — the integration is fully scaffolded and guarded (`docs/ADSENSE_SETUP.md`) but
`ADSENSE_ENABLED` is still `false` pending actually applying/getting approved. Google Search
Console connection status is unverified from the codebase — confirm directly in the GSC
dashboard, not here.

## Phase 2 — Expansion — SHIPPED

Every tool originally scoped for this phase is live:
- Remaining PDF tools: rotate, to-images, watermark, reorder-pages, page-numbers,
  remove-metadata, delete-pages, extract-pages, to-text (`/pdf/unlock` remains unbuilt — see
  Phase 3)
- Remaining image tools: webp-to-png, png-to-webp, svg-to-png, crop, optimize-svg,
  compress-to-size, rotate, remove-metadata
- Remaining audio tools: wav-to-mp3, trim, merge, volume-normalize
- Data/dev tools: csv-to-json, json-to-csv, csv-to-excel, excel-to-csv, excel-to-json,
  csv-cleaner, csv-merge, json-formatter, base64, sha256, json-diff, json-schema-validator

**2026-08 cannibalization audit — resolved, no duplicates found.** `src/pages/csv/*.astro` and
`src/pages/json/*.astro` are earlier routes that predate the `/data/` and `/dev/` hubs, but each
one (`csv/to-json`, `csv/to-excel`, `json/to-csv`) is already the single registered entry for its
conversion in `src/data/tools.ts` and already renders on the `/data/` hub via that shared array —
they're just served at a legacy URL, not a second competing page. `data/excel-to-csv.astro` and
`data/excel-to-json.astro` convert from Excel, not CSV/JSON, so they're genuinely different tools.
No redirects or URL changes were made. The GSC pattern that prompted this audit (real impressions,
poor position 60-95, on queries that already have a matching live page) has a different cause than
duplicate content — likely indexing/authority/backlink-related — worth investigating separately
rather than re-opening this as a content-duplication question.

Programmatic format-pair expansion (see `SEO.md`) is still open-ended, gated on Search Console
data showing which existing tools are getting impressions but not ranking top-10 — check GSC
before adding more tools in an already-covered category.

## Phase 3 — Heavier/server-dependent (in progress)

- **Video tools — SHIPPED**, ahead of the original "gated on traffic" plan: mp4-to-webm,
  compress, trim, mute, extract-audio, gif-from-video are all live. A 2026-08 functional audit
  found these do not yet run in a Web Worker (violates `PAGE_LAYOUT.md`'s "never block the main
  thread" requirement) and `gifFromVideo.ts` recomputes its color palette per-frame instead of
  once globally — both worth fixing before pushing more traffic to this category.
- `/pdf/unlock` — still not built. Previously pulled because `qpdf-wasm` needed COOP/COEP
  headers and had broken worker resolution under Vite; revisit with a different qpdf-wasm
  fork/version rather than treating it as permanently unsolvable (see `TOOL_SPECS.md` and
  `OPEN_SOURCE_REPOS.md`).
- `/image/background-remove` — still not built. High search volume but the most technically
  involved tool in the catalog (ML inference, license-safe model sourcing per `LICENSING.md`) —
  deliberately deferred because doing it wrong (AGPL dependency, bad mobile performance, slow
  inference) does more reputational damage than not having it yet.
- Server-side fallback tier for large video files and for full-layout-fidelity DOCX/PPTX ↔ PDF
  conversion — still the one piece of the entire project with a real, scaling infrastructure
  cost, so it stays last, built only once there's actual revenue to justify it.
- **`/pdf/to-word` — SHIPPED, but scoped differently from the item above.** Rather than the
  LibreOffice-in-WASM/server-side path `docs/IDEA.MD` correctly ruled out as impractical, this
  reuses the PDF text layer (same `pdf.js` extraction as `/pdf/to-text`) and rebuilds it as an
  editable `.docx` via the `docx` npm package (MIT, client-side, see `LICENSING.md`) — paragraphs,
  page breaks, and basic heading detection by font size, no table/column/image layout
  reconstruction. Genuinely useful for text-first PDFs (letters, resumes, reports), not a
  layout-fidelity converter. Confirmed no mature open-source WASM PDF→DOCX engine exists as of
  this writing (checked directly); the realistic client-side options were this text-reconstruction
  approach or a commercial SDK (Nutrient Web SDK, NativeDocuments docx-wasm) — went with the free,
  MIT, client-side option instead.

## Competitive research notes (2026-08-03)

Quick survey of iLovePDF, Smallpdf, Squoosh, CloudConvert, and TinyPNG while working on the
visual reskin. Findings worth keeping in mind for future phases:

- **Our "never uploaded, ever" claim is rarer than it sounds.** TinyPNG markets itself on privacy
  but every image is uploaded to its servers for processing. CloudConvert doesn't sell your data
  but still processes server-side. Squoosh is the one mainstream competitor that's genuinely
  client-side like us. Don't dilute this differentiator — see `COPY_GUIDELINES.md` for the exact,
  deliberately unembellished wording; the factual claim is already the strongest one in the
  category, no need to oversell it.
- **No daily task caps is a real advantage, already true here.** Smallpdf limits free users to 2
  tasks/day; iLovePDF (no cap) is rated better for it specifically. We have no accounts and no
  caps at all — worth protecting as a hard requirement if a Pro-tier is ever considered later,
  not just an incidental side effect of not having accounts yet.
- **Squoosh's live before/after preview (slider, real-time re-encode) is the standout UX idea
  worth borrowing**, specifically for `/image/compress` and `/pdf/compress`. Right now those tools
  show a before→after size stat after the fact (already good, matches `PAGE_LAYOUT.md`'s "concrete
  outcome metric" rule) but don't let a user *tune* quality before committing. A quality slider
  that re-runs `compressImage`/`compressPdf` live and updates the size readout would be a genuine
  UX upgrade — not implemented in this pass (real scope, needs its own design/perf pass for
  re-encode-on-drag debouncing), but worth prioritizing in Phase 2.
- iLovePDF's OCR and e-signature tools are noted as differentiators for them, but both need
  either a substantial WASM OCR engine or a signing/legal-validity story — bigger lifts than
  anything else in the current catalog. Not proposing these for now; flagging only so a future
  "what's next" discussion doesn't have to re-discover it from scratch.

## Explicit non-roadmap

Not planned at any phase, and any future request to add these should be treated as a scope
question to raise, not a normal backlog item:
- Any YouTube/streaming/social-media downloader or ripper functionality, in any form.
- User accounts, saved file history, or any persistent storage of user-uploaded content.
- Anything requiring the site to retain a copy of a user's file after processing completes.
