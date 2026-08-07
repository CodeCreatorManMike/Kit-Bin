# Architecture

## Core principle: browser-first, server fallback only when unavoidable

Pure browser-side processing is realistic for roughly 90% of the tool catalog — images, audio,
and simple video/document operations. The remaining ~10% (large video, DOCX/PPTX↔PDF via
LibreOffice) currently has no viable pure-WASM path and needs a server fallback. This is not a
temporary limitation to engineer around at launch — LibreOffice-in-WASM is still impractical as
of 2026 (too large, too slow, too platform-dependent). Design for the hybrid from day one, but
build only the client-side path first.

This decision is the single biggest lever on hosting cost: client-side processing means the
visitor's CPU does the work, so the site can run on a static-hosting free tier indefinitely
regardless of traffic volume. Server fallback is the only part of this project with a real,
scaling cost, so it's gated behind actual demand (Phase 3, see `ROADMAP.md`).

## Processing decision tree (per file, at runtime) — planned, not yet built

This decision tree was the pre-launch design intent. **As shipped, none of it exists**: there is
no file-size check anywhere in the codebase (confirmed — no `MAX_FILE_SIZE`/threshold constant,
no "file too large" message on any tool page), including on the video tools, which are the ones
this was specifically meant to gate. Every tool, including all 6 video tools, currently attempts
in-browser processing regardless of file size, with no explicit "this needs server processing"
fallback message. A large file today just risks a slow or crashed tab, silently, which is
exactly the failure mode this section was written to prevent.

```
User selects/drops file
        │
        ▼
Is file type/size supported client-side for this tool?
        │
   ┌────┴────┐
  YES        NO (e.g. video > threshold, or DOCX/PPTX tool)
   │          │
   ▼          ▼
Process    Show explicit message: "Files over Xmb / this format
in-browser  needs server processing — [not available yet /
(WASM/JS)    coming soon]." Never silently fail or hang.
   │
   ▼
Download result — file never left the device
```

- **Size threshold for video**: 50MB was the proposed client/server routing boundary — the
  commonly cited practical ceiling before ffmpeg.wasm/WASM media libraries become unreliable
  in-browser (memory pressure, mobile tab kills, Safari crashes). Not implemented yet — worth
  prioritizing now that all 6 video tools are live in production, not deferred to a future phase.
- **Mobile is a second-class but not ignored citizen.** WASM media processing on mobile Safari
  has materially tighter memory limits than desktop — a transcode that works fine on a laptop
  can crash an iPhone tab. Capping file size more aggressively on mobile UA, or clearly messaging
  the limitation, is still an open gap, not just a launch-day one.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Astro (recommended) | Ships zero JS by default per page; only the specific tool's JS/WASM loads on that tool's page. This matters a lot here — a Next.js/React SPA tends to bundle more shared JS across routes unless very deliberately code-split, and this project has ~28 largely-unrelated interactive widgets, not one app. |
| Styling | Tailwind CSS | Fast to build consistent, utility-tool-appropriate UI; see `PAGE_LAYOUT.md` for the actual visual system. |
| Hosting | Cloudflare Worker (`toolkit`) serving `dist/` as static assets via `wrangler.jsonc`'s `assets.directory` — not Cloudflare Pages | Static hosting, generous free bandwidth, fast global edge. No Astro adapter, no bindings, no SSR — this site has neither, so `@astrojs/cloudflare` (which provisions Images + KV Sessions bindings unconditionally) doesn't belong here. See root `wrangler.jsonc`. |
| Per-tool logic | Isolated ES modules, dynamically imported per page | Prevents one tool's heavy WASM payload (e.g. an image codec bundle) from loading on a page that doesn't need it. |
| Data/state | None server-side. No database, no accounts, no user file storage — ever, for the client-side tool set. | This is a genuine trust/privacy differentiator to put directly in the copy — see `COPY_GUIDELINES.md`. |
| Analytics | Privacy-respecting, aggregate-only (e.g. Cloudflare Web Analytics or Plausible) | Consistent with the privacy pitch; full user-tracking analytics undercuts the site's own positioning. |

## Repo / folder structure (as actually built)

```
/src
  /pages
    index.astro                 # homepage
    /pdf/ /image/ /audio/ /video/ /data/ /dev/
      index.astro                # category hub
      merge.astro split.astro ...
    /csv/ /json/                 # a few legacy tool routes predating /data/ and /dev/
    /guides/                     # explainer content layer, see GUIDES.md
    privacy.astro / about.astro / contact.astro / terms.astro
  /components
    Sidebar.astro                # persistent nav shell, see PAGE_LAYOUT.md "Site shell"
    ToolHeader.astro / ToolWidget.astro   # shared drop-zone/status/result chrome
    AdsterraBanner.astro / ConsentBanner.astro   # ad system, see PAGE_LAYOUT.md monetization section
    FaqAccordion.astro / Breadcrumbs.astro / ToolSchema.astro / CategorySchema.astro
  /lib
    ui.ts                        # shared drop-zone/processing/result state machine every tool uses
    /pdf/ /image/ /audio/ /video/ /data/ /dev/    # one pure module per operation
    /ads/                         # Adsterra loader, consent, processing overlay, download gate
  /data
    tools.ts                     # single source of truth per tool: title, description,
                                  # keywords, related-tool links, schema fields — see SEO.md
    toolIcons.ts                 # hand-drawn SVG icon paths, keyed by tool slug
    faqs.ts / guides.ts / references.ts / site-config.ts
```

Each `/lib/<category>/<operation>.ts` module should be a pure function wrapping the underlying
library (see `TOOL_SPECS.md` for which library per tool) — this keeps the UI components dumb and
the conversion logic independently testable.

## Non-goals (explicit, to prevent scope drift)

- No user accounts, no saved history, no cloud storage of any kind at launch.
- No YouTube/streaming media ripping or downloading of any kind, ever — legally and
  reputationally out of scope for this project regardless of technical feasibility.
- No DOCX/PPTX conversion at launch (see decision tree above) — server-dependent, deferred.
- No batch-processing UI at launch (process N files in one queue) — nice-to-have, not MVP;
  revisit in Phase 2 once single-file flows are solid.
