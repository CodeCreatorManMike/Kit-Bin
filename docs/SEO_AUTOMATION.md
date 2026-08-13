# SEO Analytics Automation

Automated collection and analysis of SEO metrics from Google Search Console, Analytics, and site performance.

## Setup

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs:
   - Google Search Console API
   - Google Analytics Reporting API
4. Create OAuth 2.0 Client ID (type: Desktop)
5. Download the JSON credentials

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and paste your credentials:
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_REDIRECT_URI=https://kit-bin.com
GA_VIEW_ID=000000000  # Optional
```

**Never commit `.env.local`** — it's in `.gitignore` to protect credentials.

### 3. First Run

```bash
npm run seo:collect
```

On first run, you'll be prompted to visit a Google authorization URL. Open it, approve access, and paste the returned code back into the terminal.

The auth token is saved to `.tokens/google-auth-token.json` (also gitignored).

## Usage

### Collect All Data

```bash
npm run seo:collect
```

Fetches:
- **Search Console**: Top queries, CTR, positions, devices, countries (30-day window)
- **Analytics**: Sessions, pageviews, bounce rate, avg duration by page/device
- **Performance**: Sitemap, robots.txt, ads.txt accessibility checks

Output saved to `data/analytics/`:
- `search-console.json` — Raw Search Console data
- `analytics.json` — Raw Analytics data
- `performance.json` — Site health checks
- `report.json` — Summary & alerts

### View Latest Report

```bash
npm run seo:report
```

Prints the summary report to console.

## Automation

### Daily Collection (cron)

Add to your server's crontab:

```bash
# Every day at 2 AM UTC
0 2 * * * cd /path/to/kit-bin && npm run seo:collect
```

Or use GitHub Actions (add `.github/workflows/seo-collect.yml`):

```yaml
name: SEO Data Collection

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - run: npm ci
      - run: npm run seo:collect
        env:
          GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
          GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
          GOOGLE_PROJECT_ID: ${{ secrets.GOOGLE_PROJECT_ID }}
          GOOGLE_REDIRECT_URI: https://kit-bin.com
```

## Agent Processing

The collected data flows to agents for analysis:

1. **Trend Analysis** — Identify rising/falling queries
2. **Content Gaps** — Find high-volume, low-ranking queries to target
3. **Performance Audit** — Check health metrics, suggest fixes
4. **Optimization Loop** — Generate content recommendations

Example agent workflow:

```bash
# Analyze search trends
node scripts/agent-seo-analyzer.mjs data/analytics/search-console.json

# Generate content recommendations
node scripts/agent-content-recommender.mjs data/analytics/report.json

# Update SEO priorities
node scripts/agent-roadmap-updater.mjs data/analytics/search-console.json
```

## Troubleshooting

**Error: `.env.local not found`**
```bash
cp .env.example .env.local
# Edit with your credentials
```

**Error: Invalid credentials**
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in `.env.local`
- Regenerate credentials if needed in Google Cloud Console

**Error: Socket hang up during npm install**
- Delete `.tokens/google-auth-token.json` and try again
- This clears cached auth and forces re-authentication

**No Analytics data (optional)**
- GA_VIEW_ID is required for Analytics API
- Find it in Google Analytics Admin > View Settings

## Files

- `.env.local` — Your credentials (gitignored, not committed)
- `.env.example` — Template for new setup
- `.tokens/` — Auth tokens (gitignored, not committed)
- `data/analytics/` — Collected data (JSON exports)
- `scripts/seo-analytics-collector.mjs` — Main collector script

## Next Steps

1. ✅ Set up credentials
2. ✅ Run first collection: `npm run seo:collect`
3. ⏳ Build agent processors
4. ⏳ Wire into CI/CD for daily runs
5. ⏳ Create dashboard from collected data
