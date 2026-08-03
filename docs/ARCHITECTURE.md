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

## Processing decision tree (per file, at runtime)

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

- **Size threshold for video**: start at 50MB as the client/server routing boundary — this is
  the commonly cited practical ceiling before ffmpeg.wasm/WASM media libraries become unreliable
  in-browser (memory pressure, mobile tab kills, Safari crashes). Tune per real usage data once
  live; don't over-engineer this number pre-launch.
- **Mobile is a second-class but not ignored citizen at launch.** WASM media processing on
  mobile Safari has materially tighter memory limits than desktop — a transcode that works fine
  on a laptop can crash an iPhone tab. Cap file size more aggressively on mobile UA, or clearly
  message the limitation, rather than letting the tab silently die mid-job.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Astro (recommended) | Ships zero JS by default per page; only the specific tool's JS/WASM loads on that tool's page. This matters a lot here — a Next.js/React SPA tends to bundle more shared JS across routes unless very deliberately code-split, and this project has ~28 largely-unrelated interactive widgets, not one app. |
| Styling | Tailwind CSS | Fast to build consistent, utility-tool-appropriate UI; see `PAGE_LAYOUT.md` for the actual visual system. |
| Hosting | Cloudflare Pages (free tier) | Static hosting, generous free bandwidth, fast global edge, zero-config previews per PR. Vercel free tier is an equally valid alternative — main constraint is avoiding anything that meters by function-invocation, since there are none server-side at launch. |
| Per-tool logic | Isolated ES modules, dynamically imported per page | Prevents one tool's heavy WASM payload (e.g. an image codec bundle) from loading on a page that doesn't need it. |
| Data/state | None server-side. No database, no accounts, no user file storage — ever, for the client-side tool set. | This is a genuine trust/privacy differentiator to put directly in the copy — see `COPY_GUIDELINES.md`. |
| Analytics | Privacy-respecting, aggregate-only (e.g. Cloudflare Web Analytics or Plausible) | Consistent with the privacy pitch; full user-tracking analytics undercuts the site's own positioning. |

## Repo / folder structure (Astro convention)

```
/src
  /pages
    index.astro                 # homepage
    /pdf/
      index.astro                # category hub
      merge.astro
      split.astro
      compress.astro
      ...
    /image/
      index.astro
      heic-to-jpg.astro
      ...
    /audio/ ...
    /video/ ...
    /csv/ ...
  /components
    UploadZone.astro/.tsx        # shared drag-drop component, see PAGE_LAYOUT.md
    ProcessingState.astro/.tsx
    ResultDownload.astro/.tsx
    RelatedTools.astro
    Faq.astro
  /lib
    /pdf/  merge.ts split.ts compress.ts ...   # one module per operation
    /image/ convert.ts compress.ts resize.ts ...
    /audio/ ...
    /video/ ...
  /content or /data
    tool-metadata.ts             # single source of truth per tool: title, description,
                                  # keywords, related-tool links, schema fields — see SEO.md
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
