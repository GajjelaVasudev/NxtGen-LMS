import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlayCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Course = {
  id: string;
  title: string;
  thumbnail?: string;
  description?: string;
  price?: number;
  creator?: string;
  createdAt: number;
};

const COURSES_KEY = "nxtgen_courses";
const ENROLL_KEY = "nxtgen_enrollments";

function loadCourses(): Course[] {
  try {
    const raw = localStorage.getItem(COURSES_KEY);
    return raw ? (JSON.parse(raw) as Course[]) : [];
  } catch {
    return [];
  }
}

function loadEnrollments(): { courseId: string; purchasedAt: number }[] {
  try {
    const raw = localStorage.getItem(ENROLL_KEY);
    return raw ? (JSON.parse(raw) as { courseId: string; purchasedAt: number }[]) : [];
  } catch {
    return [];
  }
}

function saveEnrollments(items: { courseId: string; purchasedAt: number }[]) {
  localStorage.setItem(ENROLL_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("enrollments:updated"));
}

export default function CourseCatalog() {
  const { hasRole } = useAuth();
  const [courses, setCourses] = useState<Course[]>(() => loadCourses());
  const [enrollments, setEnrollments] = useState(() => loadEnrollments());
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onCourses = () => setCourses(loadCourses());
    const onEnroll = () => setEnrollments(loadEnrollments());
    window.addEventListener("courses:updated", onCourses);
    window.addEventListener("enrollments:updated", onEnroll);
    return () => {
      window.removeEventListener("courses:updated", onCourses);
      window.removeEventListener("enrollments:updated", onEnroll);
    };
  }, []);

  const isPurchased = (id: string) => enrollments.some((e) => e.courseId === id);

  const buyCourse = (id: string) => {
    if (isPurchased(id)) return;
    const updated = [...loadEnrollments(), { courseId: id, purchasedAt: Date.now() }];
    saveEnrollments(updated);
    setEnrollments(updated);
  };

  const filtered = courses
    .filter((c) => !query || c.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-nxtgen-text-primary">Course Catalog</h1>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center border rounded overflow-hidden">
              <div className="px-3">
                <PlayCircle size={18} />
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
              No courses found. Create one in Manage Courses.
            </div>
          ) : (
            filtered.map((c) => (
              <div key={c.id} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col">
                <div className="h-40 bg-gray-100 rounded-md mb-4 overflow-hidden">
                  {c.thumbnail ? (
                    <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No thumbnail
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold mb-2">{c.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">{c.description || "No description"}</p>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">Price: ₹{c.price ?? 0}</div>
                  <div className="flex items-center gap-2">
                    {hasRole && hasRole(["instructor", "contentCreator", "admin"]) ? (
                      <Link
                        to={`/app/managecourse/edit/${c.id}`}
                        className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                      >
                        Edit
                      </Link>
                    ) : (
                      <Link
                        to={`/app/course-details/${c.id}`}
                        className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                      >
                        Details
                      </Link>
                    )}

                    <button
                      onClick={() => buyCourse(c.id)}
                      disabled={isPurchased(c.id)}
                      className={`px-4 py-2 rounded ${
                        isPurchased(c.id) ? "bg-gray-200 text-gray-500" : "bg-[#515DEF] text-white"
                      }`}
                    >
                      {isPurchased(c.id) ? "Purchased" : "Buy"}
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
