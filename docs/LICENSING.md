# Licensing

**Read this before adding any new dependency, not after.** This project is a closed-source
commercial product (ad-monetized). AGPL and GPL dependencies carry real obligations that are
incompatible with that model unless deliberately and carefully isolated — "it's open source" is
not the same question as "is it safe to use in a proprietary commercial product," and the two
get conflated constantly in blog posts and READMEs. Verify the actual license file in the repo,
not just a README badge, before treating anything below as final — licenses change between
versions.

## Quick reference table

| Library | Purpose | License (verify before use) | Safe for this project? |
|---|---|---|---|
| `pdf-lib` | PDF create/edit | MIT | Yes |
| `pdf.js` | PDF rendering | Apache-2.0 (Mozilla) | Yes |
| `@jsquash/*` (jpeg, png, webp, resize, avif, jxl, qoi) | Image codecs | Apache-2.0 — **not MIT**, which it's often reported as | Yes. The bundled codec WASM is permissive too: libavif is BSD-2, libjxl BSD-3, qoi MIT (shipped as `codec/LICENSE.codec.md`). Verified by scanning all nine `.wasm` blobs for GPL/LGPL strings — none present. |
| `browser-image-compression` | Image compression | MIT | Yes |
| `libheif-js` (`wasm-bundle` build) | HEIC decode (`/image/heic-to-jpg`) | LGPL-3.0, stated correctly in its own `package.json`/`LICENSE` | Yes, with caveats below — replaced `heic2any` for this reason |
| ~~`heic2any`~~ | ~~HEIC decode~~ | Claims MIT, but silently inlines a compiled `libheif` (LGPL-3.0) WASM/JS blob into its bundle with **no LGPL notice, no license file, and no separate/relinkable artifact** | **No — removed.** Verified by attempting to re-parse its own output and inspecting `dist/heic2any.js` directly: the LGPL component ships with zero attribution. Do not reintroduce. |
| `icodec` | Image codecs incl. HEIC | Not evaluated further — same underlying `libheif`/HEVC characteristics as any HEIC decoder; `libheif-js` was chosen instead for its correct LGPL attribution | N/A |
| `@imgly/background-removal` | Background removal | **AGPL-3.0** | **No — do not ship as-is.** Requires either a commercial license from IMG.LY or replacing with a self-integrated Apache-2.0 model via `onnxruntime-web` directly. |
| `@huggingface/transformers` | ONNX inference runtime for `/image/remove-background` | Apache-2.0 | Yes |
| `onnx-community/ormbg-ONNX` (model weights) | Background-removal model | Apache-2.0, and its base model `schirrmacher/ormbg` is also Apache-2.0 | Yes — this is the model actually shipped. See the note below. |
| ~~`rembg-webgpu`~~ | ~~Background removal~~ | Wrapper is permissive ("RemBG Attribution License, MIT-Compatible", commercial use allowed with visible `www.rembg.com` credit) — **but it hardcodes `briaai/RMBG-1.4`**, which is Creative Commons **non-commercial**; commercial use needs a paid agreement with BRIA | **No — rejected.** Verified by unpacking the published tarball: `dist/init.js` calls `AutoModel.from_pretrained("briaai/RMBG-1.4")` with no override option, so the non-commercial model cannot be swapped out. Kit-Bin is ad-supported, i.e. commercial. Do not reintroduce. |
| Mediabunny | Audio/video processing | Custom permissive license — explicitly allows commercial use in closed-source projects; redistribution obligations apply only if you fork/redistribute the library itself | Yes — preferred over ffmpeg.wasm for this reason |
| `ffmpeg.wasm` / `@ffmpeg/ffmpeg` | Audio/video processing | Depends on compiled codecs — LGPL core is fine for closed-source with dynamic linking, but many builds bundle GPL components (e.g. libx264), which would obligate the whole product to GPL | **Verify the exact build's codec list before using; prefer Mediabunny where equivalent functionality exists** |
| `PapaParse` | CSV parsing | MIT | Yes |
| `ajv` | JSON Schema validation (`/dev/json-schema-validator`) | MIT | Yes |
| `ajv-formats` | `format` keyword support (email, date, uri, uuid, etc.) for the schema validator | MIT | Yes |
| SheetJS (`xlsx`, community edition) | Spreadsheet read/write | Apache-2.0 | Yes |
| `fflate` | In-browser zipping | MIT | Yes |
| `gifenc` | GIF encoding (`/video/gif-from-video`); also its `quantize()` reused for `/image/color-palette` | MIT | Yes — supersedes `gif.js`, faster with comparable quality; already in use |
| `qrcode` | QR generation (`/dev/qr-code-generator`) | MIT | Yes. Its Node-only deps (`pngjs`, `yargs`, `dijkstrajs` — all MIT anyway) are excluded at bundle time via the package's own `browser` field remap to `lib/browser.js`; verified this resolves correctly under Vite. |
| `jsqr` | QR decoding (`/dev/qr-code-scanner`) | Apache-2.0 | Yes — pure JS, zero dependencies. |
| `qpdf-wasm` (multiple maintainers) | PDF password removal | Wraps Apache-2.0 QPDF | **No — attempted, pulled.** License is fine, but this build is pthreads/SharedArrayBuffer-based: needs site-wide COOP/COEP headers (conflicts with ad iframes) and its worker pool fails to spawn under Vite even with those headers set. See `TOOL_SPECS.md`'s `/pdf/unlock` entry. |
| `@embedpdf/pdfium` | PDF rendering (alt. to pdf.js) | MIT | Yes |
| `exifr` | EXIF/GPS/XMP metadata parsing (`/image/exif-viewer`) | MIT, verified in `node_modules/exifr/LICENSE` | Yes |
| `pdf-lib-plus-encrypt` | PDF password encryption (`/pdf/protect`) | MIT, verified in `node_modules/pdf-lib-plus-encrypt/LICENSE.md` — a maintained fork of `pdf-lib` with AES/RC4 encryption merged in, browser-tested | Yes. Used only on `/pdf/protect`'s own page (lazy-loaded per-page, per the project's code-splitting rule) — does not replace the plain `pdf-lib` used everywhere else, to avoid coupling unrelated tools to a smaller-community fork. |
| `tesseract.js` | OCR (`/image/to-text`) | Apache-2.0, verified in `node_modules/tesseract.js/LICENSE.md` | Yes. Package license only covers the JS/WASM engine — the trained-data files it downloads at runtime (`eng.traineddata` etc., fetched from the `tessdata_fast` project) are separately Apache-2.0 too (`tessdata_fast` repo's own `LICENSE`), so both halves check out per the "package license and model license are two separate questions" rule below. |
| `@techstark/opencv-js` | Perspective correction/edge detection (`/pdf/scan-to-pdf`) | Apache-2.0, verified in `node_modules/@techstark/opencv-js/LICENSE` (OpenCV itself has been Apache-2.0 since v4.5, matching this build) | Yes |
| `kokoro-js` | Text-to-speech (`/audio/text-to-speech`) | Apache-2.0, verified in `node_modules/kokoro-js/LICENSE` | Yes. Model weights (`onnx-community/Kokoro-82M-v1.0-ONNX`) are separately Apache-2.0 per the model card — both package and model check out. |
| `onnx-community/whisper-base` (model weights, via `@huggingface/transformers`) | Audio/video transcription (`/audio/transcribe`) | Inherits OpenAI Whisper's MIT license (verified at `github.com/openai/whisper/blob/main/LICENSE`) — the ONNX conversion doesn't add restrictions on top of the original weights | Yes |
| `Cropper.js` | Image crop UI | MIT | Yes |
| `wavesurfer.js` (+ Regions plugin) | Waveform/region UI (`/audio/trim`) | BSD-3-Clause | Yes — visual-only, pairs with Mediabunny for the actual trim operation |
| `react-dropzone` | Upload UI (only if using React components) | MIT | Yes |
| Stirling-PDF | Reference only, not a dependency | AGPL-3.0, server-side Java | **Do not import code. Reference for feature/UX ideas only.** |
| IT-Tools | Reference only, not a dependency | GPL-3.0 | **Do not import code — see the note on GPL and client-side distribution below.** |
| BentoPDF | Reference only, not a dependency | Inconsistent across mirrors (AGPL-3.0 and Apache-2.0 both seen); canonical repo has a split commercial/self-hosted license model | **Treat as UX/feature reference only. Do not assume any given fork's license is authoritative.** |

Full research trail and reasoning for every entry above: `OPEN_SOURCE_REPOS.md`.

## A note on GPL specifically (not just AGPL)

The table above previously only flagged AGPL as the recurring trap in this space, but GPL
deserves the same caution for a project like this one, for a reason that's easy to miss: GPL's
copyleft obligations attach to *distributing* the covered work, and shipping GPL-derived
JavaScript to every visitor's browser — which is inherent to how a client-side tool site works —
is plausibly "distribution" to each visitor in a way that server-side GPL use typically isn't
(server-side GPL use without AGPL terms generally doesn't trigger source-sharing obligations,
since no software is being distributed to the end user, just its output). Don't reason "it's
GPL not AGPL, so client-side is fine" — verify this specifically rather than assuming, and
default to treating GPL the same as AGPL for anything that would ship inside the site's own
client bundle.

## Why AGPL specifically is the recurring trap in this space

Several of the most polished, easiest-to-integrate libraries for exactly the kind of AI-powered
tool this project wants (background removal being the clearest example) are AGPL-licensed by
companies who then sell a commercial license as the alternative. This is a completely normal
and legitimate business model on the library maintainer's side — but it means "the top Google
result for '[feature] JavaScript library'" is disproportionately likely to be AGPL, precisely
because it's the free/open path the maintainer offers before you'd need to pay them. Always
check for this pattern specifically when a library feels "too easy" for a non-trivial ML/media
feature — it usually means either (a) it's genuinely a thin wrapper around a much larger
pretrained model/toolkit (fine), or (b) that ease-of-use is the free tier of a dual-licensed
commercial product (needs a license check before shipping).

## HEIC/HEVC: a second, separate risk beyond copyright (`/image/heic-to-jpg`)

`libheif-js`'s LGPL-3.0 terms (above) are a copyright-licensing question. HEIC decoding carries
a second, unrelated risk: HEIC images encode their actual pixel data with HEVC (H.265), a
codec covered by patent pools (MPEG-LA and Access Advance) with patents running into the 2030s.
This is a patent question, not a copyright one — it exists independent of which library or
license you pick, because it's inherent to decoding HEVC-encoded pixel data at all.

This is why Chrome, Firefox, and Edge don't decode HEIC/HEVC natively on desktop — the patent
pool licensing cost, not a copyright objection. Every free/open-source HEIC decoder (this one
included) carries the same unresolved exposure; there's no library swap that fixes it, short of
dropping HEIC support outright.

**Accepted as a known, industry-wide risk, not a blocker**: no enforcement action against a
small site offering free decode-only conversion is known to exist, and effectively every
consumer-facing "HEIC to JPG" web tool operates the same way. Revisit only if this project's
traffic/revenue becomes large enough that the calculus meaningfully changes, or if evidence of
actual enforcement in this space surfaces — not on a fixed schedule.

## Background removal: why `ormbg` and not the obvious choices

The two most-recommended browser background-removal options are both unusable here, for
different reasons, and both look fine until you check one level deeper:

- `@imgly/background-removal` is AGPL-3.0 (row above). Obvious once checked.
- `rembg-webgpu` advertises a permissive, "MIT-compatible" licence, and its own licence really
  is permissive. The problem is one level down: the **model weights** it downloads are
  `briaai/RMBG-1.4`, which is non-commercial. A permissive wrapper around a non-commercial model
  is still non-commercial for our purposes. This is the same shape of trap as the AGPL one, just
  moved from the package to the checkpoint.

The general rule this establishes: **for anything ML, the package licence and the model licence
are two separate questions and both have to be checked.** A model card's declared licence also
does not automatically bind the base model it was converted from, so check that too — which is
why the table records `schirrmacher/ormbg` (the base) separately from `onnx-community/ormbg-ONNX`
(the conversion we actually load).

One honest caveat on `ormbg`: the author licenses the weights Apache-2.0 and describes the model
as fully open source, but its training set includes academic datasets (P3M-10K, AIM-500, PPM-100)
whose own terms are research-oriented. We are relying on the model author's Apache-2.0 grant on
the weights, which is the same basis essentially every commercial user of open vision models
relies on. Worth knowing; not a reason to block, and materially safer than a checkpoint whose
own card says non-commercial.

## Practical rule for this project

Default assumption for any new dependency: **MIT, Apache-2.0, and BSD are safe. LGPL needs the
dynamic-linking condition verified. GPL and AGPL are a stop — do not add without an explicit
licensing decision (either paying for a commercial license, or finding/building an alternative).**
This isn't about being anti-copyleft in principle — it's that copyleft terms and "ad-supported
closed-source SaaS-lite" are a specific, well-known incompatibility, and this project is
squarely in the pattern that trips people up.
