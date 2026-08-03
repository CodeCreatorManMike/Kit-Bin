# CLAUDE.md

Project: browser-based file conversion/processing utility site (working name: TBD).
Model: static site, 100% client-side processing, AdSense-monetized, SEO-driven traffic.

This file is intentionally short. It is loaded every session — detail lives in `/docs`
and is read on demand. Do not paste `/docs` content back into this file.

## Read before working on X

| Task | Read first |
|---|---|
| Adding/editing any tool page | `docs/TOOL_SPECS.md` |
| Anything about page structure, upload flow, results UI | `docs/PAGE_LAYOUT.md` |
| Writing on-page copy, FAQ, meta tags | `docs/COPY_GUIDELINES.md` |
| URL structure, schema, internal linking | `docs/SEO.md` |
| Choosing or adding a dependency | `docs/LICENSING.md` — **check this before every new dependency** |
| Deciding what to build next | `docs/ROADMAP.md` |
| System design, thresholds, folder layout | `docs/ARCHITECTURE.md` |

## IMPORTANT — non-negotiable rules

- **YOU MUST check `docs/LICENSING.md` before adding any new npm package or WASM library.**
  This project has an AGPL-3.0 trap already identified (`@imgly/background-removal`) — do
  not reintroduce it or anything with equivalent copyleft terms without discussing it first.
- **No file ever touches a server unless it exceeds the size threshold defined in
  `docs/ARCHITECTURE.md`.** This is the entire privacy/cost pitch of the site. Any PR that
  silently adds a server upload path for a tool that was previously client-side-only is a bug.
- **Every tool ships on its own URL**, not as a tab/mode inside a generic multi-tool page.
  See `docs/SEO.md` for why.
- **Never build a YouTube/streaming "downloader" or ripper of any kind.** This project only
  converts files the user already has and already owns. That line does not move.

## Stack

- Static site, deployed to Cloudflare Pages (free tier).
- Framework: Astro (decided — minimal JS by default, per-page code splitting).
- Styling: Tailwind CSS.
- Per-tool logic: isolated JS/WASM modules, lazy-loaded per page — never bundle every tool's
  library into a shared chunk (kills load time on unrelated pages).

## Commands

```bash
npm install
npm run dev          # local dev server, http://localhost:4321
npm run build        # static build → dist/
npm run preview      # preview the static build
npm run typecheck    # astro check
```

No lint script yet — add one (ESLint) when it's worth the setup cost, not before.

## Repo etiquette

- Branch naming: `tool/pdf-merge`, `fix/heic-decode-safari`, `seo/schema-markup`.
- One tool = one PR where possible. Keep PRs reviewable.
- Every new tool page requires: the tool UI, the copy (per `docs/COPY_GUIDELINES.md`), schema
  markup (per `docs/SEO.md`), and an entry in the relevant category hub page. A tool page
  without all four is incomplete, not done.

## Current phase

See `docs/ROADMAP.md` for the authoritative phase/tool list. Update the "current phase" note
there, not here, as work progresses.
