# Copy Guidelines

## Voice

Plain, direct, competent — the register of a well-written internal tool, not marketing copy.
The audience is someone who searched a specific task ("merge pdf online") and wants to complete
it in under 30 seconds. Every sentence on a tool page should either help them do that or build
trust that the tool is safe to use. Nothing else earns space on the page.

- No exclamation points in body copy.
- No "unlock the power of," "revolutionize," "seamless experience"-style filler. If a sentence
  would sound at home in a SaaS landing page hero, cut it.
- Short sentences. This is a utility, not an essay.

## The trust/privacy line — exact wording pattern

This is the single most important recurring piece of copy on the site, because it's both the
genuine differentiator and the direct answer to the reputational baggage this entire category
carries (aggressive pop-ups, fake download buttons, and unclear data handling are widely
documented complaints about mainstream converter sites).

Use a consistent, factual version of this line near the upload zone on every tool page:

> 🔒 Processed entirely in your browser. Your file is never uploaded to a server.

Do not embellish this ("military-grade," "100% guaranteed private") — the claim is true and
specific as written; oversell it and it starts reading like the same marketing noise the line
is trying to distinguish itself from. If a given tool *does* require server processing (Phase 3
tools only), the honest equivalent is:

> This tool processes your file on our server. It's deleted immediately after conversion and
> never stored. [Link: how this works / privacy policy]

Never use the client-side wording on a tool that actually uses a server fallback, even
occasionally (e.g. large-file routing) — say so explicitly when it applies.

## Per-tool content block (the 150-300 word section below the tool UI)

Structure, in order:
1. **One sentence, plain restatement of what the tool does.** ("This tool merges multiple PDF
   files into a single PDF, in the order you arrange them.")
2. **2-3 sentences on how to use it**, phrased as simple steps, not prose ("Drop your files
   above, drag to reorder if needed, then click Merge.").
3. **A genuine FAQ, 3-5 questions.** Real questions people would actually ask, not
   keyword-stuffed variations of the title. Good FAQ candidates: file size/format limits, "is
   my file safe / does it get uploaded," "does this work on mobile," "will formatting/quality
   be affected." Bad FAQ candidates: anything that's just the title reworded as a question with
   no new information in the answer.

This block exists for two reasons: (a) genuinely orients a first-time user, (b) gives Google
enough unique, useful text per page to index meaningfully — but keep it short and specific.
Long, padded content on a utility page reads as SEO filler to users and is exactly the kind of
informational content most exposed to being summarized away in AI Overviews rather than driving
a click — the tool itself, not the surrounding prose, is what's actually defensible here.

## Meta title / description templates

- **Title**: `{Primary action} {File type} — Free & {Key differentiator} | {Site name}`
  e.g. "Merge PDF Files Online — Free & No Upload Required | [Site]"
- **Description**: one sentence stating the action + outcome, one sentence on the privacy
  angle. ~150-160 characters.
  e.g. "Combine multiple PDFs into one file in seconds. Runs entirely in your browser — your
  files are never uploaded to a server."

Keep title/description honest and specific to what the page actually does — don't reuse a
generic template verbatim across every tool page with just the noun swapped; Google and users
both discount pages that read as templated with zero unique signal.

## Error and edge-case messaging

- Wrong file type: name the expected type explicitly. "This tool needs a PDF file" not "Invalid
  file."
- File too large / needs server fallback: state the limit and why, don't just block silently.
  "Files over 50MB need server processing, which isn't available for this tool yet."
- Processing failure: apologize briefly, suggest a concrete next step (try a smaller file,
  try a different format), and — if you're logging errors — say so ("We've logged this issue").
  Never leave a user at a dead end with no suggested action.

## What never appears anywhere on the site

- Fake or decoy download/continue buttons.
- Countdown timers, "only X people can convert right now," or other artificial urgency —
  irrelevant to a free utility tool and actively damages trust.
- Any copy implying the tool downloads or extracts content from a third-party platform
  (YouTube, Spotify, streaming services, etc.) — this project only processes files the user
  already has.
