import './loadEnv.js';
import express from "express";
import cors from "cors";
// Try to load helmet if available; optional dependency to avoid install errors in minimal dev setups
let helmet: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  helmet = require('helmet');
} catch (e) {
  console.warn('[startup] optional dependency `helmet` not installed; security headers will be reduced. Install with `npm i helmet` for better protection');
}
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { handleDemo } from "./routes/demo.js";
import { login, register, getRegisteredEmails, requestOtp, verifyOtp, socialLogin, findOrCreateSocialUser, requestRole, listRoleRequests, approveRole, denyRole, getUserById, firebaseLogin, listAllUsers, updateUserRole } from "./routes/auth.js";
import debugMappingsRouter from "./routes/_debug/demo-mappings.js";
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  listEnrollments,
  enrollCourse,
} from "./routes/courses.js";
import { uploadMiddleware, handleUpload } from "./routes/upload.js";
import {
  getInbox,
  sendInboxMessage,
  markRead,
  deleteMessages,
  starMessage,
} from "./routes/messages.js";
import {
  listRoles,
  listPermissions,
  createRole,
  addPermissionToRole,
  removePermissionFromRole,
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  listActivity,
  reportsSummary,
  createUser,
  updateUser,
  deleteUser,
  listUsers,
  exportUsersCsv,
} from "./routes/admin.js";
import { getAssignments, createAssignment, getAssignment, updateAssignment } from "./routes/assignments.js";
import {
  listUserSubmissions,
  listAssignmentSubmissions,
  createSubmission,
  updateSubmission,
  listInstructorSubmissions,
  getInstructorSummary,
  submitAssignment,
  gradeSubmission,
  getSubmissionFile,
} from "./routes/submissions.js";
import { supabase } from "./supabaseClient.js";



