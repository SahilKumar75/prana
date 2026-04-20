-- ─── Doctors table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id             UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT  NOT NULL,
  age            INT,
  specialization TEXT
);

-- ─── Patients table (human-readable IDs) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id   TEXT PRIMARY KEY,   -- PAT-XXXX-XXXX
  name TEXT NOT NULL,
  age  INT
);

-- ─── Cases table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cases (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT        REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id  UUID        REFERENCES doctors(id)  ON DELETE SET NULL,
  case_type  TEXT        NOT NULL,
  case_ref   TEXT,
  status     TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at  TIMESTAMPTZ
);

-- ─── Add case_id to sessions ─────────────────────────────────────────────────
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES cases(id);

-- ─── Seed demo data ──────────────────────────────────────────────────────────
INSERT INTO doctors (id, name, specialization) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dr. Arjun Sharma', 'General Medicine'),
  ('00000000-0000-0000-0000-000000000002', 'Dr. Meera Iyer',   'Pediatrics')
ON CONFLICT (id) DO NOTHING;

INSERT INTO patients (id, name) VALUES
  ('PAT-PRIY-3210', 'Priya Patel'),
  ('PAT-RAHU-0004', 'Rahul Deshmukh')
ON CONFLICT (id) DO NOTHING;

-- ─── Disable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE doctors  DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE cases    DISABLE ROW LEVEL SECURITY;
