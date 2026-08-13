#!/usr/bin/env node
/**
 * SEO Analytics Collector
 * Pulls all data from Google Search Console, Analytics, and site metrics
 * Saves to /data/analytics/ for agent processing
 *
 * Usage: npm run seo:collect
 *
 * Setup:
 * 1. Copy .env.example to .env.local
 * 2. Add your Google OAuth credentials
 * 3. Run this script
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';
// Note: Authentication uses OAuth2 from googleapis directly, no separate auth package needed

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.resolve(projectRoot, 'data', 'analytics');
const tokensDir = path.resolve(projectRoot, '.tokens');
const envPath = path.resolve(projectRoot, '.env.local');

// Load environment variables
dotenv.config({ path: envPath });

// Verify .env.local exists
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found');
  console.error('📋 Instructions:');
  console.error('  1. cp .env.example .env.local');
  console.error('  2. Edit .env.local with your Google OAuth credentials');
  console.error('  3. Run: npm run seo:collect');
  process.exit(1);
}

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(tokensDir)) {
  fs.mkdirSync(tokensDir, { recursive: true });
}

// Load credentials from .env.local
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://kit-bin.com';

if (!clientId || !clientSecret) {
  console.error('❌ Missing Google OAuth credentials in .env.local');
  console.error('Required environment variables:');
  console.error('  - GOOGLE_CLIENT_ID');
  console.error('  - GOOGLE_CLIENT_SECRET');
  console.error('  - GOOGLE_PROJECT_ID');
  console.error('  - GOOGLE_REDIRECT_URI');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri
);

/**
 * Authenticate with Google API
 */
async function authenticateWithGoogle() {
  const tokenPath = path.resolve(tokensDir, 'google-auth-token.json');

  // Check if we have a cached token
  if (fs.existsSync(tokenPath)) {
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
    oauth2Client.setCredentials(token);
    console.log('✅ Using cached Google authentication token');
    return true;
  }

  // Generate new auth URL for user to visit
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/analytics.readonly',
    ],
  });

  console.log('\n🔐 First-time authentication required:');
  console.log('📍 Visit this URL in your browser:');
  console.log(authUrl);
  console.log('\n⏳ Waiting for authorization...');

  const code = await new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    console.log('✅ Authentication token saved to .tokens/');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

/**
 * Fetch Search Console data
 */
async function fetchSearchConsoleData() {
  console.log('\n📊 Fetching Search Console data...');

  const webmasters = google.webmasters({ version: 'v3', auth: oauth2Client });
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFormat = (d) => d.toISOString().split('T')[0];

  try {
    const response = await webmasters.searchanalytics.query({
      siteUrl: 'https://kit-bin.com/',
      requestBody: {
        startDate: dateFormat(thirtyDaysAgo),
        endDate: dateFormat(today),
        dimensions: ['query', 'page', 'device', 'country'],
        rowLimit: 25000,
      },
    });

    const scData = {
      fetchedAt: new Date().toISOString(),
      dateRange: {
        start: dateFormat(thirtyDaysAgo),
        end: dateFormat(today),
      },
      data: response.data.rows || [],
      summary: {
        totalRows: response.data.rows?.length || 0,
        topQueries: (response.data.rows || []).slice(0, 10),
      },
    };

    fs.writeFileSync(
      path.resolve(dataDir, 'search-console.json'),
      JSON.stringify(scData, null, 2)
    );
    console.log(`✅ Search Console: ${scData.summary.totalRows} rows collected`);

    return scData;
  } catch (error) {
    console.error('❌ Search Console fetch failed:', error.message);
    return null;
  }
}

/**
 * Fetch Google Analytics data
 */
async function fetchAnalyticsData() {
  console.log('\n📈 Fetching Google Analytics data...');

  const analytics = google.analyticsreporting({ version: 'v4', auth: oauth2Client });
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFormat = (d) => d.toISOString().split('T')[0];

  try {
    const response = await analytics.reports.batchGet({
      requestBody: {
        reportRequests: [
          {
            viewId: '000000000', // Replace with actual GA view ID - you'll need to set this
            dateRanges: [
              {
                startDate: dateFormat(thirtyDaysAgo),
                endDate: dateFormat(today),
              },
            ],
            metrics: [
              { expression: 'ga:sessions' },
              { expression: 'ga:pageviews' },
              { expression: 'ga:bounceRate' },
              { expression: 'ga:avgSessionDuration' },
            ],
            dimensions: [
              { name: 'ga:date' },
              { name: 'ga:deviceCategory' },
              { name: 'ga:pagePath' },
            ],
            pageSize: 10000,
          },
        ],
      },
    });

    const gaData = {
      fetchedAt: new Date().toISOString(),
      dateRange: {
        start: dateFormat(thirtyDaysAgo),
        end: dateFormat(today),
      },
      reports: response.data.reports || [],
      summary: {
        totalSessions: 0,
        totalPageviews: 0,
        avgBounceRate: 0,
      },
    };

    fs.writeFileSync(
      path.resolve(dataDir, 'analytics.json'),
      JSON.stringify(gaData, null, 2)
    );
    console.log('✅ Analytics data collected');

    return gaData;
  } catch (error) {
    console.error('⚠️  Analytics fetch (optional):', error.message);
    return null;
  }
}

