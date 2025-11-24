import { RequestHandler } from "express";
import nodemailer from "nodemailer";
import { supabase } from "../supabaseClient.js";
import admin from "firebase-admin";

type UserRecord = {
  id: string;
  email: string;
  password: string;
  // canonical DB role strings
  role: "admin" | "instructor" | "content_creator" | "student";
  name: string;
  approved?: boolean; // whether account is approved for elevated roles
  requestedRole?: "admin" | "instructor" | "content_creator" | null;
};

// Only these users can login (demo)
export const REGISTERED_USERS: UserRecord[] = [
  {
    id: "1",
    email: "admin@gmail.com",
    password: "admin123",
    role: "admin",
    name: "Admin User",
    approved: true,
    requestedRole: null,
  },
  {
    id: "2",
    email: "instructor@gmail.com",
    password: "instructor123",
    role: "instructor",
    name: "Instructor User",
    approved: true,
    requestedRole: null,
  },
  {
    id: "3",
    email: "contentcreator@gmail.com",
    password: "creator123",
    role: "content_creator",
    name: "Content Creator User",
    approved: true,
    requestedRole: null,
  },
  {
    id: "4",
    email: "student@gmail.com",
    password: "student123",
    role: "student",
    name: "Student User",
    approved: true,
    requestedRole: null,
  },
];

// Simple in-memory OTP store (demo). Use Redis or DB in production with TTL.
const OTP_STORE = new Map<string, { code: string; expiresAt: number }>();

// Nodemailer transporter (if SMTP env vars present). Otherwise fallback to console log.
const transporter = ((): nodemailer.Transporter | null => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
})();

// Initialize Firebase Admin SDK if service account JSON provided via env
const _svc = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (_svc) {
  try {
    const svc = JSON.parse(_svc);
    admin.initializeApp({ credential: admin.credential.cert(svc as admin.ServiceAccount) });
    console.log('[firebase-admin] initialized');
  } catch (ex) {
    console.warn('[firebase-admin] failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', ex);
  }
} else {
  console.warn('[firebase-admin] not configured (FIREBASE_SERVICE_ACCOUNT_JSON missing)');
}

function sendOtpEmail(to: string, code: string) {
  const from = process.env.EMAIL_FROM || "noreply@example.com";
  const subject = "Your NxtGen login OTP";
  const text = `Your one-time login code is: ${code}\nThis code expires in 5 minutes.`;

  if (transporter) {
    return transporter.sendMail({ from, to, subject, text });
  } else {
    // Fallback for local/dev: log OTP so developer can copy it
    console.log(`[OTP][dev] sendOtpEmail -> to=${to} code=${code}`);
    return Promise.resolve();
  }
}

export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // Find user in registered users
  const user = REGISTERED_USERS.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials. Please use registered email/password." });
  }

  if (user.approved === false) {
    return res.status(403).json({ error: "Account pending approval by administrator" });
  }

  const { password: _, ...userWithoutPassword } = user;

  // Try to ensure this demo user exists in Supabase and return the canonical DB row (id as UUID)
  try {
    const { data: found, error: findErr } = await supabase.from('users').select('id, email, role').ilike('email', user.email).single();
    if (found && !findErr) {
      return res.json({ success: true, user: found, message: 'Login successful (DB user)' });
    }

    // Create the user in DB
    const insertRow = { email: user.email, role: user.role };
    const { data: created, error: createErr } = await supabase.from('users').insert([insertRow]).select('id, email, role').single();
    if (created && !createErr) {
      console.log('[auth] Created DB user during login', { email: user.email, id: created.id });
      return res.json({ success: true, user: created, message: 'Login successful (created DB user)' });
    }
    console.warn('[auth] Could not create/find DB user during login, falling back to demo user', { findErr, createErr });
  } catch (ex) {
    console.error('[auth] Exception ensuring DB user during login', ex);
  }

  return res.json({ success: true, user: userWithoutPassword, message: 'Login successful (demo user fallback)' });
};

