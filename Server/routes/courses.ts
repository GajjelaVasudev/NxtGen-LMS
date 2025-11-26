import { RequestHandler } from "express";
import { supabase } from "../supabaseClient.js";
import { requireAuth } from "./auth.js";

// GET /api/courses
export const getCourses: RequestHandler = async (_req, res) => {
  try {
    const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Supabase getCourses error:", error);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ courses: data || [] });
  } catch (err: any) {
    console.error("Unexpected getCourses error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
};

// GET /api/courses/:id
export const getCourse: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'course id required' });
    const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
    if (error) {
      // PostgREST returns PGRST116 for "No rows" when using single(); treat as 404
      const code = String((error as any)?.code || '');
      if (code === "PGRST116" || /no rows/.test(String(error?.message || '').toLowerCase())) {
        return res.status(404).json({ error: "Course not found" });
      }
      console.error("Supabase getCourse error:", error);
      return res.status(500).json({ error: error.message || 'Database error' });
    }
    if (!data) return res.status(404).json({ error: "Course not found" });
    return res.json({ course: data });
  } catch (err: any) {
    console.error("Unexpected getCourse error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
};

// POST /api/courses
export const createCourse: RequestHandler = async (req, res) => {
  try {
    const payload = req.body || {};
    // Prefer authenticated user via bearer token, but allow demo/server flows to supply
    // an explicit owner via body.owner_id, body.userId, or body.email. We will resolve
    // the provided identifier to a canonical DB UUID and verify the user's role.
    let creator = '';
    try {
      const authChk = await requireAuth(req);
      if (authChk.ok) creator = String((authChk.user as any).id || '');
    } catch (e) {
      // ignore - we'll attempt fallback below
    }

    // Fallbacks: owner_id, userId, email, x-user-id header
    if (!creator) {
      const body = payload || {};
      const candidate = String(body.owner_id || body.ownerId || body.userId || body.email || req.headers['x-user-id'] || '').trim();
      if (candidate) {
        let resolved = candidate;
        try {
          if (resolved.includes('@')) {
            // email -> ensure DB user exists
            const { getOrCreateUserInDb } = await import("./auth.js");
            const result = await getOrCreateUserInDb(resolved.toLowerCase());
            if (result && result.id) resolved = result.id;
            else {
              console.error('[createCourse] failed to resolve owner email to DB id', { email: candidate, result });
              return res.status(400).json({ error: 'Invalid owner email' });
            }
          } else if (!resolved.includes('-')) {
            // try canonicalize demo numeric ids
            const { canonicalizeUserId } = await import("../utils/userHelpers.js");
            const canonical = await canonicalizeUserId(resolved);
            if (!canonical) return res.status(400).json({ error: 'owner identifier could not be canonicalized' });
            resolved = canonical;
          }
          creator = String(resolved);
        } catch (ex) {
          console.error('[createCourse] error resolving owner candidate', ex);
          return res.status(500).json({ error: 'Failed to resolve owner identifier' });
        }
      }
    }

    if (!creator) return res.status(401).json({ error: 'Missing authenticated user (creator) or owner identifier' });

    // verify role allowed to create courses
    try {
      const { data: userRow, error: userErr } = await supabase.from('users').select('id, role').eq('id', creator).maybeSingle();
      if (userErr) {
        console.error('[createCourse] user lookup error', userErr);
        return res.status(500).json({ error: 'Failed to verify creator' });
      }
      if (!userRow) return res.status(401).json({ error: 'Creator user not found' });
      const role = String((userRow as any).role || '');
      if (!(role === 'admin' || role === 'instructor' || role === 'content_creator')) {
        return res.status(403).json({ error: 'Insufficient role to create course' });
      }
    } catch (ex) {
      console.error('[createCourse] unexpected role verify error', ex);
      return res.status(500).json({ error: 'Failed to verify creator role' });
    }

    const insertRow: any = {
      slug: payload.slug || payload.title?.toLowerCase()?.replace(/[^a-z0-9]+/g, "-") || undefined,
      title: payload.title,
      description: payload.description || null,
      owner_id: creator,
    };

    const { data, error } = await supabase.from("courses").insert([insertRow]).select().single();
    if (error) {
      console.error("Supabase createCourse error:", error);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true, course: data });
  } catch (err: any) {
    console.error("Unexpected createCourse error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
};

// PUT /api/courses/:id
export const updateCourse: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const { data, error } = await supabase.from("courses").update(payload).eq("id", id).select().single();
    if (error) {
      console.error("Supabase updateCourse error:", error);
      return res.status(500).json({ error: error.message });
    }
    if (!data) return res.status(404).json({ error: "Course not found" });
    return res.json({ success: true, course: data });
  } catch (err: any) {
    console.error("Unexpected updateCourse error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
};

// DELETE /api/courses/:id
export const deleteCourse: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;
    // Require authenticated user
    const authChk = await requireAuth(req);
    if (!authChk.ok) return res.status(authChk.status).json({ error: authChk.msg });
    let requester = String((authChk.user as any).id || '');
    if (!requester) return res.status(401).json({ error: 'Missing authenticated requester id' });

    // Fetch course to get owner
    const { data: courseRow, error: courseErr } = await supabase.from('courses').select('id, owner_id').eq('id', id).maybeSingle();
    if (courseErr) {
      console.error('[deleteCourse] course lookup error', courseErr);
      return res.status(500).json({ error: courseErr.message });
    }
    if (!courseRow) return res.status(404).json({ error: 'Course not found' });

    // Fetch requester role
    const { data: userRow, error: userErr } = await supabase.from('users').select('id, role').eq('id', requester).maybeSingle();
    if (userErr) {
      console.error('[deleteCourse] user lookup error', userErr);
      return res.status(500).json({ error: userErr.message });
    }
    const role = (userRow as any)?.role || null;

    // Only owner or admin allowed
    if (role !== 'admin' && String((courseRow as any).owner_id) !== requester) {
      console.warn('[deleteCourse] forbidden delete attempt', { requester, courseOwner: (courseRow as any).owner_id });
      return res.status(403).json({ error: 'Forbidden: only course owner or admin may delete this course' });
    }

    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      console.error("Supabase deleteCourse error:", error);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Unexpected deleteCourse error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
};

// GET /api/enrollments[?userId=...]
export const listEnrollments: RequestHandler = async (req, res) => {
  try {
    let userId = String(req.query.userId || "");
    let q = supabase.from("enrollments").select("*").order("enrolled_at", { ascending: false });
    if (userId) {
      if (!userId.includes('-')) {
        const { canonicalizeUserId } = await import("../utils/userHelpers.js");
        const canonical = await canonicalizeUserId(userId);
        if (!canonical) return res.status(400).json({ error: "userId could not be canonicalized" });
        userId = canonical;
      }
      q = q.eq("user_id", userId);
    }
    const { data, error } = await q;
    if (error) {
      console.error("Supabase listEnrollments error:", error);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ enrollments: data || [] });
  } catch (err: any) {
    console.error("Unexpected listEnrollments error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
};

// POST /api/courses/:id/enroll
export const enrollCourse: RequestHandler = async (req, res) => {
  try {
    const courseId = req.params.id;

    // Log incoming request (avoid echoing legacy headers)
    console.log('[enroll] incoming request:', {
      courseId,
      bodyType: typeof req.body,
      query: req.query,
      contentType: req.headers['content-type'],
    });

    // Accept user identifier from multiple places: body.userId, body.email, query.userId, query.email
    const bodyIsObject = req.body && typeof req.body === 'object';
    const bodyUserId = bodyIsObject ? (req.body as any).userId : undefined;
    const bodyEmail = bodyIsObject ? (req.body as any).email : undefined;
    // Prefer an authenticated user if present
    let rawUserCandidate = bodyUserId || bodyEmail || req.query.userId || req.query.email;
    try {
      const authChk = await requireAuth(req);
      if (authChk.ok && (!rawUserCandidate || rawUserCandidate === '')) {
        rawUserCandidate = String((authChk.user as any).id || '');
      }
    } catch (_) { /* ignore */ }
    const rawUser = rawUserCandidate ? String(rawUserCandidate) : "";
    if (!rawUser) {
      console.warn('[enroll] validation failed: missing identifier', { courseId, bodyUserId, bodyEmail, query: req.query, headers: req.headers });
      return res.status(400).json({ success: false, error: "MissingIdentifier", details: "No email or userId provided" });
    }

    let userId = rawUser;
    let resolvedEmail: string | null = null;

    // If looks like an email, use getOrCreateUserInDb to ensure DB UUID exists
    if (userId.includes('@')) {
      resolvedEmail = userId.toLowerCase();
      try {
        const { getOrCreateUserInDb } = await import("./auth.js");
        const result = await getOrCreateUserInDb(resolvedEmail);
        console.log('[enroll] getOrCreateUserInDb result', { resolvedEmail, result });
        if (result.error) {
          console.error('[enroll] failed to ensure user', { user: resolvedEmail, error: result.error });
          return res.status(500).json({ success: false, error: 'DatabaseInsertFailed', details: result.error });
        }
        if (!result.id) {
          console.error('[enroll] getOrCreateUserInDb returned no id', { user: resolvedEmail, result });
          return res.status(500).json({ success: false, error: 'DatabaseInsertFailed', details: 'no id returned' });
        }
        userId = result.id;
      } catch (ex) {
        console.error('[enroll] exception ensuring user', ex);
        return res.status(500).json({ success: false, error: 'DatabaseInsertFailed', details: String(ex) });
      }
    } else if (!userId.includes('-')) {
      // Not an email and not a UUID: try canonicalize (handles demo numeric ids)
      try {
        const { canonicalizeUserId } = await import("../utils/userHelpers.js");
        const canonical = await canonicalizeUserId(userId);
        if (!canonical) return res.status(400).json({ success: false, error: 'ValidationFailed', details: 'userId could not be canonicalized' });
        userId = canonical;
      } catch (ex) {
        console.error('[enroll] canonicalize exception', ex);
        return res.status(500).json({ success: false, error: 'ServerError', details: String(ex) });
      }
    }

    // verify course exists
    const { data: course, error: courseErr } = await supabase.from("courses").select("id").eq("id", courseId).single();
    if (courseErr) {
      console.error('[enroll] Supabase course lookup error', courseErr);
      return res.status(500).json({ success: false, error: 'DatabaseLookupFailed', details: courseErr });
    }
    if (!course) return res.status(404).json({ success: false, error: "CourseNotFound", details: `Course ${courseId} not found` });

    // check existing
    const { data: existing, error: exErr } = await supabase.from("enrollments").select("*").eq("course_id", courseId).eq("user_id", userId).limit(1);
    if (exErr) {
      console.error('[enroll] Supabase enroll check error:', exErr);
      return res.status(500).json({ success: false, error: 'DatabaseLookupFailed', details: exErr });
    }
    if (existing && existing.length > 0) return res.status(200).json({ success: true, alreadyEnrolled: true });

    const insertRow: any = {
      course_id: courseId,
      user_id: userId,
      enrolled_at: new Date().toISOString(),
    };

    console.log('[enroll] inserting enrollment', { insertRow });
    const { data: insertData, error: insertErr } = await supabase.from("enrollments").insert([insertRow]).select().maybeSingle();
    if (insertErr) {
      // If duplicate due to race, treat as success
      const code = String(insertErr?.code || '');
      const msg = String(insertErr?.message || '');
      const isUnique = code.includes('23505') || msg.toLowerCase().includes('duplicate');
      if (isUnique) {
        console.warn('[enroll] duplicate enrollment race, treating as success', { courseId, userId, insertErr });
        return res.status(200).json({ success: true, alreadyEnrolled: true });
      }
      console.error('[enroll] Supabase enroll insert error:', insertErr);
      return res.status(500).json({ success: false, error: 'DatabaseInsertFailed', details: { code: insertErr.code, message: insertErr.message } });
    }

    console.log('[enroll] enrolled user', { courseId, userId, insertData });
    return res.status(200).json({ success: true, enrollment: insertData || null });
  } catch (err: any) {
    console.error('[enroll] Unexpected enrollCourse error:', err);
    return res.status(500).json({ success: false, error: "UnexpectedServerError", details: String(err) });
  }
};

// Quick test examples (run from a shell):
// curl -X POST -H "Content-Type: application/json" -d '{"email":"student@gmail.com"}' http://localhost:5000/api/courses/d6c1463c-4f80-4271-b194-cae4c721c46f/enroll
// Node (quick):
// node -e "(async()=>{const res=await fetch('http://localhost:5000/api/courses/d6c1463c-4f80-4271-b194-cae4c721c46f/enroll',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'student@gmail.com'})});console.log(res.status,await res.text());})();"