# Kit-Bin: Free Browser-Based File Tools

Convert, compress, and edit files entirely in your browser. No uploads, no accounts, no file
size games — your files never leave your device.

**Live site**: https://kit-bin.com/

---

## What this is

A collection of single-purpose file conversion and processing tools (PDF, image, audio, video,
CSV/data) that run **100% client-side** using WebAssembly and native browser APIs. There is no
backend for the core tool set — no server ever receives a user's file, no database stores
anything, and hosting cost stays near-zero regardless of traffic because the visitor's own
device does the processing work.

Monetized via Adsterra display ads and an optional donation link, both placed to never gate the
actual file processing. Google AdSense is scaffolded and ready (publisher ID + `ads.txt`
already committed) but stays disabled — `ADSENSE_ENABLED = false` in
[`src/data/site-config.ts`](src/data/site-config.ts) — until the account is approved and the
remaining slot ID / CMP values are filled in; see [`docs/ADSENSE_SETUP.md`](docs/ADSENSE_SETUP.md).

## Why client-side

- **Privacy**: the file genuinely never leaves the device. This isn't a marketing claim — it's
  the architecture.
- **Cost**: no server compute, no storage, scales to any traffic volume on a static-hosting free
  tier.
- **Speed**: no upload/download round-trip for most operations.

The tradeoff: some operations (large video files, DOCX/PPTX ↔ PDF conversion, PDF password
removal — see Known Issues below) currently have no practical pure-browser solution and are
deliberately out of scope or deferred until a server-fallback tier is built — see
[`docs/ROADMAP.md`](docs/ROADMAP.md).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Astro (static output, no adapter — `output: "static"`, minimal per-page JS) |
| Styling | Tailwind CSS v4 (CSS-first config, `@theme` tokens in `global.css`) |
| Hosting / deploy | Cloudflare Worker (`toolkit`) serving `dist/` as static assets via `wrangler.jsonc` — Git-connected, auto-builds on every push to `main` (see Deployment below). Not Cloudflare Pages. |
| CI validation gate | Self-hosted GitLab CE, triggered by a GitHub webhook (see CI/CD Pipeline below) |
| Processing | Per-tool WASM/JS modules, lazy-loaded per page — see [`docs/TOOL_SPECS.md`](docs/TOOL_SPECS.md) for the library behind each tool |
| Analytics | Privacy-respecting, aggregate-only (Cloudflare Web Analytics) |

No database. No user accounts. No server-side storage of any kind for the core tool set.

## Getting started

```bash
git clone https://github.com/CodeCreatorManMike/Kit-Bin.git
cd Kit-Bin
npm install
npm run dev
```

Open `http://localhost:4321` (Astro default — confirm against `package.json` if it's been
changed).

```bash
npm run build          # static build → dist/
npm run preview        # preview the production build locally
npm run typecheck      # astro check
npm run adsense:check  # validates AdSense config once ADSENSE_ENABLED is flipped on
```

No lint script yet — add one (ESLint) when it's worth the setup cost, not before.

## Deployment

Production deployment is a **Cloudflare Worker** named `toolkit`, Git-connected directly to
this GitHub repo — **not Cloudflare Pages**. `wrangler.jsonc` at the repo root points
`assets.directory` at `dist/` and declares `build.command: "npm run build"`, so `wrangler
deploy` always builds fresh before serving, regardless of the dashboard's own build-command
setting.

- Every push to `main` triggers an automatic `npm run build` + `wrangler deploy` — no manual
  step required.
- Custom domain: `kit-bin.com`, attached to the Worker via Cloudflare's dashboard with
  automatic SSL.
- No Astro adapter is used or needed — this site has no SSR/dynamic routes and no bindings, so
  `@astrojs/cloudflare` (which unconditionally provisions Images + KV Sessions bindings) does
  not belong here. Do not reintroduce it.

## CI/CD Pipeline (validation gate — not the deployment mechanism)

In addition to Cloudflare Pages' own build-on-push, this repo is also validated by a
**self-hosted GitLab CE instance** running on a separate machine. This pipeline runs
`npm ci → astro check → astro build` against every push as an independent correctness check —
**it does not deploy anything**; Cloudflare Pages above is the actual deployment mechanism.

### Architecture

```
git push (GitHub)
     │
     ▼
GitHub webhook ──POST──▶ GitLab pipeline trigger API
                                │
                                ▼
                    GitLab Runner (Docker executor)
                                │
                                ▼
                  clones this repo fresh from GitHub
                  (using a scoped, masked GitHub PAT
                   stored as a GitLab CI/CD variable)
                                │
                                ▼
                  npm ci → astro check → astro build
                                │
                                ▼
                     deploy stage: manual, no-op
                    (stubbed — Cloudflare Pages is
                     the real deploy path, above)
```

