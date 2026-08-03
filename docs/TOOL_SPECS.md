# Tool Specifications

For every tool: what it does, which library/repo to build on, license status (cross-check
`LICENSING.md` before treating this as final), and implementation notes. Complexity is rated
Low/Medium/High relative to everything else in this catalog, not in absolute terms.

Always check the license table in `LICENSING.md` before wiring up a dependency — several
popular options in this space carry AGPL or GPL terms that are unsafe for a closed-source
commercial site. Flagged inline below wherever relevant.

---

## PDF Tools

### `/pdf/merge`
- **Library**: `pdf-lib` (MIT license, pure JS, no WASM)
- **Repo**: github.com/Pdf-lib/pdf-lib
- **Approach**: Load each PDF as a `PDFDocument`, copy pages into a new document with
  `copyPages`, save and serve as a Blob download.
- **Complexity**: Low.

### `/pdf/split`
- Same library (`pdf-lib`). Load doc, create N new `PDFDocument`s each with a page subset via
  `copyPages`, zip results if more than ~3 output files (use `fflate` or similar, MIT-licensed,
  for in-browser zipping).
- **Complexity**: Low.

### `/pdf/compress`
- **Library**: `pdf-lib` for structure + re-embedding downsampled images; for actual image
  recompression inside the PDF, decode embedded images and re-encode via the image pipeline
  in the Image Tools section below (jSquash/mozjpeg).
- **Note**: True PDF compression (recompressing embedded raster images, removing redundant
  objects) is meaningfully harder than merge/split. This is the PDF tool most likely to need a
  second iteration pass after initial ship.
- **Complexity**: Medium.

### `/pdf/rotate`
- `pdf-lib` — `page.setRotation()`. Trivial once merge/split scaffolding exists.
- **Complexity**: Low.

### `/pdf/to-images`
- **Library**: `pdf.js` (Apache-2.0, Mozilla) to render each page to a canvas, then export
  canvas → PNG/JPG via native Canvas API (no extra dependency needed for the export step).
- **Repo**: github.com/mozilla/pdf.js
- **Alternative worth a head-to-head evaluation**: `@embedpdf/pdfium` (MIT) — wraps Chrome's own
  PDFium rendering engine in WASM, generally regarded as having stronger fidelity than pdf.js on
  edge-case PDFs (unusual fonts, heavy vector graphics) since it's the same engine Chrome uses
  natively. Worth testing both against a set of gnarly real-world PDFs before committing, given
  fidelity is explicitly the main risk area for this tool.
- **Complexity**: Medium (rendering fidelity across complex PDFs — fonts, vector graphics — is
  the main risk area).

### `/pdf/watermark`
- `pdf-lib` — draw text or an embedded image onto every page at a fixed position/opacity.
- **Complexity**: Low.

