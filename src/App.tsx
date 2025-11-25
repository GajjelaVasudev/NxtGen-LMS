import "./styles/global.css";

import React, { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyCode from "./pages/VerifyCode";
import SetPassword from "./pages/SetPassword";
import Surprise from "./pages/Surprise";
import DashboardLayout from "./layouts/DashboardLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import RequireAuth from "@/components/RequireAuth";

const queryClient = new QueryClient();

const SECRET = '2431';

function KeyboardShortcuts() {
  const navigate = useNavigate();
  const bufRef = useRef('');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ctrl+Shift+S opens the surprise directly
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        navigate('/surprise');
        return;
      }

      // Accumulate digits typed anywhere; unlock when SECRET matched
      if (e.key >= '0' && e.key <= '9') {
        bufRef.current = (bufRef.current + e.key).slice(-SECRET.length);
        if (bufRef.current === SECRET) {
          navigate('/surprise', { state: { autoUnlock: true } });
          bufRef.current = '';
        }
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <KeyboardShortcuts />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/surprise" element={<Surprise />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify-code" element={<VerifyCode />} />
              <Route path="/set-password" element={<SetPassword />} />
              <Route
                path="/app/*"
                element={
                  <RequireAuth>
                    <DashboardLayout />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}