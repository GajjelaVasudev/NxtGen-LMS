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

// GET /api/submissions/:submissionId/file
export const getSubmissionFile: RequestHandler = async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    console.log('[submission/file] incoming for', submissionId);
    const { data: submission, error } = await supabase.from('assignment_submissions').select('*').eq('id', submissionId).maybeSingle();
    if (error) {
      console.error('[submission/file] DB error', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    if (!submission) return res.status(404).json({ success: false, error: 'Submission not found' });

    const content = (submission as any).content || {};
    const url = content.imageUrl || content.fileUrl || content.file_url || content.url || null;
    if (!url) return res.status(404).json({ success: false, error: 'No file attached to submission' });

    // If the url is a data URL (base64), return it as a download
    if (typeof url === 'string' && url.startsWith('data:')) {
      // data:[<mediatype>][;base64],<data>
      const matches = url.match(/^data:(.+?);base64,(.+)$/);
      if (!matches) return res.status(400).json({ success: false, error: 'Invalid data URL' });
      const mime = matches[1] || 'application/octet-stream';
      const b64 = matches[2] || '';
      const buf = Buffer.from(b64, 'base64');
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Length', String(buf.length));
      // attachment with filename derived from submission id
      res.setHeader('Content-Disposition', `attachment; filename="submission-${submissionId}"`);
      return res.send(buf);
    }

    // If the url is an absolute http(s) URL, redirect
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      return res.redirect(url);
    }

    // Otherwise, treat as relative path under public/ or uploads/ - attempt to serve
    const path = await import('path');
    const fs = await import('fs');
    const root = path.join(process.cwd(), 'public');
    const filePath = path.join(root, url as string);
    // ensure filePath is within root
    if (!filePath.startsWith(root)) return res.status(400).json({ success: false, error: 'Invalid file path' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'File not found on server' });
    return res.sendFile(filePath);
  } catch (err: any) {
    console.error('[submission/file] unexpected error', err);
    return res.status(500).json({ success: false, error: 'Unexpected server error' });
  }
};

