# Kit-Bin Search Console collector and SEO feedback loop

This directory implements the private collector and analysis tooling for the flow Search Console → Supabase → Hermes → Git/Cloudflare deployment → experiment evaluation. The runnable NUC path is `/home/moodymanmike/opt/kitbin-seo`, a symlink to this Git-controlled directory. Search Analytics is not an unlimited raw export: Google may omit anonymized and low-volume rows.

## Setup and authentication

Use Python 3.13 and the committed pinned `requirements.txt`. Runtime secrets belong only in `.env` (mode 0600); Google Desktop OAuth credentials and refresh credentials belong in `credentials.json` and `token.json` (mode 0600). All three are ignored. The only Google scope is `webmasters.readonly`.

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python auth_google.py
.venv/bin/python verify_gsc.py
.venv/bin/python verify_supabase.py
```

The supplied OAuth JSON must have an `installed` root. Web-client credentials are rejected deliberately.

## Collector and checks

```bash
.venv/bin/python collector.py --days 10
.venv/bin/python collector.py --days 90
.venv/bin/python collector.py --date 2026-08-01
.venv/bin/python collector.py --days 10 --dry-run
.venv/bin/python healthcheck.py
.venv/bin/pytest -q tests
```

The rolling default re-fetches ten finalized days, paginates in 25,000-row pages, hashes property/type/date/query/page/country/device into a deterministic SHA-256 primary key, and batch-upserts 500 rows with retry/backoff. Runs are recorded in `gsc_ingest_runs`; raw history is stored in `gsc_daily`. Agent runs and experiments use `seo_runs` and `seo_changes`.

## Automation and logs

The source units are in `systemd/`; installed user units are in `~/.config/systemd/user/`. The timer uses an explicit Europe/London calendar, runs around 04:00, and is persistent. Once Google OAuth passes:

```bash
systemctl --user enable --now kitbin-gsc.timer
systemctl --user start kitbin-gsc.service
systemctl --user status kitbin-gsc.service kitbin-gsc.timer
systemctl --user list-timers kitbin-gsc.timer
journalctl --user -u kitbin-gsc.service
```

Emergency stop: `systemctl --user disable --now kitbin-gsc.timer`.

## Hermes

Hermes runs in Hostinger Docker project `hermes-agent-ffk6`. Its permanent `kitbin-seo` skill enforces evidence, cooldown, limited scope, validation, Git safety, and Supabase logging. The `kitbin-daily-seo` cron is pinned to the currently configured model and remains paused until the real-data dry run and controlled deployment pass.

Inspect/pause through the Hermes dashboard, or use the installed CLI syntax when shell access exists: `hermes cron list` and `hermes cron pause kitbin-daily-seo`. Do not resume until Google backfill and end-to-end acceptance pass.

## Analysis and experiments

`seo_context.py` produces 7/previous-7 and 28/previous-28 windows, impression-weighted positions, opportunity classes, recent run history, and 14-day cooldown exclusions without dumping the raw database. `seo_evaluate.py` records due 7/28-day correlated before/after measurements and explicitly avoids causal claims. `seo_record_run.py` and `seo_record_change.py` provide safe experiment logging primitives.

## Site validation and deployment

The actual repository gate is:

```bash
npm ci --ignore-scripts
npx patch-package
npm run typecheck
npm run test
npm run build
git diff --check
```

Production is the existing Git-connected Cloudflare Worker. Pushes to `main` deploy automatically. Do not invent a Hostinger deployment. Roll back a bad isolated SEO commit with `git revert <sha>`, validate, and push; mark the experiment rolled back in Supabase.

## Disable and restore

NUC stop: `systemctl --user disable --now kitbin-gsc.timer`. Re-enable: `systemctl --user enable --now kitbin-gsc.timer`. Hermes stop: pause `kitbin-daily-seo`; resume only after verifying fresh ingestion. Logs are in the systemd journal and Hermes run logs. Never commit `.env`, OAuth JSON/tokens, SSH keys, or collected query exports.
