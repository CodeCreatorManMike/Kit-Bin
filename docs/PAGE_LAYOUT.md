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

### Batch processing (multiple files, one operation)

Tools where the operation is per-file and document-agnostic accept a queue of files and return
a single ZIP. This is handled centrally in `src/lib/ui.ts`, not per page: `wireTool` takes
either `run(files, report)` (the tool consumes all files at once — merge, images-to-PDF) or
`runEach(file, report)` + `batchZipName` (per-file, batched). A page opts in with `multiple` on
`<ToolWidget>` plus `multiple: true` in the `wireTool` options, and its `validate` must check
*every* file, not just `files[0]`.

Batch semantics, all implemented in `runBatch`:

- Files are processed **sequentially**, deliberately — parallel WASM decodes kill mobile tabs.
- Status text is prefixed `File 2 of 5: …` so progress stays legible across the queue.
- One file's failure does not fail the batch; failures are skipped and reported as
  "N files skipped." Only an all-failed batch throws.
- A batch that yields exactly one output returns that file **un-zipped**, under its own name —
  a user who drops one file should never receive a ZIP.
- Zipping uses `src/lib/zip.ts` at `level: 0` (stored). Outputs are already-compressed formats,
  so deflating them costs CPU and saves nothing.

Tools currently **not** batched, on purpose: page-range tools (`extract-pages`, `delete-pages` —
a range from one document is meaningless against another), tools that already emit a ZIP
(`split`, `to-images` — batching would nest archives), and many→one tools (`merge`,
`images-to-pdf`).

### Image format coverage

`src/lib/image/codec.ts` is the single decode/encode surface every image tool goes through.
It covers JPEG, PNG, WebP, AVIF, JPEG XL and QOI, plus a Canvas fallback for SVG and for
anything a WASM codec rejects. Notes that aren't obvious from the code:

- AVIF, JXL and QOI are **dynamically** imported. Their encoders are large (avif_enc ~3.3MB,
  jxl_enc ~1.3MB) and a static import would put that weight in the chunk every image page loads.
- `sniffMime()` exists because browsers report an empty `file.type` for `.qoi` (no registered
  media type) and often for `.jxl`. Validation on any page accepting those formats must use it
  rather than reading `file.type` directly.
- `renameToMime()` fixes the output extension. Formats with no encoder here (GIF, BMP) come back
  as JPEG, and without this the user gets JPEG bytes in a file named `.gif`.
- AVIF's quality argument is inverted upstream (libavif takes `cqLevel`, 0 = lossless, 63 =
  worst); `encodeImage` maps our 0-100 scale onto it so callers keep one convention.
- QOI is lossless with no quality knob, so it's deliberately excluded from Compress Image —
  "compressing" one just re-emits the same bytes.

Only AVIF has dedicated conversion pages so far (`/image/avif-to-jpg`, `/image/jpg-to-avif`).
JXL and QOI are supported at the codec layer — they work in compress/resize/convert — but got no
pages, per the "Programmatic scaling" rule in `docs/SEO.md`: format-pair pages get added when
Search Console shows demand, not speculatively.

### Video frame-reordering tools (Reverse, Boomerang)

`/video/reverse` and `/video/boomerang` (`src/lib/video/frameOps.ts` +
`reverse.ts`/`boomerang.ts`) are architecturally different from every other video tool: the rest
route file→file through mediabunny's high-level `Conversion` API (`src/lib/video/convert.ts`),
which streams and never holds a whole clip in memory. Reordering frames can't stream — the last
frame has to be known before the first frame of the output is written — so these two decode a
capped, downscaled set of frames into memory first (`CanvasSink`), reorder them, then re-encode
(`CanvasSource` → MP4/AVC).

That's why they're the only video tools with a hard duration cap (10s for reverse, 5s for
boomerang — boomerang's output is roughly double its input in frame count, so its source cap is
tighter) and a fixed downscale (`MAX_WIDTH = 360`) regardless of what other video tools allow.
The caps were sized from a real measurement, not guessed: at 320×240 the encode path measured
~130 fps and ~300KB per buffered frame; at full portrait-phone resolution (1080×1920) that's
~8MB/frame, and an uncapped 30s clip would need several gigabytes in the tab. `gifFromVideo.ts`
established this same pattern (fixed sample FPS, capped duration, capped width) for the same
reason.

Audio is dropped in both — reversing audio in sync with reversed video is separate work these
tools don't attempt, and the pages say so rather than silently producing a mismatched track.

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

**Updated — this section previously banned any pre-download ad interstitial outright ("never as
an interstitial that appears before/during/after processing... this exact pattern is what
damaged trust across this entire tool category historically"). The site owner has since made an
explicit, informed decision to add exactly that pattern in a bounded form (below). That original
concern was correct and is still worth reading before touching this code again: a mandatory
ad-view step is a real UX/trust tradeoff, not a free win, and the implementation below exists
specifically to keep the two things that concern actually stayed the same as before.**

Live implementation, split across three distinct ad moments — do not conflate them:

1. **Normal page banners** — one `<AdsterraBanner>` per page: after the complete tool list on
   category hubs (`variant="leaderboard"`, 728x90 desktop / 320x50 mobile) and after
   FAQ/related-content on every tool page (`variant="auto"`, 300x250 desktop / 320x50 mobile).
   Purely passive, no interaction required. See `src/components/AdsterraBanner.astro` and
   `src/lib/ads/adsterra.ts` for the size/variant system.
2. **Processing-state ad** (`src/lib/ads/processingOverlay.ts`) — shown only after a real
   operation has been running for 300ms+, purely opportunistic. **`run()` in `ui.ts` is never
   gated by this** — the file finishes exactly when the underlying `lib/*` function resolves,
   full stop, regardless of whether an ad loaded, and closing the overlay never cancels or
   slows the operation.
3. **Pre-download gate** (`src/lib/ads/downloadGate.ts`) — the actual policy change. Once a
   result is ready and `showResult()` has already populated the real download link, a 15-second
   countdown overlay covers the result panel before the download button becomes reachable. Unlike
   every other ad placement on the site, this one plays a real video ad — a HilltopAds VAST tag
   played via Google's IMA SDK (`src/lib/ads/hilltopVast.ts`), not an Adsterra banner. Do not mix
   the two systems: `attachAdSlot`/Adsterra is for banners/processing only, `playVastAd` is for
   this gate only. The 15-second wall-clock timer is the sole unlock authority — it does not
   extend or shorten based on whether the video actually finishes, errors, or fails to load, so a
   broken ad response can never trap a user behind their own already-finished file. The file is
   not reprocessed or held back; only the moment the user is *allowed to click* is delayed.
   **Consent is the escape hatch that keeps this from becoming coercive: if ad consent has not
   been granted, this gate does not run at all and the download is available immediately.**
   Declining the cookie banner must never cost someone their file — that guarantee predates this
   gate and still applies.

No pop-ups, no fake/decoy download buttons, no ads that could be mistaken for a tool control —
that principle is unchanged. What changed is specifically: is a mandatory wait before the *real*
button acceptable when it's disclosed on-screen and skipped entirely for anyone who declines ads.
That's a judgment call for the site owner to keep revisiting, not a settled question.

## Mobile-specific layout notes

- Drop zone remains the dominant above-fold element on mobile; stack ad unit and content block
  below it, never squeeze the drop zone smaller to fit an ad above the fold.
- Processing state text should be slightly more verbose on mobile (users are more likely to
  background the tab mid-process) — consider a subtle browser notification/title-bar change
  ("✓ Done" in the tab title) for long-running operations so users get feedback even if they've
  switched apps.
