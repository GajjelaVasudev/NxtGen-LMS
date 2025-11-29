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
import { loadInboxMessages } from "@/utils/inboxHelpers";
import { Logo } from "@/components/Logo";

export default function Sidebar() {
  const { hasRole, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateUnreadCount = async () => {
      try {
        const messages = await loadInboxMessages(user?.id, user?.role);
        const unread = (messages || []).filter((msg: any) => !msg.read).length;
        setUnreadCount(unread);
      } catch {
        setUnreadCount(0);
      }
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
    <aside className="w-[280px] h-full flex flex-col p-4">
      <div className="mb-4">
        <div className="w-full card p-4 flex flex-col items-center">
          <div className="p-1 rounded-md bg-white/60">
            <Logo />
          </div>

          <nav className="w-full mt-4">
            <div className="flex flex-col gap-2">
              {navItems.map(({ icon, label, to, badge }) => (
                <NavItem key={to} icon={icon} label={label} to={to} badge={badge} />
              ))}
            </div>
          </nav>
        </div>
      </div>
    </aside>
  );
}