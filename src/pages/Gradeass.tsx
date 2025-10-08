import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, CheckCircle, Clock } from "lucide-react";

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

export default function Gradeass() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>(() => loadAssignments());
  const [submissions, setSubmissions] = useState<Submission[]>(() => loadSubmissions());

  useEffect(() => {
    const onAssignments = () => setAssignments(loadAssignments());
    const onSubmissions = () => setSubmissions(loadSubmissions());
    
    window.addEventListener("assignments:updated", onAssignments);
    window.addEventListener("submissions:updated", onSubmissions);
    
    return () => {
      window.removeEventListener("assignments:updated", onAssignments);
      window.removeEventListener("submissions:updated", onSubmissions);
    };
  }, []);

  // Debug logs
  console.log("Current user:", user);
  console.log("All assignments:", assignments);
  console.log("All submissions:", submissions);

  // Get assignments created by this instructor that have submissions
  const instructorAssignments = assignments.filter(a => a.instructorId === user?.id);
  console.log("Instructor assignments:", instructorAssignments);
  
  const assignmentsWithSubmissions = instructorAssignments.map(assignment => {
    const assignmentSubmissions = submissions.filter(s => s.assignmentId === assignment.id);
    const ungradedCount = assignmentSubmissions.filter(s => !s.graded).length;
    const gradedCount = assignmentSubmissions.filter(s => s.graded).length;
    
    console.log(`Assignment ${assignment.title} has ${assignmentSubmissions.length} submissions`);
    
    return {
      ...assignment,
      totalSubmissions: assignmentSubmissions.length,
      ungradedCount,
      gradedCount,
      hasSubmissions: assignmentSubmissions.length > 0
    };
  });

  console.log("Assignments with submissions:", assignmentsWithSubmissions);

  return (
    <main className="flex-1 p-6 overflow-y-auto bg-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-nxtgen-text-primary mb-6">
          Grade Assignments
        </h1>

        {/* Debug Info */}
        <div className="bg-gray-100 p-4 mb-6 rounded text-sm">
          <h3 className="font-bold mb-2">Debug Info:</h3>
          <p><strong>Instructor ID:</strong> {user?.id}</p>
          <p><strong>Total Assignments:</strong> {assignments.length}</p>
          <p><strong>Instructor's Assignments:</strong> {instructorAssignments.length}</p>
          <p><strong>Total Submissions:</strong> {submissions.length}</p>
          <p><strong>Assignments with Submissions:</strong> {assignmentsWithSubmissions.filter(a => a.hasSubmissions).length}</p>
        </div>

        {/* Show all instructor assignments regardless of submissions */}
        {instructorAssignments.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <div className="text-lg mb-2">No assignments created</div>
            <p className="text-sm">Create some assignments first to see submissions here.</p>
            <Link
              to="/app/assignments/create"
              className="inline-block mt-4 px-4 py-2 bg-[#515DEF] text-white rounded"
            >
              Create Assignment
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {assignmentsWithSubmissions.map((assignment) => (
              <div key={assignment.id} className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 text-gray-900">
                      {assignment.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Course: {assignment.courseName}
                    </p>
                    <p className="text-sm text-gray-500">
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Submission Stats */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Submissions:</span>
                    <span className="font-medium">{assignment.totalSubmissions}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Clock className="w-4 h-4 text-orange-500" />
                      Pending Review:
                    </span>
                    <span className="font-medium text-orange-600">
                      {assignment.ungradedCount}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Graded:
                    </span>
                    <span className="font-medium text-green-600">
                      {assignment.gradedCount}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                {assignment.totalSubmissions > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Grading Progress</span>
                      <span>
                        {Math.round((assignment.gradedCount / assignment.totalSubmissions) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(assignment.gradedCount / assignment.totalSubmissions) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Link
                    to={`/app/assignments/submissions/${assignment.id}`}
                    className="w-full py-2 px-4 bg-[#515DEF] text-white rounded hover:bg-[#515DEF]/90 text-center block transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Eye size={16} />
                      View All Submissions ({assignment.totalSubmissions})
                    </div>
                  </Link>

                  {assignment.ungradedCount > 0 && (
                    <Link
                      to={`/app/assignments/submissions/${assignment.id}`}
                      className="w-full py-2 px-4 border border-orange-500 text-orange-600 rounded hover:bg-orange-50 text-center block transition-colors"
                    >
                      Grade {assignment.ungradedCount} Pending
                    </Link>
                  )}

                  {assignment.totalSubmissions === 0 && (
                    <div className="text-center text-gray-500 text-sm py-2">
                      No submissions yet
                    </div>
                  )}
                </div>

                {/* Assignment Info */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Created: {new Date(assignment.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Raw Data Display for Debugging */}
        <div className="mt-8 bg-gray-50 p-4 rounded">
          <details>
            <summary className="cursor-pointer font-bold mb-2">Raw Data (Debug)</summary>
            <div className="text-xs">
              <h4 className="font-bold">Assignments:</h4>
              <pre className="mb-4 overflow-auto">{JSON.stringify(assignments, null, 2)}</pre>
              <h4 className="font-bold">Submissions:</h4>
              <pre className="overflow-auto">{JSON.stringify(submissions, null, 2)}</pre>
            </div>
          </details>
        </div>
      </div>
    </main>
  );
}