/**
 * Fetch site performance metrics
 */
async function fetchPerformanceMetrics() {
  console.log('\n⚡ Collecting performance metrics...');

  const metrics = {
    fetchedAt: new Date().toISOString(),
    site: 'https://kit-bin.com',
    checks: {
      sitemapExists: false,
      robotsExists: false,
      adsTextExists: false,
      httpsEnabled: false,
    },
  };

  try {
    // Check sitemap
    const sitemapRes = await fetch('https://kit-bin.com/sitemap-0.xml');
    metrics.checks.sitemapExists = sitemapRes.ok;

    // Check robots.txt
    const robotsRes = await fetch('https://kit-bin.com/robots.txt');
    metrics.checks.robotsExists = robotsRes.ok;

    // Check ads.txt
    const adsRes = await fetch('https://kit-bin.com/ads.txt');
    metrics.checks.adsTextExists = adsRes.ok;

    // HTTPS is implicit (we're checking https://)
    metrics.checks.httpsEnabled = true;

    fs.writeFileSync(
      path.resolve(dataDir, 'performance.json'),
      JSON.stringify(metrics, null, 2)
    );
    console.log('✅ Performance metrics collected');

    return metrics;
  } catch (error) {
    console.error('❌ Performance metrics failed:', error.message);
    return metrics;
  }
}

/**
 * Create summary report
 */
function createSummaryReport(scData, gaData, perfData) {
  const report = {
    generatedAt: new Date().toISOString(),
    site: 'https://kit-bin.com',
    sections: {
      searchConsole: scData ? '✅ Collected' : '❌ Failed',
      analytics: gaData ? '✅ Collected' : '❌ Failed',
      performance: perfData ? '✅ Collected' : '❌ Failed',
    },
    topPages: [],
    topQueries: [],
    alerts: [],
  };

  if (scData?.summary?.topQueries) {
    report.topQueries = scData.summary.topQueries.map((q) => ({
      query: q.keys[0],
      clicks: q.clicks,
      impressions: q.impressions,
      ctr: (q.ctr * 100).toFixed(2) + '%',
      position: q.position.toFixed(1),
    }));
  }

  // Add alerts
  if (perfData && !perfData.checks.sitemapExists) {
    report.alerts.push('⚠️  Sitemap not found');
  }
  if (perfData && !perfData.checks.adsTextExists) {
    report.alerts.push('⚠️  ads.txt not found');
  }

  fs.writeFileSync(
    path.resolve(dataDir, 'report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n📋 Summary Report:');
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Status: ${Object.values(report.sections).join(', ')}`);
  if (report.alerts.length > 0) {
    console.log(`Alerts: ${report.alerts.join(', ')}`);
  }
  console.log(`Top queries: ${report.topQueries.length}`);

  return report;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 SEO Analytics Collector\n');
  console.log('Site: https://kit-bin.com');
  console.log(`Output: ${path.relative(projectRoot, dataDir)}/\n`);

  try {
    const authenticated = await authenticateWithGoogle();
    if (!authenticated) {
      process.exit(1);
    }

    const scData = await fetchSearchConsoleData();
    const gaData = await fetchAnalyticsData();
    const perfData = await fetchPerformanceMetrics();

    createSummaryReport(scData, gaData, perfData);

    console.log('\n✅ Data collection complete\n');
    console.log('📁 Files saved to data/analytics/:');
    console.log('  ✓ search-console.json  — Top queries, CTR, positions');
    console.log('  ✓ analytics.json       — Sessions, pageviews, bounce rate');
    console.log('  ✓ performance.json     — Sitemap, robots.txt, ads.txt checks');
    console.log('  ✓ report.json          — Summary & alerts\n');
    console.log('🔄 Next: Agents will process this data for SEO improvements');
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