### `/pdf/unlock`
- Scope explicitly to **removing a password the user already knows/owns** (i.e. decrypting a
  PDF you have the password for, not bypassing protection you don't own). Flag clearly in copy
  that this is for the user's own files.
- **Library**: `pdf-lib` has limited encryption support, so use a `qpdf-wasm` port instead —
  QPDF itself is Apache-2.0, and several independent maintainers have compiled it to WASM (see
  `OPEN_SOURCE_REPOS.md` for specific repos). Pin a specific version once chosen; these are
  smaller, less centrally-maintained packages than pdf-lib/pdf.js, so check recent commit
  activity before committing to one.
- **Complexity**: Medium.

### `/pdf/reorder-pages`
- `pdf-lib` `copyPages` with a user-specified order array; UI is a drag-to-reorder thumbnail
  grid fed by `pdf.js` page renders.
- **Complexity**: Medium (mostly UI complexity, not library complexity).

**Reference implementation worth studying (not importing wholesale)**: Stirling-PDF
(github.com/Stirling-Tools/Stirling-PDF) — 50+ PDF operations, AGPL-3.0 licensed, **server-side
Java/Spring, not client-side JS**. Do not use its code directly (license + wrong stack), but its
feature list and UI flow are a useful reference for what a comprehensive PDF tool set covers and
in what order users expect operations to appear.

---

## Image Tools

### `/image/heic-to-jpg`, `/image/webp-to-png`, `/image/png-to-webp`
- **Library**: `@jsquash/*` packages (per-format: `@jsquash/jpeg`, `@jsquash/png`,
  `@jsquash/webp`, `@jsquash/avif`) — Apache-2.0, browser/WebWorker-focused WASM codec bundles
  derived from Google's Squoosh app.
- **Repo**: github.com/jamsinclair/jSquash
- **Alternative worth evaluating**: `icodec` (github.com/Kaciras/icodec) — broader format
  coverage including native HEIC encode/decode (via libheif+x265/libde265), check license before
  committing (verify at build time; not confirmed Apache/MIT at time of writing).
- **Note**: HEIC specifically is the trickiest of this set — iOS photos are HEIC by default and
  it's a high-search-volume conversion, but codec licensing (H.265-derived) needs a careful
  license check before shipping. Confirm `icodec`'s HEIC module license explicitly; if unclear,
  scope `/image/heic-to-jpg` to decode-only (reading HEIC in, which is generally less
  encumbered than encoding HEIC out).
- **Complexity**: Low–Medium (Low for WebP/PNG/JPG pairs, Medium for HEIC due to the license
  research step).

### `/image/compress`
- **Library**: `browser-image-compression` (MIT) for a simple, dependency-light path, or the
  `@jsquash` codecs directly for finer quality/size control (this is literally what Squoosh
  itself does under the hood).
- **Complexity**: Low.

### `/image/resize`
- Native Canvas API (`drawImage` with target dimensions) — no external library needed.
- **Complexity**: Low.

### `/image/crop`
- **Library**: `Cropper.js` (MIT) for the crop-selection UI/interaction (drag handles, aspect
  ratio locking); pair with native Canvas API for the actual pixel export once a selection is
  confirmed. Rolling this interaction by hand is disproportionately fiddly relative to its value
  — this is a case where the small UI library earns its place.
- **Complexity**: Low.

### `/image/svg-to-png`
- Native: render SVG into an `<img>` or via `Image()` + draw to canvas + export. No dependency
  required for simple cases; for SVGs with external references or complex filters, test
  thoroughly — this is the "10% edge case" tool in the image category.
- **Complexity**: Low (with a Medium tail of edge cases).

### `/image/background-remove`
- **Library to avoid as-is**: `@imgly/background-removal` — **AGPL-3.0 licensed**. This is a
  real copyleft risk for a closed-source commercial site; do not ship this dependency without
  either (a) a commercial license from IMG.LY, or (b) swapping to an Apache-2.0-licensed model.
- **Safer path**: run an Apache-2.0-licensed segmentation model (e.g. an IS-Net/ORMBG-style
  ONNX model) directly through `onnxruntime-web` yourself, bypassing the AGPL wrapper package
  entirely. This is more integration work than dropping in `@imgly/background-removal`, but
  removes the license risk completely.
- **Complexity**: High — this is the single most technically involved tool in the entire
  catalog (ML model inference in-browser, WebGPU/WASM backend selection, mask compositing).
  Deliberately placed in Phase 2+/3, not the MVP, despite high search volume — see
  `ROADMAP.md` for the reasoning.

---

## Audio Tools

### `/audio/mp3-to-wav`, `/audio/wav-to-mp3`, `/audio/format-convert`
- **Primary library**: **Mediabunny** (github.com/Vanilagy/mediabunny) — pure TypeScript,
  zero dependencies, permissive commercial-friendly custom license (explicitly allows
  commercial use in open- or closed-source projects; only requires publishing modifications if
  you fork and redistribute the library itself, not your application). Prefer this over
  ffmpeg.wasm as the default choice for new build work — it's purpose-built for the browser
  rather than a WASM port of a native tool, and avoids FFmpeg's GPL/LGPL licensing complexity
  entirely.
- **Fallback/comparison**: `ffmpeg.wasm` (`@ffmpeg/ffmpeg` + `@ffmpeg/util`) — widely used,
  well-documented, but license depends on which codecs are compiled into the WASM build in use;
  default builds often include GPL-licensed components (e.g. libx264), which would obligate the
  whole product to GPL terms if shipped as-is. If used, explicitly verify an LGPL-only build.
- **Complexity**: Low–Medium.

### `/audio/trim`, `/audio/merge`, `/audio/volume-normalize`
- Same library choice as above (Mediabunny). Trim/merge are container/stream operations;
  normalize requires reading PCM samples and applying a gain calculation — slightly more
  involved but still well within what Mediabunny or the Web Audio API natively supports.
- **Note**: Volume normalize can alternatively be built with zero extra dependencies using the
  native Web Audio API (`AudioContext`, `AnalyserNode` for peak detection, `GainNode` for
  adjustment) if avoiding a media library for this one tool is preferable.
- **Complexity**: Medium.

---

## Video Tools

### `/video/mp4-to-webm`, `/video/compress`, `/video/trim`, `/video/mute`
- **Primary library**: Mediabunny (see above) — explicitly supports transmux (container change,
  no re-encode) and transcode (re-encode) operations, with claimed microsecond-precision
  trimming.
- **Critical performance rule**: prefer remux over re-encode whenever the requested operation
  allows it (e.g. MP4↔MOV container change) — remuxing is roughly 100x faster than a full
  re-encode and is the difference between a tool feeling instant vs. feeling broken on a phone.
  Only fall back to full re-encoding when the operation genuinely requires it (true format
  conversion between incompatible codecs, e.g. H.264 → VP9).
- **Complexity**: Medium (compress, mp4-to-webm) to Low (trim/mute, when remux-only paths apply).

### `/video/extract-audio`
- Mediabunny — demux the audio track directly, no video decode/encode needed at all. This
  should be one of the cheapest video-category tools to build well.
- **Complexity**: Low.

### `/video/gif-from-video`
- Decode frames via Mediabunny/canvas sampling at a target frame rate, encode via a GIF encoder
  (e.g. `gif.js`, check license — historically MIT). Watch output file size; GIF is an
  inherently inefficient format, so cap duration/resolution defaults sensibly in the UI rather
  than letting users generate 200MB "GIFs."
- **Complexity**: Medium.

**Mobile note for the entire Video category**: a transcode that works fine on desktop can crash
a mobile browser tab due to tighter memory limits — test explicitly on iOS Safari and a
mid-range Android device before shipping any video tool, not just desktop Chrome.

---

## Document/Data Tools

### `/csv/to-json`, `/json/to-csv`
- Trivial with native `JSON.parse`/`JSON.stringify` plus a small CSV parser. **Library**:
  `PapaParse` (MIT) handles CSV parsing/generation robustly (quoting, encoding edge cases) far
  better than hand-rolled string splitting.
- **Complexity**: Low.

### `/csv/to-excel`
- **Library**: SheetJS (`xlsx`, community edition Apache-2.0) — read CSV, write `.xlsx` directly.
  Already a known quantity from other parts of this project's tooling context.
- **Complexity**: Low.

### `/data/csv-cleaner`
- PapaParse for parsing + a rules-based cleaning pass (trim whitespace, dedupe rows, normalize
  date formats, drop empty rows/columns) — this is mostly your own logic, not a library problem.
- **Complexity**: Medium (the "rules" are a product-design question — decide the default
  cleaning behavior deliberately rather than guessing feature-by-feature).

---

## Explicitly deferred / needs a server (Phase 3 candidates)

### Word ↔ PDF, PowerPoint ↔ PDF
- No viable pure-client-side path as of this writing — LibreOffice-in-WASM is still impractical.
  Needs a real server (LibreOffice headless, or a hosted conversion API) — this is where actual
  hosting cost enters the picture. Do not promise these tools in launch copy or navigation.

### Batch/bulk processing (many files, one queue)
- Not a technical blocker so much as a scope one — build the single-file flow well first, add
  batch as a Phase 2 enhancement once the underlying per-tool logic is proven.
