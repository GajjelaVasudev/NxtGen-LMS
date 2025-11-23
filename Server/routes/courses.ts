import { RequestHandler } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// __dirname is not available in ES modules. Derive directory from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..", "data");
const COURSES_FILE = path.join(DATA_DIR, "courses.json");
const ENROLL_FILE = path.join(DATA_DIR, "enrollments.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
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

// GET /api/courses
export const getCourses: RequestHandler = async (_req, res) => {
  const courses = await readJson(COURSES_FILE, [] as any[]);
  res.json({ courses });
};

// GET /api/courses/:id
export const getCourse: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const courses = await readJson(COURSES_FILE, [] as any[]);
  const c = courses.find((x: any) => String(x.id) === String(id));
  if (!c) return res.status(404).json({ error: "Course not found" });
  res.json({ course: c });
};

// POST /api/courses
export const createCourse: RequestHandler = async (req, res) => {
  const payload = req.body || {};
  const courses = await readJson(COURSES_FILE, [] as any[]);
  const now = Date.now();
  const id = String(now);
  const creator = payload.creator || (req.headers["x-user-id"] as string) || "unknown";
  const course = { ...payload, id, createdAt: now, creator };
  courses.unshift(course);
  await writeJson(COURSES_FILE, courses);
  res.json({ success: true, course });
};

// PUT /api/courses/:id
export const updateCourse: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  const courses = await readJson(COURSES_FILE, [] as any[]);
  const idx = courses.findIndex((x: any) => String(x.id) === String(id));
  if (idx === -1) return res.status(404).json({ error: "Course not found" });
  courses[idx] = { ...courses[idx], ...payload };
  await writeJson(COURSES_FILE, courses);
  res.json({ success: true, course: courses[idx] });
};

// DELETE /api/courses/:id
export const deleteCourse: RequestHandler = async (req, res) => {
  const id = req.params.id;
  let courses = await readJson(COURSES_FILE, [] as any[]);
  const before = courses.length;
  courses = courses.filter((x: any) => String(x.id) !== String(id));
  if (courses.length === before) return res.status(404).json({ error: "Course not found" });
  await writeJson(COURSES_FILE, courses);
  res.json({ success: true });
};

// GET /api/enrollments[?userId=...]
export const listEnrollments: RequestHandler = async (req, res) => {
  const userId = String(req.query.userId || "");
  const enrollments = await readJson(ENROLL_FILE, [] as any[]);
  if (userId) return res.json({ enrollments: enrollments.filter((e: any) => String(e.userId) === userId) });
  res.json({ enrollments });
};

// POST /api/courses/:id/enroll
export const enrollCourse: RequestHandler = async (req, res) => {
  const courseId = req.params.id;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const courses = await readJson(COURSES_FILE, [] as any[]);
  const course = courses.find((c: any) => String(c.id) === String(courseId));
  if (!course) return res.status(404).json({ error: "Course not found" });

  const enrollments = await readJson(ENROLL_FILE, [] as any[]);
  const exists = enrollments.some((e: any) => String(e.courseId) === String(courseId) && String(e.userId) === String(userId));
  if (exists) return res.json({ success: true, message: "Already enrolled" });

  enrollments.push({ courseId, userId, purchasedAt: Date.now() });
  await writeJson(ENROLL_FILE, enrollments);

  // optional: notify creator (left as hook)
  res.json({ success: true });
};