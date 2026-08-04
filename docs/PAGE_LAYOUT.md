# Page Layout & UX Specification

Three page templates cover the entire site: **Homepage**, **Category Hub**, **Tool Page**. Build
each as a reusable Astro layout/component set — do not one-off design individual tool pages.

## Site shell (supersedes "Header" in the diagrams below)

As of the Kit-Bin visual reskin, every page renders through `src/layouts/Layout.astro`, which
wraps `<slot />` in a persistent left sidebar (`src/components/Sidebar.astro`) instead of the
flat top header the diagrams below still show — the diagrams' "Header: logo/name · category nav"
row is now that sidebar. The sidebar holds: logo + "Kit-Bin" wordmark, Home, the 5 category links
(with icon + active-state highlight from `Astro.url.pathname`), a client-only "Favorites" list,
a "100% Private" trust panel, and the light/dark toggle. Below `lg` (1024px) the sidebar becomes
an off-canvas drawer behind a mobile top bar with a hamburger button — this exists because a
fixed 256px column has no room on phone-width viewports; see `Sidebar.astro` for the breakpoint
mechanics.

Favorites and the light/dark theme are both plain `localStorage` (`kitbin:favorites`,
`kitbin:theme`) — client-side UI preferences only, not user file data, so they don't conflict
with the project's no-accounts/no-persistent-storage rule. `src/lib/favorites.ts` is the shared
helper; reuse it rather than re-deriving the localStorage key elsewhere.

Per-tool icons are hand-drawn SVG line icons, not files — defined as path primitives in
`src/data/toolIcons.ts` (keyed by tool slug) and rendered by `ToolIcon.astro` (or, for the
sidebar's dynamically-built Favorites list, the string-returning `toolIconHtml()` in
`src/lib/toolIconHtml.ts`, which must stay in sync with `ToolIcon.astro`'s rendering). Add a new
entry there for any new tool — do not drop in a raster icon. Category accent colors and icon
glyphs live in the same file (`categoryColors`, `categoryIconPaths`), shared by the sidebar nav,
category hub page headers, and the homepage's category group headings.

Design tokens (`--color-primary`, `--color-ink`, `--color-muted`, `--color-app-bg`,
`--color-surface`, `--color-border-soft`) are defined once via Tailwind v4's `@theme` block in
`global.css` and used as regular utility classes (`bg-primary`, `text-ink`, etc.) — use these
instead of raw `slate-*`/`blue-*` values for any new light-mode styling, so the whole site stays
on one consistent palette. Dark mode is Tailwind v4's class-based variant (`@custom-variant dark`
in `global.css`, toggled on `<html>`), not the OS-preference-only default, and still uses the
plain `slate`/`blue` palette directly (no dark-mode equivalents were defined for the new tokens).

## Design principles (apply to every template)

1. **The tool is the hero, not the ad, not the explanation.** The upload/drop zone should be the
   single largest, most visually prominent element above the fold. Competing tools in this
   space (iLovePDF-style sites) succeed or fail on how fast a first-time visitor can find where
   to drop their file — don't make them scroll or read first.
2. **Trust signals are load-bearing, not decorative.** "Files never leave your device" /
   "processed 100% in your browser" needs to be visible on every tool page, near the upload
   zone, not buried in a privacy policy. This is the actual competitive differentiator against
   established players and directly counters the "sketchy converter site" reputation the whole
   category has to overcome (see `COPY_GUIDELINES.md` for exact wording).
3. **No interstitials, no fake download buttons, no ads inside or immediately above the tool
   UI itself.** This is both a monetization-placement rule (see below) and a UX rule — the
   category's worst reputation damage historically came from exactly this pattern.
4. **Progressive disclosure of options.** Show the minimum controls needed to complete the
   default case (e.g. "Compress" with a sensible default quality) with an "Advanced options"
   disclosure for power users, rather than a wall of settings on load.

---

## Template 1: Homepage

```
┌─────────────────────────────────────────┐
│ Header: logo/name · category nav         │
├─────────────────────────────────────────┤
│ Hero: one-line value prop                │
│ "Convert files instantly. Nothing        │
│  ever leaves your browser."              │
│ [Search/filter box for all tools]        │
├─────────────────────────────────────────┤
│ Category grid (PDF / Image / Audio /     │
│ Video / Data) — each card links to its   │
│ hub page, shows tool count               │
├─────────────────────────────────────────┤
│ "Popular tools" row — top 6-8 tools by   │
│ traffic, direct links (skip the hub)     │
├─────────────────────────────────────────┤
│ Brief "How it works" — 3 steps, icons,   │
│ reinforces the privacy/client-side pitch │
├─────────────────────────────────────────┤
│ Footer: full tool sitemap (every tool    │
│ linked — this is a real internal-linking │
│ asset, not just legal-page filler)       │
└─────────────────────────────────────────┘
```

- Search/filter box matters more than it looks like it should: users landing on the homepage
  (vs. arriving via a direct search hit) are often looking for a specific tool by name — treat
  this like a tiny site-search, matching on tool name/keywords from `tool-metadata.ts`.

## Template 2: Category Hub (e.g. `/pdf/`)

