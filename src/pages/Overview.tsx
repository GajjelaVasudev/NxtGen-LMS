import React, { useEffect, useState } from "react";
import {
  Eye,
  CheckCircle2,
  HelpCircle,
  Search,
  Clock,
  FileText,
  GraduationCap,
  Plus,
  X,
  Users,
  BookOpen,
  TrendingUp,
  Award,
  BarChart3,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

// Updated Course type to match ManageCourse structure
type Course = {
  id: string;
  title: string;
  thumbnail?: string;
  videos?: { id: string; title: string; fileName?: string; dataUrl?: string; completed?: boolean }[];
  quizzes?: { id: string; type: string; score?: number; maxScore?: number; questions?: any[] }[];
  assignments?: { id: string; title: string; files?: any[]; completed?: boolean; score?: number; maxScore?: number }[];
  description?: string;
  price?: number;
  createdAt: number;
  upcomingLessons?: { id: string; title: string; time: string; type: 'video' | 'assignment' | 'quiz' }[];
};

type TodoItem = {
  id: string;
  title: string;
  date: string;
  completed: boolean;
};

const COURSES_KEY = "nxtgen_courses";
const ENROLL_KEY = "nxtgen_enrollments";
const TODO_KEY = "nxtgen_todos";
const ASSIGNMENTS_KEY = "nxtgen_assignments";
const SUBMISSIONS_KEY = "nxtgen_submissions";

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

function loadTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem(TODO_KEY);
    return raw ? (JSON.parse(raw) as TodoItem[]) : [
      { id: "1", title: "Human Interaction Designs", date: "Tuesday, 30 June 2024", completed: false },
      { id: "2", title: "Design system Basics", date: "Monday, 24 June 2024", completed: false },
      { id: "3", title: "Introduction to UI", date: "Friday, 10 June 2024", completed: true },
      { id: "4", title: "Basics of Figma", date: "Friday, 05 June 2024", completed: true },
    ];
  } catch {
    return [];
  }
}

function saveTodos(todos: TodoItem[]) {
  localStorage.setItem(TODO_KEY, JSON.stringify(todos));
}

