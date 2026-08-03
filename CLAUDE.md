# CLAUDE.md

Project: Kit-Bin — browser-based file conversion/processing utility site, live at kit-bin.com.
Model: static site, 100% client-side processing, AdSense-monetized, SEO-driven traffic.

**The name is "Kit-Bin" — not "Kits-Bin".** A supplied UI asset pack (`assets/kits-bin-ui-assets/`)
has "Kits-Bin" baked into its logo image as pixels; that was a mistake in producing the asset
pack, confirmed by the project owner. Never let that asset's wrong wordmark leak into on-page
text — only its icon glyph (or the flat rebuilt mark at `public/brand/mark.svg`) should ever be
used visually. All text says "Kit-Bin".

This file is intentionally short. It is loaded every session — detail lives in `/docs`
and is read on demand. Do not paste `/docs` content back into this file.

## Read before working on X

| Task | Read first |
|---|---|
| Adding/editing any tool page | `docs/TOOL_SPECS.md` |
| Anything about page structure, upload flow, results UI | `docs/PAGE_LAYOUT.md` |
| Sidebar, dark mode, favorites, or per-tool icons | `docs/PAGE_LAYOUT.md`'s "Site shell" section — every page renders through the sidebar shell in `Layout.astro`/`Sidebar.astro`; icons are hand-drawn SVG in `src/data/toolIcons.ts` (`ToolIcon.astro`), not files — add an entry there for any new tool, don't drop in a raster icon |
| Writing on-page copy, FAQ, meta tags | `docs/COPY_GUIDELINES.md` |
| URL structure, schema, internal linking | `docs/SEO.md` |
| Choosing or adding a dependency | `docs/LICENSING.md` — **check this before every new dependency** |
| Deciding what to build next | `docs/ROADMAP.md` |
| System design, thresholds, folder layout | `docs/ARCHITECTURE.md` |

## IMPORTANT — non-negotiable rules

- **YOU MUST check `docs/LICENSING.md` before adding any new npm package or WASM library.**
  This project has an AGPL-3.0 trap already identified (`@imgly/background-removal`) — do
  not reintroduce it or anything with equivalent copyleft terms without discussing it first.
  Same for `heic2any` (used for `/image/heic-to-jpg` until it was replaced): it claims MIT but
  silently inlines a compiled LGPL-3.0 `libheif` blob with zero attribution — don't reintroduce
  it; use `libheif-js` instead, which is properly licensed.
- **Only hand-drawn SVG for tool/brand icons and illustrations — no raster/AI-generated art.**
  The original asset pack (pastel gradient icon tiles, a gradient-background logo, a glossy 3D
  hero render) was replaced for reading as generic/AI-made. New icons follow the same recipe:
  simple geometric shapes, `currentColor` stroke, defined in `src/data/toolIcons.ts`.
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
- Styling: Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`). Dark mode is the
  class-based custom variant in `global.css`, toggled on `<html>` and persisted to
  `localStorage` (`kitbin:theme`) — not the OS-preference-only default.
- Every page renders through a persistent sidebar shell (`Sidebar.astro` inside `Layout.astro`):
  categories, a `localStorage`-backed Favorites list (`src/lib/favorites.ts`), a privacy panel,
  the theme toggle. Off-canvas drawer below the `lg` breakpoint. This wraps `<slot />` — it does
  not change per-tool URLs or page logic.
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
