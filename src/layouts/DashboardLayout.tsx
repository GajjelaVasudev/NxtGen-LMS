import React, { useEffect, useState } from "react";
import { Link, Routes, Route } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

import Overview from "@/pages/Overview";
import Assignments from "@/pages/Assignments";
import CreateAssignment from "@/pages/CreateAssignment";
import AssignmentSubmissions from "@/pages/AssignmentSubmissions";
import Courses from "@/pages/Courses";
import CourseView from "@/pages/CourseView";
import ManageCourse, { AddCourse } from "@/pages/ManageCourse";
import CourseCatalog from "@/pages/CourseCatalog";
import CourseDetails from "@/pages/CourseDetails";
import Inbox from "@/pages/Inbox";
import Discussions from "@/pages/Discussions";
import Settings from "@/pages/Settings";
import Reports from "@/pages/Reports";
import ManageRoles from "@/pages/ManageRoles";
import Gradeass from "@/pages/Gradeass";
import UserManagement from "@/pages/UserManagement";

export default function DashboardLayout() {
  const { user } = useAuth();

  return (
    <div className="h-screen flex bg-white">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-0">
        <Header />

        {/* Central content area: allow content scrolling while header/sidebar stay fixed */}
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="min-h-full">
            <Routes>
              <Route index element={<Overview />} />

              {/* Assignments */}
              <Route path="assignments" element={<Assignments />} />
              <Route path="assignments/create" element={<CreateAssignment />} />
              <Route path="assignments/edit/:id" element={<CreateAssignment />} />
              <Route
                path="assignments/submissions/:assignmentId"
                element={<AssignmentSubmissions />}
              />

              {/* My Courses */}
              <Route path="courses" element={<Courses />} />
              <Route path="courses/:courseId" element={<CourseView />} />

              {/* Catalog / Details */}
              <Route path="course-catalog" element={<CourseCatalog />} />
              <Route path="course-details/:courseId" element={<CourseDetails />} />

              {/* Course management */}
              <Route path="managecourse" element={<ManageCourse />} />
              <Route path="managecourse/add" element={<AddCourse />} />
              <Route path="managecourse/edit/:id" element={<AddCourse />} />

              {/* Messaging / Settings */}
              <Route path="inbox" element={<Inbox />} />
              <Route path="discussions" element={<Discussions />} />
              <Route path="settings" element={<Settings />} />

              {/* Reports / Admin */}
              <Route path="reports" element={<Reports />} />
              <Route path="managerole" element={<ManageRoles />} />
              <Route path="gradeass" element={<Gradeass />} />
              <Route path="user-management" element={<UserManagement />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

