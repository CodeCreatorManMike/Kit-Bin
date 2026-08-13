#!/usr/bin/env node
/**
 * Example Agent Query Script
 * Shows how agents can query data from Supabase
 * Run: node seo/scripts/query-example.mjs
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.resolve(projectRoot, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryExamples() {
  console.log('📊 Supabase Query Examples\n');

  try {
    // Get today's summary
    const today = new Date().toISOString().split('T')[0];

    console.log(`1️⃣  Today's Summary (${today}):`);
    const { data: dailyData, error: dailyError } = await supabase
      .from('seo_daily_summary')
      .select('*')
      .eq('date', today)
      .single();

    if (!dailyError && dailyData) {
      console.log(`   📈 Clicks: ${dailyData.total_clicks}`);
      console.log(`   👁️  Impressions: ${dailyData.total_impressions}`);
      console.log(`   📊 CTR: ${dailyData.avg_ctr}%`);
      console.log(`   🎯 Avg Position: ${dailyData.avg_position}`);
      console.log(`   ⚠️  Alerts: ${dailyData.alerts?.length || 0}`);
    }

    // Last 7 days
    console.log('\n2️⃣  Last 7 Days:');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: weekData, error: weekError } = await supabase
      .from('seo_daily_summary')
      .select('date, total_clicks, total_impressions, avg_ctr')
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false })
      .limit(7);

    if (!weekError && weekData) {
      console.log(`   Found ${weekData.length} days of data`);
      weekData.forEach(day => {
        console.log(`   ${day.date}: ${day.total_clicks} clicks, ${day.avg_ctr}% CTR`);
      });
    }

    // Top queries across all time
    console.log('\n3️⃣  Top Queries (All Time):');
    const { data: allSummaries } = await supabase
      .from('seo_daily_summary')
      .select('top_queries')
      .order('date', { ascending: false })
      .limit(7);

    const allQueries = {};
    if (allSummaries) {
      allSummaries.forEach(day => {
        if (day.top_queries) {
          day.top_queries.forEach(q => {
            if (!allQueries[q.query]) {
              allQueries[q.query] = { ...q, occurrences: 1 };
            } else {
              allQueries[q.query].occurrences += 1;
              allQueries[q.query].clicks += q.clicks;
            }
          });
        }
      });

      const topQueries = Object.values(allQueries)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);

      topQueries.forEach((q, i) => {
        console.log(`   ${i + 1}. "${q.query}" — ${q.clicks} clicks (${q.occurrences} days)`);
      });
    }

    // Performance checks
    console.log('\n4️⃣  Latest Performance Checks:');
    const { data: perfData } = await supabase
      .from('seo_analytics_raw')
      .select('raw_data, created_at')
      .eq('data_type', 'performance')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (perfData?.raw_data) {
      const checks = perfData.raw_data;
      console.log(`   Sitemap: ${checks.sitemapExists ? '✅' : '❌'}`);
      console.log(`   robots.txt: ${checks.robotsExists ? '✅' : '❌'}`);
      console.log(`   ads.txt: ${checks.adsTextExists ? '✅' : '❌'}`);
    }

    // Content recommendations (when agents add them)
    console.log('\n5️⃣  Pending Recommendations:');
    const { data: recs } = await supabase
      .from('seo_content_recommendations')
      .select('query, recommendation_type, priority')
      .eq('implementation_status', 'pending')
      .order('priority', { ascending: false })
      .limit(5);

    if (recs && recs.length > 0) {
      recs.forEach(r => {
        console.log(`   [${r.priority.toUpperCase()}] ${r.recommendation_type}: "${r.query}"`);
      });
    } else {
      console.log('   No recommendations yet. Agents will add them.');
    }

    console.log('\n✅ Query examples complete\n');

  } catch (error) {
    console.error('❌ Query failed:', error.message);
  }
}

queryExamples();
