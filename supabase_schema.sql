-- ─────────────────────────────────────────────────────────────────────────────
-- PRANA — Supabase Schema
-- Run this in your Supabase SQL editor BEFORE the hackathon starts
-- Adjust columns once you have the problem statement
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Core table: voice sessions ────────────────────────────────────────────────
create table if not exists sessions (
  id            uuid primary key default uuid_generate_v4(),
  created_at    timestamptz default now(),
  language      text default 'hi-IN',
  raw_transcript text,
  extracted_data jsonb,          -- structured JSON from Groq
  status        text default 'pending'  -- pending | processed | error
);

-- ── Index for fast queries ────────────────────────────────────────────────────
create index if not exists sessions_created_at_idx on sessions(created_at desc);
create index if not exists sessions_status_idx on sessions(status);

-- ── Row Level Security (keep data safe even on free tier) ─────────────────────
alter table sessions enable row level security;

-- Allow all for demo (tighten this in production)
create policy "allow all for demo" on sessions
  for all using (true) with check (true);
