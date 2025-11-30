import React, { useEffect, useState } from "react";
import MockPaymentGateway from "@/components/MockPaymentGateway";
import { useParams, Link } from "react-router-dom";
import { PlayCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";

export default function CourseDetails() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  useEffect(() => {
    if (!courseId) return;
    let mounted = true;
    (async () => {
      const c = await fetch(`${API}/courses/${courseId}`).then(r => r.json()).catch(() => ({ course: null }));
      const e = await fetch(`${API}/enrollments${user?.id ? `?userId=${user.id}` : ""}`).then(r => r.json()).catch(() => ({ enrollments: [] }));
      if (!mounted) return;
      setCourse(c.course || null);
      const raw = e.enrollments || [];
      setEnrollments(raw.map((row: any) => ({ ...row, courseId: row.course_id || row.courseId, userId: row.user_id || row.userId })));
    })();
    return () => { mounted = false; };
  }, [courseId, user]);

  useEffect(() => setEnrolled(enrollments.some(e => e.courseId === courseId)), [enrollments, courseId]);

  // local mock purchase/enroll flow (client-only)
  const [showGateway, setShowGateway] = useState(false);
  const buyCourse = () => {
    if (enrolled) return;
    if (!user?.id) return alert("Please sign in to enroll");
    setShowGateway(true);
  };

  const handleMockSuccess = () => {
    // mark enrolled client-side and persist to localStorage as a mock purchase
    try {
      const purchasesRaw = localStorage.getItem("nxt_purchases") || "{}";
      const purchases = JSON.parse(purchasesRaw || "{}");
      purchases[courseId || ""] = { purchasedAt: new Date().toISOString(), title: course?.title || "" };
      localStorage.setItem("nxt_purchases", JSON.stringify(purchases));
    } catch (e) { }
    setEnrolled(true);
    setShowGateway(false);
    // Also add a simple local enrollment record so UI reflects state
    setEnrollments(prev => [...prev, { courseId, userId: user?.id } as any]);
  };

  if (!course) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
        <div className="max-w-5xl mx-auto p-6 text-center">
          <p className="text-gray-500">Course not found.</p>
          <Link to="/app/course-catalog" className="text-brand hover:underline mt-4 inline-block">Back to Catalog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-white">
      <div className="max-w-6xl mx-auto p-6 lg:p-10">
        {/* hero and details (unchanged UI) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* left info */}
          {/* right CTA */}
          <aside>
            <div className="card p-6 text-center">
              <div className="text-sm text-gray-500">Students enrolled</div>
              <div className="text-2xl font-bold mt-2">{/* show via enrollments count */}</div>
              <div className="text-sm text-gray-400 mt-1">Updated live</div>
            </div>
            <div className="bg-gradient-to-br from-[var(--brand-color)] to-[var(--brand-yellow)] text-white p-6 rounded-lg shadow-lg mt-4">
              <button onClick={buyCourse} disabled={enrolled} className={`mt-4 w-full px-4 py-2 rounded-md font-semibold ${enrolled ? "bg-white/20" : "bg-white text-brand"}`}>
                {enrolled ? "Enrolled" : user ? "Buy Now" : "Sign in to Enroll"}
              </button>
            </div>
            {showGateway && (
              <MockPaymentGateway
                courseId={courseId || ""}
                courseTitle={course?.title}
                amount={course?.price || 0}
                onCancel={() => setShowGateway(false)}
                onSuccess={handleMockSuccess}
              />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}