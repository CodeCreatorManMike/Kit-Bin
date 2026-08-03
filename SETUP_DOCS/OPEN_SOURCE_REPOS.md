# Open Source Repos — Vetted for This Project

This is the research trail: every repo/library evaluated for this project, why it fits (or
doesn't), and the license finding. `LICENSING.md` is the enforced rule table — this file is the
evidence behind it. Update this file whenever a new dependency is evaluated, even if rejected —
"we already checked this and it's AGPL" saves someone re-doing the research in six months.

Legend: 🟢 safe to use · 🟡 usable with a specific caveat, read the note · 🔴 do not use as a
dependency (reference/inspiration only, if even that)

---

## PDF

### 🟢 pdf-lib — github.com/Pdf-lib/pdf-lib
MIT. Pure JS, no WASM. Core library for merge/split/compress/rotate/watermark/reorder. Already
the primary recommendation in `TOOL_SPECS.md` — confirmed solid.

### 🟢 pdf.js — github.com/mozilla/pdf.js
Apache-2.0. Mozilla's PDF renderer, used for `/pdf/to-images` and page thumbnail generation
(reorder-pages UI). Extremely mature, battle-tested (it's the PDF viewer built into Firefox).

### 🟢 @embedpdf/pdfium — npmjs.com/package/@embedpdf/pdfium
**MIT.** Newly identified as a strong alternative to pdf.js for rendering — this is Google's own
PDFium engine (the renderer inside Chrome) compiled to WASM. Worth evaluating against pdf.js
specifically for `/pdf/to-images` where rendering fidelity on complex PDFs (unusual fonts, heavy
vector graphics) is the main risk called out in `TOOL_SPECS.md`. PDFium is generally regarded as
having stronger fidelity than pdf.js on edge-case PDFs since it's the same engine Chrome itself
uses to render PDFs natively. Note this comes from the broader EmbedPDF project (embedpdf.com) —
confirm the specific `@embedpdf/pdfium` package license independently if pulling in any other
EmbedPDF packages, don't assume the whole project is uniformly MIT.

### 🟡 qpdf-wasm (multiple maintainers: jsscheller/qpdf-wasm, neslinesli93/qpdf-wasm,
kairi003/qpdf-wasm-esm, @jspawn/qpdf-wasm on npm)
**Closes the license gap flagged in `TOOL_SPECS.md` for `/pdf/unlock`.** The underlying QPDF
library (github.com/qpdf/qpdf) is Apache-2.0. Several independent maintainers have compiled it
to WASM for browser use. Caveat: these are smaller, less centrally-maintained packages than
pdf-lib or pdf.js — check recent commit activity and open issues before committing to one, and
pin a specific version once chosen since browser WASM builds for CLI tools like this can be
fragile across QPDF version bumps. This is exactly the tool for password removal on a user's own
PDF (decrypt-with-known-password), which is the scoped use case defined in `TOOL_SPECS.md` —
do not use it to build any kind of protection-bypass feature beyond that.

### 🔴 Stirling-PDF — github.com/Stirling-Tools/Stirling-PDF
AGPL-3.0, server-side Java/Spring. Reference for feature completeness and UX flow only — 50+
PDF operations is a genuinely useful map of "what a comprehensive PDF tool set covers," but
wrong license and wrong stack for this project. Do not import code.

### 🔴 BentoPDF — canonical repo appears to be alam00000/bentopdf; also mirrored under several
other GitHub accounts (189569400/bentopdf, brettcran/bentopdf, goodtab/bentopdf, and others)
**License finding is genuinely inconsistent across mirrors/versions** — some snapshots show
AGPL-3.0, at least one shows Apache-2.0, and the canonical repo describes a **split licensing
model**: a "Self-Hosted build" (stripped of marketing UI) versus a "Commercial build" (the full
bentopdf.com marketing site, used by paying commercial license holders). This is worth flagging
prominently: BentoPDF's actual business model is nearly identical to this project's (client-side
PDF toolkit, ad/commercially monetized), which means their code is specifically structured to
*not* be freely cloneable into a competing commercial product without a paid license — treat
this as reference/inspiration for feature scope and UX only, verify the license on the exact
file/version in question before ever copying so much as a snippet, and do not assume any
particular BentoPDF fork on GitHub reflects the canonical license terms.
**Worth noting from BentoPDF's own dependency list** (useful pointers even though we're not
using their code): they credit PDFKit, Cropper.js (image cropping — see Image section below),
and explicitly call out that AGPL-licensed tools they use server-side (CoherentPDF, PyMuPDF,
Ghostscript) are "not bundled in BentoPDF's source code" — i.e. even BentoPDF's own maintainers
are actively managing around the same AGPL trap flagged in this project's `LICENSING.md`. That's
a useful confirmation that this is a known, common pitfall in exactly this space, not something
specific to this project's dependency choices.

---

## Image

### 🟢 jSquash — github.com/jamsinclair/jSquash
Apache-2.0. Already the primary recommendation for format conversion (`@jsquash/avif`,
`@jsquash/webp`, `@jsquash/png`, `@jsquash/jpeg`, `@jsquash/resize`). Confirmed solid.

