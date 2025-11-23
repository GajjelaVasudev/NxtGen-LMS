import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PlayCircle, FileText, CheckCircle } from "lucide-react";

type Todo = { id: string; text: string; done: boolean };
type Course = { id: string; title: string; thumbnail?: string; description?: string; price?: number; creator?: string; createdAt: number; };
type Assignment = { id: string; title: string; courseId: string; courseName: string; instructorId: string; dueDate: string; createdAt: number; };

const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
const TODO_KEY = "nxtgen_todos";
const ASSIGNMENTS_KEY = "nxtgen_assignments";
const SUBMISSIONS_KEY = "nxtgen_submissions";

function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(TODO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTodos(todos: Todo[]) {
  try {
    localStorage.setItem(TODO_KEY, JSON.stringify(todos));
  } catch {}
}

function loadAssignments(): Assignment[] {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadSubmissions() {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function Overview() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>(() => loadTodos());
  const [text, setText] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<{ courseId: string; userId?: string }[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Load server-backed courses & user enrollments
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [cRes, eRes] = await Promise.all([
          fetch(`${API}/courses`).then(r => r.json()).catch(() => ({ courses: [] })),
          fetch(`${API}/enrollments${user?.id ? `?userId=${user.id}` : ""}`).then(r => r.json()).catch(() => ({ enrollments: [] })),
        ]);
        if (!mounted) return;
        setCourses(cRes.courses || []);
        setEnrollments(eRes.enrollments || []);
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  // Load local assignments/submissions (existing app shape)
  useEffect(() => {
    setAssignments(loadAssignments());
    setSubmissions(loadSubmissions());
  }, []);

  // Persist todos
  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  // To-do handlers
  function addTodo() {
    if (!text.trim()) return;
    const t: Todo = { id: `${Date.now()}`, text: text.trim(), done: false };
    setTodos((s) => [t, ...s]);
    setText("");
  }

  function toggle(id: string) {
    setTodos((s) => s.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function remove(id: string) {
    setTodos((s) => s.filter(t => t.id !== id));
  }

  // Derived data
  const enrolledCourseIds = enrollments.map((e) => e.courseId);
  const enrolledCourses = courses.filter(c => enrolledCourseIds.includes(c.id));
  const pendingAssignments = assignments.filter(a =>
    enrolledCourseIds.includes(a.courseId) &&
    // not submitted by this user
    !submissions.some((s: any) => s.assignmentId === a.id && s.userId === user?.id)
  );

  const recentAssignments = assignments
    .filter(a => enrolledCourseIds.includes(a.courseId))
    .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);

  const displayName = user?.name || (user?.email?.split?.("@")?.[0]) || "Student";

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {displayName}</h1>
            <p className="text-sm text-gray-600 mt-1">Here's a snapshot of your learning dashboard</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Ongoing Courses</div>
              <div className="text-xl font-semibold">{enrolledCourses.length}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Pending Assignments</div>
              <div className="text-xl font-semibold">{pendingAssignments.length}</div>
            </div>
          </div>
        </div>

        {/* To-do list */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <section className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">To-Do List</h2>

            <div className="flex gap-2 mb-4">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addTodo(); }}
                className="flex-1 border px-3 py-2 rounded"
                placeholder="Add a new task..."
              />
              <button onClick={addTodo} className="px-4 py-2 bg-blue-600 text-white rounded">Add</button>
            </div>

            <div className="space-y-2">
              {todos.length === 0 && <div className="text-gray-500">No tasks yet — add one above.</div>}
              {todos.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
                    <div className={`${t.done ? 'line-through text-gray-500' : ''}`}>{t.text}</div>
                  </div>
                  <div>
                    <button onClick={() => remove(t.id)} className="text-red-600">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Course & assignment insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="bg-white border rounded-lg p-6 col-span-2">
            <h2 className="text-lg font-semibold mb-4">Your Courses</h2>
            {enrolledCourses.length === 0 ? (
              <div className="text-gray-500">You're not enrolled in any courses yet.</div>
            ) : (
              <div className="space-y-4">
                {enrolledCourses.map(course => (
                  <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {course.thumbnail && (
                        <img src={course.thumbnail} alt={course.title} className="w-16 h-16 rounded object-cover" />
                      )}
                      <div>
                        <div className="text-md font-semibold">{course.title}</div>
                        <div className="text-sm text-gray-500">{course.description}</div>
                      </div>
                    </div>
                    <div>
                      <Link to={`/app/courses/${course.id}`} className="px-4 py-2 bg-blue-600 text-white rounded">
                        <PlayCircle className="w-5 h-5 inline-block mr-1 -mt-1" />
                        Continue
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Pending Assignments</h2>
            {pendingAssignments.length === 0 ? (
              <div className="text-gray-500">No pending assignments.</div>
            ) : (
              <div className="space-y-4">
                {pendingAssignments.map(assignment => (
                  <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 flex items-center justify-center rounded bg-blue-100">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-md font-semibold">{assignment.title}</div>
                        <div className="text-sm text-gray-500">{assignment.courseName}</div>
                      </div>
                    </div>
                    <div>
                      <Link to={`/app/assignments/submissions/${assignment.id}`} className="px-4 py-2 bg-blue-600 text-white rounded">
                        <CheckCircle className="w-5 h-5 inline-block mr-1 -mt-1" />
                        View Assignment
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
