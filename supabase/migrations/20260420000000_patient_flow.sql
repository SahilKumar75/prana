-- ─── Profiles table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  role       TEXT        NOT NULL CHECK (role IN ('doctor', 'patient')),
  specialty  TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demo seed: 2 doctors + 2 patients (fixed UUIDs so app can reference them)
INSERT INTO profiles (id, name, role, specialty) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dr. Arjun Sharma',  'doctor',  'General Medicine'),
  ('00000000-0000-0000-0000-000000000002', 'Dr. Meera Iyer',    'doctor',  'Pediatrics')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, name, role, phone) VALUES
  ('00000000-0000-0000-0000-000000000003', 'Priya Patel',     'patient', '+91 98765 43210'),
  ('00000000-0000-0000-0000-000000000004', 'Rahul Deshmukh',  'patient', '+91 91234 56789')
ON CONFLICT (id) DO NOTHING;

-- ─── Session requests (patient → doctor) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_requests (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sr_doctor_status  ON session_requests(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_sr_patient_status ON session_requests(patient_id, status);

-- ─── Extend sessions with doctor + request context ────────────────────────────
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS doctor_id  UUID REFERENCES profiles(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES session_requests(id);