export function createServer() {
  const app = express();
  // When behind a proxy (Render, Heroku, etc.) trust the proxy so req.protocol reflects https
  app.set('trust proxy', true);

  // Middleware
  // Security headers (only if helmet is available)
  if (helmet) app.use(helmet());

  // CORS: allow a specific list from env in production; allow any in development
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (process.env.NODE_ENV === 'production' && allowed.length > 0) {
    app.use(cors({ origin: function(origin, cb) {
      if (!origin) return cb(null, false);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error('CORS origin denied'));
    } }));
  } else {
    // development / testing: allow any origin
    app.use(cors({ origin: true }));
  }
  // Configure request body size limits. If MAX_UPLOAD_BYTES is set (bytes),
  // use it to compute a reasonable megabyte limit for express body parsers.
  // Default: 10MB to avoid small base64 payloads causing 413 errors.
  const bodyLimit = process.env.MAX_UPLOAD_BYTES
    ? `${Math.max(1, Math.round(Number(process.env.MAX_UPLOAD_BYTES) / 1024 / 1024))}mb`
    : '10mb';
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // Global request logger (temporary) — logs method and path for every request
  app.use((req, _res, next) => {
    try {
      console.log(`[http] ${req.method} ${req.originalUrl}`);
    } catch (e) {
      // ignore logging errors
    }
    next();
  });

  // Lightweight admin rate limiter (in-memory). Limits requests per IP for admin endpoints.
  const adminRateMap = new Map();
  function adminRateLimiter(req: any, res: any, next: any) {
    try {
      const ip = String(req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown');
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minute
      const max = 60; // max requests per window
      const entry = adminRateMap.get(ip) || { count: 0, reset: now + windowMs };
      if (entry.reset < now) {
        entry.count = 0;
        entry.reset = now + windowMs;
      }
      entry.count += 1;
      adminRateMap.set(ip, entry);
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
      res.setHeader('X-RateLimit-Reset', String(Math.floor(entry.reset / 1000)));
      if (entry.count > max) return res.status(429).json({ error: 'Too many requests' });
      next();
    } catch (e) { next(); }
  }

  // API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });
  app.get("/test-db", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .limit(5);

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    console.error("Unexpected Error:", err.message);
    return res.status(500).json({ error: "Unexpected server error" });
  }
});

  app.get("/api/demo", handleDemo);
  // NOTE: dev seed endpoint removed for deployment
  app.post("/api/auth/login", login);
  app.post("/api/auth/register", register);
  app.get("/api/auth/registered-emails", getRegisteredEmails);
  app.get("/api/users/:id", getUserById);

  // OTP + social endpoints
  app.post("/api/auth/request-otp", requestOtp);
  app.post("/api/auth/login-otp", verifyOtp);
  app.post("/api/auth/social", socialLogin);

  // role request workflow endpoints
  app.post('/api/auth/request-role', requestRole);
  app.get('/api/auth/role-requests', listRoleRequests);
  app.post('/api/auth/approve-role', approveRole);
  app.post('/api/auth/deny-role', denyRole);
  app.get("/api/assignments", getAssignments);
  app.get("/api/assignments/:id", getAssignment);
  app.post("/api/assignments", createAssignment);
  
  // debug routes (protected)
  app.use('/api/_debug', debugMappingsRouter);


  // --- Google OAuth (popup flow) ---
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const BASE_URL = process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://nxt-gen-lms.vercel.app' : 'http://localhost:5173'); // client origin for postMessage fallback

  const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback";

  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: CALLBACK_URL,
        },
        // verify
        function (_accessToken, _refreshToken, profile, done) {
          // pass profile through
          return done(null, profile);
        }
      )
    );

    app.use(passport.initialize());

    // start OAuth
    app.get(
      "/api/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"], session: false })
    );

    // callback
    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { session: false, failureRedirect: "/api/auth/google/failure" }),
      async (req, res) => {
        // @ts-ignore -- passport attaches user
        const profile = (req as any).user;
        const emails = profile?.emails || [];
        const email = emails[0]?.value;
        const name = profile?.displayName || emails[0]?.value?.split('@')[0] || 'User';

        if (!email) {
          // send error back to opener; if postMessage fails, fall back to redirecting opener to dashboard
          return res.send(
            `<html><body><script>try{window.opener.postMessage({ type: 'oauth', error: 'No email returned from provider' }, '${BASE_URL}');}catch(e){try{window.opener.location='${BASE_URL}/app';}catch(_){} } finally{ window.close();}</script></body></html>`
          );
        }

        const user = findOrCreateSocialUser(email, name as string);

        // If the user exists but is pending approval, notify opener
        if ((user as any).approved === false) {
          return res.send(`<html><body><script>window.opener.postMessage({ type: 'oauth', error: 'Account pending administrator approval' }, '${BASE_URL}'); window.close();</script></body></html>`);
        }

        // Ensure DB user exists and use DB row for payload (so caller receives UUID)
        let payloadUser: any = null;
        try {
          const { data: found, error: findErr } = await supabase.from('users').select('id, email, role').ilike('email', email).maybeSingle();
          if (findErr) console.warn('[auth/google] Supabase lookup error', { email, findErr });
          if (found) payloadUser = found;
          else {
            const insertRow = { email, role: (user as any).role || 'user' };
            const { data: created, error: createErr } = await supabase.from('users').insert([insertRow]).select('id, email, role').maybeSingle();
            if (createErr) console.warn('[auth/google] failed to create DB user', { email, createErr });
            if (created) payloadUser = created;
          }
        } catch (ex) {
          console.error('[auth/google] exception ensuring DB user', ex);
        }

        const outUser = payloadUser || user;

        // send user back to opener window via postMessage and close; fallback to redirecting opener to dashboard
        const payload = JSON.stringify(outUser).replace(/</g, '\u003c');
        return res.send(`
          <html>
            <body>
              <script>
                try {
                  const u = ${payload};
                  window.opener.postMessage({ type: 'oauth', user: u }, '${BASE_URL}');
                } catch (e) {
                  try { window.opener.location = '${BASE_URL}/app'; } catch (_) {}
                }
                window.close();
              </script>
            </body>
          </html>
        `);
      }
    );

    app.get('/api/auth/google/failure', (_req, res) => {
      return res.send(`<html><body><script>try{window.opener.postMessage({ type: 'oauth', error: 'OAuth failed' }, '${BASE_URL}');}catch(e){try{window.opener.location='${BASE_URL}/app';}catch(_){} } finally{ window.close();}</script></body></html>`);
    });
  } else {
    // If OAuth not configured show a helpful route
    app.get('/api/auth/google', (_req, res) => {
      return res.send(`<html><body><script>try{window.opener.postMessage({ type: 'oauth', error: 'Google OAuth not configured on server' }, '${BASE_URL}');}catch(e){try{window.opener.location='${BASE_URL}/app';}catch(_){} } finally{ window.close();}</script></body></html>`);
    });
  }

  // Firebase token-based login (client posts ID token)
  app.post("/api/auth/firebase-login", firebaseLogin);
  // Email verification endpoint removed — manual signups create users immediately

  // Admin user management
  // Apply admin rate limiter to admin and sensitive role endpoints
  app.use('/api/admin', adminRateLimiter);
  app.use('/api/auth/approve-role', adminRateLimiter);
  app.use('/api/auth/deny-role', adminRateLimiter);
  app.use('/api/auth/role-requests', adminRateLimiter);
  app.get("/api/admin/users", listUsers);
  app.get("/api/admin/users/export", exportUsersCsv);
  app.patch("/api/admin/users/:id/role", updateUserRole);
  // Roles / Permissions / Groups / Activity / Reports
  app.get('/api/admin/roles', listRoles);
  app.get('/api/admin/permissions', listPermissions);
  app.post('/api/admin/roles', createRole);
  app.post('/api/admin/roles/:roleId/permissions', addPermissionToRole);
  app.delete('/api/admin/roles/:roleId/permissions/:permId', removePermissionFromRole);
  app.get('/api/admin/groups', listGroups);
  app.post('/api/admin/groups', createGroup);
  app.put('/api/admin/groups/:id', updateGroup);
  app.delete('/api/admin/groups/:id', deleteGroup);
  app.get('/api/admin/activity', listActivity);
  app.get('/api/admin/reports/summary', reportsSummary);
  // Admin user CRUD
  app.post('/api/admin/users', createUser);
  app.put('/api/admin/users/:id', updateUser);
  app.delete('/api/admin/users/:id', deleteUser);

  // register courses API
  app.get("/api/courses", getCourses);
  app.get("/api/courses/:id", getCourse);
  app.post("/api/courses", createCourse);
  app.put("/api/courses/:id", updateCourse);
  app.delete("/api/courses/:id", deleteCourse);

  // file upload endpoint (accepts multipart/form-data with field 'file')
  app.post('/api/upload', uploadMiddleware, handleUpload);

  app.get("/api/enrollments", listEnrollments);
  app.post("/api/courses/:id/enroll", enrollCourse);

  // messages / discussions routes
  app.get("/api/inbox", getInbox);
  app.post("/api/inbox/send", sendInboxMessage);
  app.post("/api/inbox/mark-read", markRead);
  app.post("/api/inbox/delete", deleteMessages);
  app.post("/api/inbox/star", starMessage);
  // Assignments
  app.get("/api/assignments", getAssignments);
  app.get("/api/assignments/:id", getAssignment);
  app.post("/api/assignments", createAssignment);
  app.put("/api/assignments/:id", updateAssignment);

  // Submissions
  app.get("/api/submissions", listUserSubmissions);
  app.get("/api/assignments/:assignmentId/submissions", listAssignmentSubmissions);
  app.post("/api/assignments/:assignmentId/submissions", createSubmission);
  app.post("/api/assignments/:id/submit", submitAssignment);
  app.get("/api/instructor/submissions", listInstructorSubmissions);
  app.get("/api/instructor/summary", getInstructorSummary);
  app.get("/api/submissions/:submissionId/file", getSubmissionFile);
  app.patch("/api/submissions/:submissionId/grade", gradeSubmission);
  app.put("/api/submissions/:submissionId", updateSubmission);
  // Discussions and direct-messages removed: Inbox handles notifications, teacher and admin messages

  // Global error handler to log unexpected errors and return JSON
  // Placed after all routes so any thrown error is caught here.
  // In non-production include the stack trace for debugging.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    try {
      console.error('[Unhandled Error]', {
        message: err?.message,
        stack: err?.stack,
        method: req.method,
        url: req.originalUrl,
        body: req.body,
      });
    } catch (logErr) {
      console.error('[Unhandled Error] logging failed', logErr);
    }

    const status = err?.status || 500;
    const payload: any = { success: false, message: err?.message || 'Internal server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = err?.stack;
    try {
      res.status(status).json(payload);
    } catch (resErr) {
      // If JSON response fails, fallback to plain text
      try { res.status(status).send(payload.message || 'Internal server error'); } catch (_) { /* noop */ }
    }
  });

  return app;
}

const PORT = process.env.PORT || 5000;
const app = createServer();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});