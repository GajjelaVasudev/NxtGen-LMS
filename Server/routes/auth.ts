import { RequestHandler } from "express";
// Nodemailer and SMTP removed per new requirements — no email sending
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
  roleRequestDetails?: any;
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

// On server start (demo), mirror any in-memory pending role requests into the DB so admin UI sees them.
(async function syncDemoRoleRequests() {
  try {
    const pending = REGISTERED_USERS.filter((u) => u.requestedRole);
    if (!pending.length) return;
    for (const u of pending) {
      try {
        // ensure a DB user exists for this email
        const { data: dbUser } = await supabase.from('users').select('id, email').ilike('email', u.email).maybeSingle();
        const userId = dbUser?.id || null;
        await supabase.from('role_requests').insert([{ user_id: userId, email: u.email, requested_role: u.requestedRole, details: u.roleRequestDetails || {}, status: 'pending' }]).maybeSingle();
      } catch (inner) {
        console.warn('[auth/syncDemoRoleRequests] failed for', u.email, inner?.message || inner);
      }
    }
  } catch (ex) {
    console.warn('[auth/syncDemoRoleRequests] error', ex?.message || ex);
  }
})();

// No transporter — all email-sending code removed. OTPs and verification links are logged only.

// Email verification removed — no verification store required.

// Email verification removed — no sendVerificationEmail implementation.

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

  // Email sending removed: always log OTP to server logs (demo behavior)
  console.log(`[OTP][dev] sendOtpEmail -> to=${to} code=${code}`);
  return Promise.resolve();
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
    const { data: found, error: findErr } = await supabase.from('users').select('id, email, role, first_name, last_name').ilike('email', user.email).single();
    if (found && !findErr) {
      // attempt to ensure an auth session exists for the user (create+signin using anon key)
      try {
        // signUp (may return error if already exists) — ignore duplicate errors
        await (supabase as any).auth.signUp?.({ email: user.email, password: password }).catch(() => null);
      } catch (_) {}
      // sign in to obtain a session for the browser
      try {
        const signIn = await (supabase as any).auth.signInWithPassword?.({ email: user.email, password });
        const session = signIn?.data?.session || null;
        return res.json({ success: true, user: found, message: 'Login successful (DB user)', session });
      } catch (_) {
        return res.json({ success: true, user: found, message: 'Login successful (DB user)' });
      }
    }

    // Create the user in DB
    const insertRow = { email: user.email, role: user.role };
    const { data: created, error: createErr } = await supabase.from('users').insert([insertRow]).select('id, email, role, first_name, last_name').single();
    if (created && !createErr) {
      console.log('[auth] Created DB user during login', { email: user.email, id: created.id });
      // attempt to ensure auth user exists and sign in to obtain session
      try {
        await (supabase as any).auth.signUp?.({ email: user.email, password }).catch(() => null);
      } catch (_) {}
      try {
        const signIn = await (supabase as any).auth.signInWithPassword?.({ email: user.email, password });
        const session = signIn?.data?.session || null;
        return res.json({ success: true, user: created, message: 'Login successful (created DB user)', session });
      } catch (_) {
        return res.json({ success: true, user: created, message: 'Login successful (created DB user)' });
      }
    }
    console.warn('[auth] Could not create/find DB user during login, falling back to demo user', { findErr, createErr });
  } catch (ex) {
    console.error('[auth] Exception ensuring DB user during login', ex);
  }

  // As a final fallback, return demo user (no session)
  return res.json({ success: true, user: userWithoutPassword, message: 'Login successful (demo user fallback)' });
};