export const register: RequestHandler = async (_req, res) => {
  // Allow manual signup for students only
  const { email, password, name } = _req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  const existing = REGISTERED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const newUser: UserRecord = {
    id: String(Date.now()),
    email,
    password,
    role: "student",
    name: name || email.split("@")[0],
    approved: true,
    requestedRole: null,
  };
  REGISTERED_USERS.push(newUser);

  // Also create a DB user so frontend receives canonical UUID
  try {
    const insertRow = { email: newUser.email, role: newUser.role };
    const { data: created, error: createErr } = await supabase.from('users').insert([insertRow]).select('id, email, role').maybeSingle();
    if (createErr) {
      console.warn('[auth/register] failed to create DB user', { email: newUser.email, createErr });
    }
    if (created) return res.json({ success: true, user: created });
  } catch (ex) {
    console.error('[auth/register] exception creating DB user', ex);
  }

  const { password: _, ...userWithoutPassword } = newUser;
  return res.json({ success: true, user: userWithoutPassword });
};

// Get all registered emails (for display purposes only)
export const getRegisteredEmails: RequestHandler = (_req, res) => {
  const emails = REGISTERED_USERS.map((u) => ({ email: u.email, role: u.role }));
  return res.json({ emails });
};

// NOTE: demo numeric id mapping removed — do not fall back to in-memory demo ids

// GET /api/users/:id
export const getUserById: RequestHandler = async (req, res) => {
  const key = String(req.params.id || "");
  // If the key looks like an email, ensure DB row exists (create if missing) and return it
  try {
    if (key.includes("@")) {
      const lc = key.toLowerCase();
      console.log('[auth/byEmail] handling by email', { email: lc });
      try {
        const result = await getOrCreateUserInDb(lc);
        if (result.error) {
          // Return structured error with Supabase details
          return res.status(500).json({ error: 'Failed to create user', details: result.error });
        }
        const id = result.id;
        if (id) {
          const { data, error } = await supabase.from("users").select("id, email, role").eq("id", id).maybeSingle();
          if (error) {
            console.warn('[auth] Supabase lookup by id returned error', { key: lc, error });
          } else if (data) {
            return res.json({ user: data });
          }
        }
      } catch (exInner) {
        console.error('[auth/getUserById] error ensuring user', exInner);
        return res.status(500).json({ error: 'Failed to create user', details: String(exInner) });
      }
    }

    // Otherwise, try by id (UUID) in Supabase
    if (key && key.includes("-")) {
      const { data, error } = await supabase.from("users").select("id, email, role").eq("id", key).maybeSingle();
      if (error) {
        console.warn('[auth] Supabase lookup by id returned error', { key, error });
      } else if (data) {
        return res.json({ user: data });
      }
    }
  } catch (ex) {
    console.error('[auth] Exception querying Supabase for user', ex);
  }
  // No Supabase user found
  return res.status(404).json({ error: 'User not found' });
};

