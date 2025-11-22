import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowLeft,
  PlayCircle,
  ClipboardList,
  FileText,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

type Course = {
  id: string;
  title: string;
  thumbnail?: string;
  description?: string;
  price?: number;
  creator?: string;
  videos?: { id: string; title: string; duration?: string }[];
  quizzes?: { id: string }[];
  assignments?: { id: string; title: string }[];
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

export default function CourseDetails() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollments, setEnrollments] = useState(() => loadEnrollments());

  useEffect(() => {
    const courses = loadCourses();
    const found = courses.find((c) => c.id === courseId) || null;
    setCourse(found);
  }, [courseId]);

  useEffect(() => {
    setEnrolled(enrollments.some((e) => e.courseId === courseId));
  }, [enrollments, courseId]);

  useEffect(() => {
    const handler = () => setEnrollments(loadEnrollments());
    window.addEventListener("enrollments:updated", handler);
    return () => window.removeEventListener("enrollments:updated", handler);
  }, []);

  if (!course) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
        <div className="max-w-5xl mx-auto p-6 text-center">
          <p className="text-gray-500">Course not found.</p>
          <Link to="/app/course-catalog" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const buyCourse = () => {
    if (enrolled) return;
    const updated = [...loadEnrollments(), { courseId: course.id, purchasedAt: Date.now() }];
    saveEnrollments(updated);
    setEnrollments(updated);
    setEnrolled(true);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-white">
      <div className="max-w-6xl mx-auto p-6 lg:p-10">
        {/* Hero */}
        <div className="rounded-3xl overflow-hidden shadow-lg mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 opacity-80"></div>

            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-60 object-cover opacity-80"
              />
            ) : (
              <div className="w-full h-60 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 opacity-90">
                <div className="text-white text-4xl font-bold">{course.title.slice(0, 1)}</div>
              </div>
            )}

            <div className="absolute inset-0 flex items-end p-6">
              <div className="text-white">
                <div className="text-sm opacity-80">{course.creator || "Instructor"}</div>
                <h1 className="text-3xl md:text-4xl font-bold">{course.title}</h1>
                <p className="mt-2 max-w-3xl text-sm md:text-base opacity-90">{course.description}</p>
              </div>

              <div className="ml-auto flex flex-col items-end gap-3">
                <div className="text-white text-sm opacity-90">Price</div>
                <div className="text-white font-bold text-2xl">₹{course.price ?? 0}</div>
                <button
                  onClick={buyCourse}
                  disabled={enrolled}
                  className={`px-6 py-3 rounded-full font-semibold transition ${
                    enrolled ? "bg-gray-200 text-gray-600 cursor-default" : "bg-white text-blue-700 hover:scale-105"
                  }`}
                >
                  {enrolled ? "Enrolled" : user ? "Enroll Now" : "Sign in to Enroll"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: About & Curriculum */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-semibold mb-3">What you'll learn</h2>
              <p className="text-sm text-gray-700 mb-4">{course.description || "No description provided."}</p>

              <h3 className="text-lg font-medium mb-3">Course Curriculum</h3>
              <div className="space-y-2">
                {(course.videos || []).map((v, i) => (
                  <div key={v.id || i} className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50">
                    <PlayCircle className="w-6 h-6 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {i + 1}. {v.title}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{v.duration || ""}</div>
                  </div>
                ))}
                {(!course.videos || course.videos.length === 0) && (
                  <div className="text-sm text-gray-500">No video lessons yet.</div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-3">Instructor</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  {course.creator ? course.creator.charAt(0).toUpperCase() : "I"}
                </div>
                <div>
                  <div className="font-medium">{course.creator || "Instructor"}</div>
                  <div className="text-sm text-gray-500">Top-rated educator</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-3">Reviews</h3>
              <div className="space-y-3">
                <div className="p-3 border rounded">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">AM</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Amit</div>
                      <div className="text-xs text-gray-500">"Great course, clear explanations."</div>
                    </div>
                    <div className="text-sm text-gray-500">5 ★</div>
                  </div>
                </div>
                {/* keep static review examples; can hook to persisted reviews later */}
              </div>
            </div>
          </div>

          {/* Right: Quick stats / CTA */}
          <aside className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <div className="text-sm text-gray-500">Students enrolled</div>
              <div className="text-2xl font-bold mt-2">
                {loadEnrollments().filter((e) => e.courseId === course.id).length}
              </div>
              <div className="text-sm text-gray-400 mt-1">Updated live</div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-6 rounded-lg shadow-lg">
              <h4 className="text-lg font-semibold">Ready to start?</h4>
              <p className="text-sm opacity-90 mt-2">Access lessons, quizzes and assignments instantly after enrolment.</p>
              <button
                onClick={buyCourse}
                disabled={enrolled}
                className={`mt-4 w-full px-4 py-2 rounded-md font-semibold ${enrolled ? "bg-white/20" : "bg-white text-blue-600"}`}
              >
                {enrolled ? "Enrolled" : "Enroll Now"}
              </button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border text-sm text-gray-600">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>Certificate of completion</div>
              </div>
              <div className="text-xs">Lifetime access · Offline materials · Community support</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}