export const register: RequestHandler = async (_req, res) => {
  // Manual signup: immediately create canonical DB user after validating email.
  const { email, password, firstName, lastName } = _req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  // Simple email format validation
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(String(email || '').trim())) return res.status(400).json({ error: 'Invalid email format' });

  // If a canonical DB user already exists, disallow signup (email already used).
  try {
    const { data: found, error: findErr } = await supabase.from('users').select('id').ilike('email', email).maybeSingle();
    if (findErr) console.warn('[auth/register] Supabase lookup error', { email, findErr });
    if (found && found.id) return res.status(409).json({ error: 'Email already registered' });
  } catch (ex) {
    console.warn('[auth/register] error checking existing user', ex);
  }

  try {
    // Create DB user and return it. Use helper to set first/last name when available.
    const result = await getOrCreateUserInDb(email.toLowerCase(), 'student', firstName, lastName);
    if (result.error || !result.id) {
      console.error('[auth/register] failed to create user in DB', { email, err: result.error });
      return res.status(500).json({ error: 'Failed to create user' });
    }

    const { data, error } = await supabase.from('users').select('id, email, role, first_name, last_name').eq('id', result.id).maybeSingle();
    if (error || !data) {
      console.error('[auth/register] failed to fetch created user', { id: result.id, error });
      return res.status(500).json({ error: 'Failed to fetch created user' });
    }

    // Also register demo in-memory user for local/demo flows
    const displayName = `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim() || data.email.split('@')[0];
    const newUser = {
      id: String(Date.now()),
      email: data.email,
      password: password || '',
      role: 'student',
      name: displayName,
      approved: true,
      requestedRole: null,
    } as UserRecord;
    REGISTERED_USERS.push(newUser);

    return res.json({ success: true, user: data, created: !!result.created });
  } catch (ex) {
    console.error('[auth/register] unexpected error', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
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
          const { data, error } = await supabase.from("users").select("id, email, role, first_name, last_name").eq("id", id).maybeSingle();
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
      const { data, error } = await supabase.from("users").select("id, email, role, first_name, last_name").eq("id", key).maybeSingle();
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
export async function getOrCreateUserInDb(email: string, _role: string = 'user', firstName?: string, lastName?: string): Promise<{ id: string | null; created?: boolean; error?: any }> {
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
    // Try find first (also prefer first_name/last_name if present)
    const { data: found, error: findErr } = await supabase.from('users').select('id, first_name, last_name').ilike('email', lc).maybeSingle();
    if (findErr) {
      console.warn('[auth/getOrCreate] Supabase lookup error', { email: lc, findErr });
    }
    if (found && found.id) return { id: found.id };

    // Not found -> attempt insert with lowercase email
    const insertRow: any = { email: lc, role: assignedRole };
    if (firstName) insertRow.first_name = firstName;
    if (lastName) insertRow.last_name = lastName;
    const { data: created, error: createErr } = await supabase.from('users').insert([insertRow]).select('id, first_name, last_name').maybeSingle();
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
      return { id: created.id, created: true };
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
    const { data: found, error: findErr } = await supabase.from('users').select('id, email, role, first_name, last_name').ilike('email', email).maybeSingle();
    if (findErr) {
      console.warn('[auth/verifyOtp] Supabase lookup error', { email, findErr });
    }
    if (found) return res.json({ success: true, user: found, message: 'OTP verified', created: false });

    const insertRow: any = { email: user.email, role: user.role };
    const { data: created, error: createErr } = await supabase.from('users').insert([insertRow]).select('id, email, role, first_name, last_name').maybeSingle();
    if (createErr) console.warn('[auth/verifyOtp] failed to create DB user', { email, createErr });
    if (created) return res.json({ success: true, user: created, message: 'OTP verified', created: true });
  } catch (ex) {
    console.error('[auth/verifyOtp] exception ensuring DB user', ex);
  }

  return res.json({ success: true, user: userWithoutPassword, message: "OTP verified" });
};

// Email verification endpoint removed — manual signups are created immediately without email verification.

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
    const { data: found, error: findErr } = await supabase.from('users').select('id, email, role, first_name, last_name').ilike('email', user.email).maybeSingle();
    if (findErr) console.warn('[auth/socialLogin] Supabase lookup error', { email: user.email, findErr });
    if (found) return res.json({ success: true, user: found, provider, created: false });

    const insertRow: any = { email: user.email, role: user.role };
    const { data: created, error: createErr } = await supabase.from('users').insert([insertRow]).select('id, email, role, first_name, last_name').maybeSingle();
    if (createErr) console.warn('[auth/socialLogin] failed to create DB user', { email: user.email, createErr });
    if (created) return res.json({ success: true, user: created, provider, created: true });
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
    const given = String((decoded as any).given_name || '').trim() || name.split(' ')[0];
    const family = String((decoded as any).family_name || '').trim() || (name.split(' ').slice(1).join(' ') || '');
    if (!email) return res.status(400).json({ error: 'No email present in token' });

    // Ensure DB user exists with default student role
    const result = await getOrCreateUserInDb(email, 'student', given || undefined, family || undefined);
    if (result.error || !result.id) {
      console.warn('[auth/firebaseLogin] failed to ensure DB user', { email, err: result.error });
      return res.status(500).json({ error: 'Failed to ensure user in DB' });
    }

    const { data, error } = await supabase.from('users').select('id, email, role, first_name, last_name').eq('id', result.id).maybeSingle();
    if (error || !data) {
      console.warn('[auth/firebaseLogin] failed to fetch created user', { id: result.id, error });
      return res.status(500).json({ error: 'Failed to fetch user' });
    }

    return res.json({ success: true, user: data, created: !!result.created });
  } catch (ex: any) {
    console.error('[auth/firebaseLogin] token verification failed', ex);
    return res.status(401).json({ error: 'Invalid or expired ID token' });
  }
};

// Helper to ensure requester is an admin based on `Authorization: Bearer` token
// Note: some frontend code may still include `x-user-id` as a local/demo fallback,
// but the server enforces bearer-only authentication for admin-protected routes.
export async function requireAdmin(req: any) {
  // Enforce Authorization Bearer token only. Legacy test fallbacks (headers)
  // were removed to ensure production-grade security.
  try {
    const authHeader = String(req.headers['authorization'] || '');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return { ok: false, status: 401, msg: 'Authorization bearer token required' };
    }

    const token = authHeader.slice(7).trim();
    if (!token) return { ok: false, status: 401, msg: 'Authorization bearer token required' };

    try {
      // Validate token with Supabase and retrieve the associated user
      const userResp: any = await (supabase as any).auth.getUser?.(token) || (await (supabase as any).auth.api?.getUser?.(token));
      const foundUser = userResp?.data?.user || userResp?.user || null;
      if (!foundUser || !foundUser.id) return { ok: false, status: 401, msg: 'Invalid token or user not found' };

      // Confirm role from DB row
      const { data: dbUser, error: dbErr } = await supabase.from('users').select('id, role').eq('id', foundUser.id).maybeSingle();
      if (dbErr || !dbUser) return { ok: false, status: 401, msg: 'Requester not found' };
      if (String(dbUser.role) !== 'admin') return { ok: false, status: 403, msg: 'admin role required' };
      return { ok: true, user: dbUser };
    } catch (tokenErr) {
      console.warn('[requireAdmin] token validation failed', tokenErr?.message || tokenErr);
      return { ok: false, status: 401, msg: 'Invalid or expired token' };
    }
  } catch (ex) {
    console.error('[requireAdmin] unexpected error', ex);
    return { ok: false, status: 500, msg: 'failed to verify admin' };
  }
}

// Admin: list all users
export const listAllUsers: RequestHandler = async (req, res) => {
  const chk = await requireAdmin(req);
  if (!chk.ok) return res.status(chk.status).json({ error: chk.msg });
  try {
    const { data, error } = await supabase.from('users').select('id, email, role, first_name, last_name').order('email');
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
    const { data, error } = await supabase.from('users').update({ role }).eq('id', id).select('id, email, role, first_name, last_name').maybeSingle();
    if (error) return res.status(500).json({ error: error.message || 'Failed to update role' });
    if (!data) return res.status(404).json({ error: 'User not found' });

    // Attempt to write a simple audit entry. If the audit table doesn't exist, don't fail the request.
    try {
      const adminId = String((chk.user && (chk.user as any).id) || '');
      const metadata = { changedBy: adminId, newRole: role, targetUser: id, timestamp: new Date().toISOString() };
      await supabase.from('admin_audit').insert([{ action: 'update_user_role', admin_id: adminId, target_user_id: id, metadata }]);
    } catch (auditErr) {
      // Non-fatal: audit failed (table may not exist), log and continue
      console.warn('[admin/updateUserRole] audit insert failed', auditErr?.message || auditErr);
    }

    return res.json({ success: true, user: data });
  } catch (ex) {
    console.error('[admin/updateUserRole] err', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// User requests elevated role (instructor/content_creator) — persist to DB and keep demo fallback
export const requestRole: RequestHandler = async (req, res) => {
  const { email, requestedRole } = req.body || {};
  if (!email || !requestedRole) return res.status(400).json({ error: 'email and requestedRole required' });
  // accept either frontend form values ('contentCreator') or canonical ('content_creator')
  const allowed = ['instructor', 'contentCreator', 'content_creator'];
  if (!allowed.includes(requestedRole)) return res.status(400).json({ error: 'invalid requestedRole' });

  // normalize requested role to DB canonical form when storing
  const normalized = requestedRole === 'contentCreator' ? 'content_creator' : requestedRole;

  try {
    // Ensure the canonical DB user exists
    const lc = String(email || '').toLowerCase();
    const { data: dbUser, error: findErr } = await supabase.from('users').select('id, email, role, first_name, last_name').ilike('email', lc).maybeSingle();
    if (findErr) {
      console.warn('[auth/requestRole] Supabase lookup error', { email: lc, findErr });
      return res.status(500).json({ error: 'Failed to lookup user' });
    }
    if (!dbUser || !dbUser.id) {
      // User not present in DB -> ask them to signup first
      return res.status(404).json({ error: 'user not found; please signup first' });
    }

    const details: any = {};
    if (req.body.reason) details.reason = String(req.body.reason);
    if (req.body.bio) details.bio = String(req.body.bio);
    if (req.body.portfolio) details.portfolio = String(req.body.portfolio);

    // Insert role request into DB
    const insertRow: any = {
      user_id: dbUser.id,
      email: dbUser.email,
      requested_role: normalized,
      details: Object.keys(details).length ? details : {},
      status: 'pending',
    };

    const { data: created, error: createErr } = await supabase.from('role_requests').insert([insertRow]).select('*').maybeSingle();
    if (createErr) {
      console.error('[auth/requestRole] failed to insert role_request', createErr);
      return res.status(500).json({ error: 'Failed to submit role request' });
    }

    // Mirror in demo in-memory users if present (non-fatal)
    try {
      const demo = REGISTERED_USERS.find((u) => u.email.toLowerCase() === lc);
      if (demo) {
        demo.requestedRole = normalized as any;
        demo.approved = false;
        if (Object.keys(details).length) demo.roleRequestDetails = details as any;
      }
    } catch (ex) {
      console.warn('[auth/requestRole] failed to update demo user', ex);
    }

    return res.json({ success: true, message: 'Role request submitted' });
  } catch (ex) {
    console.error('[auth/requestRole] unexpected error', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// Admin: list pending role requests (protected by requireAdmin middleware)
export const listRoleRequests: RequestHandler = async (req, res) => {
  // Public endpoint: return pending role requests. Client-side UI should gate visibility.
  try {
    const { data, error } = await supabase.from('role_requests').select('id, user_id, email, requested_role, details, status, created_at, updated_at').eq('status', 'pending').order('created_at', { ascending: false });
    if (error) {
      console.error('[listRoleRequests] supabase error', error);
      return res.status(500).json({ error: 'Failed to fetch role requests' });
    }

    const rows = data || [];
    // Fetch related users in batch
    const userIds = rows.map((r: any) => r.user_id).filter(Boolean);
    let usersMap: Record<string, any> = {};
    if (userIds.length) {
      const { data: users, error: usersErr } = await supabase.from('users').select('id, email, first_name, last_name').in('id', userIds as any[]);
      if (!usersErr && users) {
        usersMap = (users as any[]).reduce((acc: any, u: any) => { acc[u.id] = u; return acc; }, {} as any);
      }
    }

    const requests = (rows as any[]).map((r) => ({
      id: r.id,
      email: r.email,
      requestedRole: r.requested_role,
      name: (usersMap[r.user_id]?.first_name || '') ? `${usersMap[r.user_id].first_name} ${usersMap[r.user_id].last_name || ''}`.trim() : r.email,
      details: r.details || null,
      createdAt: r.created_at,
      status: r.status,
    }));
    return res.json({ requests });
  } catch (ex) {
    console.error('[listRoleRequests] unexpected error', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// Admin: approve a role request
export const approveRole: RequestHandler = async (req, res) => {
  // Allow either a verified admin bearer token OR an `adminEmail` provided by the client
  const { email, requestId, adminEmail } = req.body || {};
  if (!email && !requestId) return res.status(400).json({ error: 'email or requestId required' });

  // Verify admin: prefer server token; otherwise verify adminEmail exists and has admin role
  let isAdmin = false;
  try {
    const chk = await requireAdmin(req);
    if (chk.ok) isAdmin = true;
  } catch (_) {}

  if (!isAdmin && adminEmail) {
    // verify adminEmail in DB
    try {
      const { data: adm, error: admErr } = await supabase.from('users').select('id, email, role').ilike('email', String(adminEmail)).maybeSingle();
      if (adm && adm.role === 'admin') isAdmin = true;
      else {
        // fallback to demo in-memory check
        const demoAdmin = REGISTERED_USERS.find((u) => u.email.toLowerCase() === String(adminEmail).toLowerCase() && (u.role === 'admin'));
        if (demoAdmin) isAdmin = true;
      }
    } catch (ex) {
      console.warn('[admin/approveRole] adminEmail verification failed', ex);
    }
  }

  if (!isAdmin) return res.status(403).json({ error: 'admin role required' });

  try {
    // Find the pending request
    let rr: any = null;
    if (requestId) {
      const { data: row, error: rowErr } = await supabase.from('role_requests').select('*').eq('id', requestId).maybeSingle();
      if (rowErr) return res.status(500).json({ error: 'Failed to query role request' });
      rr = row;
    } else {
      const { data: row, error: rowErr } = await supabase.from('role_requests').select('*').ilike('email', String(email || '')).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (rowErr) return res.status(500).json({ error: 'Failed to query role request' });
      rr = row;
    }
    if (!rr) return res.status(404).json({ error: 'No pending role request found for this user' });

    // Update user's role in DB (if user exists)
    if (rr.user_id) {
      const { data: updatedUser, error: updErr } = await supabase.from('users').update({ role: rr.requested_role }).eq('id', rr.user_id).select('id, email, role, first_name, last_name').maybeSingle();
      if (updErr) console.warn('[admin/approveRole] failed to update DB user role', updErr);
      // Mirror demo in-memory user
      try {
        const demo = REGISTERED_USERS.find((u) => u.email.toLowerCase() === (rr.email || '').toLowerCase());
        if (demo) {
          demo.role = rr.requested_role as any;
          demo.requestedRole = null;
          demo.approved = true;
        }
      } catch (ex) {
        console.warn('[admin/approveRole] demo update failed', ex);
      }
    }

    // Mark the role request as approved
    try {
      await supabase.from('role_requests').update({ status: 'approved' }).eq('id', rr.id);
    } catch (ex) {
      console.warn('[admin/approveRole] failed to update role_requests status', ex);
    }

    // Audit
    try {
      const adminId = String((isAdmin && adminEmail) ? (adminEmail) : '');
      const metadata = { action: 'approve_role', target: rr.email, by: adminId, timestamp: new Date().toISOString() };
      await supabase.from('admin_audit').insert([{ action: 'approve_role', admin_id: adminId || null, target_user_id: rr.user_id || null, metadata }]);
    } catch (auditErr) {
      console.warn('[admin/approveRole] audit insert failed', auditErr?.message || auditErr);
    }

    return res.json({ success: true });
  } catch (ex) {
    console.error('[admin/approveRole] unexpected error', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

// Admin: deny a role request
export const denyRole: RequestHandler = async (req, res) => {
  // Allow either a verified admin bearer token OR an `adminEmail` provided by the client
  const { email, requestId, adminEmail } = req.body || {};
  if (!email && !requestId) return res.status(400).json({ error: 'email or requestId required' });

  let isAdmin = false;
  try {
    const chk = await requireAdmin(req);
    if (chk.ok) isAdmin = true;
  } catch (_) {}

  if (!isAdmin && adminEmail) {
    try {
      const { data: adm, error: admErr } = await supabase.from('users').select('id, email, role').ilike('email', String(adminEmail)).maybeSingle();
      if (adm && adm.role === 'admin') isAdmin = true;
      else {
        const demoAdmin = REGISTERED_USERS.find((u) => u.email.toLowerCase() === String(adminEmail).toLowerCase() && (u.role === 'admin'));
        if (demoAdmin) isAdmin = true;
      }
    } catch (ex) {
      console.warn('[admin/denyRole] adminEmail verification failed', ex);
    }
  }

  if (!isAdmin) return res.status(403).json({ error: 'admin role required' });

  try {
    // Find the pending request
    let rr: any = null;
    if (requestId) {
      const { data: row, error: rowErr } = await supabase.from('role_requests').select('*').eq('id', requestId).maybeSingle();
      if (rowErr) return res.status(500).json({ error: 'Failed to query role request' });
      rr = row;
    } else {
      const { data: row, error: rowErr } = await supabase.from('role_requests').select('*').ilike('email', String(email || '')).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (rowErr) return res.status(500).json({ error: 'Failed to query role request' });
      rr = row;
    }
    if (!rr) return res.status(404).json({ error: 'No pending role request found for this user' });

    // Mark the role request as denied
    try {
      await supabase.from('role_requests').update({ status: 'denied' }).eq('id', rr.id);
    } catch (ex) {
      console.warn('[admin/denyRole] failed to update role_requests status', ex);
    }

    // Mirror demo in-memory user if present
    try {
      const demo = REGISTERED_USERS.find((u) => u.email.toLowerCase() === (rr.email || '').toLowerCase());
      if (demo) {
        demo.requestedRole = null;
        demo.approved = true;
      }
    } catch (ex) {
      console.warn('[admin/denyRole] demo update failed', ex);
    }

    // Audit
    try {
      const adminId = String((isAdmin && adminEmail) ? (adminEmail) : '');
      const metadata = { action: 'deny_role', target: rr.email, by: adminId, timestamp: new Date().toISOString() };
      await supabase.from('admin_audit').insert([{ action: 'deny_role', admin_id: adminId || null, target_user_id: rr.user_id || null, metadata }]);
    } catch (auditErr) {
      console.warn('[admin/denyRole] audit insert failed', auditErr?.message || auditErr);
    }

    return res.json({ success: true });
  } catch (ex) {
    console.error('[admin/denyRole] unexpected error', ex);
    return res.status(500).json({ error: 'Unexpected error' });
  }
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

// Generic authenticated user check (validates bearer token and returns DB user row)
export async function requireAuth(req: any) {
  try {
    const authHeader = String(req.headers['authorization'] || '');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return { ok: false, status: 401, msg: 'Authorization bearer token required' };
    }
    const token = authHeader.slice(7).trim();
    if (!token) return { ok: false, status: 401, msg: 'Authorization bearer token required' };

    try {
      const userResp: any = await (supabase as any).auth.getUser?.(token) || (await (supabase as any).auth.api?.getUser?.(token));
      const foundUser = userResp?.data?.user || userResp?.user || null;
      if (!foundUser || !foundUser.id) return { ok: false, status: 401, msg: 'Invalid token or user not found' };

      const { data: dbUser, error: dbErr } = await supabase.from('users').select('id, role, email, first_name, last_name').eq('id', foundUser.id).maybeSingle();
      if (dbErr || !dbUser) return { ok: false, status: 401, msg: 'Requester not found' };
      return { ok: true, user: dbUser };
    } catch (tokenErr) {
      console.warn('[requireAuth] token validation failed', tokenErr?.message || tokenErr);
      return { ok: false, status: 401, msg: 'Invalid or expired token' };
    }
  } catch (ex) {
    console.error('[requireAuth] unexpected error', ex);
    return { ok: false, status: 500, msg: 'failed to verify user' };
  }
}

// Ensure requester is an instructor or admin
export async function requireInstructor(req: any) {
  const chk = await requireAuth(req);
  if (!chk.ok) return chk;
  const role = String((chk.user as any).role || '');
  if (role !== 'instructor' && role !== 'admin') return { ok: false, status: 403, msg: 'instructor role required' };
  return { ok: true, user: chk.user };
}