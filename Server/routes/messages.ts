import { RequestHandler } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { findUserById } from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..", "data");
const INBOX_FILE = path.join(DATA_DIR, "inbox.json");

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T) {
  await ensureDataDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

type InboxMessage = {
  id: string;
  fromUserId: string;
  fromName: string;
  toUserId?: string | null; // optional for specific student
  toName?: string | null;
  recipientRole?: string | null; // e.g. 'instructor' or 'student' or 'admin'
  category?: string | null; // 'notification' | 'teacher' | 'admin'
  subject: string;
  content: string;
  timestamp: number;
  read?: boolean;
  starred?: boolean;
};

// ---------- Inbox endpoints (notifications + teacher/admin messages) ----------

// GET /api/inbox?userId=...&role=...
export const getInbox: RequestHandler = async (req, res) => {
  const { userId, role } = req.query;
  const messages: InboxMessage[] = await readJson(INBOX_FILE, []);
  // Return messages addressed to userId OR messages targeted to user's role OR admin announcements (recipientRole = 'admin' handled below)
  const filtered = messages.filter((m) => {
    // If explicit personal message
    if (m.toUserId && userId && String(m.toUserId) === String(userId)) return true;
    // If targeted to user's role (e.g., student)
    if (m.recipientRole && role && String(m.recipientRole) === String(role)) return true;
    // Admin announcements with no specific recipient or role should be visible to all
    if (!m.toUserId && !m.recipientRole) return true;
    return false;
  }).sort((a, b) => b.timestamp - a.timestamp);
  res.json({ messages: filtered });
};

// POST /api/inbox/send
// Used for: teacher -> student private messages (set toUserId),
// admin announcements (recipientRole: 'student' or null for all), and automated notifications
export const sendInboxMessage: RequestHandler = async (req, res) => {
  const payload = req.body || {};
  if (!payload.fromUserId || !payload.fromName || !payload.subject || !payload.content) {
    return res.status(400).json({ error: "fromUserId, fromName, subject and content required" });
  }
  // Enforce only admin or instructor can send messages via API
  const senderId = payload.fromUserId || (req.headers['x-user-id'] as string);
  const sender = senderId ? findUserById(String(senderId)) : undefined;
  if (!sender || (sender.role !== 'admin' && sender.role !== 'instructor')) {
    return res.status(403).json({ error: 'Only admin or instructor may send inbox messages' });
  }
  const messages: InboxMessage[] = await readJson(INBOX_FILE, []);
  const msg: InboxMessage = {
    id: String(Date.now()),
    fromUserId: payload.fromUserId,
    fromName: payload.fromName,
    toUserId: payload.toUserId || null,
    toName: payload.toName || null,
    recipientRole: payload.recipientRole || null,
    category: payload.category || null,
    subject: payload.subject,
    content: payload.content,
    timestamp: Date.now(),
    read: false,
    starred: false,
  };
  // Prepend new messages so newest appear first
  messages.unshift(msg);
  await writeJson(INBOX_FILE, messages);
  res.json({ success: true, message: msg });
};

// POST /api/inbox/mark-read
export const markRead: RequestHandler = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids array required" });
  const messages: InboxMessage[] = await readJson(INBOX_FILE, []);
  const updated = messages.map(m => ids.includes(m.id) ? { ...m, read: true } : m);
  await writeJson(INBOX_FILE, updated);
  res.json({ success: true });
};

// POST /api/inbox/delete
export const deleteMessages: RequestHandler = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids array required" });
  const messages: InboxMessage[] = await readJson(INBOX_FILE, []);
  const remaining = messages.filter(m => !ids.includes(m.id));
  await writeJson(INBOX_FILE, remaining);
  res.json({ success: true });
};

// POST /api/inbox/star
export const starMessage: RequestHandler = async (req, res) => {
  const { id, starred } = req.body;
  if (!id) return res.status(400).json({ error: "id required" });
  const messages: InboxMessage[] = await readJson(INBOX_FILE, []);
  const updated = messages.map(m => m.id === id ? { ...m, starred: !!starred } : m);
  await writeJson(INBOX_FILE, updated);
  res.json({ success: true });
};