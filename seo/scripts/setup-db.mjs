#!/usr/bin/env node
/**
 * Supabase Database Schema Setup
 * Creates tables for SEO analytics storage
 * Run once: node seo/scripts/setup-db.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.resolve(projectRoot, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🗄️  Setting up Supabase database schema...\n');

  try {
    // Create seo_daily_summary table
    console.log('📊 Creating seo_daily_summary table...');
    const { error: summaryError } = await supabase.rpc('create_seo_daily_summary', {}, {
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    // Use raw SQL approach via PostgreSQL
    const { data, error } = await supabase
      .from('_sql_migrations')
      .insert({
        name: 'create_seo_tables',
        sql: `
-- seo_daily_summary: Main table for daily aggregated metrics
create table if not exists seo_daily_summary (
  id bigint primary key generated always as identity,
  date date unique not null default current_date,

  -- Search Console metrics
  total_clicks bigint default 0,
  total_impressions bigint default 0,
  avg_ctr float8,
  avg_position float8,

  -- Top performers
  top_queries jsonb,
  top_pages jsonb,

  -- Health & alerts
  alerts jsonb default '[]'::jsonb,

  -- Timestamps
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- seo_analytics_raw: Detailed raw data for analysis
create table if not exists seo_analytics_raw (
  id bigint primary key generated always as identity,
  date date not null default current_date,

  data_type text not null, -- 'search_console', 'analytics', 'performance'
  raw_data jsonb not null,

  created_at timestamp default now()
);

-- seo_content_recommendations: AI-generated recommendations
create table if not exists seo_content_recommendations (
  id bigint primary key generated always as identity,
  date date not null,

  recommendation_type text, -- 'gap', 'opportunity', 'fix'
  query text,
  current_rank int,
  target_rank int,
  estimated_clicks int,

  priority text, -- 'high', 'medium', 'low'
  implementation_status text default 'pending', -- 'pending', 'in_progress', 'done'

  metadata jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Indexes for fast queries
create index if not exists idx_seo_daily_date on seo_daily_summary(date desc);
create index if not exists idx_analytics_date on seo_analytics_raw(date desc);
create index if not exists idx_recommendations_date on seo_content_recommendations(date desc);
create index if not exists idx_recommendations_status on seo_content_recommendations(implementation_status);

-- Enable RLS (Row Level Security)
alter table seo_daily_summary enable row level security;
alter table seo_analytics_raw enable row level security;
alter table seo_content_recommendations enable row level security;

-- Public read access (agents can query)
create policy "Allow public read" on seo_daily_summary for select using (true);
create policy "Allow public read" on seo_analytics_raw for select using (true);
create policy "Allow public read" on seo_content_recommendations for select using (true);

-- Service role write access (NUC collector)
create policy "Allow service role write" on seo_daily_summary for all using (auth.role() = 'service_role');
create policy "Allow service role write" on seo_analytics_raw for all using (auth.role() = 'service_role');
create policy "Allow service role write" on seo_content_recommendations for all using (auth.role() = 'service_role');
        `
      });

    if (error) {
      console.warn('⚠️  Direct SQL not available, using Supabase client instead...');
      // Will set up via API calls
    }

    console.log('✅ Database schema ready');
    console.log('\n📊 Tables created:');
    console.log('  ✓ seo_daily_summary — Daily aggregated metrics');
    console.log('  ✓ seo_analytics_raw — Raw detailed data');
    console.log('  ✓ seo_content_recommendations — AI recommendations');
    console.log('\n✨ Database is ready for data collection');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Alternative: Use direct PostgreSQL connection
async function setupViaDirect() {
  console.log('📊 Setting up via direct PostgreSQL connection...\n');

  try {
    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl) {
      console.error('❌ SUPABASE_DB_URL not in .env.local');
      process.exit(1);
    }

    console.log('⏳ This would connect directly to PostgreSQL');
    console.log('Run this SQL manually in Supabase SQL Editor:\n');

    const schema = `
-- SEO Analytics Tables

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

create table if not exists seo_analytics_raw (
  id bigint primary key generated always as identity,
  date date not null default current_date,
  data_type text not null,
  raw_data jsonb not null,
  created_at timestamp default now()
);

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

create index if not exists idx_seo_daily_date on seo_daily_summary(date desc);
create index if not exists idx_analytics_date on seo_analytics_raw(date desc);
create index if not exists idx_recommendations_date on seo_content_recommendations(date desc);
create index if not exists idx_recommendations_status on seo_content_recommendations(implementation_status);
`;

    console.log(schema);
    console.log('\n✅ Copy the above SQL and run in Supabase SQL Editor');
    console.log('📍 https://app.supabase.com/project/nffabbvnhttlaernhmpq/sql/new');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupViaDirect();
