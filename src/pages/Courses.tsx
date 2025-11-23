import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlayCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";

export default function Courses() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) {
        if (mounted) {
          setEnrollments([]);
          setCourses([]);
          setLoading(false);
        }
        return;
      }

      try {
        const eRes = await fetch(`${API}/enrollments?userId=${user.id}`);
        const eJson = await eRes.json().catch(() => ({ enrollments: [] }));
        const raw = eJson.enrollments || [];
        const norm = raw.map((row: any) => ({ ...row, courseId: row.course_id || row.courseId, userId: row.user_id || row.userId }));
        if (!mounted) return;
        setEnrollments(norm);

        // Fetch course details for each enrollment
        const courseIds = Array.from(new Set(norm.map((r: any) => r.courseId).filter(Boolean)));
        const coursePromises = courseIds.map((id: string) => fetch(`${API}/courses/${id}`).then(r => r.json()).catch(() => ({ course: null })));
        const courseResults = await Promise.all(coursePromises);
        const fetched = courseResults.map((c: any) => c.course).filter(Boolean);
        if (!mounted) return;
        setCourses(fetched);
      } catch (err) {
        console.error('Failed to load enrolled courses', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [user]);

  if (loading) return <div className="p-6">Loading...</div>;

  if (!user) {
    return (
      <div className="p-6">
        <p>Please sign in to see your courses.</p>
        <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
      </div>
    );
  }

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-white">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">My Courses</h1>

        {courses.length === 0 ? (
          <div className="text-gray-500">You are not enrolled in any courses yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((c: any) => (
              <div key={c.id} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col">
                <div className="h-40 bg-gray-100 rounded-md mb-4 overflow-hidden">
                  {c.thumbnail ? <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">No thumbnail</div>}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">{c.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">{c.description || "No description"}</p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">Price: ₹{c.price ?? 0}</div>
                  <Link to={`/app/courses/${c.id}`} className="text-sm px-3 py-1 border rounded hover:bg-gray-50">Open</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

