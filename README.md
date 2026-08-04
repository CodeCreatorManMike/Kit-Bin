# Kit-Bin — Free Browser-Based File Tools

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

Monetized via display ads (AdSense) and an optional donation link, both placed to never
interfere with the actual tool UI.

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
| Framework | Astro (static output, minimal per-page JS) |
| Styling | Tailwind CSS |
| Hosting / deploy | Cloudflare Pages, auto-deploys on every push to `main` (see Deployment below) |
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
npm run build      # static build → dist/
npm run preview    # preview the production build locally
npm run lint
npm run typecheck
```

## Deployment

Production deployment is **Cloudflare Pages**, connected directly to this GitHub repo:

- Every push to `main` triggers an automatic build (`npm run build` → `dist/`) and deploy —
  no manual step required.
- Every pull request gets its own unique preview URL automatically.
- Custom domain: `kit-bin.com`, attached via Cloudflare's dashboard with automatic SSL.
- Full manual setup steps (for a fresh environment, or a new collaborator's reference):
  [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) and [`docs/SETUP_CHECKLIST.md`](docs/SETUP_CHECKLIST.md).

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
    index.astro          # homepage
    /pdf/                 # category hub + one .astro file per tool
    /image/
    /audio/
    /video/
    /csv/
    /guides/               # explainer content layer — see docs/GUIDES.md
    privacy.astro / about.astro / contact.astro / terms.astro
  /components             # UploadZone, ProcessingState, ResultDownload, AdUnit, etc.
  /lib
    /pdf/  /image/  /audio/  /video/   # one pure module per operation
  /data
    tool-metadata.ts       # single source of truth: title, keywords, related tools, schema
    site-config.ts          # KOFI_URL and other project-wide constants
/docs                      # full project documentation — see below
CLAUDE.md                  # Claude Code project context (short, points into /docs)
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
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Hosting, domain, deploy pipeline, launch checklist, cost breakdown |
| [`docs/SETUP_CHECKLIST.md`](docs/SETUP_CHECKLIST.md) | The literal step-by-step account setup checklist |
| [`docs/MONETIZATION.md`](docs/MONETIZATION.md) | AdSense implementation detail (ads.txt, ad unit placement) and the donation link setup |
| [`docs/MONETIZATION_BUILD_TASKS.md`](docs/MONETIZATION_BUILD_TASKS.md) | Direct build instructions for Claude Code: policy pages, donation link, AdSense scaffolding |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Current phase, tool build order, what's explicitly out of scope |

## Current status

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the authoritative, up-to-date phase and tool list.
As of this writing:

- **Domain live**: `kit-bin.com`, SSL confirmed working.
- **27 of ~28 planned tools built and verified locally.**
- **`/guides/` explainer content layer live** — hub page plus six guides, cross-linked from every
  relevant tool page, built to strengthen the AdSense editorial review (see `docs/GUIDES.md`).
- **Deployment**: Cloudflare Pages connected to this repo, auto-deploy on push to `main`.
- **CI validation pipeline**: self-hosted GitLab CE configured and wired to a GitHub webhook
  (see CI/CD Pipeline above) — confirm the webhook fires successfully on the next push if it
  hasn't been end-to-end verified since the most recent Cloudflare Tunnel/domain changes.
- **Monetization**: policy pages (Privacy, About, Contact, Terms) required before AdSense
  application — confirm all four are live; donation link (Ko-fi) pending the actual page URL
  being created and handed off for footer placement; AdSense not yet applied for.

<!--
Progress checklist — update as tools ship. Keep in sync with docs/ROADMAP.md.

PDF:
- [x] /pdf/merge, /pdf/split, /pdf/compress, /pdf/rotate, /pdf/watermark, /pdf/to-images,
  /pdf/reorder-pages
- [ ] /pdf/unlock — attempted, pulled (qpdf-wasm needs COOP/COEP + broken worker resolution
  under Vite; see docs/TOOL_SPECS.md and docs/OPEN_SOURCE_REPOS.md for the qpdf-wasm maintainer
  caveat — this may just need a different qpdf-wasm fork/version, revisit before writing this
  off as unsolvable)

Image:
- [x] /image/heic-to-jpg, /image/compress, /image/resize, /image/webp-to-png,
  /image/png-to-webp, /image/svg-to-png, /image/crop
- [ ] /image/background-remove — Phase 3, not started (AGPL trap already documented, use an
  Apache-2.0 model directly via onnxruntime-web when this is picked up)

Audio:
- [x] /audio/mp3-to-wav, /audio/wav-to-mp3, /audio/trim, /audio/merge, /audio/volume-normalize

Video:
- [x] /video/mp4-to-webm, /video/compress, /video/trim, /video/mute, /video/extract-audio,
  /video/gif-from-video

Data:
- [x] /csv/to-json, /json/to-csv, /csv/to-excel, /data/csv-cleaner

Site/infra:
- [x] Homepage + category hubs live (PDF, Image, Audio, Video, Data)
- [x] /guides/ content layer (hub + 6 guides) live, cross-linked from tool pages
- [x] Deployed to Cloudflare Pages, custom domain attached
- [x] Self-hosted GitLab CI validation pipeline configured (webhook + trigger)
- [ ] Confirm CI pipeline fires successfully post-domain-change
- [ ] Policy pages (Privacy/About/Contact/Terms) confirmed live
- [ ] Ko-fi donation link created and placed in footer
- [ ] Search Console connected
- [ ] AdSense applied for / approved
-->

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
