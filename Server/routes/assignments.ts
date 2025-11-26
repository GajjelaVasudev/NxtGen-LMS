import { RequestHandler } from "express";
import { supabase } from "../supabaseClient.js";
import { requireAuth } from "./auth.js";

// GET /api/assignments?courseId=<id>
export const getAssignments: RequestHandler = async (req, res) => {
  try {
    const courseId = String(req.query.courseId || "");
    const creatorId = String(req.query.creatorId || "");

    let query = supabase.from("assignments").select("*").order("created_at", { ascending: false });

    if (courseId) {
      query = query.eq("course_id", courseId as string);
    } else if (creatorId) {
      query = query.eq("created_by", creatorId as string);
    } else {
      // If neither provided, return empty result to avoid exposing all assignments
      return res.json({ success: true, data: [] });
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase getAssignments error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    console.error("Unexpected getAssignments error:", err);
    return res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};

// GET /api/assignments/:id
export const getAssignment: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, error: "assignment id required" });

    const { data, error } = await supabase.from("assignments").select("*").eq("id", id).single();
    if (error) {
      console.error("Supabase getAssignment error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
    if (!data) return res.status(404).json({ success: false, error: "Assignment not found" });
    return res.json({ success: true, data });
  } catch (err: any) {
    console.error("Unexpected getAssignment error:", err);
    return res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};

// POST /api/assignments
// Body: { course_id, title, description, points?, due_at? }
export const createAssignment: RequestHandler = async (req, res) => {
  try {
    const payload = req.body || {};
    const course_id = payload.course_id || payload.courseId || payload.courseId;
    const title = payload.title;
    const description = payload.description || null;
    const points = payload.points ?? 100;
    const due_at = payload.due_at || payload.dueAt || null;

    if (!course_id) return res.status(400).json({ success: false, error: "course_id is required" });
    if (!title) return res.status(400).json({ success: false, error: "title is required" });

    // Determine creator: prefer bearer token, but allow demo fallbacks (body.userId, body.email, x-user-id)
    let creatorId = '';
    try {
      const authChk = await requireAuth(req);
      if (authChk.ok) creatorId = String((authChk.user as any).id || '');
    } catch (_) {}

    // Fallbacks: body.created_by, body.creatorId, body.userId, body.email, x-user-id header
    if (!creatorId) {
      const body = payload || {};
      const candidate = String(body.created_by || body.creatorId || body.userId || body.email || req.headers['x-user-id'] || '').trim();
      if (candidate) {
        let resolved = candidate;
        try {
          if (resolved.includes('@')) {
            const { getOrCreateUserInDb } = await import('./auth.js');
            const result = await getOrCreateUserInDb(resolved.toLowerCase());
            if (result && result.id) resolved = result.id;
            else return res.status(400).json({ success: false, error: 'Invalid creator email' });
          } else if (!resolved.includes('-')) {
            const { canonicalizeUserId } = await import('../utils/userHelpers.js');
            const canonical = await canonicalizeUserId(resolved);
            if (!canonical) return res.status(400).json({ success: false, error: 'creator identifier could not be canonicalized' });
            resolved = canonical;
          }
          creatorId = String(resolved);
        } catch (ex) {
          console.error('[createAssignment] failed to resolve creator candidate', ex);
          return res.status(500).json({ success: false, error: 'Failed to resolve creator identifier' });
        }
      }
    }

    if (!creatorId) return res.status(401).json({ success: false, error: 'Missing authenticated user (creator) or creator identifier' });

    // Verify role
    try {
      const { data: userRow, error: userErr } = await supabase.from('users').select('id, role').eq('id', creatorId).maybeSingle();
      if (userErr) {
        console.error('[createAssignment] user lookup error', userErr);
        return res.status(500).json({ success: false, error: 'Failed to verify creator' });
      }
      if (!userRow) return res.status(401).json({ success: false, error: 'Creator user not found' });
      const role = String((userRow as any).role || '');
      if (role !== 'instructor' && role !== 'admin') return res.status(403).json({ success: false, error: 'Only instructors or admins can create assignments' });
    } catch (ex) {
      console.error('[createAssignment] unexpected role verify error', ex);
      return res.status(500).json({ success: false, error: 'Failed to verify creator role' });
    }

    const insertRow: any = {
      course_id,
      title,
      description,
      points,
      created_by: creatorId,
    };
    if (due_at) insertRow.due_at = due_at;

    const { data, error } = await supabase.from("assignments").insert([insertRow]).select().single();

    if (error) {
      console.error("Supabase insert assignment error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (err: any) {
    console.error("Unexpected createAssignment error:", err);
    return res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};

// PUT /api/assignments/:id
export const updateAssignment: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, error: "assignment id required" });

    const payload = req.body || {};
    // Determine updater: prefer bearer token, allow demo fallbacks
    let updaterId = '';
    try {
      const authChk = await requireAuth(req);
      if (authChk.ok) updaterId = String((authChk.user as any).id || '');
    } catch (_) {}

    if (!updaterId) {
      const candidate = String(req.headers['x-user-id'] || req.body?.userId || req.body?.updaterId || '').trim();
      if (candidate) {
        let resolved = candidate;
        try {
          if (resolved.includes('@')) {
            const { getOrCreateUserInDb } = await import('./auth.js');
            const result = await getOrCreateUserInDb(resolved.toLowerCase());
            if (result && result.id) resolved = result.id;
            else return res.status(400).json({ success: false, error: 'Invalid updater email' });
          } else if (!resolved.includes('-')) {
            const { canonicalizeUserId } = await import('../utils/userHelpers.js');
            const canonical = await canonicalizeUserId(resolved);
            if (!canonical) return res.status(400).json({ success: false, error: 'updater identifier could not be canonicalized' });
            resolved = canonical;
          }
          updaterId = String(resolved);
        } catch (ex) {
          console.error('[updateAssignment] failed to resolve updater candidate', ex);
          return res.status(500).json({ success: false, error: 'Failed to resolve updater identifier' });
        }
      }
    }

    if (!updaterId) return res.status(401).json({ success: false, error: 'Missing authenticated user (updater) or updater identifier' });

    try {
      const { data: userRow, error: userErr } = await supabase.from('users').select('id, role').eq('id', updaterId).maybeSingle();
      if (userErr) {
        console.error('[updateAssignment] user lookup error', userErr);
        return res.status(500).json({ success: false, error: 'Failed to verify updater' });
      }
      if (!userRow) return res.status(401).json({ success: false, error: 'Updater user not found' });
      const role = String((userRow as any).role || '');
      if (role !== 'instructor' && role !== 'admin') return res.status(403).json({ success: false, error: 'Only instructors or admins can update assignments' });
    } catch (ex) {
      console.error('[updateAssignment] unexpected role verify error', ex);
      return res.status(500).json({ success: false, error: 'Failed to verify updater role' });
    }

    const update: any = {};
    if (typeof payload.title !== "undefined") update.title = payload.title;
    if (typeof payload.description !== "undefined") update.description = payload.description;
    if (typeof payload.points !== "undefined") update.points = payload.points;
    if (typeof payload.due_at !== "undefined") update.due_at = payload.due_at;

    if (Object.keys(update).length === 0) return res.status(400).json({ success: false, error: "No update fields provided" });

    update.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from("assignments").update(update).eq("id", id).select().single();
    if (error) {
      console.error("Supabase update assignment error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    console.error("Unexpected updateAssignment error:", err);
    return res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};

export default {};