// Ensure a user row exists for the given email. Returns the DB id or null on failure.
export async function getOrCreateUserInDb(email: string, _role: string = 'user'): Promise<{ id: string | null; error?: any }> {
  const lc = String(email || '').toLowerCase();
  console.log('[auth/getOrCreate] ensure user exists', { email: lc });
  // determine role based on demo emails
  let assignedRole: string;
  if (lc === 'admin@gmail.com') assignedRole = 'admin';
  else if (lc === 'instructor@gmail.com') assignedRole = 'instructor';
  else if (lc === 'contentcreator@gmail.com') assignedRole = 'content_creator';
  else if (lc === 'student@gmail.com') assignedRole = 'student';
  else assignedRole = 'student';
  console.log('[auth/getOrCreate] assigning role', assignedRole, 'to', lc);
  try {
    // Try find first
    const { data: found, error: findErr } = await supabase.from('users').select('id').ilike('email', lc).maybeSingle();
    if (findErr) {
      console.warn('[auth/getOrCreate] Supabase lookup error', { email: lc, findErr });
    }
    if (found && found.id) return { id: found.id };

    // Not found -> attempt insert with lowercase email
    const insertRow = { email: lc, role: assignedRole };
    const { data: created, error: createErr } = await supabase.from('users').insert([insertRow]).select('id').maybeSingle();
    if (createErr) {
      // If unique constraint (race) occurred, query again
      const isUniqueViolation = String(createErr?.code || '').includes('23505') || String(createErr?.message || '').toLowerCase().includes('duplicate');
      if (isUniqueViolation) {
        console.warn('[auth/getOrCreate] insert unique violation, querying again', { email: lc, createErr });
        const { data: recheck } = await supabase.from('users').select('id').ilike('email', lc).maybeSingle();
        if (recheck && recheck.id) return { id: recheck.id };
      }
      console.warn('[auth/getOrCreate] failed to insert user', { email: lc, createErr });
      return { id: null, error: createErr };
    }
    if (created && created.id) {
      console.log('[auth/getOrCreate] created DB user', { email: lc, id: created.id });
      return { id: created.id };
    }
    return { id: null };
  } catch (ex: any) {
    console.error('[auth/getOrCreate] exception', ex);
    return { id: null, error: ex };
  }
}

// NEW: request OTP endpoint
export const requestOtp: RequestHandler = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const user = REGISTERED_USERS.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: "Email not registered" });

  if (user.approved === false) return res.status(403).json({ error: "Account pending approval by administrator" });

  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  OTP_STORE.set(email, { code, expiresAt });

  try {
    await sendOtpEmail(email, code);
    return res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
};

// NEW: verify OTP and login
export const verifyOtp: RequestHandler = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email and otp required" });

  const record = OTP_STORE.get(email);
  if (!record) return res.status(401).json({ error: "No OTP requested for this email" });
  if (Date.now() > record.expiresAt) {
    OTP_STORE.delete(email);
    return res.status(401).json({ error: "OTP expired" });
  }
  if (record.code !== String(otp)) {
    return res.status(401).json({ error: "Invalid OTP" });
  }

  // OTP is valid -> issue session (demo: return user object)
  OTP_STORE.delete(email);
  const user = REGISTERED_USERS.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.approved === false) return res.status(403).json({ error: "Account pending approval by administrator" });
  const { password: _, ...userWithoutPassword } = user;

  // Ensure DB user exists and return DB row when possible
  try {
    const { data: found, error: findErr } = await supabase.from('users').select('id, email, role').ilike('email', email).maybeSingle();
    if (findErr) {
      console.warn('[auth/verifyOtp] Supabase lookup error', { email, findErr });
    }
    if (found) return res.json({ success: true, user: found, message: 'OTP verified' });

    const insertRow = { email: user.email, role: user.role };
    const { data: created, error: createErr } = await supabase.from('users').insert([insertRow]).select('id, email, role').maybeSingle();
    if (createErr) console.warn('[auth/verifyOtp] failed to create DB user', { email, createErr });
    if (created) return res.json({ success: true, user: created, message: 'OTP verified' });
  } catch (ex) {
    console.error('[auth/verifyOtp] exception ensuring DB user', ex);
  }

  return res.json({ success: true, user: userWithoutPassword, message: "OTP verified" });
};

