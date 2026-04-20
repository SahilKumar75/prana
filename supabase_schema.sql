-- ─────────────────────────────────────────────────────────────────────────────
-- PRANA — Supabase Schema
-- Run this in your Supabase SQL editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Core table: voice sessions ────────────────────────────────────────────────
create table if not exists sessions (
  id                uuid        primary key default uuid_generate_v4(),
  created_at        timestamptz default now(),

  -- Patient info
  patient_id        text,
  patient_name      text,

  -- Audio / language
  language          text        default 'hi-IN',   -- language selected by user
  detected_language text,                           -- auto-detected by Whisper
  duration_seconds  int,                            -- recording length in seconds
  raw_transcript    text,                           -- raw Whisper output

  -- AI extraction (structured medical JSON)
  -- Shape: { patient_name, symptoms[], symptom_duration, diagnosis,
  --          medications[], allergies[], vitals{}, follow_up,
  --          language_detected, missing_info[], summary, severity }
  extracted_data    jsonb,

  status            text        default 'pending'  -- pending | processed | error
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists sessions_created_at_idx    on sessions(created_at desc);
create index if not exists sessions_status_idx        on sessions(status);
create index if not exists sessions_patient_id_idx    on sessions(patient_id);
create index if not exists sessions_patient_name_idx  on sessions(patient_name);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table sessions enable row level security;
create policy "allow all for demo" on sessions
  for all using (true) with check (true);

-- ── Migration: add new columns to existing table (safe to re-run) ─────────────
alter table sessions add column if not exists patient_id        text;
alter table sessions add column if not exists patient_name      text;
alter table sessions add column if not exists detected_language text;
alter table sessions add column if not exists duration_seconds  int;
