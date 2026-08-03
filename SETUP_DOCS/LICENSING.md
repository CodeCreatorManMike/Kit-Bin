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
| `@jsquash/*` (avif, webp, png, jpeg, resize) | Image codecs | Apache-2.0 | Yes |
| `browser-image-compression` | Image compression | MIT | Yes |
| `icodec` | Image codecs incl. HEIC | Verify at build time — not confirmed here | **Check before use, especially the HEIC module** |
| `@imgly/background-removal` | Background removal | **AGPL-3.0** | **No — do not ship as-is.** Requires either a commercial license from IMG.LY or replacing with a self-integrated Apache-2.0 model via `onnxruntime-web` directly. |
| Mediabunny | Audio/video processing | Custom permissive license — explicitly allows commercial use in closed-source projects; redistribution obligations apply only if you fork/redistribute the library itself | Yes — preferred over ffmpeg.wasm for this reason |
| `ffmpeg.wasm` / `@ffmpeg/ffmpeg` | Audio/video processing | Depends on compiled codecs — LGPL core is fine for closed-source with dynamic linking, but many builds bundle GPL components (e.g. libx264), which would obligate the whole product to GPL | **Verify the exact build's codec list before using; prefer Mediabunny where equivalent functionality exists** |
| `PapaParse` | CSV parsing | MIT | Yes |
| SheetJS (`xlsx`, community edition) | Spreadsheet read/write | Apache-2.0 | Yes |
| `fflate` (or equivalent) | In-browser zipping | MIT | Yes |
| `gif.js` (or equivalent) | GIF encoding | Verify — historically MIT | Check current repo before use |
| Stirling-PDF | Reference only, not a dependency | AGPL-3.0, server-side Java | **Do not import code. Reference for feature/UX ideas only.** |

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

## Practical rule for this project

Default assumption for any new dependency: **MIT, Apache-2.0, and BSD are safe. LGPL needs the
dynamic-linking condition verified. GPL and AGPL are a stop — do not add without an explicit
licensing decision (either paying for a commercial license, or finding/building an alternative).**
This isn't about being anti-copyleft in principle — it's that copyleft terms and "ad-supported
closed-source SaaS-lite" are a specific, well-known incompatibility, and this project is
squarely in the pattern that trips people up.