GitLab itself is reachable at `https://gitlab.kit-bin.com` via a Cloudflare Tunnel — it isn't
mirrored/synced from GitHub automatically (this GitLab CE edition doesn't support repository
mirroring), so the pipeline clones the repo fresh from GitHub at the start of every run instead
of relying on a stale mirror.

### `.gitlab-ci.yml` (already committed to the GitLab project — reference copy)

```yaml
stages:
  - test
  - deploy

test:
  stage: test
  image: node:20
  script:
    - git clone https://${GITHUB_PAT}@github.com/CodeCreatorManMike/Kit-Bin.git repo
    - cd repo
    - npm ci
    - npx astro check
    - npx astro build

deploy:
  stage: deploy
  image: alpine:latest
  script:
    - echo "Deployment is handled by Cloudflare Pages, not this pipeline."
  when: manual
```

`GITHUB_PAT` is stored as a **masked** CI/CD variable in the GitLab project settings
(`Settings → CI/CD → Variables`) — never commit it, and never print it in pipeline logs.

### GitHub webhook configuration (repo → Settings → Webhooks)

| Field | Value |
|---|---|
| Payload URL | `https://gitlab.kit-bin.com/api/v4/projects/<PROJECT_ID>/trigger/pipeline?token=<TRIGGER_TOKEN>&ref=main` |
| Content type | `application/json` |
| Secret | (leave blank — GitLab's trigger endpoint doesn't use GitHub's signature; the token in the URL is the actual auth) |
| SSL verification | Enabled |
| Events | Just the push event |

Replace `<PROJECT_ID>` and `<TRIGGER_TOKEN>` with the real values from the GitLab project
(`Settings → CI/CD → Pipeline triggers`, and the project's main page for the ID) —
**never commit either value into this repo or paste them into a public issue/PR.** Rotate the
trigger token via that same settings page if it's ever been exposed (screenshot, shared log,
etc.) and update the webhook URL with the new one afterward.

### Verifying it's working

1. Push a commit to `main`.
2. Check `https://gitlab.kit-bin.com` → the Kit-Bin project → **CI/CD → Pipelines** — a new run
   should appear within seconds.
3. On GitHub: **Settings → Webhooks → (the webhook) → Recent Deliveries** shows whether GitHub's
   request succeeded (green) or failed (red, with GitLab's response for debugging).

## Project structure

```
/src
  /pages
    index.astro            # homepage
    /pdf/  /image/  /audio/ /video/  /data/  /dev/   # category hub + one .astro file per tool
    /csv/  /json/          # a few legacy tool routes predating the /data/ and /dev/ hubs
    /guides/                # explainer content layer — see docs/GUIDES.md
    privacy.astro / about.astro / contact.astro / terms.astro
  /components               # Sidebar, ToolWidget, AdsterraBanner, ConsentBanner, Footer, etc.
  /lib
    /pdf/ /image/ /audio/ /video/ /data/ /dev/   # one pure module per operation
    /ads/                   # Adsterra loader, consent, processing overlay, download gate
    ui.ts                   # shared drop-zone/processing/result state machine for every tool
  /data
    tools.ts                # single source of truth: title, keywords, related tools, schema
    toolIcons.ts             # hand-drawn SVG icon paths, keyed by tool slug
    faqs.ts / guides.ts / references.ts
    site-config.ts           # AdSense flags, Ko-fi URL, contact email, and other constants
/docs                        # full project documentation — see below
CLAUDE.md                    # Claude Code project context (short, points into /docs)
```

## Documentation

This repo's `/docs` folder is the source of truth for how and why the site is built the way it
is. Read the relevant file before making changes in that area:

| File | Covers |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Client/server processing split, tech stack rationale, repo layout |
| [`docs/TOOL_SPECS.md`](docs/TOOL_SPECS.md) | Every tool: library used, implementation approach, complexity |
| [`docs/OPEN_SOURCE_REPOS.md`](docs/OPEN_SOURCE_REPOS.md) | Vetted third-party repos, license findings, rejected options and why |
| [`docs/PAGE_LAYOUT.md`](docs/PAGE_LAYOUT.md) | Page templates, upload/processing/result UI states, ad placement rules |
| [`docs/COPY_GUIDELINES.md`](docs/COPY_GUIDELINES.md) | Voice, trust-signal wording, FAQ structure, meta tag templates |
| [`docs/SEO.md`](docs/SEO.md) | URL structure, schema markup, internal linking, content depth rules |
| [`docs/GUIDES.md`](docs/GUIDES.md) | The `/guides/` explainer content layer: routing, internal linking, schema, how to add a new guide |
| [`docs/LICENSING.md`](docs/LICENSING.md) | **Check before adding any dependency** — license compatibility table |
| [`docs/ADSENSE_SETUP.md`](docs/ADSENSE_SETUP.md) | The guarded AdSense integration: what's already in place, what's still needed, the dashboard checklist to go live |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Current phase, tool build order, what's explicitly out of scope |

Adsterra's own ad system (banners, the processing-state overlay, the pre-download countdown
gate) is implemented in `src/lib/ads/` and documented inline plus in the "Monetization
placement" section of `docs/PAGE_LAYOUT.md` — there is no separate `docs/MONETIZATION.md`.

## Current status

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the authoritative, up-to-date phase and tool list.
As of this writing:

- **Domain live**: `kit-bin.com`, SSL confirmed working, deployed and verified in production.
- **47 tools live** across PDF, Image, Audio, Video, Data, and Dev categories.
- **`/guides/` explainer content layer live** — hub page plus 16 guides, cross-linked from every
  relevant tool page, built to strengthen the AdSense editorial review (see `docs/GUIDES.md`).
- **Deployment**: Cloudflare Worker (`toolkit`), Git-connected to this repo, auto-deploys on
  push to `main` (see Deployment above — not Cloudflare Pages).
- **CI validation pipeline**: self-hosted GitLab CE configured and wired to a GitHub webhook
  (see CI/CD Pipeline above) — reachable at `https://gitlab.kit-bin.com`; re-confirm the webhook
  still fires on the next push if it hasn't been checked recently.
- **Monetization**: Adsterra ads (banners, processing-state, pre-download gate) are live and
  consent-gated; policy pages (Privacy, About, Contact, Terms) are live and up to date; the
  donation link (Ko-fi) is live in the footer; Google AdSense remains scaffolded but disabled
  pending account approval (see `docs/ADSENSE_SETUP.md`).

A per-tool progress checklist previously lived here as an HTML comment; it drifted out of sync
with reality repeatedly (undercounting tools, listing a defunct deploy target) and duplicated
`docs/ROADMAP.md`, which is the single source of truth for phase/tool status — check that file
instead of maintaining a second list here.

## Collaborators

Add a collaborator via **GitHub → repo → Settings → Collaborators and teams → Add people**,
inviting their own GitHub account by username/email — no shared logins, no personal
credentials handed over. Give **Write** access (not Admin) unless there's a specific reason to
grant more. Cloudflare Pages watches the repo itself, not who's pushing, so a collaborator's
commits trigger the same auto-build/deploy automatically once they're added — no separate
Cloudflare access is needed unless they also need to view build logs/manage the project
directly in the Cloudflare dashboard, in which case invite them there separately via
**Manage Account → Members**.

## Contributing / working conventions

- Branch naming: `tool/pdf-merge`, `fix/heic-decode-safari`, `seo/schema-markup`.
- A tool page isn't done until it has all four of: the working tool UI, on-page copy per
  `docs/COPY_GUIDELINES.md`, schema markup per `docs/SEO.md`, and a listing on its category hub
  page.
- **Check `docs/LICENSING.md` before adding any new dependency.** This project has already hit
  more than one copyleft trap during research (AGPL-licensed background-removal and PDF-
  compression libraries, and a same-purpose "squash" vs "squish" naming collision where one is
  AGPL and the other MIT) — verify license compatibility before importing anything new,
  especially for image/ML-adjacent features. Full research trail: `docs/OPEN_SOURCE_REPOS.md`.
- **Never commit secrets** — GitHub PATs, GitLab trigger tokens, Cloudflare tunnel tokens, or
  AdSense publisher IDs. All of these are handled as masked CI/CD variables or placeholder
  constants (see `docs/MONETIZATION_BUILD_TASKS.md`), never as literal values in tracked files.

## Explicitly out of scope

- Any YouTube, streaming, or social-media downloader/ripper functionality, in any form.
- User accounts, saved history, or persistent storage of anything a user uploads.
- DOCX/PPTX ↔ PDF conversion, until a server-fallback tier exists (Phase 3 — not currently
  planned unless traffic justifies the added hosting cost).

## License

[TBD — pick a license for your own code once decided; note that this does not cover the
third-party dependencies listed in `docs/LICENSING.md`, which retain their own licenses.]
