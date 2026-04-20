-- ─────────────────────────────────────────────────────────────────────────────
-- PRANA — Supabase Schema
-- Run this in your Supabase SQL editor BEFORE the hackathon starts
-- Adjust columns once you have the problem statement
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Table: doctors ────────────────────────────────────────────────────────────
create table if not exists doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT,
    specialization TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── Table: patients ───────────────────────────────────────────────────────────
create table if not exists patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_code TEXT UNIQUE NOT NULL,   -- user-facing ID
    full_name TEXT,
    age INT,
    gender TEXT,
    phone TEXT,
    doctor_id UUID REFERENCES doctors(id), -- 👈 primary/default doctor
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── Table: sessions ───────────────────────────────────────────────────────────
create table if not exists sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id), -- 👈 doctor for this session
    transcript TEXT,
    detected_language TEXT,
    structured_data JSONB NOT NULL,  -- 🔥 main medical data
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── Table: session_reviews ────────────────────────────────────────────────────
create table if not exists session_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id),
    reviewed_diagnosis TEXT,
    reviewed_medications JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── Indexes for fast queries ──────────────────────────────────────────────────
create index if not exists sessions_created_at_idx on sessions(created_at desc);
create index if not exists patients_doctor_id_idx on patients(doctor_id);
create index if not exists sessions_patient_id_idx on sessions(patient_id);
create index if not exists sessions_doctor_id_idx on sessions(doctor_id);
create index if not exists session_reviews_session_id_idx on session_reviews(session_id);

-- ── Row Level Security (keep data safe even on free tier) ─────────────────────
alter table doctors enable row level security;
alter table patients enable row level security;
alter table sessions enable row level security;
alter table session_reviews enable row level security;

-- Allow all for demo (tighten this in production)
create policy "allow all for demo on doctors" on doctors
  for all using (true) with check (true);
create policy "allow all for demo on patients" on patients
  for all using (true) with check (true);
create policy "allow all for demo on sessions" on sessions
  for all using (true) with check (true);
create policy "allow all for demo on session_reviews" on session_reviews
  for all using (true) with check (true);
