import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PlayCircle, FileText, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { getAccessToken } from "@/utils/supabaseBrowser";

type Todo = { id: string; text: string; done: boolean };
type Course = { id: string; title: string; thumbnail?: string; description?: string; price?: number; creator?: string; createdAt: number; };
type Assignment = { id: string; title: string; courseId: string; courseName: string; instructorId: string; dueDate: string; createdAt: number; };

const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";

export default function Overview() {
  const { user } = useAuth();
  function loadTodos(): Todo[] {
    try {
      const raw = localStorage.getItem("nxtgen_todos");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveTodos(todos: Todo[]) {
    try {
      localStorage.setItem("nxtgen_todos", JSON.stringify(todos));
    } catch {}
  }

  const [todos, setTodos] = useState<Todo[]>(() => loadTodos());
  const [text, setText] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<{ courseId: string; userId?: string }[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [instructorSummary, setInstructorSummary] = useState<any | null>(null);
  const [justSignedUp, setJustSignedUp] = useState(false);
  const [pendingForGrading, setPendingForGrading] = useState<any[]>([]);
  const navigate = useNavigate();

  // Load server-backed courses & user enrollments
  useEffect(() => {
    // If the signed-in user is an instructor, fetch instructor summary KPIs
    (async () => {
      try {
        if (!user) return;
        const role = (user as any).role || '';
        if (role !== 'instructor') return;
        const token = await getAccessToken();
        if (!token) return;
        const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
        const res = await fetch(`${API}/instructor/summary`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const body = await res.json().catch(() => null);
        if (body?.data) setInstructorSummary(body.data);
      } catch (e) {
        // ignore
      }
    })();

    // also fetch pending submissions for grading (instructor)
    (async () => {
      try {
        if (!user) return;
        const role = (user as any).role || '';
        if (role !== 'instructor') return;
        const token = await getAccessToken();
        if (!token) return;
        const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
        const res = await fetch(`${API}/instructor/submissions`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const body = await res.json().catch(() => null);
        if (body?.submissions && Array.isArray(body.submissions)) {
          const pending = body.submissions.filter((s:any) => s.grade === null || typeof s.grade === 'undefined').slice(0, 10);
          setPendingForGrading(pending);
        }
      } catch (e) {
        // ignore
      }
    })();

    try {
      const flag = localStorage.getItem('nxtgen_justSignedUp');
      if (flag) {
        setJustSignedUp(true);
        // clear the transient flag after a short period
        setTimeout(() => {
          try { localStorage.removeItem('nxtgen_justSignedUp'); } catch {}
          setJustSignedUp(false);
        }, 4000);
      }
    } catch {}
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

  // Load assignments & submissions from server for enrolled courses
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!user) return;
        const userId = user.id;
        // fetch user submissions
        const sRes = await fetch(`${API}/submissions?userId=${userId}`).then(r => r.json()).catch(() => ({ data: [] }));
        const subs = (sRes.data || []).map((s: any) => ({
          id: s.id,
          assignmentId: s.assignment_id,
          userId: s.user_id,
        }));
        if (!mounted) return;
        setSubmissions(subs);

        // fetch assignments for enrolled courses
        const courseIds = enrollments.map(e => (e as any).course_id || e.courseId);
        const assignmentPromises = courseIds.map((cid: string) => fetch(`${API}/assignments?courseId=${cid}`).then(r => r.json()).catch(() => ({ data: [] })));
        const results = await Promise.all(assignmentPromises);
        if (!mounted) return;
        const all = results.flatMap((r: any) => r.data || r.assignments || []);
        const mapped = (all || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          courseId: a.course_id,
          courseName: a.course_name || "",
          instructorId: a.created_by,
          dueDate: a.due_at || a.dueDate || new Date(a.created_at).toISOString(),
          createdAt: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
        }));
        setAssignments(mapped);
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [user, enrollments]);

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
  const enrolledCourseIds = enrollments.map((e) => (e as any).course_id || e.courseId);
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
  const [coursePage, setCoursePage] = useState(0);
  const [assignmentPage, setAssignmentPage] = useState(0);
  const ITEMS_PER_PAGE = 3;

  // Clamp pages when data changes
  useEffect(() => {
    const maxCoursePage = Math.max(0, Math.ceil(enrolledCourses.length / ITEMS_PER_PAGE) - 1);
    if (coursePage > maxCoursePage) setCoursePage(maxCoursePage);
  }, [enrolledCourses.length]);

  useEffect(() => {
    const maxAssignPage = Math.max(0, Math.ceil(pendingAssignments.length / ITEMS_PER_PAGE) - 1);
    if (assignmentPage > maxAssignPage) setAssignmentPage(maxAssignPage);
  }, [pendingAssignments.length]);

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{justSignedUp ? `Welcome, ${displayName}` : `Welcome back, ${displayName}`}</h1>
            <p className="text-sm text-gray-600 mt-1">Here's a snapshot of your learning dashboard</p>
          </div>

          <div className="flex items-center gap-4">
            {/* If instructor show instructor KPIs else student summary */}
            {user?.role === 'instructor' && instructorSummary ? (
              <>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Active Courses</div>
                  <div className="text-xl font-semibold">{instructorSummary.activeCourses}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total Students</div>
                  <div className="text-xl font-semibold">{instructorSummary.totalEnrolled}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Pending Grading</div>
                  <div className="text-xl font-semibold">{instructorSummary.pendingSubmissions}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Avg Rating</div>
                  <div className="text-xl font-semibold">{instructorSummary.avgRating ? instructorSummary.avgRating.toFixed(2) : '-'}</div>
                </div>
              </>
            ) : (
              <>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Ongoing Courses</div>
                  <div className="text-xl font-semibold">{enrolledCourses.length}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Pending Assignments</div>
                  <div className="text-xl font-semibold">{pendingAssignments.length}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick actions + To-do list */}
        {/* Instructor quick actions & pending grading */}
        {user?.role === 'instructor' && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => navigate('/app/courses/create')} className="px-3 py-2 bg-green-600 text-white rounded">Create Course</button>
              <button onClick={() => navigate('/app/assignments/create')} className="px-3 py-2 bg-blue-600 text-white rounded">Add Assignment</button>
              <button onClick={() => navigate('/app/reports?scope=course')} className="px-3 py-2 bg-indigo-600 text-white rounded">View Analytics</button>
              <button onClick={() => navigate('/app/announcements')} className="px-3 py-2 bg-yellow-600 text-white rounded">Send Announcement</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Pending Grading</h3>
                {pendingForGrading.length === 0 ? (
                  <div className="text-gray-500">No submissions pending grading.</div>
                ) : (
                  <div className="space-y-2">
                    {pendingForGrading.map((p) => (
                      <div key={p.submissionId || p.assignmentId} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{p.assignmentTitle || 'Assignment'}</div>
                          <div className="text-sm text-gray-500">{p.studentName || p.studentEmail || p.user_id}</div>
                        </div>
                        <div>
                          <Link to={`/app/assignments/submissions/${p.assignmentId}`} className="px-3 py-1 bg-blue-600 text-white rounded">View</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold mb-4">Your Courses</h2>
              {enrolledCourses.length > ITEMS_PER_PAGE && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCoursePage((p) => Math.max(0, p - 1))}
                    aria-label="Previous courses"
                    className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCoursePage((p) => Math.min(Math.ceil(enrolledCourses.length / ITEMS_PER_PAGE) - 1, p + 1))}
                    aria-label="Next courses"
                    className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {enrolledCourses.length === 0 ? (
              <div className="text-gray-500">You're not enrolled in any courses yet.</div>
            ) : (
              <>
                <div className="space-y-4">
                  {enrolledCourses.slice(coursePage * ITEMS_PER_PAGE, (coursePage + 1) * ITEMS_PER_PAGE).map(course => (
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

                {/* Dots */}
                {enrolledCourses.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {Array.from({ length: Math.ceil(enrolledCourses.length / ITEMS_PER_PAGE) }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCoursePage(idx)}
                        className={`h-2 rounded-full transition-all ${idx === coursePage ? 'w-8 bg-gray-800' : 'w-2 bg-gray-300'}`}
                        aria-label={`Go to courses page ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold mb-4">Pending Assignments</h2>
              {pendingAssignments.length > ITEMS_PER_PAGE && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAssignmentPage((p) => Math.max(0, p - 1))}
                    aria-label="Previous assignments"
                    className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setAssignmentPage((p) => Math.min(Math.ceil(pendingAssignments.length / ITEMS_PER_PAGE) - 1, p + 1))}
                    aria-label="Next assignments"
                    className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {pendingAssignments.length === 0 ? (
              <div className="text-gray-500">No pending assignments.</div>
            ) : (
              <>
                <div className="space-y-4">
                  {pendingAssignments.slice(assignmentPage * ITEMS_PER_PAGE, (assignmentPage + 1) * ITEMS_PER_PAGE).map(assignment => (
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

                {/* Dots */}
                {pendingAssignments.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {Array.from({ length: Math.ceil(pendingAssignments.length / ITEMS_PER_PAGE) }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setAssignmentPage(idx)}
                        className={`h-2 rounded-full transition-all ${idx === assignmentPage ? 'w-8 bg-gray-800' : 'w-2 bg-gray-300'}`}
                        aria-label={`Go to assignments page ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
