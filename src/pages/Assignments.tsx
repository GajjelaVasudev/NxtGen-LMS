import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Edit, Calendar, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Assignment = {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  instructorId: string;
  dueDate: string;
  imageUrl?: string;
  createdAt: number;
};

type Submission = {
  id: string;
  assignmentId: string;
  userId: string;
  userName: string;
  imageUrl: string;
  submittedAt: number;
  grade?: number;
  feedback?: string;
  graded: boolean;
};

type InboxMessage = {
  id: string;
  type: 'assignment-due' | 'assignment-graded' | 'assignment-overdue';
  title: string;
  message: string;
  assignmentId?: string;
  createdAt: number;
  read: boolean;
};

const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";

export default function Assignments() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [search, setSearch] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user) return;
      try {
        const [cRes, eRes, sRes] = await Promise.all([
          fetch(`${API}/courses`).then(r => r.json()).catch(() => ({ courses: [] })),
          fetch(`${API}/enrollments?userId=${user.id}`).then(r => r.json()).catch(() => ({ enrollments: [] })),
          fetch(`${API}/submissions?userId=${user.id}`).then(r => r.json()).catch(() => ({ data: [] })),
        ]);

        if (!mounted) return;
        setCourses(cRes.courses || []);
        setEnrollments(eRes.enrollments || []);
        setSubmissions((sRes.data && Array.isArray(sRes.data)) ? sRes.data.map((s: any) => ({
          id: s.id,
          assignmentId: s.assignment_id,
          userId: s.user_id,
          userName: s.user_name || s.user_id,
          imageUrl: s.content?.imageUrl || s.content?.image_url || "",
          submittedAt: new Date(s.submitted_at).getTime(),
          grade: s.grade,
          feedback: s.feedback,
          graded: s.status === 'graded'
        })) : []);

        // Fetch assignments for enrolled courses
        const courseIds = (eRes.enrollments || []).map((en: any) => en.course_id || en.courseId || en.courseId);
        const assignmentPromises = courseIds.map((cid: string) => fetch(`${API}/assignments?courseId=${cid}`).then(r => r.json()).catch(() => ({ data: [] })));
        const assignmentsResults = await Promise.all(assignmentPromises);
        let all = assignmentsResults.flatMap((ar: any) => (ar.data || ar.assignments || []));

        // If the user is an instructor/admin also fetch assignments they created so they can view/edit them
        if (hasRole && hasRole(["instructor", "admin"])) {
          try {
            const mineRes = await fetch(`${API}/assignments?creatorId=${user.id}`).then(r => r.json()).catch(() => ({ data: [] }));
            const mine = (mineRes.data || mineRes.assignments || []);
            // merge and dedupe by id
            const byId: Record<string, any> = {};
            [...all, ...mine].forEach((a: any) => { if (a && a.id) byId[a.id] = a; });
            all = Object.values(byId);
          } catch (e) {
            // ignore
          }
        }
        const mapped = (all || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          courseId: a.course_id || a.courseId,
          courseName: (cRes.courses || []).find((c: any) => c.id === (a.course_id || a.courseId))?.title || "",
          instructorId: a.created_by || a.created_by || a.instructorId,
          dueDate: a.due_at || a.dueAt || a.dueDate || new Date(a.created_at).toISOString(),
          imageUrl: a.image_url || a.imageUrl || undefined,
          createdAt: a.created_at ? new Date(a.created_at).getTime() : Date.now()
        }));
        setAssignments(mapped);
      } catch (err) {
        // ignore
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  // Get user's enrolled courses
  const enrolledCourseIds = enrollments.map((e: any) => e.course_id || e.courseId);

  // Filter assignments based on role
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(search.toLowerCase()) ||
                         assignment.courseName.toLowerCase().includes(search.toLowerCase());
    
    if (hasRole && hasRole(["instructor", "admin"])) {
      // Instructors see assignments they created
      return matchesSearch && assignment.instructorId === user?.id;
    } else {
      // Students see assignments from enrolled courses
      return matchesSearch && enrolledCourseIds.includes(assignment.courseId);
    }
  });

  // Check for due assignments and add to inbox (improved)
  useEffect(() => {
  // Note: due-date notification logic moved to server or will be implemented later
  }, [filteredAssignments, submissions, user, hasRole]);

  const isOverdue = (dueDate: string) => new Date(dueDate).getTime() < Date.now();

  const getUserSubmission = (assignmentId: string) => {
    return submissions.find(s => String(s.assignment_id || s.assignmentId) === String(assignmentId) && s.userId === user?.id);
  };

  const getAssignmentSubmissions = (assignmentId: string) => {
    return submissions.filter(s => s.assignmentId === assignmentId);
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const submitAssignment = async (assignmentId: string, imageFile: File) => {
    if (!user) return;

    try {
      const imageUrl = await handleImageUpload(imageFile);
      // Create submission via API
      const res = await fetch(`${API}/assignments/${assignmentId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({ content: { imageUrl } }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to submit");

      // update local view
      setSubmissions((s) => [{
        id: json.data.id,
        assignmentId: json.data.assignment_id,
        userId: json.data.user_id,
        userName: user.name || user.email,
        imageUrl: imageUrl,
        submittedAt: new Date(json.data.submitted_at).getTime(),
        graded: json.data.status === 'graded'
      }, ...s]);

      setSelectedAssignment(null);

      // Notify instructor via server inbox
      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment) {
        await fetch(`${API}/inbox/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromUserId: user.id,
            fromName: user.name || user.email,
            toUserId: assignment.instructorId,
            subject: "New Assignment Submission",
            content: `${user.name || user.email} submitted assignment \"${assignment.title}\"`
          })
        });
      }
    } catch (error) {
      alert("Failed to submit assignment");
    }
  };

  const getStatusIcon = (assignment: Assignment) => {
    const userSubmission = getUserSubmission(assignment.id);
    const overdue = isOverdue(assignment.dueDate);

    if (userSubmission) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (overdue) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    } else {
      return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (assignment: Assignment) => {
    const userSubmission = getUserSubmission(assignment.id);
    const overdue = isOverdue(assignment.dueDate);

    if (userSubmission) {
      if (userSubmission.graded) {
        return `Submitted & Graded (${userSubmission.grade}/100)`;
      }
      return "Submitted";
    } else if (overdue) {
      return "Overdue";
    } else {
      return "Pending";
    }
  };

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-nxtgen-text-primary">Assignments</h1>
          
          <div className="flex items-center gap-3">
            <div className="relative flex items-center border rounded overflow-hidden">
              <div className="px-3">
                <Search size={18} />
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assignments..."
                className="px-3 py-2 outline-none"
              />
            </div>

            {hasRole && hasRole(["instructor", "admin"]) && (
              <Link
                to="/app/assignments/create"
                className="px-4 py-2 bg-[#515DEF] text-white rounded flex items-center gap-2"
              >
                <Plus size={18} />
                Create Assignment
              </Link>
            )}
          </div>
        </div>

        {/* Assignment List */}
        <div className="bg-white border rounded-lg">
          {filteredAssignments.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg mb-2">No assignments found</p>
              {hasRole && hasRole(["instructor", "admin"]) && (
                <Link to="/app/assignments/create" className="text-blue-600 hover:underline">
                  Create your first assignment
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredAssignments.map((assignment) => {
                const userSubmission = getUserSubmission(assignment.id);
                const assignmentSubmissions = getAssignmentSubmissions(assignment.id);
                const overdue = isOverdue(assignment.dueDate);
                
                return (
                  <div key={assignment.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {getStatusIcon(assignment)}
                      </div>

                      {/* Assignment Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 truncate">
                              {assignment.title}
                            </h3>
                            <div className="flex items-center gap-4 mt-1 flex-wrap">
                              <span className="text-sm text-gray-500">
                                {assignment.courseName}
                              </span>
                              <span className={`text-sm ${overdue ? "text-red-500" : "text-gray-500"}`}>
                                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                              </span>
                              <span className="text-sm text-gray-600">
                                {getStatusText(assignment)}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-3">
                            {hasRole && hasRole(["instructor", "admin"]) ? (
                              // Instructor View
                              <>
                                <Link
                                  to={`/app/assignments/edit/${assignment.id}`}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                >
                                  <Edit size={16} />
                                </Link>
                                <Link
                                  to={`/app/assignments/submissions/${assignment.id}`}
                                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                >
                                  View Submissions ({assignmentSubmissions.length})
                                </Link>
                              </>
                            ) : (
                              // Student View
                              <>
                                {userSubmission ? (
                                  <span className="text-sm text-green-600 font-medium">
                                    ✓ Submitted
                                  </span>
                                ) : overdue ? (
                                  <span className="text-sm text-red-500 font-medium">
                                    Submission Closed
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setSelectedAssignment(assignment)}
                                    className="px-3 py-1 text-sm bg-[#515DEF] text-white rounded hover:bg-[#515DEF]/90"
                                  >
                                    Submit
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submission Modal */}
        {selectedAssignment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Submit Assignment</h3>
              <p className="text-gray-600 mb-4">{selectedAssignment.title}</p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Upload Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      submitAssignment(selectedAssignment.id, file);
                    }
                  }}
                  className="w-full border rounded p-2"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="flex-1 py-2 px-4 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
