import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlayCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Course = { id: string; title: string; thumbnail?: string; description?: string; price?: number; creator?: string; createdAt: number; };

const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";

export default function CourseCatalog() {
  const { hasRole, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<{ courseId: string; userId?: string }[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [cRes, eRes] = await Promise.all([
        fetch(`${API}/courses`).then((r) => r.json()).catch(() => ({ courses: [] })),
        fetch(`${API}/enrollments${user?.id ? `?userId=${user.id}` : ""}`).then((r) => r.json()).catch(() => ({ enrollments: [] })),
      ]);
      if (!mounted) return;
      setCourses(cRes.courses || []);
      // Normalize enrollment rows to use client-friendly keys
      const rawEnrolls = eRes.enrollments || [];
      const norm = rawEnrolls.map((row: any) => ({
        ...row,
        courseId: row.course_id || row.courseId,
        userId: row.user_id || row.userId,
      }));
      setEnrollments(norm);
    })();
    return () => { mounted = false; };
  }, [user]);

  const isPurchased = (id: string) => enrollments.some((e) => e.courseId === id);

  const buyCourse = async (id: string) => {
    if (!user?.id) return alert("Please sign in to enroll");
    if (isPurchased(id)) return;
    try {
      const res = await fetch(`${API}/courses/${id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        console.error('Enroll failed', { status: res.status, body });
        return alert("Failed to enroll");
      }
      // treat both success and alreadyEnrolled as success
      if (!body || body.success !== true) {
        console.error('Enroll failed - unexpected body', { status: res.status, body });
        return alert('Failed to enroll');
      }
      const eJson = await fetch(`${API}/enrollments?userId=${user.id}`).then((r) => r.json()).catch(() => ({ enrollments: [] }));
      const raw = eJson.enrollments || [];
      setEnrollments(raw.map((row: any) => ({ ...row, courseId: row.course_id || row.courseId, userId: row.user_id || row.userId })));
    } catch (err) {
      console.error('Enroll exception', err);
      alert('Failed to enroll');
    }
  };

  const filtered = courses.filter((c) => !query || c.title.toLowerCase().includes(query.toLowerCase())).sort((a,b) => b.createdAt - a.createdAt);

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* header/search */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-brand">Course Catalog</h1>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center border rounded overflow-hidden">
              <div className="px-3">
                <PlayCircle size={18} className="text-brand" />
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses..."
                className="px-3 py-2 outline-none"
                aria-label="Search courses"
              />
            </div>
          </div>
        </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No courses found.
            </div>
          ) : (
            filtered.map(c => (
              <div key={c.id} className="card p-4 flex flex-col">
                <div className="h-40 bg-gray-100 rounded-md mb-4 overflow-hidden">
                  {c.thumbnail ? <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-brand opacity-40">No thumbnail</div>}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">{c.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">{c.description || "No description"}</p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">Price: ₹{c.price ?? 0}</div>
                  <div className="flex items-center gap-2">
                    {hasRole && hasRole(["instructor", "contentCreator", "admin"]) ? (
                      <Link to={`/app/managecourse/edit/${c.id}`} className="text-sm px-3 py-1 border rounded text-brand">Edit</Link>
                    ) : (
                      <Link to={`/app/course-details/${c.id}`} className="text-sm px-3 py-1 border rounded text-brand">Details</Link>
                    )}
                    <button onClick={() => buyCourse(c.id)} disabled={isPurchased(c.id)} className={`px-4 py-2 rounded ${isPurchased(c.id) ? "bg-gray-200 text-gray-500" : "bg-brand text-white"}`}>
                      {isPurchased(c.id) ? "Enrolled" : "Buy"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
