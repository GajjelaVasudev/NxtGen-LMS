import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { login, register, getRegisteredEmails } from "./routes/auth";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
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
