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

    // Determine creator from bearer token
    const authChk = await requireAuth(req);
    if (!authChk.ok) return res.status(authChk.status).json({ success: false, error: authChk.msg });
    let creatorId = String((authChk.user as any).id || '');
    const role = String((authChk.user as any).role || '');
    if (!creatorId) return res.status(401).json({ success: false, error: 'Missing authenticated user' });
    if (role !== 'instructor' && role !== 'admin') return res.status(403).json({ success: false, error: 'Only instructors or admins can create assignments' });

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
    const authChk = await requireAuth(req);
    if (!authChk.ok) return res.status(authChk.status).json({ success: false, error: authChk.msg });
    const updaterId = String((authChk.user as any).id || '');
    const role = String((authChk.user as any).role || '');
    if (!updaterId) return res.status(401).json({ success: false, error: 'Missing authenticated user (updater)' });
    if (role !== 'instructor' && role !== 'admin') return res.status(403).json({ success: false, error: 'Only instructors or admins can update assignments' });

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
