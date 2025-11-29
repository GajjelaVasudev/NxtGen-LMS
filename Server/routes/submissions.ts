import { RequestHandler } from "express";
import { supabase } from "../supabaseClient.js";
import multer from 'multer';

// Local Multer file type to avoid depending on ambient module augmentations
type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
};

// Configure multer to store uploads in memory, with a reasonable default limit
const DEFAULT_MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES || String(10 * 1024 * 1024)); // 10MB
const uploadStorage = multer.memoryStorage();
const uploadMiddleware = multer({ storage: uploadStorage, limits: { fileSize: DEFAULT_MAX_BYTES } }).single('file');

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
    // Require userId in the request body for demo/user-based auth (no bearer token required)
    // If multipart/form-data we need to run multer to populate req.file and req.body
    let multerRan = false;
    if (String(req.headers['content-type'] || '').startsWith('multipart/')) {
      await new Promise<void>((resolve, reject) => {
        uploadMiddleware(req as any, res as any, (err: any) => {
          multerRan = true;
          if (err) return reject(err);
          return resolve();
        });
      }).catch((multerErr: any) => {
        console.warn('[submit] multer error', multerErr?.code || String(multerErr));
        if (multerErr && multerErr.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ success: false, error: `File too large. Maximum allowed size is ${Math.round(DEFAULT_MAX_BYTES / 1024 / 1024)}MB.` });
        }
        return res.status(400).json({ success: false, error: 'Failed to parse file upload' });
      });
      // If multer already sent a response (e.g. LIMIT_FILE_SIZE), stop processing
      if (res.headersSent) return;
    }

    let userId = String(req.body?.userId || "");
    if (!userId) return res.status(401).json({ success: false, error: "Missing userId in body (students must include their user.id)" });
    if (!userId.includes('-')) {
      const { canonicalizeUserId } = await import("../utils/userHelpers.js");
      const canonical = await canonicalizeUserId(userId);
      if (!canonical) return res.status(401).json({ success: false, error: "userId could not be canonicalized" });
      userId = canonical;
    }

    const content = req.body.content || {};

    // If a file was uploaded via multipart form-data, handle uploading it to Supabase Storage
    if (multerRan && (req as any).file) {
      try {
        const file = (req as any).file as MulterFile;
        const bucket = process.env.SUPABASE_SUBMISSIONS_BUCKET || 'submissions';
        const safeName = (file.originalname || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${assignmentId}/${userId}/${Date.now()}-${safeName}`;

        // upload to supabase storage (buffer)
        const { data: uploadData, error: uploadErr } = await supabase.storage.from(bucket).upload(filePath, file.buffer as Buffer, { contentType: file.mimetype });
        if (uploadErr) {
          console.error('[submit] supabase storage upload error', uploadErr);
          const safeMessage = process.env.NODE_ENV === 'production' ? 'Failed to store uploaded file' : `Failed to store uploaded file: ${uploadErr?.message || String(uploadErr)}`;
          return res.status(500).json({ success: false, error: safeMessage, details: uploadErr });
        }

        // Store the internal storage path (do not expose a public URL here)
        content.filePath = filePath;
        content.fileName = file.originalname;
        content.fileSize = file.size;
        content.fileMime = file.mimetype;
      } catch (e: any) {
        console.error('[submit] failed handling uploaded file', e);
        return res.status(500).json({ success: false, error: 'Failed to process uploaded file' });
      }
    }

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
      // Expect instructorId (user id) to be provided as a query parameter or body value.
      let instructorId = String(req.query.userId || req.query.instructorId || req.body?.userId || '');
      if (!instructorId) return res.status(401).json({ success: false, error: 'Missing instructor userId in request' });
      // Verify role in DB
      const { data: userRow, error: userErr } = await supabase.from('users').select('id, role').eq('id', instructorId).maybeSingle();
      if (userErr || !userRow) return res.status(401).json({ success: false, error: 'Instructor not found' });
      const role = String((userRow as any).role || '');
      if (role !== 'instructor' && role !== 'admin') return res.status(403).json({ success: false, error: 'instructor role required' });

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
    // prefer explicit public/absolute URL fields
    const url = content.imageUrl || content.fileUrl || content.file_url || content.url || null;
    // If no explicit public URL, but we have an internal storage path (filePath), attempt to generate a signed URL
    const filePath = content.filePath || content.file_path || null;
    if (!url && !filePath) return res.status(404).json({ success: false, error: 'No file attached to submission' });

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

    // If we have an explicit absolute URL, redirect immediately
    if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      return res.redirect(url);
    }

    // If we have an internal storage path, try to create a signed URL from Supabase Storage
    if (!url && filePath) {
      try {
        const bucket = process.env.SUPABASE_SUBMISSIONS_BUCKET || 'submissions';
        // create a short-lived signed URL (60s)
        const signedTtl = Number(process.env.SUBMISSION_SIGNED_URL_TTL || '60');
        const { data: signedData, error: signedErr } = await supabase.storage.from(bucket).createSignedUrl(filePath, signedTtl);
        if (signedErr) {
          console.error('[submission/file] createSignedUrl error', signedErr);
        } else if (signedData && (signedData.signedURL || signedData.signedUrl || signedData.signed_url)) {
          const signedUrl = (signedData.signedURL || signedData.signedUrl || signedData.signed_url);
          return res.redirect(signedUrl);
        }
        // Fallback to getPublicUrl if createSignedUrl not available or failed
        const { data: pubData, error: pubErr } = await supabase.storage.from(bucket).getPublicUrl(filePath);
        if (pubErr) {
          console.error('[submission/file] getPublicUrl error', pubErr);
        } else if (pubData && (pubData.publicUrl || pubData.public_url)) {
          const pubUrl = (pubData.publicUrl || pubData.public_url);
          return res.redirect(pubUrl);
        }
      } catch (e: any) {
        console.error('[submission/file] error generating storage URL', e);
      }
      // If we reach here, continue to other handlers which may attempt to serve file locally
    }

    // Otherwise, treat as relative path under public/ or uploads/ - attempt to serve
    const path = await import('path');
    const fs = await import('fs');
    const root = path.join(process.cwd(), 'public');
    const localPath = path.join(root, url as string);
    // ensure localPath is within root
    if (!localPath.startsWith(root)) return res.status(400).json({ success: false, error: 'Invalid file path' });
    if (!fs.existsSync(localPath)) return res.status(404).json({ success: false, error: 'File not found on server' });
    return res.sendFile(localPath);
  } catch (err: any) {
    console.error('[submission/file] unexpected error', err);
    return res.status(500).json({ success: false, error: 'Unexpected server error' });
  }
};

// PATCH /api/submissions/:submissionId/grade
export const gradeSubmission: RequestHandler = async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    // Expect graderId to be provided in the request body (no bearer token required)
    let graderId = String(req.body?.graderId || req.body?.userId || req.query?.userId || '');
    if (!graderId) return res.status(401).json({ success: false, error: 'Missing graderId in request' });
    if (!graderId.includes('-')) {
      const { canonicalizeUserId } = await import('../utils/userHelpers.js');
      const canonical = await canonicalizeUserId(graderId);
      if (!canonical) return res.status(401).json({ success: false, error: 'graderId could not be canonicalized' });
      graderId = canonical;
    }
    // verify role from DB
    const { data: graderRow, error: graderErr } = await supabase.from('users').select('id, role').eq('id', graderId).maybeSingle();
    if (graderErr || !graderRow) return res.status(401).json({ success: false, error: 'Grader not found' });
    const role = String((graderRow as any).role || '');
    console.log('[grade] incoming', { submissionId, graderId, role, body: req.body });

    // Validate presence of identifiers
    if (!submissionId) {
      console.error('[grade] missing submissionId');
      return res.status(400).json({ success: false, message: 'submissionId required' });
    }

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
    // Use provided updaterId (no bearer token required)
    let updaterId = String(req.body?.updaterId || req.body?.userId || req.query?.userId || '');
    if (!updaterId) return res.status(401).json({ success: false, error: 'Missing updaterId in request' });
    if (!updaterId.includes('-')) {
      const { canonicalizeUserId } = await import('../utils/userHelpers.js');
      const canonical = await canonicalizeUserId(updaterId);
      if (!canonical) return res.status(401).json({ success: false, error: 'updaterId could not be canonicalized' });
      updaterId = canonical;
    }
    const { data: updaterRow, error: updaterErr } = await supabase.from('users').select('id, role').eq('id', updaterId).maybeSingle();
    if (updaterErr || !updaterRow) return res.status(401).json({ success: false, error: 'Updater not found' });
    const role = String((updaterRow as any).role || '');
    if (!role || (role !== 'instructor' && role !== 'admin')) {
      return res.status(403).json({ success: false, error: 'Only instructors or admins can grade submissions' });
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

// GET /api/instructor/summary
export const getInstructorSummary: RequestHandler = async (req, res) => {
  try {
    // Accept instructorId from query or body and verify role in DB (no bearer token required)
    let instructorId = String(req.query.userId || req.query.instructorId || req.body?.userId || '');
    if (!instructorId) return res.status(401).json({ success: false, error: 'Missing instructor userId in request' });
    if (!instructorId.includes('-')) {
      const { canonicalizeUserId } = await import('../utils/userHelpers.js');
      const canonical = await canonicalizeUserId(instructorId);
      if (!canonical) return res.status(401).json({ success: false, error: 'instructorId could not be canonicalized' });
      instructorId = canonical;
    }
    const { data: userRow, error: userErr } = await supabase.from('users').select('id, role').eq('id', instructorId).maybeSingle();
    if (userErr || !userRow) return res.status(401).json({ success: false, error: 'Instructor not found' });
    const role = String((userRow as any).role || '');
    if (role !== 'instructor' && role !== 'admin') return res.status(403).json({ success: false, error: 'instructor role required' });

    // Fetch instructor's courses
    const { data: courses = [], error: coursesErr } = await supabase.from('courses').select('*').eq('owner_id', instructorId).order('updated_at', { ascending: false });
    if (coursesErr) {
      console.error('[instructor/summary] courses lookup error', coursesErr);
      return res.status(500).json({ success: false, error: coursesErr.message });
    }

    const courseIds = (courses as any[]).map(c => c.id).filter(Boolean);

    // Fetch assignments created by instructor
    const { data: assignments = [], error: assignErr } = await supabase.from('assignments').select('id, course_id').eq('created_by', instructorId);
    if (assignErr) {
      console.error('[instructor/summary] assignments lookup error', assignErr);
      return res.status(500).json({ success: false, error: assignErr.message });
    }
    const assignmentIds = (assignments as any[]).map(a => a.id).filter(Boolean);

    // Pending submissions (not graded)
    let pendingCount = 0;
    if (assignmentIds.length > 0) {
      const { data: pending = [], error: pendingErr } = await supabase.from('assignment_submissions').select('id').in('assignment_id', assignmentIds).is('graded_by', null);
      if (pendingErr) {
        console.error('[instructor/summary] pending submissions lookup error', pendingErr);
        return res.status(500).json({ success: false, error: pendingErr.message });
      }
      pendingCount = (pending as any[]).length;
    }

    // Enrollments for these courses
    let totalEnrolled = 0;
    const enrollmentCounts: Record<string, number> = {};
    if (courseIds.length > 0) {
      const { data: enrolls = [], error: enrollErr } = await supabase.from('enrollments').select('course_id, user_id').in('course_id', courseIds);
      if (enrollErr) {
        console.error('[instructor/summary] enrollments lookup error', enrollErr);
        return res.status(500).json({ success: false, error: enrollErr.message });
      }
      const uniqueStudents = new Set<string>();
      (enrolls as any[]).forEach(e => {
        const cid = e.course_id;
        const uid = e.user_id;
        if (!cid) return;
        enrollmentCounts[cid] = (enrollmentCounts[cid] || 0) + 1;
        if (uid) uniqueStudents.add(uid);
      });
      totalEnrolled = uniqueStudents.size;
    }

    // Average rating across courses (if rating field exists)
    let avgRating: number | null = null;
    try {
      const ratings = (courses as any[]).map(c => Number(c.rating)).filter(r => !Number.isNaN(r));
      if (ratings.length > 0) {
        avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      }
    } catch (_) { avgRating = null; }

    const recentCourses = (courses as any[]).slice(0, 8).map(c => ({
      id: c.id,
      title: c.title,
      status: c.status || c.published ? 'published' : 'draft',
      enrollment_count: enrollmentCounts[c.id] || 0,
      updated_at: c.updated_at,
    }));

    return res.json({
      success: true,
      data: {
        instructorId,
        activeCourses: (courses as any[]).length,
        totalEnrolled,
        pendingSubmissions: pendingCount,
        avgRating,
        recentCourses,
      }
    });
  } catch (err: any) {
    console.error('[instructor/summary] unexpected error', err);
    return res.status(500).json({ success: false, error: 'Unexpected server error' });
  }
};

export default {};
