-- Add corrected_transcript column to sessions
-- This stores the LLaMA-corrected version of the Whisper STT output
-- (misheard drug names, dosages, and medical terms are fixed before AI extraction)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS corrected_transcript TEXT;
