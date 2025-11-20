import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlayCircle } from "lucide-react";

type Course = {
  id: string;
  title: string;
  thumbnail?: string;
  description?: string;
  price?: number;
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

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>(() => loadCourses());
  const [enrollments, setEnrollments] = useState(() => loadEnrollments());

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

  const purchased = enrollments
    .map((e) => {
      const c = courses.find((x) => x.id === e.courseId);
      return c ? { ...c, purchasedAt: e.purchasedAt } : null;
    })
    .filter(Boolean) as (Course & { purchasedAt: number })[];

  return (
    <main className="flex-1 h-full overflow-y-auto bg-white">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-nxtgen-text-primary mb-6">My Courses</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {purchased.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 mb-4">You haven't purchased any courses yet.</p>
              <Link to="/app/course-catalog" className="text-blue-600 hover:underline">
                Browse Course Catalog
              </Link>
            </div>
          ) : (
            purchased.map((c) => (
              <Link 
                key={c.id} 
                to={`/app/courses/${c.id}`}
                className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="h-40 bg-gray-100 rounded-md mb-4 overflow-hidden relative">
                  {c.thumbnail ? (
                    <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No thumbnail
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                    <PlayCircle className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <h3 className="font-semibold mb-2 group-hover:text-blue-600 transition-colors">{c.title}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{c.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">Purchased: {new Date(c.purchasedAt).toLocaleDateString()}</div>
                  <div className="text-sm font-medium text-blue-600">Continue →</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

