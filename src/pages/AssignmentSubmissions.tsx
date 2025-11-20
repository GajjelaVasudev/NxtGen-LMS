import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

const ASSIGNMENTS_KEY = "nxtgen_assignments";
const SUBMISSIONS_KEY = "nxtgen_submissions";
const INBOX_KEY = "nxtgen_inbox";

function loadAssignments(): Assignment[] {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    return raw ? (JSON.parse(raw) as Assignment[]) : [];
  } catch {
    return [];
  }
}

function loadSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    return raw ? (JSON.parse(raw) as Submission[]) : [];
  } catch {
    return [];
  }
}

function saveSubmissions(submissions: Submission[]) {
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  window.dispatchEvent(new CustomEvent("submissions:updated")); // Add this event
}

function addInboxMessage(message: any) {
  try {
    const messages = JSON.parse(localStorage.getItem(INBOX_KEY) || "[]");
    const newMessage = {
      ...message,
      id: String(Date.now()),
      createdAt: Date.now(),
      read: false
    };
    localStorage.setItem(INBOX_KEY, JSON.stringify([newMessage, ...messages]));
  } catch (error) {
    console.error("Failed to add inbox message:", error);
  }
}

export default function AssignmentSubmissions() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>(() => loadSubmissions());
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeForm, setGradeForm] = useState({ grade: "", feedback: "" });

  useEffect(() => {
    const assignments = loadAssignments();
    const found = assignments.find(a => a.id === assignmentId);
    setAssignment(found || null);
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

    const updatedSubmissions = submissions.map(s => {
      if (s.id === selectedSubmission.id) {
        // Add grade notification to student's inbox
        addInboxMessage({
          type: 'assignment-graded',
          title: 'Assignment Graded',
          message: `Your assignment "${assignment?.title}" has been graded: ${grade}/100. ${gradeForm.feedback || 'No feedback provided.'}`
        });
        
        return { ...s, grade, feedback: gradeForm.feedback, graded: true };
      }
      return s;
    });
    
    setSubmissions(updatedSubmissions);
    saveSubmissions(updatedSubmissions);
    setSelectedSubmission(null);
    setGradeForm({ grade: "", feedback: "" });
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
                    className="w-full py-2 px-3 bg-[#515DEF] text-white rounded hover:bg-[#515DEF]/90"
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
                  className="flex-1 py-2 px-4 bg-[#515DEF] text-white rounded hover:bg-[#515DEF]/90"
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