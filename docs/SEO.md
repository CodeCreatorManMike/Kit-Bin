# SEO Structure

## Why this category is worth building into in 2026

Google's AI Overviews are aggressively compressing organic traffic for informational queries —
independent studies place the CTR hit anywhere from 15% to 89% depending on query type and
industry, with some sectors losing 40-70% of organic traffic year over year. Critically, this
damage concentrates on *informational* queries (definitions, explanations, "best X" lists) —
Google's own systems currently can't replicate an interactive tool inline in a summary box.
Transactional and navigational queries — which is what "merge pdf" or "webp to png converter"
actually are — are comparatively insulated, and low-CPC, short, task-shaped queries trigger AI
Overviews at meaningfully lower rates than the average query. This is the entire strategic bet
behind building utility tools right now rather than a content/blog site: the query type this
project targets is structurally one of the more AI-Overview-resistant categories in search.

This does not mean SEO is easy or automatic here — it means the *ceiling* on this model hasn't
been cut the way blog-style content has. Execution (below) still has to be right.

## URL structure

- **One URL per tool, keyword-matched to search intent exactly**: `/pdf/merge`,
  `/image/heic-to-jpg`. Never `/tools?type=heic` or a single page with a mode switcher — Google
  ranks specific-intent pages far better than parameterized/generic ones, and a dedicated URL is
  also what makes a page linkable and shareable on its own.
- **Category hub pages** at `/pdf/`, `/image/`, etc. — these exist for internal linking and to
  establish topical authority (a site with 8 well-built PDF tools under one hub reads as more
  authoritative to Google than 8 isolated pages with no category structure), not as a page meant
  to independently rank for a specific transactional query.
- **No deep nesting.** `/pdf/merge`, not `/tools/pdf/documents/merge`. Every tool should be at
  most one directory level under its category.

## Schema markup

Use `SoftwareApplication` structured data (JSON-LD) on every individual tool page. Minimum
fields: `name`, `applicationCategory` (e.g. "Utility"), `operatingSystem` ("Any" / "Web"),
`offers` (price: 0, priceCurrency), and `aggregateRating` **only if you have genuine user rating
data — do not fabricate ratings**, this is a real Google policy violation risk, not just an
ethics one. This structured data is what makes a tool page eligible for rich-result treatment
(star ratings, price, category) directly in search results.

Add `FAQPage` schema wrapping the genuine FAQ block described in `COPY_GUIDELINES.md` — this is
a second, independent path to rich-result eligibility and reuses content you're already writing
for users, not additional content created solely for schema's sake.

## Internal linking

- Every tool page links to 3-4 related tools in a "Related tools" section (see
  `PAGE_LAYOUT.md`). Link logically adjacent operations (merge → split → compress, all within
  PDF) not just same-category-random.
- Every category hub links to every tool in that category, and every tool page links back to
  its hub.
- Homepage links to every category hub plus a "popular tools" shortcut row to the highest-
  traffic individual tools directly (see `PAGE_LAYOUT.md`).
- This internal linking mesh matters more here than on a typical content site because there's no
  blog/content layer generating natural backlinks or link equity — the site has to distribute
  whatever authority it earns entirely through its own structure.

## Content depth per page

150-300 unique words per tool page (see `COPY_GUIDELINES.md` for exact structure) — enough to
avoid being flagged as thin/doorway content, deliberately not more. Padding a utility page with
800+ words of generic "why you might need to convert files" content is now actively
counterproductive: it reads as SEO filler to users, and it's exactly the kind of purely
informational text that's most exposed to being summarized directly in a search AI Overview
rather than driving a click through to the actual tool.

## The `/guides/` content layer

A separate set of longer-form explainer pages at `/guides/` exists specifically to support the
AdSense editorial review — tool-only pages read as thin templates to a reviewer even when the
tool works fine. Guides are not padding for tool pages (those stay at 150-300 words per above)
and they're not a blog: each one demonstrates specific technical depth about a format/mechanism
that a generic AI-written post couldn't produce. See `docs/GUIDES.md` for routing, the internal
linking rules (the trust-signal line on every tool page links to `/guides/how-kit-bin-works`,
which is the single highest-value link in this layer), and schema (`Article`, not `FAQPage`).

## Programmatic scaling — deliberately sequenced, not immediate

Format-pair combinatorics (webp→png, png→webp, jpg→webp, jpg→png...) can multiply page count
3-4x cheaply once the core catalog is live and indexed. **Do not do this at launch.** A brand-new
domain publishing dozens of templated pages simultaneously, with no existing trust/authority
signal, is a well-documented pattern Google's spam systems specifically target. Sequence:
Phase 1 tools live and indexed first → observe which get organic traction → only then expand
combinatorially into the formats/pairs actual Search Console data shows demand for.

## What to track from day one

- Google Search Console, connected before or immediately at launch — not after "waiting to see
  if it's worth it." Impressions-without-clicks on a given tool page is the specific signal that
  an AI Overview may be intercepting that query; this is diagnosable and actionable (see the
  AI-Overview-resistance argument above — if a supposedly "transactional" tool page is showing
  this pattern, something about that specific query may behave more informationally than
  expected, worth investigating per-query rather than assuming the whole category is safe).
- Direct/repeat traffic share, not just organic — this is real insurance against search-algorithm
  volatility of any kind (AI Overviews or otherwise) and is influenced directly by whether people
  actually had a good experience last time, which loops back to `PAGE_LAYOUT.md` and
  `COPY_GUIDELINES.md` mattering for retention, not just first-visit conversion.
