# File Converter / Processor Utility Site — Build Plan

## Core Architecture Decision: Browser-First, Server Fallback Only When Unavoidable

Pure browser-side processing is realistic for roughly 90% of conversions — images, audio, and simple video — and the pragmatic setup is a hybrid: browser-first, with a server fallback only when necessary. This is the single most important architectural decision because it determines your hosting bill.

- **Client-side (default, zero marginal cost):** WASM libraries running in the visitor's browser. Their CPU does the work, not yours. Host as pure static files — Cloudflare Pages or Vercel free tier, $0/month up to generous bandwidth limits.
- **Server fallback (only for large files):** A practical threshold pattern is checking file size and routing large jobs elsewhere — use ffmpeg.wasm for lightweight client-side operations and route heavier work to a server API, with something like a 50MB threshold deciding which path a file takes. Realistically, skip this at launch. Cap upload size, tell the user why, add server processing later only if demand justifies the hosting cost.

### Library Picks Per Category

| Category | Library / Approach |
|---|---|
| PDF | `pdf-lib` (merge/split/rotate/compress/watermark, pure JS, no WASM needed) + `pdf.js` for rendering/preview |
| Images | `browser-image-compression` + Canvas API for format conversion (HEIC/WebP/PNG/JPG) — native browser APIs handle most of this without any library at all |
| Audio/Video | `ffmpeg.wasm` is the default choice, but a newer library called **MediaBunny** is worth prioritizing for new projects doing browser media processing, and can offer significant performance improvements over ffmpeg.wasm — worth prototyping both before committing. Prefer remux over re-encode wherever the task allows it, since it's roughly 100x faster (e.g. MP4→MOV container swap vs. actually re-encoding video). |
| Spreadsheets/CSV | SheetJS (`xlsx`) — already in your available library set from the artifact environment, so you already know this one. |

### What NOT to Promise

LibreOffice-in-WASM (for DOCX/PPTX conversions) is still unstable and impractical in 2026 — too large, too slow, too platform-dependent. Don't build "Word to PDF" or "PPTX to PDF" at launch; it's the one category where a real server-side fallback (LibreOffice headless, or your PDF skill's approach) is currently unavoidable, and that costs real compute. Leave it for phase 3 if the site earns its keep.

---

## Full Tool Matrix (Organized for URL/SEO Structure)

Structure the site as one category hub page + one dedicated URL per tool (not one big multi-tool page — Google ranks specific-intent pages far better than generic ones, and each page becomes its own long-tail entry point).

### PDF Tools
- `/pdf/merge`
- `/pdf/split`
- `/pdf/compress`
- `/pdf/rotate`
- `/pdf/to-images`
- `/pdf/watermark`
- `/pdf/unlock` (password removal for user's own files)
- `/pdf/reorder-pages`

### Image Tools
- `/image/heic-to-jpg`
- `/image/webp-to-png`
- `/image/png-to-webp`
- `/image/compress`
- `/image/resize`
- `/image/crop`
- `/image/svg-to-png`
- `/image/background-remove` — this last one needs a small ML model, doable in-browser via `onnxruntime-web`, high search volume, worth prioritizing early

### Audio Tools
- `/audio/mp3-to-wav`
- `/audio/wav-to-mp3`
- `/audio/trim`
- `/audio/merge`
- `/audio/volume-normalize`
- `/audio/format-convert` — all legitimate since the input is a file the user already owns, not a YouTube URL

### Video Tools
- `/video/mp4-to-webm`
- `/video/compress`
- `/video/trim`
- `/video/extract-audio`
- `/video/mute`
- `/video/gif-from-video`

### Document/Data Tools
- `/csv/to-json`
- `/json/to-csv`
- `/csv/to-excel`
- `/data/csv-cleaner`

That's ~28 tools — a real, comprehensive-looking site, entirely buildable with free/open-source libraries, none of it touching copyrighted third-party content.

---

## SEO Structure That Actually Compounds

1. **One URL per tool**, keyword-matched exactly to search intent (`/image/heic-to-jpg` not `/tools?type=heic`).
2. **Category hub pages** (`/pdf/`, `/image/`) that link to all sub-tools — this is what lets Google understand you're a comprehensive authority in "PDF tools" rather than one lucky page.
3. **Schema markup** — use `SoftwareApplication` structured data on every tool page. This is what gets you the star-rating/rich snippet in results.
4. **Thin unique content per page** (150-300 words: what it does, how to use it, a genuine FAQ) — enough to avoid "thin content" penalties, not so much it becomes a content-farm page that AI Overviews can just summarize instead of the user clicking through.
5. **Internal linking**: every tool page links to 3-4 related tools ("also try: PDF compress, PDF split"). This is free traffic distribution across your whole catalog.
6. **Programmatic scale, later, carefully**: once the core 28 pages are indexed and working, format-pair combinatorics (webp-to-png, png-to-webp, jpg-to-webp...) can 3-4x your page count cheaply. Don't do this at launch — Google penalizes template-spam sites with no initial trust signal.

---

## Realistic Phasing

### Phase 1 (2–4 weeks) — MVP
6-8 tools covering the highest-search-volume, lowest-technical-risk items — PDF merge/split/compress, image format conversion, image compress, one audio converter. This is enough to launch, get indexed, and start collecting Search Console data on what's actually converting.

### Phase 2 (Months 2–4)
Fill out the remaining PDF/image/audio tools based on what Search Console shows is getting impressions but not yet ranking top-10 — that's your signal for where to add depth (more FAQ content, better schema) rather than guessing.

### Phase 3 (Month 5+, only if traffic justifies it)
Video tools (heavier WASM payload, worse mobile experience per the reality that a transcode working fine on a MacBook will crash on mobile Safari due to tighter memory limits), and only then consider a server-side fallback tier for large files or DOCX/PPTX conversion.

---

## Monetization Placement (Avoiding the "Sketchy Converter Site" Reputation Problem)

Given the reputational risk that killed public trust in stream-ripping sites, don't replicate their UX pattern — many low-quality converters became notorious for aggressive pop-ups and fake download buttons. AdSense auto-ads or a single sidebar/below-the-fold unit, never interstitials over the actual tool UI. It costs you some short-term RPM but is what lets the site survive an AdSense policy review and keeps repeat visitors (which matters — repeat/direct traffic is a hedge against the zero-click trend, since Google itself weighs engagement signals).

---

## Cost Reality

- **Static hosting** (Cloudflare Pages/Vercel free tier): $0
- **Domain**: ~£10/year
- **No database needed at launch** — client-side only means no user files ever touch a server, no storage cost, and it's a genuine privacy selling point to put in your copy
- **Total realistic year-one cost**: domain + your time

The only thing that costs real money is Phase 3's server fallback, and you'd only build that once traffic data justifies it.
