import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  TrendingUp,
  Award,
  Clock,
  FileText,
  Users,
  BookOpen,
  Star,
  Download,
  Calendar,
  Activity,
  BarChart3,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Target,
  Eye,
  MessageSquare,
  Settings,
  Database
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

// Sample data generators
const generateStudentProgressData = () => [
  { week: "Week 1", progress: 20, grade: 75 },
  { week: "Week 2", progress: 35, grade: 78 },
  { week: "Week 3", progress: 50, grade: 82 },
  { week: "Week 4", progress: 65, grade: 85 },
  { week: "Week 5", progress: 80, grade: 88 },
  { week: "Week 6", progress: 95, grade: 92 },
];

const generateActivityData = () => [
  { day: "Mon", hours: 3 },
  { day: "Tue", hours: 4 },
  { day: "Wed", hours: 2 },
  { day: "Thu", hours: 5 },
  { day: "Fri", hours: 3 },
  { day: "Sat", hours: 6 },
  { day: "Sun", hours: 4 },
];

const generateCourseDistribution = () => [
  { name: "In Progress", value: 5, color: "#515DEF" },
  { name: "Completed", value: 3, color: "#10B981" },
  { name: "Not Started", value: 2, color: "#F59E0B" },
];

const COLORS = ["#515DEF", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

// Student Reports Component
function StudentReports() {
  const progressData = generateStudentProgressData();
  const activityData = generateActivityData();
  const courseDistribution = generateCourseDistribution();

  const stats = {
    totalCourses: 10,
    completed: 3,
    inProgress: 5,
    averageGrade: 85,
    totalHours: 47,
    certificates: 2,
  };

  const achievements = [
    { id: 1, title: "Quick Learner", description: "Completed 3 courses", icon: "🏆", date: "2024-01-15" },
    { id: 2, title: "Perfect Score", description: "Got 100% in JavaScript Quiz", icon: "⭐", date: "2024-01-20" },
    { id: 3, title: "Consistent", description: "7-day learning streak", icon: "🔥", date: "2024-01-25" },
  ];

  const recentGrades = [
    { course: "JavaScript Basics", assignment: "Final Project", grade: 92, date: "2024-01-28" },
    { course: "React Fundamentals", assignment: "Component Quiz", grade: 88, date: "2024-01-26" },
    { course: "CSS Advanced", assignment: "Layout Challenge", grade: 95, date: "2024-01-24" },
    { course: "HTML5", assignment: "Semantic HTML", grade: 90, date: "2024-01-22" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold">{stats.totalCourses}</span>
          </div>
          <p className="text-sm text-gray-600">Total Courses</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold">{stats.completed}</span>
          </div>
          <p className="text-sm text-gray-600">Completed</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold">{stats.averageGrade}%</span>
          </div>
          <p className="text-sm text-gray-600">Average Grade</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold">{stats.totalHours}h</span>
          </div>
          <p className="text-sm text-gray-600">Total Hours</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Learning Progress & Grades</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="progress" stroke="#515DEF" strokeWidth={2} />
              <Line type="monotone" dataKey="grade" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      
        {/*Activity Chart*/}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Weekly Activity (Hours)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#515DEF" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Course Distribution & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Course Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={courseDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {courseDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Achievements */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Achievements</h3>
            <Award className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="space-y-3">
            {achievements.map((achievement) => (
              <div key={achievement.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <span className="text-3xl">{achievement.icon}</span>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{achievement.title}</h4>
                  <p className="text-xs text-gray-600">{achievement.description}</p>
                </div>
                <span className="text-xs text-gray-500">{new Date(achievement.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Grades Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Grades</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            <Download size={16} />
            Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Course</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Assignment</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Grade</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentGrades.map((grade, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{grade.course}</td>
                  <td className="px-4 py-3 text-sm">{grade.assignment}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`font-semibold ${grade.grade >= 90 ? 'text-green-600' : grade.grade >= 80 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {grade.grade}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(grade.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Instructor Reports Component
function InstructorReports() {
  const studentPerformanceData = [
    { name: "John Doe", avgGrade: 85, submissions: 12, attendance: 95 },
    { name: "Jane Smith", avgGrade: 92, submissions: 15, attendance: 98 },
    { name: "Bob Johnson", avgGrade: 78, submissions: 10, attendance: 87 },
    { name: "Alice Brown", avgGrade: 88, submissions: 14, attendance: 92 },
  ];

  const engagementData = [
    { month: "Jan", views: 450, submissions: 89, interactions: 234 },
    { month: "Feb", views: 520, submissions: 105, interactions: 289 },
    { month: "Mar", views: 610, submissions: 124, interactions: 312 },
    { month: "Apr", views: 580, submissions: 118, interactions: 301 },
  ];

  const assignmentStats = {
    totalAssignments: 24,
    pendingGrade: 8,
    avgSubmissionTime: "2.5 days",
    completionRate: 87,
  };

  const exportReport = () => {
    alert("Exporting report... (Feature to be implemented)");
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold">42</span>
          </div>
          <p className="text-sm text-gray-600">Total Students</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold">{assignmentStats.totalAssignments}</span>
          </div>
          <p className="text-sm text-gray-600">Assignments</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold">{assignmentStats.pendingGrade}</span>
          </div>
          <p className="text-sm text-gray-600">Pending Grade</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold">{assignmentStats.completionRate}%</span>
          </div>
          <p className="text-sm text-gray-600">Completion Rate</p>
        </div>
      </div>

      {/* Engagement Analytics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Course Engagement Analytics</h3>
          <button onClick={exportReport} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            <Download size={16} />
            Export
          </button>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={engagementData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="views" stackId="1" stroke="#515DEF" fill="#515DEF" fillOpacity={0.6} />
            <Area type="monotone" dataKey="submissions" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
            <Area type="monotone" dataKey="interactions" stackId="3" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Student Performance Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Student Performance Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Student Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Avg Grade</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Submissions</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Attendance</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {studentPerformanceData.map((student, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{student.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`font-semibold ${student.avgGrade >= 90 ? 'text-green-600' : student.avgGrade >= 80 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {student.avgGrade}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{student.submissions}</td>
                  <td className="px-4 py-3 text-sm">{student.attendance}%</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${student.avgGrade >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {student.avgGrade >= 80 ? 'Excellent' : 'Needs Attention'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Student Activity Logs</h3>
        <div className="space-y-3">
          {[
            { student: "John Doe", action: "Submitted Assignment 3", time: "2 hours ago", type: "submission" },
            { student: "Jane Smith", action: "Completed Quiz 5", time: "4 hours ago", type: "quiz" },
            { student: "Bob Johnson", action: "Watched Lecture 12", time: "6 hours ago", type: "video" },
            { student: "Alice Brown", action: "Posted in Discussion", time: "8 hours ago", type: "discussion" },
          ].map((activity, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border-l-4 border-l-blue-500 bg-blue-50 rounded">
              <Activity className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">{activity.student}</p>
                <p className="text-xs text-gray-600">{activity.action}</p>
              </div>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Content Creator Reports Component
function ContentCreatorReports() {
  const contentUsageData = [
    { month: "Jan", views: 1250, completions: 340, ratings: 4.2 },
    { month: "Feb", views: 1580, completions: 425, ratings: 4.5 },
    { month: "Mar", views: 1890, completions: 510, ratings: 4.7 },
    { month: "Apr", views: 2120, completions: 598, ratings: 4.8 },
  ];

  const contentRatings = [
    { course: "JavaScript Mastery", rating: 4.8, reviews: 245, engagement: 92 },
    { course: "React Complete Guide", rating: 4.6, reviews: 189, engagement: 88 },
    { course: "CSS Advanced", rating: 4.9, reviews: 312, engagement: 95 },
    { course: "Node.js Backend", rating: 4.5, reviews: 178, engagement: 85 },
  ];

  const qualityMetrics = {
    overallQuality: 4.7,
    contentAccuracy: 95,
    studentSatisfaction: 92,
    updateFrequency: "Weekly",
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold">8.2K</span>
          </div>
          <p className="text-sm text-gray-600">Total Views</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-8 h-8 text-yellow-500" />
            <span className="text-2xl font-bold">{qualityMetrics.overallQuality}</span>
          </div>
          <p className="text-sm text-gray-600">Avg Rating</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold">{qualityMetrics.contentAccuracy}%</span>
          </div>
          <p className="text-sm text-gray-600">Content Accuracy</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold">{qualityMetrics.studentSatisfaction}%</span>
          </div>
          <p className="text-sm text-gray-600">Satisfaction</p>
        </div>
      </div>

      {/* Content Usage Trends */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Content Usage & Engagement Trends</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={contentUsageData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="views" stroke="#515DEF" strokeWidth={2} name="Views" />
            <Line yAxisId="left" type="monotone" dataKey="completions" stroke="#10B981" strokeWidth={2} name="Completions" />
            <Line yAxisId="right" type="monotone" dataKey="ratings" stroke="#F59E0B" strokeWidth={2} name="Avg Rating" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Content Ratings Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Content Ratings & Feedback</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Course</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Rating</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Reviews</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Engagement</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contentRatings.map((content, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{content.course}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold">{content.rating}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{content.reviews}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${content.engagement}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-600">{content.engagement}%</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button className="text-blue-600 hover:text-blue-800 text-xs">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Feedback */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Recent Student Feedback</h3>
        <div className="space-y-3">
          {[
            { student: "John Doe", course: "JavaScript Mastery", rating: 5, comment: "Excellent content! Very clear explanations.", time: "2 days ago" },
            { student: "Jane Smith", course: "React Complete Guide", rating: 4, comment: "Good course, would love more examples.", time: "3 days ago" },
            { student: "Bob Johnson", course: "CSS Advanced", rating: 5, comment: "Best CSS course I've taken!", time: "5 days ago" },
          ].map((feedback, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">{feedback.student}</p>
                  <p className="text-xs text-gray-600">{feedback.course}</p>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(feedback.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-2">{feedback.comment}</p>
              <span className="text-xs text-gray-500">{feedback.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Admin Reports Component
function AdminReports() {
  const userStatsData = [
    { month: "Jan", students: 120, instructors: 15, creators: 8 },
    { month: "Feb", students: 145, instructors: 18, creators: 10 },
    { month: "Mar", students: 178, instructors: 22, creators: 12 },
    { month: "Apr", students: 210, instructors: 25, creators: 15 },
  ];

  const revenueData = [
    { month: "Jan", revenue: 12500, subscriptions: 89 },
    { month: "Feb", revenue: 15200, subscriptions: 105 },
    { month: "Mar", revenue: 18900, subscriptions: 128 },
    { month: "Apr", revenue: 22400, subscriptions: 152 },
  ];

  const systemStats = {
    totalUsers: 268,
    activeCourses: 45,
    totalRevenue: "$69K",
    systemUptime: "99.8%",
  };

  const recentErrors = [
    { id: 1, type: "API Error", message: "Database connection timeout", severity: "high", time: "1 hour ago" },
    { id: 2, type: "User Report", message: "Video playback issue", severity: "medium", time: "3 hours ago" },
    { id: 3, type: "System", message: "High memory usage detected", severity: "low", time: "5 hours ago" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold">{systemStats.totalUsers}</span>
          </div>
          <p className="text-sm text-gray-600">Total Users</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold">{systemStats.activeCourses}</span>
          </div>
          <p className="text-sm text-gray-600">Active Courses</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-yellow-500" />
            <span className="text-2xl font-bold">{systemStats.totalRevenue}</span>
          </div>
          <p className="text-sm text-gray-600">Total Revenue</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold">{systemStats.systemUptime}</span>
          </div>
          <p className="text-sm text-gray-600">System Uptime</p>
        </div>
      </div>

      {/* User Growth & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">User Growth Analytics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userStatsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="students" fill="#515DEF" />
              <Bar dataKey="instructors" fill="#10B981" />
              <Bar dataKey="creators" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Revenue Analytics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Logs & Errors */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">System Issues & Error Logs</h3>
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <div className="space-y-3">
          {recentErrors.map((error) => (
            <div key={error.id} className={`p-4 rounded-lg border-l-4 ${
              error.severity === 'high' ? 'border-l-red-500 bg-red-50' :
              error.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
              'border-l-blue-500 bg-blue-50'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      error.severity === 'high' ? 'bg-red-200 text-red-700' :
                      error.severity === 'medium' ? 'bg-yellow-200 text-yellow-700' :
                      'bg-blue-200 text-blue-700'
                    }`}>
                      {error.severity.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium">{error.type}</span>
                  </div>
                  <p className="text-sm text-gray-700">{error.message}</p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-4">{error.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Data Management & Exports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-gray-50">
            <Download className="w-6 h-6 text-blue-500" />
            <span className="text-sm font-medium">Export Users</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-gray-50">
            <Download className="w-6 h-6 text-green-500" />
            <span className="text-sm font-medium">Export Courses</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-gray-50">
            <Database className="w-6 h-6 text-purple-500" />
            <span className="text-sm font-medium">Backup Data</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-gray-50">
            <Settings className="w-6 h-6 text-orange-500" />
            <span className="text-sm font-medium">System Config</span>
          </button>
        </div>
      </div>

      {/* Course Analytics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Top Performing Courses</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Course</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Enrollments</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Revenue</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Rating</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { course: "JavaScript Mastery", enrollments: 245, revenue: "$12,250", rating: 4.8, status: "active" },
                { course: "React Complete Guide", enrollments: 189, revenue: "$9,450", rating: 4.6, status: "active" },
                { course: "Python for Beginners", enrollments: 312, revenue: "$15,600", rating: 4.9, status: "active" },
                { course: "Data Science Fundamentals", enrollments: 156, revenue: "$7,800", rating: 4.5, status: "active" },
              ].map((course, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{course.course}</td>
                  <td className="px-4 py-3 text-sm">{course.enrollments}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">{course.revenue}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span>{course.rating}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Main Reports Component
export default function Reports() {
  const { user } = useAuth();

  return (
    <main className="flex-1 h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">
            {user?.role === 'admin' && 'Platform-wide analytics and system reports'}
            {user?.role === 'instructor' && 'Student performance and course engagement metrics'}
            {user?.role === 'contentCreator' && 'Content usage statistics and feedback'}
            {user?.role === 'user' && 'Your learning progress and achievements'}
          </p>
        </div>

        {/* Role-based Reports */}
        {user?.role === 'user' && <StudentReports />}
        {user?.role === 'instructor' && <InstructorReports />}
        {user?.role === 'contentCreator' && <ContentCreatorReports />}
        {user?.role === 'admin' && <AdminReports />}
      </div>
    </main>
  );
}
