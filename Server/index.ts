import "dotenv/config";
import express from "express";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { handleDemo } from "./routes/demo.js";
import { login, register, getRegisteredEmails, requestOtp, verifyOtp, socialLogin, findOrCreateSocialUser, requestRole, listRoleRequests, approveRole, denyRole } from "./routes/auth.js";

export function createServer() {
  const app = express();

  // Middleware
  // allow CORS for local development; tighten origin in production
  app.use(cors({ origin: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/auth/login", login);
  app.post("/api/auth/register", register);
  app.get("/api/auth/registered-emails", getRegisteredEmails);

  // OTP + social endpoints
  app.post("/api/auth/request-otp", requestOtp);
  app.post("/api/auth/login-otp", verifyOtp);
  app.post("/api/auth/social", socialLogin);

  // role request workflow endpoints
  app.post('/api/auth/request-role', requestRole);
  app.get('/api/auth/role-requests', listRoleRequests);
  app.post('/api/auth/approve-role', approveRole);
  app.post('/api/auth/deny-role', denyRole);

  // --- Google OAuth (popup flow) ---
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const BASE_URL = process.env.BASE_URL || "http://localhost:5173"; // client origin for postMessage fallback

  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
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
      (req, res) => {
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

        // send user back to opener window via postMessage and close
        const payload = JSON.stringify(user).replace(/</g, '\\u003c');
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

  return app;
}

const PORT = process.env.PORT || 5000;
const app = createServer();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});