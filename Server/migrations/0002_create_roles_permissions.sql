-- Migration: create roles and permissions tables

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

-- Seed basic roles and permissions (idempotent)
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

-- minimal permissions
INSERT INTO permissions (id, description)
SELECT 'user_manage', 'Manage user accounts' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE id='user_manage');

INSERT INTO permissions (id, description)
SELECT 'role_manage', 'Approve or change roles' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE id='role_manage');

INSERT INTO permissions (id, description)
SELECT 'course_manage', 'Create and manage courses' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE id='course_manage');

INSERT INTO permissions (id, description)
SELECT 'grade_manage', 'Grade assignments' WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE id='grade_manage');

-- assign some default role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'admin','user_manage' WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id='admin' AND permission_id='user_manage');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'admin','role_manage' WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id='admin' AND permission_id='role_manage');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'admin','course_manage' WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id='admin' AND permission_id='course_manage');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'instructor','grade_manage' WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id='instructor' AND permission_id='grade_manage');
