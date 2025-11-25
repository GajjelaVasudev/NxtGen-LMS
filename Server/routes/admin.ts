import { RequestHandler } from 'express';
import { supabase } from '../supabaseClient.js';
import { requireAdmin } from './auth.js';

// GET /api/admin/roles
export const listRoles: RequestHandler = async (_req, res) => {
  const chk = await requireAdmin(_req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  try {
    const { data, error } = await supabase.from('roles').select('*');
    if (error) return res.status(500).json({ error: error.message || 'Failed to list roles' });
    return res.json({ roles: data || [] });
  } catch (ex) {
    console.error('[admin/listRoles] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// GET /api/admin/permissions
export const listPermissions: RequestHandler = async (_req, res) => {
  const chk = await requireAdmin(_req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  try {
    const { data, error } = await supabase.from('permissions').select('*');
    if (error) return res.status(500).json({ error: error.message || 'Failed to list permissions' });
    return res.json({ permissions: data || [] });
  } catch (ex) {
    console.error('[admin/listPermissions] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// POST /api/admin/roles
export const createRole: RequestHandler = async (req, res) => {
  const chk = await requireAdmin(req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  const id = String(req.body?.id || '').trim();
  const description = String(req.body?.description || '');
  if (!id) return res.status(400).json({ error: 'role id required' });
  try {
    const { data, error } = await supabase.from('roles').insert([{ id, description }]).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message || 'Failed to create role' });
    return res.json({ success: true, role: data });
  } catch (ex) {
    console.error('[admin/createRole] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// POST /api/admin/roles/:roleId/permissions
export const addPermissionToRole: RequestHandler = async (req, res) => {
  const chk = await requireAdmin(req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  const roleId = String(req.params.roleId || '');
  const perm = String(req.body?.permission || '');
  if (!roleId || !perm) return res.status(400).json({ error: 'roleId and permission required' });
  try {
    const { error } = await supabase.from('role_permissions').insert([{ role_id: roleId, permission_id: perm }]);
    if (error) return res.status(500).json({ error: error.message || 'Failed to assign permission' });
    return res.json({ success: true });
  } catch (ex) {
    console.error('[admin/addPermissionToRole] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// DELETE /api/admin/roles/:roleId/permissions/:permId
export const removePermissionFromRole: RequestHandler = async (req, res) => {
  const chk = await requireAdmin(req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  const roleId = String(req.params.roleId || '');
  const permId = String(req.params.permId || '');
  if (!roleId || !permId) return res.status(400).json({ error: 'roleId and permId required' });
  try {
    const { error } = await supabase.from('role_permissions').delete().eq('role_id', roleId).eq('permission_id', permId);
    if (error) return res.status(500).json({ error: error.message || 'Failed to remove permission' });
    return res.json({ success: true });
  } catch (ex) {
    console.error('[admin/removePermissionFromRole] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// Groups CRUD
// GET /api/admin/groups
export const listGroups: RequestHandler = async (_req, res) => {
  const chk = await requireAdmin(_req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  try {
    const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message || 'Failed to list groups' });
    return res.json({ groups: data || [] });
  } catch (ex) {
    console.error('[admin/listGroups] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// POST /api/admin/groups
export const createGroup: RequestHandler = async (req, res) => {
  const chk = await requireAdmin(req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const { data, error } = await supabase.from('groups').insert([{ name, metadata: req.body?.metadata || {} }]).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message || 'Failed to create group' });
    return res.json({ success: true, group: data });
  } catch (ex) {
    console.error('[admin/createGroup] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// PUT /api/admin/groups/:id
export const updateGroup: RequestHandler = async (req, res) => {
  const chk = await requireAdmin(req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  const id = String(req.params.id || '');
  try {
    const { data, error } = await supabase.from('groups').update({ name: req.body?.name, metadata: req.body?.metadata }).eq('id', id).select().maybeSingle();
    if (error) return res.status(500).json({ error: error.message || 'Failed to update group' });
    return res.json({ success: true, group: data });
  } catch (ex) {
    console.error('[admin/updateGroup] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// DELETE /api/admin/groups/:id
export const deleteGroup: RequestHandler = async (req, res) => {
  const chk = await requireAdmin(req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  const id = String(req.params.id || '');
  try {
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message || 'Failed to delete group' });
    return res.json({ success: true });
  } catch (ex) {
    console.error('[admin/deleteGroup] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// Activity log
// GET /api/admin/activity
export const listActivity: RequestHandler = async (req, res) => {
  const chk = await requireAdmin(req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  try {
    let q = supabase.from('activity_log').select('*').order('created_at', { ascending: false });
    const userId = String(req.query.userId || '');
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message || 'Failed to list activity' });
    return res.json({ activity: data || [] });
  } catch (ex) {
    console.error('[admin/listActivity] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// Reports: basic summary counters
// GET /api/admin/reports/summary
export const reportsSummary: RequestHandler = async (_req, res) => {
  const chk = await requireAdmin(_req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  try {
    const counts: any = {};
    const userRes = await supabase.from('users').select('id', { count: 'exact', head: true });
    counts.users = (userRes as any).count || 0;
    const courseRes = await supabase.from('courses').select('id', { count: 'exact', head: true });
    counts.courses = (courseRes as any).count || 0;
    const assignRes = await supabase.from('assignments').select('id', { count: 'exact', head: true });
    counts.assignments = (assignRes as any).count || 0;
    const subRes = await supabase.from('submissions').select('id', { count: 'exact', head: true });
    counts.submissions = (subRes as any).count || 0;
    return res.json({ summary: counts });
  } catch (ex) {
    console.error('[admin/reportsSummary] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// Admin: create a user (POST /api/admin/users)
export const createUser: RequestHandler = async (req, res) => {
  const chk = await requireAdmin(req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  const email = String(req.body?.email || '').toLowerCase();
  const role = String(req.body?.role || 'student');
  const firstName = req.body?.first_name || req.body?.firstName || null;
  const lastName = req.body?.last_name || req.body?.lastName || null;
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const insertRow: any = { email, role };
    if (firstName) insertRow.first_name = firstName;
    if (lastName) insertRow.last_name = lastName;
    const { data, error } = await supabase.from('users').insert([insertRow]).select('id, email, role, first_name, last_name').maybeSingle();
    if (error) return res.status(500).json({ error: error.message || 'Failed to create user' });

    // audit
    try {
      const adminId = String((chk.user && (chk.user as any).id) || (req.headers['x-user-id'] || ''));
      await supabase.from('admin_audit').insert([{ action: 'create_user', admin_id: adminId, target_user_id: data?.id || null, metadata: { email } }]);
    } catch (auditErr) { console.warn('[admin/createUser] audit failed', auditErr); }

    return res.json({ success: true, user: data });
  } catch (ex) {
    console.error('[admin/createUser] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// Admin: update user (PUT /api/admin/users/:id)
export const updateUser: RequestHandler = async (req, res) => {
  const chk = await requireAdmin(req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  const id = String(req.params.id || '');
  if (!id) return res.status(400).json({ error: 'user id required' });
  const payload: any = {};
  if (req.body?.email) payload.email = String(req.body.email).toLowerCase();
  if (req.body?.role) payload.role = String(req.body.role);
  if (req.body?.first_name) payload.first_name = req.body.first_name;
  if (req.body?.last_name) payload.last_name = req.body.last_name;
  try {
    const { data, error } = await supabase.from('users').update(payload).eq('id', id).select('id, email, role, first_name, last_name').maybeSingle();
    if (error) return res.status(500).json({ error: error.message || 'Failed to update user' });
    if (!data) return res.status(404).json({ error: 'User not found' });

    // audit
    try {
      const adminId = String((chk.user && (chk.user as any).id) || (req.headers['x-user-id'] || ''));
      await supabase.from('admin_audit').insert([{ action: 'update_user', admin_id: adminId, target_user_id: id, metadata: payload }]);
    } catch (auditErr) { console.warn('[admin/updateUser] audit failed', auditErr); }

    return res.json({ success: true, user: data });
  } catch (ex) {
    console.error('[admin/updateUser] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// Admin: delete user (DELETE /api/admin/users/:id)
export const deleteUser: RequestHandler = async (req, res) => {
  const chk = await requireAdmin(req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  const id = String(req.params.id || '');
  if (!id) return res.status(400).json({ error: 'user id required' });
  try {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message || 'Failed to delete user' });

    try {
      const adminId = String((chk.user && (chk.user as any).id) || (req.headers['x-user-id'] || ''));
      await supabase.from('admin_audit').insert([{ action: 'delete_user', admin_id: adminId, target_user_id: id, metadata: {} }]);
    } catch (auditErr) { console.warn('[admin/deleteUser] audit failed', auditErr); }

    return res.json({ success: true });
  } catch (ex) {
    console.error('[admin/deleteUser] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};
