# SEO Analytics Automation

Automated daily SEO data collection, storage, and agent-driven optimization.

## Architecture

```
Daily (NUC i3 cron)
  ↓
collector.mjs    ← Fetch Google Search Console & Analytics
  ↓
uploader.mjs     ← Insert into Supabase
  ↓
Supabase DB      ← REST API queryable
  ↓
Agents query     ← Analyze & recommend improvements
  ↓
Update ROADMAP   ← Drive content strategy
```

## Setup

### 1. Database Schema

Go to [Supabase SQL Editor](https://app.supabase.com/project/nffabbvnhttlaernhmpq/sql/new) and run:

```bash
node seo/scripts/setup-db.mjs
```

Or copy/paste this SQL:

```sql
-- Daily aggregated metrics
create table if not exists seo_daily_summary (
  id bigint primary key generated always as identity,
  date date unique not null default current_date,
  total_clicks bigint default 0,
  total_impressions bigint default 0,
  avg_ctr float8,
  avg_position float8,
  top_queries jsonb,
  top_pages jsonb,
  alerts jsonb default '[]'::jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Raw data for detailed analysis
create table if not exists seo_analytics_raw (
  id bigint primary key generated always as identity,
  date date not null default current_date,
  data_type text not null,
  raw_data jsonb not null,
  created_at timestamp default now()
);

-- AI-generated recommendations
create table if not exists seo_content_recommendations (
  id bigint primary key generated always as identity,
  date date not null,
  recommendation_type text,
  query text,
  current_rank int,
  target_rank int,
  estimated_clicks int,
  priority text default 'medium',
  implementation_status text default 'pending',
  metadata jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Indexes
create index if not exists idx_seo_daily_date on seo_daily_summary(date desc);
create index if not exists idx_analytics_date on seo_analytics_raw(date desc);
create index if not exists idx_recommendations_status on seo_content_recommendations(implementation_status);
```

### 2. Environment Setup

Your `.env.local` already has credentials. Verify:

```bash
cat .env.local | grep SUPABASE
```

Should show:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_DB_URL`

## Usage

### Manual Collection

```bash
# 1. Collect data from Google
node seo/scripts/collector.mjs
# (First time: authorize Google, then auto-cached)

# 2. Upload to Supabase
node seo/scripts/uploader.mjs
```

Or both at once:

```bash
npm run seo:collect-and-upload
```

### Query Data

```bash
# See examples
node seo/scripts/query-example.mjs
```

Output shows:
- Today's metrics (clicks, impressions, CTR, position)
- Last 7 days trend
- Top queries all-time
- Site health checks
- Pending recommendations

## Automation (Next Step: NUC)

On your NUC i3, add cron job:

```bash
crontab -e

# Add line: Run daily at 3 AM UTC
0 3 * * * cd /path/to/Kit-Bin && npm run seo:collect-and-upload >> /var/log/seo.log 2>&1
```

## Agent Integration

Agents query the REST API:

```javascript
// Agent code (runs anywhere)
const { data } = await supabase
  .from('seo_daily_summary')
  .select('*')
  .gte('date', '2026-08-01')
  .order('date', { ascending: false });

// Analyze trends
const topQueries = data.flatMap(day => day.top_queries);
const trending = identifyRisers(topQueries);
const gaps = findContentGaps(trending);

// Insert recommendations
await supabase.from('seo_content_recommendations').insert(gaps);
```

## Files

| File | Purpose |
|------|---------|
| `scripts/collector.mjs` | Fetch Google Search Console + Analytics |
| `scripts/uploader.mjs` | Insert data into Supabase |
| `scripts/setup-db.mjs` | Initialize database schema |
| `scripts/query-example.mjs` | Show agent query patterns |
| `data/` | Local cache of collected data |
| `.tokens/` | Google OAuth tokens (gitignored) |

## Database Tables

### seo_daily_summary
Daily aggregated metrics. Agents query this most.

```json
{
  "date": "2026-08-13",
  "total_clicks": 1234,
  "total_impressions": 45678,
  "avg_ctr": 2.7,
  "avg_position": 12.5,
  "top_queries": [...],
  "top_pages": [...],
  "alerts": []
}
```

### seo_analytics_raw
Detailed raw data (Search Console rows, performance checks).

### seo_content_recommendations
AI-generated recommendations for content improvements.

```json
{
  "query": "best pdf merger",
  "recommendation_type": "gap",
  "current_rank": 45,
  "target_rank": 5,
  "estimated_clicks": 150,
  "priority": "high",
  "implementation_status": "pending"
}
```

## Credentials

Never commit:
- `.env.local` (contains secrets)
- `.tokens/` (contains Google auth)
- `seo/data/*.json` (collected from production)

All are in `.gitignore`. Safe to push all scripts.

## Troubleshooting

**"SUPABASE_URL not in .env.local"**
```bash
# Verify credentials
cat .env.local
```

**No data from Google**
- First run: Visit auth URL, paste code
- Subsequent: Uses cached token
- Token expires: Delete `.tokens/google-auth-token.json`, re-auth

**Upload fails**
- Check Supabase status: https://www.supabase.co/
- Verify API key not expired
- Check table exists: `SELECT * FROM seo_daily_summary;`

## Next Steps

1. ✅ Database set up (you'll do this)
2. ✅ Scripts committed (doing now)
3. ⏳ Test on your machine: `npm run seo:collect-and-upload`
4. ⏳ Set cron on NUC
5. ⏳ Build agent processors
6. ⏳ Auto-update ROADMAP from data
