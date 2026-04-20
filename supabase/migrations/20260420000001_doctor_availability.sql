-- Add availability flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT false;

-- Doctors start as unavailable; availability is set at runtime when they open the app
