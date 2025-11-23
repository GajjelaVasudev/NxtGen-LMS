import { RequestHandler } from "express";
import { supabase } from "../supabaseClient.js";

// GET /api/assignments?courseId=<id>
export const getAssignments: RequestHandler = async (req, res) => {
  try {
    const courseId = String(req.query.courseId || "");
    if (!courseId) return res.status(400).json({ success: false, error: "courseId query parameter is required" });

    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });

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

    // Determine creator from header (demo auth). In production use JWT/session.
    const creatorId = String(req.headers["x-user-id"] || req.headers["x-userid"] || "");
    if (!creatorId) return res.status(401).json({ success: false, error: "Missing x-user-id header (sender)" });

    // Verify user role (only instructor or admin allowed to create)
    const { data: userData, error: userErr } = await supabase.from("users").select("role").eq("id", creatorId).single();
    if (userErr) {
      console.error("Supabase user lookup error:", userErr);
      return res.status(500).json({ success: false, error: "Failed to verify user role" });
    }
    const role = (userData as any)?.role;
    if (!role || (role !== "instructor" && role !== "admin")) {
      return res.status(403).json({ success: false, error: "Only instructors or admins can create assignments" });
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

export default {};
