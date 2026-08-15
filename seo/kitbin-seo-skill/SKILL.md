---
name: kitbin-seo
description: Use for evidence-driven Kit-Bin SEO automation.
---
# Kit-Bin SEO

Improve organic search performance using measured Search Console evidence and people-first useful content. A no-change run is valid. Never optimize for keyword density or fabricate claims.

## Workflow

1. Verify fresh finalized data and latest successful ingestion. If stale, record a skipped run and make no edit.
2. Run `seo_evaluate.py`, then `seo_context.py`; review recent runs, experiments, and 14-day page cooldowns.
3. Prefer one high-confidence page; never exceed `KITBIN_SEO_MAX_PAGES` (default 3).
4. Inspect current source and repository status. Skip or use an isolated worktree if unrelated human changes exist.
5. Capture URL, source files, title, description, headings, evidence, reason, and expected outcome.
6. Make the smallest useful intervention. Validate with the repository's actual typecheck, tests, and build.
7. Inspect `git diff --check`, `git diff --stat`, and the full diff. Reject changes touching auth, billing, server config, migrations, ads, analytics, security, legal, robots, canonical strategy, URLs, routes, or core tool behavior.
8. Commit descriptively with evidence and run ID. Deploy only through the discovered existing workflow, verify the live URL, then record exact before/after evidence and commit in Supabase.
9. Finish `seo_runs` consistently as `success_changed`, `success_no_change`, `failed_analysis`, `failed_validation`, or `failed_deploy`.

Run the committed helpers through the normal terminal, including `seo_record_run.py no-change`; unattended cron must not use `execute_code`. `seo_context.py` emits compact candidate context by default; never request `--full` in an LLM run.

## Allowed

Improve titles/descriptions, headings, visible explanatory copy, useful examples/FAQs, internal links/anchors, related-tool links, alt text, semantic structure, accurate schema reflecting visible content, and relevant intent coverage.

## Forbidden

Never delete pages/content because traffic is low; remove tools; change URLs/routes, auth, payments, ads, analytics, user-data handling, legal/privacy documents, core functionality, robots.txt, canonicals, DNS, or sitemap architecture. Never fabricate reviews, statistics, authors, expertise, hidden text, doorway pages, keyword stuffing, or near-duplicate mass pages.
