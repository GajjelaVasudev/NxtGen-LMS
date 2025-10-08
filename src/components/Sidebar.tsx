import React, { useState, useEffect } from "react";
import NavItem from "./Navitem";
import {
  LayoutGrid,
  FileText,
  PieChart,
  MessageSquarePlus,
  Settings,
  Inbox,
  MessageCircle,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

const INBOX_KEY = "nxtgen_inbox";

function loadInboxMessages() {
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function Sidebar() {
  const { hasRole } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateUnreadCount = () => {
      const messages = loadInboxMessages();
      const unread = messages.filter((msg: any) => !msg.read).length;
      setUnreadCount(unread);
    };

    updateUnreadCount();
    
    const handler = () => updateUnreadCount();
    window.addEventListener("inbox:updated", handler);
    
    return () => window.removeEventListener("inbox:updated", handler);
  }, []);

  const navItems: { icon: React.ReactNode; label: string; to: string; badge?: number }[] = [
    { icon: <LayoutGrid />, label: "Overview", to: "/app" },
    { icon: <FileText />, label: "Assignments", to: "/app/assignments" },
    { icon: <PieChart />, label: "Reports", to: "/app/reports" },
    { icon: <Inbox />, label: "Inbox", to: "/app/inbox", badge: unreadCount },
    { icon: <MessageCircle />, label: "Discussions", to: "/app/discussions" },
    { icon: <Inbox />, label: "Courses", to: "/app/courses" },
    { icon: <MessageSquarePlus />, label: "Course Catalog", to: "/app/course-catalog" },
    { icon: <Settings />, label: "Settings", to: "/app/settings" },
  ];

  // Role-specific additions
  if (hasRole && hasRole(["contentCreator", "admin", "instructor"])) {
    navItems.push({ icon: <MessageSquarePlus />, label: "Manage Course", to: "/app/managecourse" });
  }
  
  if (hasRole && hasRole(["instructor", "admin"])) {
    navItems.push({ icon: <MessageSquarePlus />, label: "Grade Assignments", to: "/app/gradeass" });
  }
  
  if (hasRole && hasRole("admin")) {
    navItems.push({ icon: <Users />, label: "User Management", to: "/app/user-management" });
    navItems.push({ icon: <Settings />, label: "Manage Roles", to: "/app/managerole" });
  }

  return (
    <aside className="w-[280px] h-full flex flex-col" style={{ backgroundColor: "#F5F7F9" }}>
      <div className="flex justify-center items-center h-[105px] px-[29px]">
        <Logo />
      </div>

      <nav className="px-[24px] pt-[24px] flex-1">
        <div className="flex flex-col gap-4">
          {navItems.map(({ icon, label, to, badge }) => (
            <NavItem key={to} icon={icon} label={label} to={to} badge={badge} />
          ))}
        </div>
      </nav>
    </aside>
  );
}