// NEW: simple demo social login
export const socialLogin: RequestHandler = async (req, res) => {
  const provider = (req.body?.provider || req.query?.provider || "").toLowerCase();
  if (!provider) return res.status(400).json({ error: "provider required" });

  // Demo mapping: map provider -> a registered user
  let user: UserRecord | undefined;
  if (provider === "google") user = REGISTERED_USERS.find((u) => u.role === "student");
  else if (provider === "facebook") user = REGISTERED_USERS.find((u) => u.role === "instructor");
  else if (provider === "apple") user = REGISTERED_USERS.find((u) => u.role === "content_creator");

  if (!user) return res.status(404).json({ error: "No demo user available for provider" });

  if (user.approved === false) return res.status(403).json({ error: "Account pending approval by administrator" });
  const { password: _, ...userWithoutPassword } = user;

  // Ensure DB user exists so social login returns DB UUID
  try {
    const { data: found, error: findErr } = await supabase.from('users').select('id, email, role').ilike('email', user.email).maybeSingle();
    if (findErr) console.warn('[auth/socialLogin] Supabase lookup error', { email: user.email, findErr });
    if (found) return res.json({ success: true, user: found, provider });

    const insertRow = { email: user.email, role: user.role };
    const { data: created, error: createErr } = await supabase.from('users').insert([insertRow]).select('id, email, role').maybeSingle();
    if (createErr) console.warn('[auth/socialLogin] failed to create DB user', { email: user.email, createErr });
    if (created) return res.json({ success: true, user: created, provider });
  } catch (ex) {
    console.error('[auth/socialLogin] exception ensuring DB user', ex);
  }

  return res.json({ success: true, user: userWithoutPassword, provider });
};

// Verify Firebase ID token and return canonical DB user (creates student by default)
export const firebaseLogin: RequestHandler = async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'idToken required' });
  if (!admin.apps?.length) return res.status(500).json({ error: 'Server not configured for Firebase token verification' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = String(decoded.email || '').toLowerCase();
    const name = String(decoded.name || email.split('@')[0]);
    if (!email) return res.status(400).json({ error: 'No email present in token' });

    // Ensure DB user exists with default student role
    const result = await getOrCreateUserInDb(email, 'student');
    if (result.error || !result.id) {
      console.warn('[auth/firebaseLogin] failed to ensure DB user', { email, err: result.error });
      return res.status(500).json({ error: 'Failed to ensure user in DB' });
    }

    const { data, error } = await supabase.from('users').select('id, email, role').eq('id', result.id).maybeSingle();
    if (error || !data) {
      console.warn('[auth/firebaseLogin] failed to fetch created user', { id: result.id, error });
      return res.status(500).json({ error: 'Failed to fetch user' });
    }

    return res.json({ success: true, user: data });
  } catch (ex: any) {
    console.error('[auth/firebaseLogin] token verification failed', ex);
    return res.status(401).json({ error: 'Invalid or expired ID token' });
  }
};

// Helper to ensure requester is an admin based on x-user-id header
async function requireAdmin(req: any) {
  const reqId = String(req.headers['x-user-id'] || '');
  if (!reqId) return { ok: false, status: 401, msg: 'x-user-id header required' };
  try {
    const { data: user, error } = await supabase.from('users').select('id, role').eq('id', reqId).maybeSingle();
    if (error || !user) return { ok: false, status: 401, msg: 'Requester not found' };
    if (String(user.role) !== 'admin') return { ok: false, status: 403, msg: 'admin role required' };
    return { ok: true, user };
  } catch (ex) {
    return { ok: false, status: 500, msg: 'failed to verify admin' };
  }
}

