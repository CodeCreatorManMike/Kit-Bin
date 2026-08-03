# Roadmap

**Current phase: Phase 1 / MVP — all 7 tools + homepage + hubs live locally, not yet deployed.**
Update this line as work progresses — this file,
not `CLAUDE.md`, is the source of truth for what phase the project is actually in.

## Phase 1 — MVP (target: 2-4 weeks)

Goal: launch with a small, fully-polished set of the highest-search-volume, lowest-technical-
risk tools. Every tool shipped in this phase must be complete per the four-part definition in
`CLAUDE.md` (UI, copy, schema, hub listing) — a half-finished 8th tool is worse than a fully
finished 6th.

Tool list:
- `/pdf/merge`
- `/pdf/split`
- `/pdf/compress`
- `/image/heic-to-jpg` (decode-only if HEIC-encode licensing isn't resolved by build time —
  see `LICENSING.md`)
- `/image/compress`
- `/image/resize`
- `/audio/mp3-to-wav` (Mediabunny)

Also required in Phase 1, not deferrable:
- Homepage, all category hub pages for categories with at least one live tool.
- Google Search Console connected.
- Privacy-respecting analytics connected (see `ARCHITECTURE.md`).
- AdSense applied for and approved — this can take time and gate on site having real content,
  so apply as soon as 4-5 tools are live rather than waiting for full Phase 1 completion.

## Phase 2 — Expansion (target: months 2-4)

Driven by Search Console data, not guesswork: prioritize filling out tools in categories that
are already getting impressions but not yet ranking top-10 (signal that the category has demand
and needs more depth/authority, not that it's a dead end).

Candidate tool list (sequence within this list based on actual Phase 1 data, not the order
below):
- Remaining PDF tools: rotate, to-images, watermark, reorder-pages, unlock (pending license
  check)
- Remaining image tools: webp-to-png, png-to-webp, svg-to-png, crop
- Remaining audio tools: wav-to-mp3, trim, merge, volume-normalize
- CSV/data tools: csv-to-json, json-to-csv, csv-to-excel, csv-cleaner
- Programmatic format-pair expansion (see `SEO.md`) — only once Phase 1 tools show organic
  traction, not on a fixed calendar date.

## Phase 3 — Heavier/server-dependent (target: month 5+, gated on traffic, not time)

Only build this phase if Phase 1/2 traffic and revenue actually justify taking on real hosting
cost — this phase is where the project stops being free to run.

- Video tools (mp4-to-webm, compress, trim, mute, extract-audio, gif-from-video) — heavier WASM
  payloads, materially worse mobile reliability (see `ARCHITECTURE.md` mobile notes), worth
  doing once the rest of the site has proven the model.
- `/image/background-remove` — high search volume but the most technically involved tool in the
  catalog (ML inference, license-safe model sourcing per `LICENSING.md`) — deliberately not in
  Phase 1 or 2 despite demand, specifically because it's the one tool where doing it wrong (AGPL
  dependency, bad mobile performance, slow inference) does more reputational damage than not
  having it yet.
- Server-side fallback tier for large video files and for DOCX/PPTX ↔ PDF conversion — this is
  the one piece of the entire project with a real, scaling infrastructure cost, so it's the last
  thing built, once there's actual revenue to justify it.

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
