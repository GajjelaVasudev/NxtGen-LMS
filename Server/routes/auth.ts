import { RequestHandler } from "express";

type UserRecord = {
  id: string;
  email: string;
  password: string;
  role: "admin" | "instructor" | "contentCreator" | "user";
  name: string;
};

// Only these users can login
const REGISTERED_USERS: UserRecord[] = [
  {
    id: "1",
    email: "admin@gmail.com",
    password: "admin123",
    role: "admin",
    name: "Admin User",
  },
  {
    id: "2",
    email: "instructor@gmail.com",
    password: "instructor123",
    role: "instructor",
    name: "Instructor User",
  },
  {
    id: "3",
    email: "contentcreator@gmail.com",
    password: "creator123",
    role: "contentCreator",
    name: "Content Creator User",
  },
  {
    id: "4",
    email: "student@gmail.com",
    password: "student123",
    role: "user",
    name: "Student User",
  },
];

export const login: RequestHandler = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password are required",
    });
  }

  // Find user in registered users
  const user = REGISTERED_USERS.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({
      error: "Invalid credentials. Please use registered email/password.",
    });
  }

  // Return user data (excluding password)
  const { password: _, ...userWithoutPassword } = user;
  return res.json({
    success: true,
    user: userWithoutPassword,
    message: "Login successful",
  });
};

export const register: RequestHandler = (req, res) => {
  return res.status(403).json({
    error: "Registration is disabled. Please contact administrator for access.",
  });
};

// Get all registered emails (for display purposes only)
export const getRegisteredEmails: RequestHandler = (req, res) => {
  const emails = REGISTERED_USERS.map((u) => ({
    email: u.email,
    role: u.role,
  }));
  return res.json({ emails });
};