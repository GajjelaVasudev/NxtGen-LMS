import { RequestHandler } from "express";
import { supabase } from "../supabaseClient.js";
import { requireAuth, getOrCreateUserInDb, REGISTERED_USERS } from "./auth.js";

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

    // Canonicalize numeric/demo ids or emails to UUIDs
    if (userId && !userId.includes("-")) {
      const { canonicalizeUserId } = await import("../utils/userHelpers.js");
      const canonical = await canonicalizeUserId(userId);
      if (!canonical) return res.status(400).json({ success: false, error: 'userId could not be canonicalized to UUID' });
      userId = canonical;
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
  console.log('[inbox] sendInboxMessage called', { method: req.method, url: req.originalUrl, body: req.body });
  try {
    const payload = req.body || {};
    const fromName = payload.fromName || payload.from_name || null;
    const subject = payload.subject;
    const body = payload.content || payload.body || null;

    // Require authenticated sender. If bearer auth fails, allow a development
    // fallback using `x-user-id` (email, demo numeric id, or UUID) so local
    // development can send messages without a proper bearer token.
    let senderId = '';
    let role = '';
    const authChk = await requireAuth(req);
    if (authChk.ok) {
      senderId = String((authChk.user as any).id || '');
      role = String((authChk.user as any).role || '');
    } else {
      // Try dev fallback header
      const fallback = String(req.headers['x-user-id'] || '').trim();
      if (fallback) {
        // If looks like an email, ensure user exists in DB
        if (fallback.includes('@')) {
          const resEnsure = await getOrCreateUserInDb(fallback.toLowerCase());
          if (resEnsure && resEnsure.id) {
            // fetch role from DB
            const { data: dbUser } = await supabase.from('users').select('id, role').eq('id', resEnsure.id).maybeSingle();
            if (dbUser && dbUser.id) {
              senderId = dbUser.id;
              role = String(dbUser.role || '');
            }
          }
        } else if (!fallback.includes('-')) {
          // numeric/demo id -> look up REGISTERED_USERS
          const demo = REGISTERED_USERS.find((u: any) => String(u.id) === fallback);
          if (demo) {
            // demo ids are not UUIDs; we try to canonicalize to a DB user when possible
            // but for development flows we'll map the demo id to a created/test user id
            const { email } = demo as any;
            const resEnsure = await getOrCreateUserInDb(String(email || '').toLowerCase());
            if (resEnsure && resEnsure.id) {
              senderId = resEnsure.id;
              role = String(demo.role || '');
            }
          }
        } else {
          // Looks like a UUID - try to fetch role from DB
          const { data: dbUser } = await supabase.from('users').select('id, role').eq('id', fallback).maybeSingle();
          if (dbUser && dbUser.id) {
            senderId = dbUser.id;
            role = String(dbUser.role || '');
          }
        }
      }
    }

    // If senderId found but fromName missing, attempt to derive a display name
    if (senderId && !fromName) {
      try {
        const { data: u } = await supabase.from('users').select('first_name, last_name, email').eq('id', senderId).maybeSingle();
        if (u) {
          const parts = [] as string[];
          if (u.first_name) parts.push(String(u.first_name));
          if (u.last_name) parts.push(String(u.last_name));
          if (parts.length) fromName = parts.join(' ');
          else if (u.email) fromName = String(u.email).split('@')[0];
        }
      } catch (ex) {
        // ignore - we'll fallback to generic label below
      }
    }

    if (!senderId || !fromName || !subject || !body) {
      return res.status(400).json({ success: false, error: "fromName, subject and content required" });
    }

    if (!role || (role !== 'admin' && role !== 'instructor')) {
      return res.status(403).json({ success: false, error: 'Only admin or instructor may send inbox messages' });
    }

    const insertRow: any = {
      from_user_id: senderId,
      from_name: fromName,
      title: subject,
      message: body,
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