import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getAccessToken } from "@/utils/supabaseBrowser";
import { ArrowLeft, Eye } from "lucide-react";

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

const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";

export default function AssignmentSubmissions() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeForm, setGradeForm] = useState({ grade: "", feedback: "" });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!assignmentId) return;
        const [aRes, sRes] = await Promise.all([
          fetch(`/api/assignments/${assignmentId}`).then(r => r.json()).catch(() => ({ data: null })),
          fetch(`/api/assignments/${assignmentId}/submissions`).then(r => r.json()).catch(() => ({ data: [] })),
        ]);
        if (!mounted) return;
        if (aRes && aRes.data) {
          const a = aRes.data;
          setAssignment({
            id: a.id,
            title: a.title,
            description: a.description,
            courseId: a.course_id,
            courseName: a.course_name || "",
            instructorId: a.created_by,
            dueDate: a.due_at || a.dueDate || new Date(a.created_at).toISOString(),
            createdAt: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
          });
        }
        if (sRes && sRes.data) {
            setSubmissions((sRes.data || []).map((s: any) => ({
            id: s.id,
            assignmentId: s.assignment_id,
            userId: s.user_id,
            userName: s.user_name || s.user_id,
            imageUrl: s.content?.imageUrl || s.content?.image_url || "",
            submittedAt: new Date(s.submitted_at).getTime(),
            grade: s.grade,
            feedback: s.feedback,
            graded: (s.status === 'graded' || s.grade != null)
          })));
        }
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [assignmentId]);

  const assignmentSubmissions = submissions.filter(s => s.assignmentId === assignmentId);

  const handleGrade = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradeForm({
      grade: submission.grade?.toString() || "",
      feedback: submission.feedback || ""
    });
  };

  const submitGrade = () => {
    if (!selectedSubmission) return;
    
    const grade = parseInt(gradeForm.grade);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      alert("Please enter a valid grade (0-100)");
      return;
    }
    (async () => {
      try {
        const token = await getAccessToken();

        const headers: Record<string,string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/submissions/${selectedSubmission.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ grade, feedback: gradeForm.feedback })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed to grade");

        // update local state
        setSubmissions(prev => prev.map(s => s.id === selectedSubmission.id ? { ...s, grade, feedback: gradeForm.feedback, graded: true } : s));
        setSelectedSubmission(null);
        setGradeForm({ grade: "", feedback: "" });

        // notify student via inbox
        await fetch(`/api/inbox/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            fromUserId: user?.id || "",
            fromName: user?.name || user?.email || "Instructor",
            toUserId: (json.data && json.data.user_id) || selectedSubmission.userId,
            subject: "Assignment Graded",
            content: `Your assignment \"${assignment?.title}\" has been graded: ${grade}/100. ${gradeForm.feedback || 'No feedback provided.'}`
          })
        });
      } catch (err) {
        alert("Failed to submit grade");
      }
    })();
  };

  if (!assignment) {
    return (
      <div className="flex-1 p-6 overflow-y-auto bg-white">
        <div className="text-center py-8">Assignment not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-white min-h-0">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/app/assignments")}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{assignment.title}</h1>
            <p className="text-gray-600">{assignment.courseName}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {assignmentSubmissions.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-8">
              No submissions yet
            </div>
          ) : (
            assignmentSubmissions.map((submission) => (
              <div key={submission.id} className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{submission.userName}</h3>
                  <span className="text-xs text-gray-500">
                    {new Date(submission.submittedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="mb-3">
                  <img 
                    src={submission.imageUrl} 
                    alt="Submission" 
                    className="w-full h-40 object-cover rounded-md cursor-pointer"
                    onClick={() => window.open(submission.imageUrl, '_blank')}
                  />
                </div>

                {submission.graded ? (
                  <div className="space-y-2">
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-sm font-medium text-green-800">
                        Grade: {submission.grade}/100
                      </div>
                      {submission.feedback && (
                        <div className="text-sm text-green-700 mt-1">
                          {submission.feedback}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleGrade(submission)}
                      className="w-full py-2 px-3 text-sm border rounded hover:bg-gray-50"
                    >
                      Edit Grade
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleGrade(submission)}
                    className="w-full py-2 px-3 bg-brand text-white rounded hover:opacity-90"
                  >
                    Grade Submission
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Grading Modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Grade Submission</h3>
              <p className="text-gray-600 mb-4">Student: {selectedSubmission.userName}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Grade (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={gradeForm.grade}
                    onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                    className="w-full border rounded p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Feedback (Optional)</label>
                  <textarea
                    value={gradeForm.feedback}
                    onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                    className="w-full border rounded p-2"
                    rows={3}
                    placeholder="Provide feedback to the student..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={submitGrade}
                  className="flex-1 py-2 px-4 bg-brand text-white rounded hover:opacity-90"
                >
                  Submit Grade
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="flex-1 py-2 px-4 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}