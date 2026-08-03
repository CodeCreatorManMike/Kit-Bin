# Kit-Bin — Free Browser-Based File Tools

Convert, compress, and edit files entirely in your browser. No uploads, no accounts, no file
size games — your files never leave your device.

**Live site**: https://kit-bin.com/

---

## What this is

A collection of single-purpose file conversion and processing tools (PDF, image, audio, video,
CSV/data) that run **100% client-side** using WebAssembly and native browser APIs. There is no
backend for the core tool set — no server ever receives a user's file, no database stores
anything, and hosting cost stays near-zero regardless of traffic because the visitor's own
device does the processing work.

Monetized via display ads (AdSense), placed to never interfere with the actual tool UI.

## Why client-side

- **Privacy**: the file genuinely never leaves the device. This isn't a marketing claim — it's
  the architecture.
- **Cost**: no server compute, no storage, scales to any traffic volume on a static-hosting free
  tier.
- **Speed**: no upload/download round-trip for most operations.

The tradeoff: some operations (large video files, DOCX/PPTX ↔ PDF conversion) currently have no
practical pure-browser solution and are deliberately out of scope until a server-fallback tier
is built — see [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Astro (static output, minimal per-page JS) |
| Styling | Tailwind CSS |
| Hosting | Cloudflare Pages (free tier) |
| Processing | Per-tool WASM/JS modules, lazy-loaded per page — see [`docs/TOOL_SPECS.md`](docs/TOOL_SPECS.md) for the library behind each tool |
| Analytics | Privacy-respecting, aggregate-only (Cloudflare Web Analytics / Plausible) |

No database. No user accounts. No server-side storage of any kind for the core tool set.

## Getting started

```bash
git clone [repo-url]
cd [repo-name]
npm install
npm run dev
```

Open `http://localhost:4321` (Astro default — confirm against `package.json` once scaffolded).

```bash
npm run build      # static build → dist/
npm run preview    # preview the production build locally
npm run lint
npm run typecheck
```

## Project structure

```
/src
  /pages
    index.astro          # homepage
    /pdf/                 # category hub + one .astro file per tool
    /image/
    /audio/
    /video/
    /csv/
  /components             # UploadZone, ProcessingState, ResultDownload, etc.
  /lib
    /pdf/  /image/  /audio/  /video/   # one pure module per operation
  /data
    tool-metadata.ts       # single source of truth: title, keywords, related tools, schema
/docs                      # full project documentation — see below
CLAUDE.md                  # Claude Code project context (short, points into /docs)
```

## Documentation

This repo's `/docs` folder is the source of truth for how and why the site is built the way it
is. Read the relevant file before making changes in that area:

| File | Covers |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Client/server processing split, tech stack rationale, repo layout |
| [`docs/TOOL_SPECS.md`](docs/TOOL_SPECS.md) | Every tool: library used, implementation approach, complexity |
| [`docs/PAGE_LAYOUT.md`](docs/PAGE_LAYOUT.md) | Page templates, upload/processing/result UI states, ad placement rules |
| [`docs/COPY_GUIDELINES.md`](docs/COPY_GUIDELINES.md) | Voice, trust-signal wording, FAQ structure, meta tag templates |
| [`docs/SEO.md`](docs/SEO.md) | URL structure, schema markup, internal linking, content depth rules |
| [`docs/LICENSING.md`](docs/LICENSING.md) | **Check before adding any dependency** — license compatibility table |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Current phase, tool build order, what's explicitly out of scope |

## Current status

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the authoritative, up-to-date phase and tool list.
As of this writing: **27 of ~28 tools built and verified locally, not yet deployed.**

<!--
Progress checklist — update as tools ship. Keep in sync with docs/ROADMAP.md.

PDF:
- [x] /pdf/merge, /pdf/split, /pdf/compress, /pdf/rotate, /pdf/watermark, /pdf/to-images,
  /pdf/reorder-pages
- [ ] /pdf/unlock — attempted, pulled (qpdf-wasm needs COOP/COEP + broken worker resolution
  under Vite, see docs/TOOL_SPECS.md)

Image:
- [x] /image/heic-to-jpg, /image/compress, /image/resize, /image/webp-to-png,
  /image/png-to-webp, /image/svg-to-png, /image/crop
- [ ] /image/background-remove — Phase 3, not started

Audio:
- [x] /audio/mp3-to-wav, /audio/wav-to-mp3, /audio/trim, /audio/merge, /audio/volume-normalize

Video:
- [x] /video/mp4-to-webm, /video/compress, /video/trim, /video/mute, /video/extract-audio,
  /video/gif-from-video

Data:
- [x] /csv/to-json, /json/to-csv, /csv/to-excel, /data/csv-cleaner

- [x] Homepage + category hubs live (PDF, Image, Audio, Video, Data)
- [ ] Deployed to Cloudflare Pages
- [ ] Search Console connected
- [ ] AdSense approved
-->

## Contributing / working conventions

- Branch naming: `tool/pdf-merge`, `fix/heic-decode-safari`, `seo/schema-markup`.
- A tool page isn't done until it has all four of: the working tool UI, on-page copy per
  `docs/COPY_GUIDELINES.md`, schema markup per `docs/SEO.md`, and a listing on its category hub
  page.
- **Check `docs/LICENSING.md` before adding any new dependency.** This project has already hit
  one AGPL trap (a background-removal library) — verify license compatibility before importing
  anything new, especially for image/ML-adjacent features.

## Explicitly out of scope

- Any YouTube, streaming, or social-media downloader/ripper functionality, in any form.
- User accounts, saved history, or persistent storage of anything a user uploads.
- DOCX/PPTX ↔ PDF conversion, until a server-fallback tier exists (Phase 3 — not currently
  planned unless traffic justifies the added hosting cost).

## License

[TBD — pick a license for your own code once decided; note that this does not cover the
third-party dependencies listed in `docs/LICENSING.md`, which retain their own licenses.]