// PATCH /api/submissions/:submissionId/grade
export const gradeSubmission: RequestHandler = async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    let graderId = String(req.headers['x-user-id'] || "");
    console.log('[grade] incoming', { submissionId, graderId, body: req.body });

    // Validate presence of identifiers
    if (!submissionId) {
      console.error('[grade] missing submissionId');
      return res.status(400).json({ success: false, message: 'submissionId required' });
    }
    if (!graderId) {
      console.error('[grade] missing x-user-id header');
      return res.status(400).json({ success: false, message: 'Missing x-user-id header' });
    }

    if (!graderId.includes('-')) {
      const { canonicalizeUserId } = await import('../utils/userHelpers.js');
      const canonical = await canonicalizeUserId(graderId);
      if (!canonical) {
        console.error('[grade] graderId could not be canonicalized', { graderId });
        return res.status(400).json({ success: false, message: 'Invalid grader id' });
      }
      graderId = canonical;
    }
    // Verify grader exists and role
    const { data: userData, error: userErr } = await supabase.from('users').select('role').eq('id', graderId).maybeSingle();
    if (userErr) {
      console.error('[grade] user lookup error', userErr);
      return res.status(500).json({ success: false, error: 'Failed to verify grader' });
    }
    const role = (userData as any)?.role;
    if (!role) return res.status(403).json({ success: false, error: 'Forbidden: grader not found' });

    const payload = req.body || {};
    const update: any = {};
    // Validate grade if provided
    if (typeof payload.grade !== 'undefined') {
      const gradeNumber = Number(payload.grade);
      if (Number.isNaN(gradeNumber)) {
        console.error('[grade] invalid grade value', { grade: payload.grade });
        return res.status(400).json({ success: false, message: 'Invalid grade' });
      }
      update.grade = gradeNumber;
    }
    if (typeof payload.feedback !== 'undefined') update.feedback = payload.feedback;
    if (Object.keys(update).length === 0) return res.status(400).json({ success: false, message: 'No update fields provided' });

    // Fetch submission and related assignment to verify permission and existence
    const { data: existingSubmission, error: subErr } = await supabase.from('assignment_submissions').select('*').eq('id', submissionId).maybeSingle();
    if (subErr) {
      console.error('[grade] submission lookup error', subErr);
      return res.status(500).json({ success: false, error: 'Failed to lookup submission' });
    }
    if (!existingSubmission) return res.status(404).json({ success: false, error: 'Submission not found' });

    const assignmentId = (existingSubmission as any).assignment_id;
    const { data: assignmentRow, error: assignErr } = await supabase.from('assignments').select('*').eq('id', assignmentId).maybeSingle();
    if (assignErr) {
      console.error('[grade] assignment lookup error', assignErr);
      return res.status(500).json({ success: false, error: 'Failed to lookup assignment' });
    }

    // Instructor must be assignment creator OR admin
    if (role !== 'admin') {
      if (!assignmentRow) return res.status(400).json({ success: false, error: 'Assignment not found for submission' });
      const createdBy = (assignmentRow as any).created_by;
      if (createdBy !== graderId) {
        return res.status(403).json({ success: false, error: 'Forbidden: you do not own this assignment' });
      }
    }

    update.graded_by = graderId;
    update.graded_at = new Date().toISOString();

    // Perform update and log result
    let { data, error } = await supabase
      .from('assignment_submissions')
      .update(update)
      .eq('id', submissionId)
      .select()
      .maybeSingle();

    // redact large binary/content fields from logs to avoid enormous output
    const safeData = data ? ({ ...data, content: '[redacted]' }) : data;
    console.log('[grade] supabase update result', { data: safeData, error });

    // If schema cache error complaining about missing column(s), strip them and retry once
    if (error && (error as any).code === 'PGRST204' && typeof (error as any).message === 'string') {
      const msg: string = (error as any).message;
      // extract quoted identifiers like 'feedback' from the message
      const missing: string[] = [];
      const re = /'([^']+)'/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(msg)) !== null) {
        const col = m[1];
        // only consider columns present in our update payload
        if (col in update) missing.push(col);
      }
      if (missing.length > 0) {
        console.warn('[grade] supabase reported missing columns, removing and retrying update', { missing });
        for (const c of missing) delete update[c];

        if (Object.keys(update).length === 0) {
          console.error('[grade] no updatable columns remain after removing missing columns', { missing });
          return res.status(500).json({ success: false, message: 'Database schema missing required columns for grading. Please add the grade/feedback/graded_by/graded_at columns to the assignment_submissions table.' });
        }

        // retry update once
        const retry = await supabase
          .from('assignment_submissions')
          .update(update)
          .eq('id', submissionId)
          .select()
          .maybeSingle();
        data = retry.data;
        error = retry.error;
        const safeRetryData = data ? ({ ...data, content: '[redacted]' }) : data;
        console.log('[grade] retry supabase update result', { data: safeRetryData, error });
      }
    }

    if (error) {
      console.error('[grade] supabase error', error);
      return res.status(500).json({ success: false, message: 'Failed to save grade', error: error.message ?? String(error) });
    }
    if (!data) {
      console.error('[grade] no rows updated for submissionId', submissionId);
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    console.log('[grade] updated submission', submissionId);

    // Build response payload with canonical fields
    const assignmentTitle = assignmentRow ? (assignmentRow as any).title : null;
    const resp = {
      id: data.id,
      assignment_id: data.assignment_id,
      assignment_title: assignmentTitle,
      user_id: data.user_id,
      grade: data.grade ?? null,
      feedback: data.feedback ?? null,
      graded_by: data.graded_by ?? graderId,
      graded_at: data.graded_at ?? new Date().toISOString(),
    };

    return res.json({ success: true, data: resp });
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
