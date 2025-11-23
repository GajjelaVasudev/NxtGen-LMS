import "dotenv/config";
import express from "express";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { handleDemo } from "./routes/demo.js";
import { login, register, getRegisteredEmails, requestOtp, verifyOtp, socialLogin, findOrCreateSocialUser, requestRole, listRoleRequests, approveRole, denyRole, getUserById } from "./routes/auth.js";
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
import {
  getInbox,
  sendInboxMessage,
  markRead,
  deleteMessages,
  starMessage,
} from "./routes/messages.js";
import { getAssignments, createAssignment, getAssignment, updateAssignment } from "./routes/assignments.js";
import {
  listUserSubmissions,
  listAssignmentSubmissions,
  createSubmission,
  updateSubmission,
  listInstructorSubmissions,
  submitAssignment,
  gradeSubmission,
} from "./routes/submissions.js";
import { supabase } from "./supabaseClient.js";



export function createServer() {
  const app = express();
  // When behind a proxy (Render, Heroku, etc.) trust the proxy so req.protocol reflects https
  app.set('trust proxy', true);

  // Middleware
  // allow CORS for local development; tighten origin in production
  app.use(cors({ origin: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Global request logger (temporary) — logs method and path for every request
  app.use((req, _res, next) => {
    try {
      console.log(`[http] ${req.method} ${req.originalUrl}`);
    } catch (e) {
      // ignore logging errors
    }
    next();
  });

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
  const BASE_URL = process.env.BASE_URL || "http://localhost:5173"; // client origin for postMessage fallback

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
          // send error back to opener
          return res.send(
            `<html><body><script>window.opener.postMessage({ type: 'oauth', error: 'No email returned from provider' }, '${BASE_URL}'); window.close();</script></body></html>`
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

        // send user back to opener window via postMessage and close
        const payload = JSON.stringify(outUser).replace(/</g, '\u003c');
        return res.send(`
          <html>
            <body>
              <script>
                try {
                  const u = ${payload};
                  window.opener.postMessage({ type: 'oauth', user: u }, '${BASE_URL}');
                } catch (e) {
                  window.opener.postMessage({ type: 'oauth', error: 'Failed to parse user' }, '${BASE_URL}');
                }
                window.close();
              </script>
            </body>
          </html>
        `);
      }
    );

    app.get('/api/auth/google/failure', (_req, res) => {
      return res.send(`<html><body><script>window.opener.postMessage({ type: 'oauth', error: 'OAuth failed' }, '${BASE_URL}'); window.close();</script></body></html>`);
    });
  } else {
    // If OAuth not configured show a helpful route
    app.get('/api/auth/google', (_req, res) => {
      return res.send(`<html><body><script>window.opener.postMessage({ type: 'oauth', error: 'Google OAuth not configured on server' }, '${BASE_URL}'); window.close();</script></body></html>`);
    });
  }

  // register courses API
  app.get("/api/courses", getCourses);
  app.get("/api/courses/:id", getCourse);
  app.post("/api/courses", createCourse);
  app.put("/api/courses/:id", updateCourse);
  app.delete("/api/courses/:id", deleteCourse);

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
  app.patch("/api/submissions/:submissionId/grade", gradeSubmission);
  app.put("/api/submissions/:submissionId", updateSubmission);
  // Discussions and direct-messages removed: Inbox handles notifications, teacher and admin messages

  return app;
}

const PORT = process.env.PORT || 5000;
const app = createServer();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});