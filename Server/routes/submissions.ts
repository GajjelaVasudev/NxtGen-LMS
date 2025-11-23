import { RequestHandler } from "express";
import { supabase } from "../supabaseClient.js";

// GET /api/submissions?userId=<id>
export const listUserSubmissions: RequestHandler = async (req, res) => {
  try {
    let userId = String(req.query.userId || "");
    if (!userId) return res.status(400).json({ success: false, error: "userId required" });

    if (!userId.includes('-')) {
      const { canonicalizeUserId } = await import("../utils/userHelpers.js");
      const canonical = await canonicalizeUserId(userId);
      if (!canonical) return res.status(400).json({ success: false, error: "userId could not be canonicalized" });
      userId = canonical;
    }

    const { data, error } = await supabase.from("assignment_submissions").select("*").eq("user_id", userId).order("submitted_at", { ascending: false });
    if (error) {
      console.error("Supabase listUserSubmissions error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    console.error("Unexpected listUserSubmissions error:", err);
    return res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};

// GET /api/assignments/:assignmentId/submissions
export const listAssignmentSubmissions: RequestHandler = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;
    const { data, error } = await supabase.from("assignment_submissions").select("*").eq("assignment_id", assignmentId).order("submitted_at", { ascending: false });
    if (error) {
      console.error("Supabase listAssignmentSubmissions error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    console.error("Unexpected listAssignmentSubmissions error:", err);
    return res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};

// POST /api/assignments/:assignmentId/submissions
export const createSubmission: RequestHandler = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;
    let userId = String(req.headers["x-user-id"] || req.body.userId || "");
    if (!userId) return res.status(401).json({ success: false, error: "Missing x-user-id header" });
    if (!userId.includes('-')) {
      const { canonicalizeUserId } = await import("../utils/userHelpers.js");
      const canonical = await canonicalizeUserId(userId);
      if (!canonical) return res.status(401).json({ success: false, error: "x-user-id could not be canonicalized" });
      userId = canonical;
    }

    const content = req.body.content || {};

    const row: any = {
      assignment_id: assignmentId,
      user_id: userId,
      content,
      submitted_at: new Date().toISOString(),
      status: "submitted",
    };

    const { data, error } = await supabase.from("assignment_submissions").insert([row]).select().single();
    if (error) {
      console.error("Supabase createSubmission error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.status(201).json({ success: true, data });
  } catch (err: any) {
    console.error("Unexpected createSubmission error:", err);
    return res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};

// PUT /api/submissions/:submissionId  -- grade/update
export const updateSubmission: RequestHandler = async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    const updaterId = String(req.headers["x-user-id"] || "");
    if (!updaterId) return res.status(401).json({ success: false, error: "Missing x-user-id header" });

    // Verify updater role (must be instructor or admin)
    const { data: userData, error: userErr } = await supabase.from("users").select("role").eq("id", updaterId).single();
    if (userErr) {
      console.error("Supabase user lookup error:", userErr);
      return res.status(500).json({ success: false, error: "Failed to verify updater" });
    }
    const role = (userData as any)?.role;
    if (!role || (role !== "instructor" && role !== "admin")) {
      return res.status(403).json({ success: false, error: "Only instructors or admins can grade submissions" });
    }

    const payload = req.body || {};
    const update: any = {};
    if (typeof payload.grade !== "undefined") update.grade = payload.grade;
    if (typeof payload.feedback !== "undefined") update.feedback = payload.feedback;
    if (Object.keys(update).length === 0) return res.status(400).json({ success: false, error: "No update fields provided" });
    update.graded_by = updaterId;
    update.graded_at = new Date().toISOString();
    update.status = "graded";

    const { data, error } = await supabase.from("assignment_submissions").update(update).eq("id", submissionId).select().single();
    if (error) {
      console.error("Supabase updateSubmission error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true, data });
  } catch (err: any) {
    console.error("Unexpected updateSubmission error:", err);
    return res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};

export default {};