// Admin: list all users
export const listAllUsers: RequestHandler = async (req, res) => {
  const chk = await requireAdmin(req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  try {
    const { data, error } = await supabase.from('users').select('id, email, role').order('email');
    if (error) return res.status(500).json({ error: error.message || 'Failed to list users' });
    return res.json({ success: true, users: data || [] });
  } catch (ex) {
    console.error('[admin/listAllUsers] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// Admin: update a user's role
export const updateUserRole: RequestHandler = async (req, res) => {
  const chk = await requireAdmin(req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  const id = String(req.params.id || '');
  const role = normalizeRoleForDb(String(req.body?.role || 'student'));
  if (!id) return res.status(400).json({ error: 'user id required' });

  try {
    const { data, error } = await supabase.from('users').update({ role }).eq('id', id).select('id, email, role').maybeSingle();
    if (error) return res.status(500).json({ error: error.message || 'Failed to update role' });
    if (!data) return res.status(404).json({ error: 'User not found' });
    return res.json({ success: true, user: data });
  } catch (ex) {
    console.error('[admin/updateUserRole] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// User requests elevated role (teacher/contentCreator/admin) — creates or updates requestedRole
export const requestRole: RequestHandler = (req, res) => {
  const { email, requestedRole } = req.body;
  if (!email || !requestedRole) return res.status(400).json({ error: 'email and requestedRole required' });
  // accept either frontend form values ('contentCreator') or canonical ('content_creator')
  const allowed = ['admin', 'instructor', 'contentCreator', 'content_creator'];
  if (!allowed.includes(requestedRole)) return res.status(400).json({ error: 'invalid requestedRole' });

  const user = REGISTERED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'user not found; please signup first' });

  // normalize requested role to DB canonical form when storing
  const normalized = requestedRole === 'contentCreator' ? 'content_creator' : requestedRole;
  user.requestedRole = normalized as any;
  user.approved = false; // pending approval
  return res.json({ success: true, message: 'Role request submitted' });
};

// Admin: list pending role requests (protected by ADMIN_SECRET header)
export const listRoleRequests: RequestHandler = (_req, res) => {
  const secret = process.env.ADMIN_SECRET || '';
  const provided = (_req.headers['x-admin-secret'] || '') as string;
  if (!secret || provided !== secret) return res.status(403).json({ error: 'admin secret required' });

  const requests = REGISTERED_USERS.filter((u) => u.requestedRole).map((u) => ({ email: u.email, requestedRole: u.requestedRole, name: u.name }));
  return res.json({ requests });
};

// Admin: approve a role request
export const approveRole: RequestHandler = (req, res) => {
  const secret = process.env.ADMIN_SECRET || '';
  const provided = (req.headers['x-admin-secret'] || '') as string;
  if (!secret || provided !== secret) return res.status(403).json({ error: 'admin secret required' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const user = REGISTERED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'user not found' });
  if (!user.requestedRole) return res.status(400).json({ error: 'no pending request for this user' });

  user.role = user.requestedRole as any;
  user.requestedRole = null;
  user.approved = true;
  const { password: _, ...userWithoutPassword } = user;
  return res.json({ success: true, user: userWithoutPassword });
};

// Admin: deny a role request
export const denyRole: RequestHandler = (req, res) => {
  const secret = process.env.ADMIN_SECRET || '';
  const provided = (req.headers['x-admin-secret'] || '') as string;
  if (!secret || provided !== secret) return res.status(403).json({ error: 'admin secret required' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const user = REGISTERED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'user not found' });
  user.requestedRole = null;
  user.approved = true; // keep as student
  return res.json({ success: true });
};

// Helper: find or create a social user based on email. Assign role according to registered list
export function findOrCreateSocialUser(email: string, name?: string) {
  // try to find exact match
  let user = REGISTERED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (user) return { ...user, password: undefined };

  // By default, new social signups become students (role 'student') and are approved.
  const newUser: UserRecord = {
    id: String(Date.now()),
    email,
    password: '',
    role: 'student',
    name: name || email.split('@')[0],
    approved: true,
    requestedRole: null,
  };
  REGISTERED_USERS.push(newUser);
  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

// Helper to normalize incoming role strings to DB canonical values
export function normalizeRoleForDb(role: string | undefined | null) {
  if (!role) return 'student';
  const r = String(role);
  if (r === 'contentCreator' || r === 'content_creator') return 'content_creator';
  if (r === 'user' || r === 'student') return 'student';
  if (r === 'instructor') return 'instructor';
  if (r === 'admin') return 'admin';
  return 'student';
}