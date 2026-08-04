# Guides Section

## Why this section exists

AdSense approval is fundamentally an editorial quality review. Tool-only pages give reviewers
very little to evaluate — pages that are mostly UI with no supporting content read as thin
templates even when the tool itself works fine. `/guides/` is a small set of pages that
demonstrate real, specific expertise about the problems the tools solve, kept as a separate
content layer from the tool pages themselves — the tool pages stay short per `SEO.md`, this is
not an excuse to pad those.

Every guide has to pass one test before it's written: could a generic AI-written blog post say
the same thing, or does it require actually knowing how the underlying format/mechanism works?
No padding for its own sake.

## Routing

```
/src/pages/guides/
  index.astro                    # hub page — /guides/
  how-kit-bin-works.astro
  heic-explained.astro
  why-pdfs-get-large.astro
  webp-vs-png-jpg.astro
  why-audio-sounds-quiet.astro
  mp4-vs-webm.astro
```

Guide metadata (title, card title, description) lives in `src/data/guides.ts` — the same
pattern as `src/data/tools.ts`. Icons are hand-drawn SVG in `src/data/toolIcons.ts` under the
`/guides/<slug>` key and the `guides` category color, rendered by the existing `ToolIcon.astro`
— add both a `guides.ts` entry and a `toolIcons.ts` entry for any new guide.

## Internal linking rules (this is most of the SEO value — do not skip)

- Every guide links to the specific tool(s) it's relevant to, inline, at the point in the text
  where the tool is mentioned — not just a generic box at the bottom.
- Every tool page relevant to a guide links back to it with a short line near the FAQ block
  (e.g. `/image/heic-to-jpg` → "Want to understand why iPhone photos use this format in the
  first place? Read the guide" → `/guides/heic-explained`).
- Every tool page's trust-signal line ("Processed entirely in your browser...") links the whole
  phrase to `/guides/how-kit-bin-works` — the single highest-value internal link in this section,
  since it appears on every tool page and turns a trust *claim* into a trust *explanation* one
  click away.
- `/guides/` links to every guide; every guide links back to `/guides/`.
- The homepage has a "Guides" section near the bottom (above the footer), and the sidebar/footer
  nav both link to `/guides/`.

## Schema markup

`Article` schema (JSON-LD), inline in each guide page — `headline`, `datePublished`, `author`
(`Organization`, name only, no personal byline), `description`. Not `FAQPage` — that schema is
reserved for the tool pages' Q&A blocks per `SEO.md`.

## Adding a new guide

1. Add an entry to `src/data/guides.ts` (slug, title, cardTitle, description).
2. Add a hand-drawn icon entry to `src/data/toolIcons.ts` under the same slug.
3. Create `src/pages/guides/<slug>.astro` — meta title/description, `Article` JSON-LD, body
   copy that passes the "could a generic AI blog post say this" test, inline links to the
   relevant tool(s) and back to `/guides/`.
4. Add the tool-page cross-link(s) described above for every tool the guide references.

Note: this project doesn't have a sitemap integration configured yet (no `@astrojs/sitemap` in
`package.json`/`astro.config.mjs`) — new guide routes are discoverable via internal links only
until one is added.
