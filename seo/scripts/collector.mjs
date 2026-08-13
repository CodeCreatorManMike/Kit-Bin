#!/usr/bin/env node
/**
 * SEO Data Collector
 * Fetches Search Console + Analytics data, saves locally
 * Run: node seo/scripts/collector.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const dataDir = path.resolve(__dirname, '../data');
const tokensDir = path.resolve(__dirname, '../.tokens');

// Create directories
[dataDir, tokensDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Load env
dotenv.config({ path: path.resolve(projectRoot, '.env.local') });

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://kit-bin.com';

if (!clientId || !clientSecret) {
  console.error('❌ Missing Google OAuth credentials in .env.local');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

async function authenticateWithGoogle() {
  const tokenPath = path.resolve(tokensDir, 'google-auth-token.json');

  if (fs.existsSync(tokenPath)) {
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
    oauth2Client.setCredentials(token);
    console.log('✅ Using cached Google auth token');
    return true;
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/analytics.readonly',
    ],
  });

  console.log('\n🔐 First-time authentication required:');
  console.log('📍 Visit: ' + authUrl);
  console.log('\n⏳ Paste the authorization code here:');

  const code = await new Promise(resolve => {
    process.stdin.once('data', data => resolve(data.toString().trim()));
  });

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    console.log('✅ Token saved\n');
    return true;
  } catch (error) {
    console.error('❌ Auth failed:', error.message);
    return false;
  }
}

async function fetchSearchConsole() {
  console.log('📊 Fetching Search Console data...');

  const webmasters = google.webmasters({ version: 'v3', auth: oauth2Client });
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFormat = d => d.toISOString().split('T')[0];

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

    const data = {
      fetchedAt: new Date().toISOString(),
      dateRange: { start: dateFormat(thirtyDaysAgo), end: dateFormat(today) },
      rows: response.data.rows || [],
      summary: {
        totalRows: response.data.rows?.length || 0,
        totalClicks: response.data.rows?.reduce((sum, r) => sum + (r.clicks || 0), 0) || 0,
        totalImpressions: response.data.rows?.reduce((sum, r) => sum + (r.impressions || 0), 0) || 0,
        topQueries: (response.data.rows || []).slice(0, 10),
      },
    };

    // Calculate metrics
    if (data.summary.totalImpressions > 0) {
      data.summary.avgCtr = (data.summary.totalClicks / data.summary.totalImpressions * 100).toFixed(2);
    }
    if (data.summary.topQueries.length > 0) {
      const avgPos = data.summary.topQueries.reduce((sum, q) => sum + q.position, 0) / data.summary.topQueries.length;
      data.summary.avgPosition = avgPos.toFixed(1);
    }

    fs.writeFileSync(
      path.resolve(dataDir, 'search-console.json'),
      JSON.stringify(data, null, 2)
    );

    console.log(`✅ ${data.summary.totalRows} queries collected`);
    return data;
  } catch (error) {
    console.error('❌ Search Console failed:', error.message);
    return null;
  }
}

async function fetchPerformance() {
  console.log('⚡ Checking site health...');

  const checks = {
    sitemapExists: false,
    robotsExists: false,
    adsTextExists: false,
    httpsEnabled: true,
    fetchedAt: new Date().toISOString(),
  };

  try {
    checks.sitemapExists = (await fetch('https://kit-bin.com/sitemap-0.xml')).ok;
    checks.robotsExists = (await fetch('https://kit-bin.com/robots.txt')).ok;
    checks.adsTextExists = (await fetch('https://kit-bin.com/ads.txt')).ok;

    fs.writeFileSync(
      path.resolve(dataDir, 'performance.json'),
      JSON.stringify(checks, null, 2)
    );

    console.log('✅ Health checks complete');
    return checks;
  } catch (error) {
    console.error('⚠️  Health check error:', error.message);
    return checks;
  }
}

async function main() {
  console.log('🚀 SEO Data Collector\n');

  const auth = await authenticateWithGoogle();
  if (!auth) process.exit(1);

  const sc = await fetchSearchConsole();
  const perf = await fetchPerformance();

  console.log('\n✅ Data collected to seo/data/');
  console.log('📁 Files:');
  console.log('  • search-console.json');
  console.log('  • performance.json');
  console.log('\n➡️  Next: node seo/scripts/uploader.mjs');
}

main();
