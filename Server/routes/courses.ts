import { RequestHandler } from "express";
import { supabase } from "../supabaseClient.js";

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
    const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
    if (error) {
      if ((error as any).code === "PGRST116") return res.status(404).json({ error: "Course not found" });
      console.error("Supabase getCourse error:", error);
      return res.status(500).json({ error: error.message });
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
    const creator = String(req.headers["x-user-id"] || "");
    if (!creator) return res.status(401).json({ error: "Missing x-user-id header (creator)" });

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

    // Log incoming request
    console.log('[enroll] incoming request:', {
      courseId,
      bodyType: typeof req.body,
      body: req.body,
      query: req.query,
      headers: { 'x-user-id': req.headers['x-user-id'], 'content-type': req.headers['content-type'] },
    });

    // Accept user identifier from multiple places: body.userId, body.email, query.userId, query.email, header x-user-id
    const bodyIsObject = req.body && typeof req.body === 'object';
    const bodyUserId = bodyIsObject ? (req.body as any).userId : undefined;
    const bodyEmail = bodyIsObject ? (req.body as any).email : undefined;
    const rawUserCandidate = bodyUserId || bodyEmail || req.query.userId || req.query.email || req.headers['x-user-id'];
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