### 🟡 icodec — github.com/Kaciras/icodec
License needs direct verification at build time (not confirmed at time of writing) — this is
the one repo in the image category with broader format coverage including native HEIC
encode/decode, which is the highest-search-volume image conversion in the whole catalog. Worth
the extra diligence specifically because of that traffic value; don't default to skipping it
just because jSquash doesn't need the same scrutiny.

### 🟢 browser-image-compression — MIT
Confirmed, already in use for `/image/compress`.

### 🟢 Cropper.js
MIT-licensed (confirmed via multiple independent sources, including being credited by BentoPDF
above). Solid choice for `/image/crop`'s actual crop-selection UI — this is a UI/interaction
library, not a codec, and pairs with the native Canvas API for the actual pixel export step.

### 🔴 @imgly/background-removal — AGPL-3.0
Already flagged in `LICENSING.md`. No change to this finding — still avoid as-is.

---

## Audio/Video

### 🟢 Mediabunny — github.com/Vanilagy/mediabunny
Custom permissive license, explicit commercial-use allowance. Already the primary
recommendation across audio and video tools. Confirmed solid, no changes.

### 🟡 ffmpeg.wasm — github.com/ffmpegwasm/ffmpeg.wasm
License depends entirely on which codecs are compiled into the specific build in use — confirmed
risk already documented in `LICENSING.md`. No new finding here beyond the existing caveat: verify
the exact build's codec list (`ffmpeg -L` equivalent check) before use, and default to Mediabunny
where functionality overlaps.

---

## Data/CSV

### 🟢 PapaParse — github.com/mholt/PapaParse
MIT. Already the primary recommendation for CSV parsing.

### 🟢 SheetJS (community edition) — Apache-2.0
Already the primary recommendation for `.xlsx` read/write.

### 🟢 fflate — github.com/101arrowz/fflate
MIT. Confirmed for in-browser zipping (used when `/pdf/split` produces multiple output files).

---

## UI/Interaction (not tool-logic libraries, but relevant to `PAGE_LAYOUT.md`)

### 🟢 react-dropzone — github.com/react-dropzone/react-dropzone
MIT. If the frontend ends up using React components anywhere (e.g. for the upload zone
specifically, even inside an otherwise-Astro site), this is the standard, well-maintained choice
for drag-and-drop file input with the accept-type validation behavior specified in
`PAGE_LAYOUT.md`. If staying framework-agnostic/vanilla per the Astro-first approach in
`ARCHITECTURE.md`, this isn't needed — native HTML5 drag-and-drop events plus `<input
type="file">` cover the same behavior without pulling in React as a dependency just for one
component. Decide this once the framework choice in `ARCHITECTURE.md` is finalized.

---

## Full-site references (architecture/UX inspiration — not code sources)

### 🔴 IT-Tools — github.com/CorentinTh/it-tools
**GPL-3.0.** Correction to note explicitly: some third-party write-ups describe this as "free
for commercial use" because GPL permits use/modification/distribution — but that description
is misleading for this project's situation. GPL's copyleft obligations attach to *distribution*
of the covered work, and shipping GPL-derived JavaScript to every visitor's browser (which is
what a client-side tool site inherently does) is very plausibly "distribution" of that code to
each user in a way that server-side GPL use typically isn't. Copying IT-Tools' code into this
project's client bundle would likely obligate this project's own client-side source to be
GPL-licensed too — which defeats the point of running a closed-source commercial site. Treat
IT-Tools purely as a UX/scope reference (100+ tools, clean categorization, "great UX" is
genuinely its own stated differentiator and worth studying for that reason) — do not copy code.

### 🔴 ToolKnit — toolknit.com (not confirmed to have a public GitHub repo at time of writing)
Not a code source at all, but worth knowing about as a direct competitor/case study: a real,
live example of this exact business model (86 free browser-based tools, 100% client-side, no
uploads, ad-supported), whose founder has publicly documented spending real money on AI coding
tokens building it (one build log entry mentions burning roughly $200 in tokens in a single day
on Claude 4.8 Max). Useful as a sanity check on realistic build cost/time for a catalog this
size — not something to fork or reference code from, since no public repo was found.

---

## Summary of new findings vs. previously documented state

1. **`/pdf/unlock`'s open license question in `TOOL_SPECS.md` is now resolved**: qpdf-wasm
   (wrapping Apache-2.0 QPDF) is a viable, license-safe path. Update that file's status from
   "verify library support before committing" to reflect this.
2. **New alternative for PDF rendering**: `@embedpdf/pdfium` (MIT) is worth a head-to-head
   evaluation against pdf.js for `/pdf/to-images` specifically, on fidelity grounds.
3. **New pick for `/image/crop`'s UI layer**: Cropper.js (MIT).
4. **IT-Tools' license risk is more specific than "open source, so it's probably fine"** — worth
   making sure this framing doesn't creep into future dependency decisions for this project.
5. **BentoPDF is a closer real-world analog to this project than initially apparent** (same
   business model, same AGPL-avoidance pattern already independently arrived at in this
   project's own `LICENSING.md`) — good external validation of the approach already taken, but
   its own dual-license structure means treat it as reference, not a code source.
