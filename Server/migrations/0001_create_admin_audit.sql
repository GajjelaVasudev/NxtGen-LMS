-- Migration: create admin_audit table
-- Run this in your Supabase/Postgres DB to enable audit logging for admin actions.

-- Create extension for gen_random_uuid if available (pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  admin_id uuid,
  target_user_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target_user_id ON admin_audit(target_user_id);
