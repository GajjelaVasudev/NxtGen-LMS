-- Combined migration: admin_audit, roles/permissions, groups/activity/courses, users.status, group_members
-- Run this file in your Supabase SQL editor (or via psql) to apply all admin-related schema changes.
-- File is idempotent where possible (uses IF NOT EXISTS and INSERT ... WHERE NOT EXISTS guards).

-- 0001_create_admin_audit.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  admin_id uuid,
  target_user_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target_user_id ON admin_audit(target_user_id);

-- 0002_create_roles_permissions.sql
CREATE TABLE IF NOT EXISTS roles (
  id text PRIMARY KEY,
  description text
);

CREATE TABLE IF NOT EXISTS permissions (
  id text PRIMARY KEY,
  description text
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id text REFERENCES roles(id) ON DELETE CASCADE,
  permission_id text REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, permission_id)
);

-- Seed basic roles
INSERT INTO roles (id, description)
SELECT 'admin', 'Full system administrator'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id='admin');

INSERT INTO roles (id, description)
SELECT 'instructor', 'Course instructor'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id='instructor');

INSERT INTO roles (id, description)
SELECT 'content_creator', 'Content creator'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id='content_creator');

INSERT INTO roles (id, description)
SELECT 'student', 'Learner / student'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE id='student');

-- Seed minimal permissions
INSERT INTO permissions (id, description)
SELECT 'user_manage', 'Manage user accounts' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE id='user_manage');

INSERT INTO permissions (id, description)
SELECT 'role_manage', 'Approve or change roles' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE id='role_manage');

INSERT INTO permissions (id, description)
SELECT 'course_manage', 'Create and manage courses' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE id='course_manage');

INSERT INTO permissions (id, description)
SELECT 'grade_manage', 'Grade assignments' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE id='grade_manage');

-- Assign some defaults
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'admin','user_manage' WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id='admin' AND permission_id='user_manage');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'admin','role_manage' WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id='admin' AND permission_id='role_manage');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'admin','course_manage' WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id='admin' AND permission_id='course_manage');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'instructor','grade_manage' WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id='instructor' AND permission_id='grade_manage');

-- 0003_create_groups_activity_courses.sql
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_by uuid,
  published boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_at timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content jsonb,
  grade numeric,
  graded_by uuid,
  graded_at timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
-- Ensure `created_by` column exists before creating index (handles pre-existing schema)
ALTER TABLE IF EXISTS courses ADD COLUMN IF NOT EXISTS created_by uuid;
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);

-- 0004_add_users_status.sql
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 0005_create_group_members.sql
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role_in_group text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

-- End combined migration
