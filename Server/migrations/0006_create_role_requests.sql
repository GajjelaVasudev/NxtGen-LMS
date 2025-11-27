-- Migration: create role_requests table
-- Run this against the Postgres DB used by Supabase

CREATE TABLE IF NOT EXISTS role_requests (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  email text NOT NULL,
  requested_role text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_requests(status);

-- Optional: update updated_at on row modification
CREATE OR REPLACE FUNCTION role_requests_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_role_requests_updated_at ON role_requests;
CREATE TRIGGER trg_role_requests_updated_at
BEFORE UPDATE ON role_requests
FOR EACH ROW
EXECUTE PROCEDURE role_requests_updated_at_trigger();
