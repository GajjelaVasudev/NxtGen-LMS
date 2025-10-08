import { RequestHandler } from "express";

type UserRecord = { id: string; email: string; password?: string; role?: string; name?: string };

const users: UserRecord[] = [];

export const register: RequestHandler = (req, res) => {
  const { email, password, role = "user", name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email/password required" });
  if (users.find((u) => u.email === email)) return res.status(409).json({ error: "user exists" });
  const id = String(Date.now());
  users.push({ id, email, password, role, name });
  return res.json({ ok: true, user: { id, email, role, name } });
};