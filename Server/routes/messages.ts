import { RequestHandler } from "express";
import { supabase } from "../supabaseClient.js";

// ---------- Inbox endpoints (notifications + teacher/admin messages) ----------

// GET /api/inbox?userId=...&role=...
export const getInbox: RequestHandler = async (req, res) => {
  console.log('[inbox] getInbox called', { method: req.method, url: req.originalUrl, query: req.query });
  try {
    let userId = String(req.query.userId || "");
    const role = String(req.query.role || "");

    // If no userId/role present, return only global broadcasts (to_user_id IS NULL AND to_role IS NULL)
    if (!userId && !role) {
      const { data, error } = await supabase
        .from("inbox_messages")
        .select("*")
        .is("to_user_id", null)
        .is("to_role", null)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("Supabase getInbox broadcasts error:", error);
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.json({ success: true, data: data || [] });
    }

    // Reject numeric/demo IDs — require a UUID for userId
    if (userId && !userId.includes("-")) {
      return res.status(400).json({ success: false, error: 'userId must be a UUID' });
    }

    // Build OR query: messages addressed to user, targeted to role, or global broadcasts
    const clauses: string[] = [];
    if (userId) clauses.push(`to_user_id.eq.${userId}`);
    if (role) clauses.push(`to_role.eq.${role}`);
    // include broadcasts
    clauses.push("to_user_id.is.null");

    const orQuery = clauses.join(",");

    const { data, error } = await supabase
      .from("inbox_messages")
      .select("*")
      .or(orQuery)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("Supabase getInbox error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    console.error("Unexpected getInbox error:", err);
    return res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};

// POST /api/inbox/send
export const sendInboxMessage: RequestHandler = async (req, res) => {
  console.log('[inbox] sendInboxMessage called', { method: req.method, url: req.originalUrl, body: req.body, headers: { 'x-user-id': req.headers['x-user-id'] } });
  try {
    const payload = req.body || {};
    const senderId = String(payload.fromUserId || req.headers["x-user-id"] || "");
    const fromName = payload.fromName || payload.from_name || null;
    const subject = payload.subject;
    const body = payload.content || payload.body || null;

    if (!senderId || !fromName || !subject || !body) {
      return res.status(400).json({ success: false, error: "fromUserId, fromName, subject and content required" });
    }

    // verify sender role from Supabase only
    let role: string | null = null;
    try {
      const { data: userData, error: userErr } = await supabase.from("users").select("role").eq("id", senderId).maybeSingle();
      if (userErr) {
        console.warn('[inbox] Supabase error looking up sender role', { senderId, userErr });
        return res.status(500).json({ success: false, error: userErr.message || 'Supabase lookup error' });
      }
      if (!userData) {
        return res.status(403).json({ success: false, error: 'Sender not recognized' });
      }
      role = (userData as any)?.role || null;
    } catch (ex) {
      console.error('[inbox] Exception during Supabase user lookup', ex);
      return res.status(500).json({ success: false, error: 'Unexpected server error' });
    }

    if (!role || (role !== "admin" && role !== "instructor")) {
      return res.status(403).json({ success: false, error: "Only admin or instructor may send inbox messages" });
    }

    const insertRow: any = {
      from_user_id: senderId,
      to_user_id: payload.toUserId || payload.to_user_id || null,
      to_role: payload.recipientRole || payload.recipient_role || null,
      course_id: payload.course_id || payload.courseId || null,
      subject: subject,
      body: body,
      metadata: Object.assign({}, payload.metadata || {}, { fromName, toName: payload.toName || payload.to_name || null }),
    };

    // Require to_user_id to be UUID when provided
    if (insertRow.to_user_id && !String(insertRow.to_user_id).includes('-')) {
      return res.status(400).json({ success: false, error: 'to_user_id must be a UUID' });
    }

    const { data, error } = await supabase.from("inbox_messages").insert([insertRow]).select().single();
    if (error) {
      console.error("Supabase sendInboxMessage error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    console.error("Unexpected sendInboxMessage error:", err);
    return res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};

// POST /api/inbox/mark-read
export const markRead: RequestHandler = async (req, res) => {
  console.log('[inbox] markRead called', { method: req.method, url: req.originalUrl, body: req.body });
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, error: "ids array required" });

    const { error } = await supabase.from("inbox_messages").update({ is_read: true }).in("id", ids);
    if (error) {
      console.error("Supabase markRead error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Unexpected markRead error:", err);
    return res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};

// POST /api/inbox/delete
export const deleteMessages: RequestHandler = async (req, res) => {
  console.log('[inbox] deleteMessages called', { method: req.method, url: req.originalUrl, body: req.body });
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, error: "ids array required" });

    const { error } = await supabase.from("inbox_messages").delete().in("id", ids);
    if (error) {
      console.error("Supabase deleteMessages error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Unexpected deleteMessages error:", err);
    return res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};

// POST /api/inbox/star
export const starMessage: RequestHandler = async (req, res) => {
  console.log('[inbox] starMessage called', { method: req.method, url: req.originalUrl, body: req.body });
  try {
    const { id, starred } = req.body;
    if (!id) return res.status(400).json({ success: false, error: "id required" });

    const { error } = await supabase.from("inbox_messages").update({ is_starred: !!starred }).eq("id", id);
    if (error) {
      console.error("Supabase starMessage error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Unexpected starMessage error:", err);
    return res.status(500).json({ success: false, error: "Unexpected server error" });
  }
};