import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo.js";
import { login, register, getRegisteredEmails } from "./routes/auth.js";

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

  return app;
}

const PORT = process.env.PORT || 5000;
const app = createServer();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
