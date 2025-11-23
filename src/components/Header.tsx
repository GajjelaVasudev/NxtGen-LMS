import { useState, useEffect, useRef } from "react";
import { Search, Bell, ChevronDown, User, Settings, LogOut, FileText, BookOpen, BarChart3, Shield, Users, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { loadInboxMessages } from "@/utils/inboxHelpers";
import { Link, useNavigate } from "react-router-dom";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load notifications count
  useEffect(() => {
    const updateNotifications = () => {
      (async () => {
        try {
          const msgs = await loadInboxMessages(user?.id, user?.role);
          const unread = (msgs || []).filter((msg: any) => !msg.read).length;
          setUnreadNotifications(unread);
        } catch {
          setUnreadNotifications(0);
        }
      })();
    };

    updateNotifications();
    window.addEventListener("inbox:updated", updateNotifications);
    return () => window.removeEventListener("inbox:updated", updateNotifications);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case "admin":
        return { label: "Admin", color: "bg-red-100 text-red-700" };
      case "instructor":
        return { label: "Instructor", color: "bg-blue-100 text-blue-700" };
      case "contentCreator":
        return { label: "Creator", color: "bg-green-100 text-green-700" };
      default:
        return { label: "Student", color: "bg-purple-100 text-purple-700" };
    }
  };

  const getMenuItems = () => {
    const commonItems = [
      { icon: <User size={18} />, label: "My Profile", to: "/app/settings" },
      { icon: <FileText size={18} />, label: "My Assignments", to: "/app/assignments" },
      { icon: <BookOpen size={18} />, label: "My Courses", to: "/app/courses" },
    ];

    const roleSpecificItems = [];

    if (user?.role === "instructor") {
      roleSpecificItems.push(
        { icon: <BarChart3 size={18} />, label: "Grade Assignments", to: "/app/gradeass" },
        { icon: <BookOpen size={18} />, label: "Manage Courses", to: "/app/managecourse" },
        { icon: <FileText size={18} />, label: "Create Assignment", to: "/app/assignments/create" },
      );
    }

    if (user?.role === "contentCreator") {
      roleSpecificItems.push(
        { icon: <BookOpen size={18} />, label: "Manage Courses", to: "/app/managecourse" },
        { icon: <BarChart3 size={18} />, label: "Analytics", to: "/app/reports" },
        { icon: <Users size={18} />, label: "Course Enrollments", to: "/app/reports" },
      );
    }

    if (user?.role === "admin") {
      roleSpecificItems.push(
        { icon: <Shield size={18} />, label: "Manage Roles", to: "/app/managerole" },
        { icon: <Users size={18} />, label: "User Management", to: "/app/settings" },
        { icon: <BookOpen size={18} />, label: "All Courses", to: "/app/managecourse" },
        { icon: <BarChart3 size={18} />, label: "Platform Analytics", to: "/app/reports" },
      );
    }

    return [...commonItems, ...roleSpecificItems];
  };

  const roleBadge = getRoleBadge();
  const menuItems = getMenuItems();

  return (
    <header className="flex w-full h-[65px] px-4 lg:px-[85px] py-[13px] bg-white border-b border-nxtgen-border">
      <div className="flex items-center justify-between w-full">
        {/* Search Bar */}
        <div className="flex items-center justify-between w-full max-w-[335px] px-[11px] py-[9px] border border-nxtgen-blue rounded-[4px] bg-white">
          <div className="flex items-center gap-[11px]">
            <Search size={19} className="text-nxtgen-blue stroke-[1.4]" />
            <input
              type="text"
              placeholder="Search"
              className="text-nxtgen-text-secondary text-[13px] font-normal bg-transparent border-none outline-none flex-1"
            />
          </div>
        </div>

        {/* Profile + Notifications */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Notifications */}
          <Link to="/app/inbox" className="relative">
            <div className="w-[33px] h-8 bg-white border border-[#E7EAE9] rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer">
              <Bell size={16} className="text-black" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </div>
          </Link>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div 
              className="flex items-center gap-[11px] cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex flex-col">
                <span className="text-black text-[13px] font-medium">
                  {user?.name || user?.email?.split("@")[0] || "User"}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${roleBadge.color} w-fit`}>
                  {roleBadge.label}
                </span>
              </div>
              <ChevronDown 
                size={15} 
                className={`text-black transition-transform ${showDropdown ? "rotate-180" : ""}`} 
              />
            </div>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {/* User Info Section */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold">
                      {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user?.name || "User"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${roleBadge.color} inline-block mt-1`}>
                        {roleBadge.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  {menuItems.map((item, index) => (
                    <Link
                      key={index}
                      to={item.to}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-gray-600">{item.icon}</span>
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </Link>
                  ))}
                </div>

                {/* Settings Section */}
                <div className="border-t border-gray-100 py-2">
                  <Link
                    to="/app/settings"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <Settings size={18} className="text-gray-600" />
                    <span className="text-sm text-gray-700">Settings</span>
                  </Link>
                </div>

                {/* Logout Section */}
                <div className="border-t border-gray-100 py-2">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors w-full text-left"
                  >
                    <LogOut size={18} className="text-red-600" />
                    <span className="text-sm text-red-600 font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