function loadAssignments() {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadSubmissions() {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Student Overview Component
function StudentOverview() {
  const [courses, setCourses] = useState<Course[]>(() => loadCourses());
  const [enrollments, setEnrollments] = useState(() => loadEnrollments());
  const [todos, setTodos] = useState<TodoItem[]>(() => loadTodos());
  const [recentSearch, setRecentSearch] = useState("");
  const [newTodo, setNewTodo] = useState("");
  const [showAddTodo, setShowAddTodo] = useState(false);

  const enrolledCourses = enrollments
    .map((e) => {
      const course = courses.find((c) => c.id === e.courseId);
      if (!course) return null;
      
      return {
        ...course,
        videos: Array.isArray(course.videos) ? course.videos : [],
        quizzes: Array.isArray(course.quizzes) ? course.quizzes : [],
        assignments: Array.isArray(course.assignments) ? course.assignments : [],
        purchasedAt: e.purchasedAt
      };
    })
    .filter(Boolean) as (Course & { purchasedAt: number })[];

  const totalEnrolled = enrolledCourses.length;
  const completedCourses = enrolledCourses.filter(course => {
    const videos = Array.isArray(course.videos) ? course.videos : [];
    const assignments = Array.isArray(course.assignments) ? course.assignments : [];
    
    const totalVideos = videos.length;
    const completedVideos = videos.filter(v => v.completed === true).length;
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.completed === true).length;
    
    const totalTasks = totalVideos + totalAssignments;
    const completedTasks = completedVideos + completedAssignments;
    
    return totalTasks > 0 && completedTasks === totalTasks;
  }).length;

  const quizScore = (() => {
    let totalScore = 0;
    let maxScore = 0;
    
    enrolledCourses.forEach(course => {
      const quizzes = Array.isArray(course.quizzes) ? course.quizzes : [];
      const assignments = Array.isArray(course.assignments) ? course.assignments : [];
      
      quizzes.forEach(quiz => {
        totalScore += quiz.score || 0;
        maxScore += quiz.maxScore || 100;
      });
      
      assignments.forEach(assignment => {
        totalScore += assignment.score || 0;
        maxScore += assignment.maxScore || 100;
      });
    });
    
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  })();

  // Filter recent courses by search
  const filteredRecentCourses = enrolledCourses.filter(course =>
    course.title.toLowerCase().includes(recentSearch.toLowerCase())
  );

  // Get upcoming lessons from all enrolled courses
  const upcomingLessons = enrolledCourses.flatMap(course => {
    const lessons = course.upcomingLessons || [
      { id: "1", title: `${course.title} - Next Lesson`, time: "5:30pm", type: 'video' as const },
      { id: "2", title: `${course.title} - Assignment Due`, time: "9:00pm", type: 'assignment' as const }
    ];
    return lessons.map(lesson => ({ ...lesson, courseTitle: course.title }));
  }).slice(0, 4);

  // Calculate task progress
  const taskProgress = enrolledCourses.map(course => {
    const videos = Array.isArray(course.videos) ? course.videos : [];
    const assignments = Array.isArray(course.assignments) ? course.assignments : [];
    
    const totalTasks = videos.length + assignments.length;
    const completedTasks = videos.filter(v => v.completed === true).length + 
                          assignments.filter(a => a.completed === true).length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return {
      title: course.title,
      completed: completedTasks,
      total: totalTasks,
      progress: Math.round(progress)
    };
  }).slice(0, 3);

  // Todo functions
  const addTodo = () => {
    if (newTodo.trim()) {
      const todo: TodoItem = {
        id: String(Date.now()),
        title: newTodo.trim(),
        date: new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        completed: false
      };
      const updated = [todo, ...todos];
      setTodos(updated);
      saveTodos(updated);
      setNewTodo("");
      setShowAddTodo(false);
    }
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updated);
    saveTodos(updated);
  };

  const removeTodo = (id: string) => {
    const updated = todos.filter(todo => todo.id !== id);
    setTodos(updated);
    saveTodos(updated);
  };

  return (
    <div className="flex-1 bg-gray-50 min-h-0">
      <div className="max-w-[1160px] mx-auto p-6 lg:p-8">
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-[30px] font-normal text-[#1C1D1D] mb-4 font-sora">
            Welcome Back Student
          </h1>
          <p className="text-[19px] font-normal text-[#1C1D1D] font-sora">
            Here's your learning progress overview
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-[16px] p-8 shadow-[0_0_63px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[25px] font-medium text-[#1C1D1D] opacity-80 font-sora">
                Total Enrolled
              </h3>
              <div className="w-12 h-12 bg-[#1B68B3] rounded-lg flex items-center justify-center">
                <Eye className="w-9 h-9 text-white" />
              </div>
            </div>
            <p className="text-[19px] text-[#1C1D1D] opacity-50 font-sora">{totalEnrolled}</p>
          </div>

          <div className="bg-white rounded-[16px] p-8 shadow-[0_0_63px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[25px] font-medium text-[#1C1D1D] opacity-80 font-sora">
                Completed
              </h3>
              <div className="w-12 h-12 bg-[#1B68B3] rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-white" />
              </div>
            </div>
            <p className="text-[19px] text-[#1C1D1D] opacity-50 font-sora">{completedCourses}</p>
          </div>

          <div className="bg-white rounded-[16px] p-8 shadow-[0_0_63px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[25px] font-medium text-[#1C1D1D] opacity-80 font-sora">
                Assignments Due
              </h3>
              <div className="w-12 h-12 bg-[#1B68B3] rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-9 h-9 text-white" />
              </div>
            </div>
            <p className="text-[19px] text-[#1C1D1D] opacity-50 font-sora">3</p>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Courses */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_3.389px_5.084px_rgba(0,0,0,0.09)] p-6">
            <h2 className="text-[19px] font-medium text-[#1C1D1D] mb-5 font-inter">
              Recent enrolled classes
            </h2>
            <div className="max-h-[300px] overflow-y-auto space-y-3">
              {enrolledCourses.slice(0, 3).map((course, index) => (
                <div key={course.id} className="bg-white rounded-[10px] shadow-[0_0_40px_rgba(0,0,0,0.07)] p-5">
                  <h3 className="text-[16px] mb-3 font-inter font-bold text-[#1B68B3]">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-7 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-[#1C1D1D]" />
                      <span className="text-[14px] text-[#1C1D1D] font-sora">
                        {course.videos?.length || 0} Videos
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#1C1D1D]" />
                      <span className="text-[14px] text-[#1C1D1D] font-sora">
                        {course.assignments?.length || 0} Assignments
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* To Do List */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_3.389px_5.084px_rgba(0,0,0,0.09)] p-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold text-[#121212] font-inter">
                To do List
              </h2>
              <button
                onClick={() => setShowAddTodo(true)}
                className="flex items-center gap-1 text-[#1B68B3] hover:text-[#155a9a]"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add</span>
              </button>
            </div>

            {showAddTodo && (
              <div className="mb-4 p-3 border rounded">
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="Enter todo item..."
                  className="w-full border rounded px-3 py-2 text-sm mb-2"
                  onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={addTodo}
                    className="px-3 py-1 bg-[#1B68B3] text-white rounded text-sm"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddTodo(false);
                      setNewTodo("");
                    }}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="max-h-[300px] overflow-y-auto space-y-4">
              {todos.map((todo, index) => (
                <div key={todo.id} className={`${index < todos.length - 1 ? 'pb-4 border-b border-[#ECECEC]' : ''}`}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className={`w-4 h-4 border border-[#1B68B3] mt-1 flex-shrink-0 flex items-center justify-center ${
                        todo.completed ? 'bg-[#1B68B3]' : 'bg-[rgba(255,75,0,0.06)]'
                      }`}
                    >
                      {todo.completed && (
                        <svg className="w-2 h-2" viewBox="0 0 10 8" fill="none">
                          <path
                            d="M0.882133 3.92939L3.63887 6.41533L9.15233 1.44346"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <h3 className={`text-[13px] font-medium text-[#121212] opacity-70 font-poppins ${
                        todo.completed ? 'line-through' : ''
                      }`}>
                        {todo.title}
                      </h3>
                      <p className="text-[12px] text-[#41475E] opacity-50 mt-1 font-poppins">
                        {todo.date}
                      </p>
                    </div>
                    <button
                      onClick={() => removeTodo(todo.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Instructor Overview Component
function InstructorOverview() {
  const [assignments] = useState(() => loadAssignments());
  const [submissions] = useState(() => loadSubmissions());
  const [courses] = useState(() => loadCourses());
  const { user } = useAuth();

  // Calculate instructor stats
  const instructorAssignments = assignments.filter((a: any) => a.instructorId === user?.id);
  const instructorCourses = courses.filter((c: any) => c.creator === user?.id);
  const totalSubmissions = submissions.filter((s: any) => 
    instructorAssignments.some((a: any) => a.id === s.assignmentId)
  );
  const pendingGrading = totalSubmissions.filter((s: any) => !s.graded);

  return (
    <div className="flex-1 bg-gray-50 min-h-0">
      <div className="max-w-[1160px] mx-auto p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-[30px] font-normal text-[#1C1D1D] mb-4 font-sora">
            Instructor Dashboard
          </h1>
          <p className="text-[19px] font-normal text-[#1C1D1D] font-sora">
            Manage your courses and track student progress
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-[16px] p-6 shadow-[0_0_63px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-medium text-[#1C1D1D] opacity-80 font-sora">
                My Courses
              </h3>
              <BookOpen className="w-8 h-8 text-[#1B68B3]" />
            </div>
            <p className="text-[24px] text-[#1C1D1D] font-bold">{instructorCourses.length}</p>
          </div>

          <div className="bg-white rounded-[16px] p-6 shadow-[0_0_63px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-medium text-[#1C1D1D] opacity-80 font-sora">
                Assignments
              </h3>
              <FileText className="w-8 h-8 text-[#1B68B3]" />
            </div>
            <p className="text-[24px] text-[#1C1D1D] font-bold">{instructorAssignments.length}</p>
          </div>

          <div className="bg-white rounded-[16px] p-6 shadow-[0_0_63px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-medium text-[#1C1D1D] opacity-80 font-sora">
                Submissions
              </h3>
              <Users className="w-8 h-8 text-[#1B68B3]" />
            </div>
            <p className="text-[24px] text-[#1C1D1D] font-bold">{totalSubmissions.length}</p>
          </div>

          <div className="bg-white rounded-[16px] p-6 shadow-[0_0_63px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-medium text-[#1C1D1D] opacity-80 font-sora">
                Pending Grading
              </h3>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-[24px] text-orange-600 font-bold">{pendingGrading.length}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/app/assignments/create"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <Plus className="w-5 h-5 text-[#1B68B3]" />
                <span>Create New Assignment</span>
              </Link>
              <Link
                to="/app/managecourse/add"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <BookOpen className="w-5 h-5 text-[#1B68B3]" />
                <span>Create New Course</span>
              </Link>
              <Link
                to="/app/gradeass"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <Award className="w-5 h-5 text-[#1B68B3]" />
                <span>Grade Assignments</span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {pendingGrading.slice(0, 5).map((submission: any, index: number) => {
                const assignment = instructorAssignments.find((a: any) => a.id === submission.assignmentId);
                return (
                  <div key={submission.id} className="flex items-center gap-3 p-2 border-l-4 border-l-orange-500 bg-orange-50">
                    <FileText className="w-4 h-4 text-orange-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{submission.userName}</p>
                      <p className="text-xs text-gray-600">submitted {assignment?.title}</p>
                    </div>
                    <span className="text-xs text-orange-600">Pending</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Content Creator Overview Component
function ContentCreatorOverview() {
  const [courses] = useState(() => loadCourses());
  const [enrollments] = useState(() => loadEnrollments());
  const { user } = useAuth();

  const creatorCourses = courses.filter((c: any) => c.creator === user?.id);
  const totalEnrollments = enrollments.filter((e: any) => 
    creatorCourses.some((c: any) => c.id === e.courseId)
  ).length;

  return (
    <div className="flex-1 bg-gray-50 min-h-0">
      <div className="max-w-[1160px] mx-auto p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-[30px] font-normal text-[#1C1D1D] mb-4 font-sora">
            Content Creator Studio
          </h1>
          <p className="text-[19px] font-normal text-[#1C1D1D] font-sora">
            Create and manage your educational content
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-[16px] p-8 shadow-[0_0_63px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[25px] font-medium text-[#1C1D1D] opacity-80 font-sora">
                My Courses
              </h3>
              <BookOpen className="w-12 h-12 text-[#1B68B3]" />
            </div>
            <p className="text-[19px] text-[#1C1D1D] opacity-50 font-sora">{creatorCourses.length}</p>
          </div>

          <div className="bg-white rounded-[16px] p-8 shadow-[0_0_63px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[25px] font-medium text-[#1C1D1D] opacity-80 font-sora">
                Total Enrollments
              </h3>
              <Users className="w-12 h-12 text-[#1B68B3]" />
            </div>
            <p className="text-[19px] text-[#1C1D1D] opacity-50 font-sora">{totalEnrollments}</p>
          </div>

          <div className="bg-white rounded-[16px] p-8 shadow-[0_0_63px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[25px] font-medium text-[#1C1D1D] opacity-80 font-sora">
                Revenue
              </h3>
              <TrendingUp className="w-12 h-12 text-[#1B68B3]" />
            </div>
            <p className="text-[19px] text-[#1C1D1D] opacity-50 font-sora">$2,450</p>
          </div>
        </div>

        {/* Quick Actions and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Content Management</h2>
            <div className="space-y-3">
              <Link
                to="/app/managecourse/add"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <Plus className="w-5 h-5 text-[#1B68B3]" />
                <span>Create New Course</span>
              </Link>
              <Link
                to="/app/managecourse"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <BookOpen className="w-5 h-5 text-[#1B68B3]" />
                <span>Manage Courses</span>
              </Link>
              <Link
                to="/app/reports"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <BarChart3 className="w-5 h-5 text-[#1B68B3]" />
                <span>View Analytics</span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Recent Courses</h2>
            <div className="space-y-3">
              {creatorCourses.slice(0, 5).map((course: any) => (
                <div key={course.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <BookOpen className="w-5 h-5 text-[#1B68B3]" />
                  <div className="flex-1">
                    <p className="font-medium">{course.title}</p>
                    <p className="text-sm text-gray-600">
                      {enrollments.filter((e: any) => e.courseId === course.id).length} enrollments
                    </p>
                  </div>
                  <Link
                    to={`/app/managecourse/edit/${course.id}`}
                    className="text-sm text-[#1B68B3] hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin Overview Component
function AdminOverview() {
  const [courses] = useState(() => loadCourses());
  const [enrollments] = useState(() => loadEnrollments());
  const [assignments] = useState(() => loadAssignments());
  const [submissions] = useState(() => loadSubmissions());

  return (
    <div className="flex-1 bg-gray-50 min-h-0">
      <div className="max-w-[1160px] mx-auto p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-[30px] font-normal text-[#1C1D1D] mb-4 font-sora">
            Admin Dashboard
          </h1>
          <p className="text-[19px] font-normal text-[#1C1D1D] font-sora">
            Platform overview and system management
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-[16px] p-6 shadow-[0_0_63px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-medium text-[#1C1D1D] opacity-80 font-sora">
                Total Courses
              </h3>
              <BookOpen className="w-8 h-8 text-[#1B68B3]" />
            </div>
            <p className="text-[24px] text-[#1C1D1D] font-bold">{courses.length}</p>
          </div>

          <div className="bg-white rounded-[16px] p-6 shadow-[0_0_63px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-medium text-[#1C1D1D] opacity-80 font-sora">
                Total Enrollments
              </h3>
              <Users className="w-8 h-8 text-[#1B68B3]" />
            </div>
            <p className="text-[24px] text-[#1C1D1D] font-bold">{enrollments.length}</p>
          </div>

          <div className="bg-white rounded-[16px] p-6 shadow-[0_0_63px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-medium text-[#1C1D1D] opacity-80 font-sora">
                Total Assignments
              </h3>
              <FileText className="w-8 h-8 text-[#1B68B3]" />
            </div>
            <p className="text-[24px] text-[#1C1D1D] font-bold">{assignments.length}</p>
          </div>

          <div className="bg-white rounded-[16px] p-6 shadow-[0_0_63px_rgba(0,0,0,0.07)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-medium text-[#1C1D1D] opacity-80 font-sora">
                Total Submissions
              </h3>
              <Award className="w-8 h-8 text-[#1B68B3]" />
            </div>
            <p className="text-[24px] text-[#1C1D1D] font-bold">{submissions.length}</p>
          </div>
        </div>

        {/* Admin Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">System Management</h2>
            <div className="space-y-3">
              <Link
                to="/app/managerole"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <Users className="w-5 h-5 text-[#1B68B3]" />
                <span>Manage Roles</span>
              </Link>
              <Link
                to="/app/managecourse"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <BookOpen className="w-5 h-5 text-[#1B68B3]" />
                <span>Manage All Courses</span>
              </Link>
              <Link
                to="/app/reports"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <BarChart3 className="w-5 h-5 text-[#1B68B3]" />
                <span>Platform Analytics</span>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 border-l-4 border-l-blue-500 bg-blue-50">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">New course created</p>
                  <p className="text-xs text-gray-600">React Advanced Concepts</p>
                </div>
                <span className="text-xs text-blue-600">2h ago</span>
              </div>
              <div className="flex items-center gap-3 p-2 border-l-4 border-l-green-500 bg-green-50">
                <Users className="w-4 h-4 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">New enrollment</p>
                  <p className="text-xs text-gray-600">JavaScript Fundamentals</p>
                </div>
                <span className="text-xs text-green-600">4h ago</span>
              </div>
              <div className="flex items-center gap-3 p-2 border-l-4 border-l-purple-500 bg-purple-50">
                <FileText className="w-4 h-4 text-purple-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Assignment submitted</p>
                  <p className="text-xs text-gray-600">React Project Assignment</p>
                </div>
                <span className="text-xs text-purple-600">6h ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Overview Component
export default function Overview() {
  const { user } = useAuth();

  switch (user?.role) {
    case 'instructor':
      return <InstructorOverview />;
    case 'contentCreator':
      return <ContentCreatorOverview />;
    case 'admin':
      return <AdminOverview />;
    default:
      return <StudentOverview />;
  }
}
