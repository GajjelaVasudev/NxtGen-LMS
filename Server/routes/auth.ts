import { RequestHandler } from "express";
import nodemailer from "nodemailer";

type UserRecord = {
  id: string;
  email: string;
  password: string;
  role: "admin" | "instructor" | "contentCreator" | "user";
  name: string;
  approved?: boolean; // whether account is approved for elevated roles
  requestedRole?: "admin" | "instructor" | "contentCreator" | null;
};

// Only these users can login (demo)
const REGISTERED_USERS: UserRecord[] = [
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
    role: "contentCreator",
    name: "Content Creator User",
    approved: true,
    requestedRole: null,
  },
  {
    id: "4",
    email: "student@gmail.com",
    password: "student123",
    role: "user",
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

export const login: RequestHandler = (req, res) => {
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
  return res.json({ success: true, user: userWithoutPassword, message: "Login successful" });
};

export const register: RequestHandler = (_req, res) => {
  // Allow manual signup for students only
  const { email, password, name } = _req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  const existing = REGISTERED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const newUser: UserRecord = {
    id: String(Date.now()),
    email,
    password,
    role: "user",
    name: name || email.split("@")[0],
    approved: true,
    requestedRole: null,
  };
  REGISTERED_USERS.push(newUser);
  const { password: _, ...userWithoutPassword } = newUser;
  return res.json({ success: true, user: userWithoutPassword });
};

// Get all registered emails (for display purposes only)
export const getRegisteredEmails: RequestHandler = (_req, res) => {
  const emails = REGISTERED_USERS.map((u) => ({ email: u.email, role: u.role }));
  return res.json({ emails });
};

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
export const verifyOtp: RequestHandler = (req, res) => {
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
  return res.json({ success: true, user: userWithoutPassword, message: "OTP verified" });
};

// NEW: simple demo social login
export const socialLogin: RequestHandler = (req, res) => {
  const provider = (req.body?.provider || req.query?.provider || "").toLowerCase();
  if (!provider) return res.status(400).json({ error: "provider required" });

  // Demo mapping: map provider -> a registered user
  let user: UserRecord | undefined;
  if (provider === "google") user = REGISTERED_USERS.find((u) => u.role === "user");
  else if (provider === "facebook") user = REGISTERED_USERS.find((u) => u.role === "instructor");
  else if (provider === "apple") user = REGISTERED_USERS.find((u) => u.role === "contentCreator");

  if (!user) return res.status(404).json({ error: "No demo user available for provider" });

  if (user.approved === false) return res.status(403).json({ error: "Account pending approval by administrator" });
  const { password: _, ...userWithoutPassword } = user;
  return res.json({ success: true, user: userWithoutPassword, provider });
};

// User requests elevated role (teacher/contentCreator/admin) — creates or updates requestedRole
export const requestRole: RequestHandler = (req, res) => {
  const { email, requestedRole } = req.body;
  if (!email || !requestedRole) return res.status(400).json({ error: 'email and requestedRole required' });
  const allowed = ['admin', 'instructor', 'contentCreator'];
  if (!allowed.includes(requestedRole)) return res.status(400).json({ error: 'invalid requestedRole' });

  const user = REGISTERED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'user not found; please signup first' });

  user.requestedRole = requestedRole as any;
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

  // By default, new social signups become students (role 'user') and are approved.
  const newUser: UserRecord = {
    id: String(Date.now()),
    email,
    password: '',
    role: 'user',
    name: name || email.split('@')[0],
    approved: true,
    requestedRole: null,
  };
  REGISTERED_USERS.push(newUser);
  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}