```
┌─────────────────────────────────────────┐
│ Header                                   │
├─────────────────────────────────────────┤
│ H1: "Free PDF Tools" + 1-2 sentence      │
│ intro establishing the category          │
├─────────────────────────────────────────┤
│ Grid of every tool in category, each     │
│ card: icon, name, one-line description,  │
│ direct link to tool page                 │
├─────────────────────────────────────────┤
│ Short FAQ specific to the category       │
│ ("Is it safe to merge PDFs online?"      │
│ type questions — reinforces trust +      │
│ picks up long-tail search queries)       │
├─────────────────────────────────────────┤
│ Footer                                   │
└─────────────────────────────────────────┘
```

- This page's job is entirely navigational + SEO authority-building (see `SEO.md` on why hub
  pages matter for category authority signals) — it should not try to do any file processing
  itself.

## Template 3: Tool Page (e.g. `/pdf/merge`)

This is the template that matters most — it's where 90%+ of organic traffic lands directly.

```
┌─────────────────────────────────────────┐
│ Header                                   │
├─────────────────────────────────────────┤
│ H1: exact-match query, e.g.              │
│ "Merge PDF Files Online — Free"          │
│ Trust line directly under H1:            │
│ "🔒 Processed in your browser. Files     │
│  are never uploaded."                    │
├─────────────────────────────────────────┤
│                                           │
│   ┌─────────────────────────────────┐   │
│   │                                   │   │
│   │      DROP ZONE (largest           │   │
│   │      element on the page)         │   │
│   │      "Drop files here or          │   │
│   │       click to browse"            │   │
│   │                                   │   │
│   └─────────────────────────────────┘   │
│                                           │
├─────────────────────────────────────────┤
│ [Ad unit — single, static, below the     │
│  fold or in a clearly separated sidebar  │
│  — see monetization rules below]         │
├─────────────────────────────────────────┤
│ Processing state (appears after upload,  │
│ replaces or sits below drop zone):       │
│ progress bar / spinner + honest status   │
│ text ("Reading pages... 3 of 12")        │
├─────────────────────────────────────────┤
│ Result state: prominent "Download" CTA,  │
│ file size before/after where relevant,   │
│ "Convert another file" reset action      │
├─────────────────────────────────────────┤
│ 150-300 word unique content block:       │
│ what the tool does, how to use it,       │
│ genuine FAQ (3-5 Q&A) — see              │
│ COPY_GUIDELINES.md for exact structure   │
├─────────────────────────────────────────┤
│ "Related tools" — 3-4 links to adjacent  │
│ tools in the same or complementary       │
│ category (merge → split → compress)      │
├─────────────────────────────────────────┤
│ Footer                                   │
└─────────────────────────────────────────┘
```

### Upload zone behavior (applies to all tools)

- Drag-and-drop **and** click-to-browse — never drag-only, mobile users have no drag gesture
  for file pickers in the same way.
- Accept-file-type validation client-side immediately on drop, with a clear inline error
  ("This tool needs a .pdf file — you dropped a .docx") rather than a silent failure or a
  generic error after processing starts.
- Show file name + size immediately on selection, before processing starts, so the user has
  confirmation they selected the right file.
- For multi-file tools (merge, batch operations later), show a reorderable list of selected
  files, not just a count.

### Processing state

- Always show *something* moving (progress bar with real percentage where the library exposes
  progress events, otherwise an indeterminate spinner with descriptive status text) — dead air
  during a multi-second WASM operation reads as broken, not slow.
- Never let the tab appear frozen. If an operation is inherently blocking on the main thread,
  move it to a Web Worker — this is a hard technical requirement, not a nice-to-have, especially
  for anything using ffmpeg.wasm/Mediabunny/jSquash on larger files.

### Result state

- Download button is the single most prominent element in this state — same visual weight the
  drop zone had before upload.
- Show a concrete outcome metric where meaningful ("Reduced from 4.2MB to 1.1MB — 74% smaller")
  — this is a trust-building detail that also subtly demonstrates the tool worked correctly.
- Offer "process another file" as a clear secondary action so users doing multiple conversions
  don't have to reload the page.

---

## Monetization placement (applies across all templates)

- **One ad unit per tool page**, positioned either directly below the fold (after the upload
  zone) or in a sidebar on wider viewports — never above or overlapping the upload zone, and
  never as an interstitial that appears before/during/after processing.
- Auto-ads (AdSense) are acceptable if configured with the same placement constraint; do not
  rely on AdSense's automatic placement defaults without reviewing where it puts units relative
  to the upload zone.
- No pop-ups, no "click here to download" decoy ads anywhere on the page — this exact pattern is
  what damaged trust across this entire tool category historically and is explicitly the
  reputation risk this project is designed to avoid.

## Mobile-specific layout notes

- Drop zone remains the dominant above-fold element on mobile; stack ad unit and content block
  below it, never squeeze the drop zone smaller to fit an ad above the fold.
- Processing state text should be slightly more verbose on mobile (users are more likely to
  background the tab mid-process) — consider a subtle browser notification/title-bar change
  ("✓ Done" in the tab title) for long-running operations so users get feedback even if they've
  switched apps.
