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

const ASSIGNMENTS_KEY = "nxtgen_assignments";
const SUBMISSIONS_KEY = "nxtgen_submissions";
const INBOX_KEY = "nxtgen_inbox";
const COURSES_KEY = "nxtgen_courses";
const ENROLL_KEY = "nxtgen_enrollments";
const NOTIFIED_KEY = "nxtgen_notified_assignments";

function loadAssignments(): Assignment[] {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    return raw ? (JSON.parse(raw) as Assignment[]) : [];
  } catch {
    return [];
  }
}

function saveAssignments(assignments: Assignment[]) {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  window.dispatchEvent(new CustomEvent("assignments:updated"));
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
  window.dispatchEvent(new CustomEvent("submissions:updated"));
}

function loadInboxMessages(): InboxMessage[] {
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    return raw ? (JSON.parse(raw) as InboxMessage[]) : [];
  } catch {
    return [];
  }
}

function saveInboxMessages(messages: InboxMessage[]) {
  localStorage.setItem(INBOX_KEY, JSON.stringify(messages));
  window.dispatchEvent(new CustomEvent("inbox:updated"));
}

function loadNotifiedAssignments(): string[] {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifiedAssignments(assignmentIds: string[]) {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(assignmentIds));
}

function loadCourses() {
  try {
    const raw = localStorage.getItem(COURSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadEnrollments() {
  try {
    const raw = localStorage.getItem(ENROLL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addInboxMessage(message: Omit<InboxMessage, 'id' | 'createdAt' | 'read'>) {
  const messages = loadInboxMessages();
  const newMessage: InboxMessage = {
    ...message,
    id: String(Date.now()),
    createdAt: Date.now(),
    read: false
  };
  saveInboxMessages([newMessage, ...messages]);
}

export default function Assignments() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>(() => loadAssignments());
  const [submissions, setSubmissions] = useState<Submission[]>(() => loadSubmissions());
  const [search, setSearch] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    const handler = () => setAssignments(loadAssignments());
    window.addEventListener("assignments:updated", handler);
    return () => window.removeEventListener("assignments:updated", handler);
  }, []);

  // Get user's enrolled courses
  const enrollments = loadEnrollments();
  const enrolledCourseIds = enrollments.map((e: any) => e.courseId);

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
    if (!user || hasRole && hasRole(["instructor", "admin"])) return;

    const now = Date.now();
    const userSubmissions = submissions.filter(s => s.userId === user.id);
    const notifiedAssignments = loadNotifiedAssignments();
    const newlyNotified: string[] = [];
    
    filteredAssignments.forEach(assignment => {
      const dueDate = new Date(assignment.dueDate).getTime();
      const hasSubmitted = userSubmissions.some(s => s.assignmentId === assignment.id);
      const alreadyNotified = notifiedAssignments.includes(assignment.id);
      
      if (!hasSubmitted && !alreadyNotified) {
        const timeUntilDue = dueDate - now;
        const dayInMs = 24 * 60 * 60 * 1000;
        
        // Alert 1 day before due (only once)
        if (timeUntilDue > 0 && timeUntilDue <= dayInMs) {
          addInboxMessage({
            type: 'assignment-due',
            title: 'Assignment Due Soon',
            message: `Assignment "${assignment.title}" is due tomorrow in ${assignment.courseName}`,
            assignmentId: assignment.id
          });
          newlyNotified.push(assignment.id);
        }
      }
    });

    if (newlyNotified.length > 0) {
      saveNotifiedAssignments([...notifiedAssignments, ...newlyNotified]);
    }
  }, [filteredAssignments, submissions, user, hasRole]);

  const isOverdue = (dueDate: string) => new Date(dueDate).getTime() < Date.now();

  const getUserSubmission = (assignmentId: string) => {
    return submissions.find(s => s.assignmentId === assignmentId && s.userId === user?.id);
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
      const assignment = assignments.find(a => a.id === assignmentId);
      
      const newSubmission: Submission = {
        id: String(Date.now()),
        assignmentId,
        userId: user.id,
        userName: user.name || user.email,
        imageUrl,
        submittedAt: Date.now(),
        graded: false
      };

      const updatedSubmissions = [...submissions, newSubmission];
      setSubmissions(updatedSubmissions);
      saveSubmissions(updatedSubmissions);
      
      setSelectedAssignment(null);
      
      // Notify instructor
      if (assignment) {
        addInboxMessage({
          type: 'assignment-due',
          title: 'New Assignment Submission',
          message: `${user.name || user.email} submitted assignment "${assignment.title}"`
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
