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
    // Accept user identifier from multiple places: body.userId, body.email, query.userId, query.email, header x-user-id
    const rawUser = String(req.body.userId || req.body.email || req.query.userId || req.query.email || req.headers['x-user-id'] || "");
    if (!rawUser) return res.status(400).json({ error: "user identifier required (userId or email)" });

    let userId = rawUser;
    // If looks like an email, use getOrCreateUserInDb to ensure DB UUID exists
    if (userId.includes('@')) {
      try {
        const { getOrCreateUserInDb } = await import("./auth.js");
        const result = await getOrCreateUserInDb(userId);
        if (result.error) {
          console.error('[enroll] failed to ensure user', { user: userId, error: result.error });
          return res.status(500).json({ error: 'Failed to create user', details: result.error });
        }
        if (!result.id) return res.status(500).json({ error: 'Failed to create user', details: 'no id returned' });
        userId = result.id;
      } catch (ex) {
        console.error('[enroll] exception ensuring user', ex);
        return res.status(500).json({ error: 'Failed to create user', details: String(ex) });
      }
    } else if (!userId.includes('-')) {
      // Not an email and not a UUID: try canonicalize (handles demo numeric ids)
      const { canonicalizeUserId } = await import("../utils/userHelpers.js");
      const canonical = await canonicalizeUserId(userId);
      if (!canonical) return res.status(400).json({ error: "userId could not be canonicalized" });
      userId = canonical;
    }

    // verify course exists
    const { data: course } = await supabase.from("courses").select("id").eq("id", courseId).single();
    if (!course) return res.status(404).json({ error: "Course not found" });

    // check existing
    const { data: existing, error: exErr } = await supabase.from("enrollments").select("*").eq("course_id", courseId).eq("user_id", userId).limit(1);
    if (exErr) {
      console.error('[enroll] Supabase enroll check error:', exErr);
      return res.status(500).json({ error: exErr.message });
    }
    if (existing && existing.length > 0) return res.json({ success: true, message: "Already enrolled" });

    const insertRow = { course_id: courseId, user_id: userId, created_at: new Date().toISOString() };
    const { error: insertErr } = await supabase.from("enrollments").insert([insertRow]);
    if (insertErr) {
      // If duplicate due to race, treat as success
      const isUnique = String(insertErr?.code || '').includes('23505') || String(insertErr?.message || '').toLowerCase().includes('duplicate');
      if (isUnique) {
        console.warn('[enroll] duplicate enrollment race, treating as success', { courseId, userId, insertErr });
        return res.json({ success: true, message: 'Already enrolled' });
      }
      console.error('[enroll] Supabase enroll insert error:', insertErr);
      return res.status(500).json({ error: insertErr.message });
    }

    console.log('[enroll] enrolled user', { courseId, userId });
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[enroll] Unexpected enrollCourse error:', err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
};