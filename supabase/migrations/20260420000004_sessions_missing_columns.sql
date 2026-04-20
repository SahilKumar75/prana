-- Add all columns that api.js requires but are missing from the base sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS detected_language  TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration_seconds   INT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS patient_name       TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS patient_id         TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS corrected_transcript TEXT;
