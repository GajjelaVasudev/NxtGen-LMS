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

    console.log("[submit] listUserSubmissions for userId:", userId);
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
    console.log("[submit] listAssignmentSubmissions for assignmentId:", assignmentId);
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
    console.log("[submit] incoming");
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

    // idempotency: avoid creating duplicate submission for same assignment+user
    try {
      const { data: existing } = await supabase.from("assignment_submissions").select("*").eq("assignment_id", assignmentId).eq("user_id", userId).maybeSingle();
      if (existing) {
        console.log("[submit] submission already exists for", { assignmentId, userId });
        return res.status(200).json({ success: true, data: existing, alreadyExists: true });
      }
    } catch (e) {
      // continue to insert if check fails
    }

    const { data, error } = await supabase.from("assignment_submissions").insert([row]).select().single();
    if (error) {
      console.error("Supabase createSubmission error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
    console.log("[submit] stored submission", { id: (data as any)?.id, assignmentId, userId });
    return res.status(201).json({ success: true, data });
  } catch (err: any) {
    console.error("Unexpected createSubmission error:", err);
    return res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};

// POST /api/assignments/:id/submit  (convenience wrapper)
export const submitAssignment: RequestHandler = async (req, res, next) => {
  // normalize param name and delegate to createSubmission
  try {
    (req as any).params.assignmentId = (req as any).params.id || (req as any).params.assignmentId;
    return await createSubmission(req, res, next as any);
  } catch (err) {
    return next && next(err);
  }
};

// GET /api/instructor/submissions?courseId=<id>
export const listInstructorSubmissions: RequestHandler = async (req, res) => {
  try {
    console.log('[instructor/submissions] incoming');
    let instructorId = String(req.headers['x-user-id'] || req.query.instructorId || "");
    console.log('[instructor/submissions] instructorId raw:', instructorId);
    if (!instructorId) return res.status(403).json({ success: false, error: 'Forbidden: missing x-user-id header (instructor required)' });
    if (!instructorId.includes('-')) {
      const { canonicalizeUserId } = await import('../utils/userHelpers.js');
      const canonical = await canonicalizeUserId(instructorId);
      if (!canonical) return res.status(401).json({ success: false, error: 'instructorId could not be canonicalized' });
      instructorId = canonical;
    }

    const courseId = String(req.query.courseId || "");

    // Fetch assignments created by this instructor (optionally filter by course)
    let assignmentsQuery = supabase.from('assignments').select('*').eq('created_by', instructorId).order('created_at', { ascending: false });
    if (courseId) assignmentsQuery = assignmentsQuery.eq('course_id', courseId);
    const { data: assignments, error: assignErr } = await assignmentsQuery;
    if (assignErr) {
      console.error('[instructor/submissions] DB error: assignments lookup', assignErr);
      return res.status(500).json({ success: false, error: assignErr.message });
    }
    const assignList: any[] = assignments || [];
    if (assignList.length === 0) {
      console.log('[instructor/submissions] returning 0 results');
      return res.json({ success: true, submissions: [] });
    }

    const assignmentIds = assignList.map(a => a.id);

    const { data: subs, error: subsErr } = await supabase.from('assignment_submissions').select('*').in('assignment_id', assignmentIds).order('submitted_at', { ascending: false });
    if (subsErr) {
      console.error('[instructor/submissions] DB error: submissions lookup', subsErr);
      return res.status(500).json({ success: false, error: subsErr.message });
    }
    const submissions = subs || [];

    const userIds = Array.from(new Set(submissions.map((s: any) => s.user_id)));
    const { data: users } = await supabase.from('users').select('id, email, name').in('id', userIds as string[]);
    const userMap: Record<string, any> = {};
    (users || []).forEach((u: any) => userMap[u.id] = u);

    const assignMap: Record<string, any> = {};
    assignList.forEach((a: any) => assignMap[a.id] = a);

    const out = (submissions as any[]).map(s => ({
      submissionId: s.id,
      studentName: userMap[s.user_id]?.name || userMap[s.user_id]?.email || s.user_id,
      studentEmail: userMap[s.user_id]?.email || null,
      assignmentId: s.assignment_id,
      assignmentTitle: assignMap[s.assignment_id]?.title || "",
      submitted_at: s.submitted_at,
      grade: s.grade ?? null,
      feedback: s.feedback ?? null,
      raw: s
    }));

    console.log(`[instructor/submissions] returning ${out.length} results for instructorId=${instructorId}`);
    return res.json({ success: true, submissions: out });
  } catch (err: any) {
    console.error('[instructor/submissions] unexpected error', err);
    return res.status(500).json({ success: false, error: 'Unexpected server error' });
  }
};

// PATCH /api/submissions/:submissionId/grade
export const gradeSubmission: RequestHandler = async (req, res) => {
  try {
    console.log('[grade] incoming');
    const submissionId = req.params.submissionId;
    let graderId = String(req.headers['x-user-id'] || "");
    if (!graderId) return res.status(401).json({ success: false, error: 'Missing x-user-id header' });
    if (!graderId.includes('-')) {
      const { canonicalizeUserId } = await import('../utils/userHelpers.js');
      const canonical = await canonicalizeUserId(graderId);
      if (!canonical) return res.status(401).json({ success: false, error: 'graderId could not be canonicalized' });
      graderId = canonical;
    }

    // Verify role
    const { data: userData, error: userErr } = await supabase.from('users').select('role').eq('id', graderId).single();
    if (userErr) {
      console.error('[grade] user lookup error', userErr);
      return res.status(500).json({ success: false, error: 'Failed to verify grader' });
    }
    const role = (userData as any)?.role;
    if (!role || (role !== 'instructor' && role !== 'admin')) {
      return res.status(403).json({ success: false, error: 'Only instructors or admins can grade submissions' });
    }

    const payload = req.body || {};
    const update: any = {};
    if (typeof payload.grade !== 'undefined') update.grade = payload.grade;
    if (typeof payload.feedback !== 'undefined') update.feedback = payload.feedback;
    if (Object.keys(update).length === 0) return res.status(400).json({ success: false, error: 'No update fields provided' });

    update.graded_by = graderId;
    update.graded_at = new Date().toISOString();
    update.status = 'graded';

    const { data, error } = await supabase.from('assignment_submissions').update(update).eq('id', submissionId).select().single();
    if (error) {
      console.error('[grade] Supabase update error', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log('[grade] updated submission', submissionId);
    return res.json({ success: true, data });
  } catch (err: any) {
    console.error('[grade] unexpected error', err);
    return res.status(500).json({ success: false, error: 'Unexpected server error' });
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
