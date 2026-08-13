#!/usr/bin/env node
/**
 * Supabase Uploader
 * Takes collected data and uploads to Supabase
 * Run: node seo/scripts/uploader.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const dataDir = path.resolve(__dirname, '../data');

dotenv.config({ path: path.resolve(projectRoot, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadToDatabase() {
  console.log('📤 Uploading to Supabase...\n');

  try {
    // Read collected data
    const scPath = path.resolve(dataDir, 'search-console.json');
    const perfPath = path.resolve(dataDir, 'performance.json');

    if (!fs.existsSync(scPath)) {
      console.error('❌ No data to upload. Run: node seo/scripts/collector.mjs');
      process.exit(1);
    }

    const scData = JSON.parse(fs.readFileSync(scPath, 'utf-8'));
    const perfData = fs.existsSync(perfPath) ? JSON.parse(fs.readFileSync(perfPath, 'utf-8')) : null;

    const today = new Date().toISOString().split('T')[0];

    // Prepare summary
    const summary = {
      date: today,
      total_clicks: scData.summary.totalClicks,
      total_impressions: scData.summary.totalImpressions,
      avg_ctr: parseFloat(scData.summary.avgCtr) || null,
      avg_position: parseFloat(scData.summary.avgPosition) || null,
      top_queries: scData.summary.topQueries.map(q => ({
        query: q.keys[0],
        clicks: q.clicks,
        impressions: q.impressions,
        ctr: (q.ctr * 100).toFixed(2),
        position: q.position.toFixed(1),
      })),
      top_pages: (scData.rows || [])
        .reduce((pages, row) => {
          const existing = pages.find(p => p.page === row.keys[1]);
          if (existing) {
            existing.clicks += row.clicks;
            existing.impressions += row.impressions;
          } else {
            pages.push({
              page: row.keys[1],
              clicks: row.clicks,
              impressions: row.impressions,
            });
          }
          return pages;
        }, [])
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10),
      alerts: [],
    };

    // Add alerts
    if (perfData) {
      if (!perfData.sitemapExists) summary.alerts.push('⚠️  Sitemap not found');
      if (!perfData.robotsExists) summary.alerts.push('⚠️  robots.txt not found');
      if (!perfData.adsTextExists) summary.alerts.push('⚠️  ads.txt not found');
    }

    // Upsert to seo_daily_summary
    const { error: summaryError, data: summaryData } = await supabase
      .from('seo_daily_summary')
      .upsert(summary, { onConflict: 'date' })
      .select();

    if (summaryError) throw summaryError;

    console.log(`✅ Daily summary upserted for ${today}`);
    console.log(`   Clicks: ${summary.total_clicks}`);
    console.log(`   Impressions: ${summary.total_impressions}`);
    console.log(`   CTR: ${summary.avg_ctr}%`);
    console.log(`   Avg Position: ${summary.avg_position}`);

    // Upload raw data for analysis
    const { error: rawError } = await supabase
      .from('seo_analytics_raw')
      .insert({
        date: today,
        data_type: 'search_console',
        raw_data: scData,
      });

    if (rawError) throw rawError;
    console.log('✅ Raw data stored');

    // Upload performance data
    if (perfData) {
      const { error: perfError } = await supabase
        .from('seo_analytics_raw')
        .insert({
          date: today,
          data_type: 'performance',
          raw_data: perfData,
        });

      if (perfError) throw perfError;
      console.log('✅ Performance data stored');
    }

    console.log('\n✨ All data uploaded successfully');
    console.log('📊 Query from agents at:');
    console.log(`   SELECT * FROM seo_daily_summary WHERE date = '${today}'`);

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
}

uploadToDatabase();
