-- Migration: add status column to users table

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Optionally index status for quick counts
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
