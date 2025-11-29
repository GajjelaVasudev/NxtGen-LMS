import "./styles/global.css";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import RequestInstructor from "./pages/RequestInstructor";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPasswordClean";
import ResetPassword from "./pages/ResetPassword";
import VerifyCode from "./pages/VerifyCode";
import SetPassword from "./pages/SetPassword";

import DashboardLayout from "./layouts/DashboardLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import RequireAuth from "@/components/RequireAuth";

/* --- New Policy Pages --- */
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";

/* --- New Company & Support Pages --- */
import AboutUs from "./pages/AboutUs";
import Careers from "./pages/Careers";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import HelpCenter from "./pages/HelpCenter";
import Documentation from "./pages/Documentation";
import APIReference from "./pages/APIReference";
import StatusPage from "./pages/StatusPage";


const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <Routes>
              {/* Public Pages */}
              <Route path="/" element={<Landing />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/request-instructor" element={<RequestInstructor />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-code" element={<VerifyCode />} />
              <Route path="/set-password" element={<SetPassword />} />

              {/* Footer Policy Pages */}
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />

              {/* Company Pages */}
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/contact" element={<Contact />} />

              {/* Support Pages */}
              <Route path="/help-center" element={<HelpCenter />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/api-reference" element={<APIReference />} />
              <Route path="/status" element={<StatusPage />} />

              {/* Protected Routes */}
              <Route
                path="/app/*"
                element={
                  <RequireAuth>
                    <DashboardLayout />
                  </RequireAuth>
                }
              />

              {/* Unknown Routes Redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
