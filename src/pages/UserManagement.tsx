import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
  Lock,
  Download,
  Mail,
  Bell,
  Settings,
  UserPlus,
  Filter,
  Calendar,
  Activity,
  Eye,
  Key,
  Globe,
  Clock,
  AlertCircle,
  Save,
  X,
  FileText,
  UserCheck,
  UserX,
  BarChart3
} from "lucide-react";

type SystemUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "instructor" | "contentCreator" | "user";
  status: "active" | "inactive" | "suspended";
  lastLogin: string;
  joinedDate: string;
  department?: string;
  avatar?: string;
};

type PermissionRole = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isCustom: boolean;
};

type UserGroup = {
  id: string;
  name: string;
  userCount: number;
  createdAt: string;
};

type UserActivity = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  ipAddress: string;
};

const ADMIN_STORAGE = "nxtgen_admin_management";

const initialUsers: SystemUser[] = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@test.com",
    role: "admin",
    status: "active",
    lastLogin: "2024-01-28 10:30 AM",
    joinedDate: "2023-01-15",
    department: "Administration"
  },
  {
    id: "2",
    name: "Instructor User",
    email: "instructor@test.com",
    role: "instructor",
    status: "active",
    lastLogin: "2024-01-28 09:15 AM",
    joinedDate: "2023-02-20",
    department: "Teaching"
  }
];

const systemRoles: PermissionRole[] = [
  {
    id: "admin",
    name: "System Administrator",
    description: "Complete system control and management",
    permissions: ["all_access"],
    isCustom: false
  },
  {
    id: "instructor",
    name: "Course Instructor",
    description: "Create courses and evaluate students",
    permissions: ["course_create", "grade_manage", "student_view", "content_edit"],
    isCustom: false
  },
  {
    id: "contentCreator",
    name: "Content Developer",
    description: "Design and publish course materials",
    permissions: ["course_create", "content_edit", "analytics_view"],
    isCustom: false
  },
  {
    id: "user",
    name: "Learner",
    description: "Access courses and submit work",
    permissions: ["course_view", "assignment_submit", "grade_view"],
    isCustom: false
  }
];

const permissionsList = [
  "all_access",
  "course_create",
  "course_edit",
  "course_delete",
  "grade_manage",
  "student_view",
  "content_edit",
  "analytics_view",
  "course_view",
  "assignment_submit",
  "grade_view",
  "user_manage",
  "role_manage",
  "report_view",
  "announcement_send"
];

const userGroups: UserGroup[] = [
  { id: "1", name: "Administration Team", userCount: 5, createdAt: "2023-01-01" },
  { id: "2", name: "Teaching Staff", userCount: 12, createdAt: "2023-01-01" },
  { id: "3", name: "Content Team", userCount: 8, createdAt: "2023-01-01" },
  { id: "4", name: "Student Body", userCount: 150, createdAt: "2023-01-01" }
];

export default function UserManagement() {
  const [currentTab, setCurrentTab] = useState<"users" | "roles" | "access" | "groups" | "activity" | "profile" | "notifications">("users");
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(() => {
    const stored = localStorage.getItem(ADMIN_STORAGE);
    return stored ? JSON.parse(stored).users || initialUsers : initialUsers;
  });
  const [permissionRoles, setPermissionRoles] = useState<PermissionRole[]>(() => {
    const stored = localStorage.getItem(ADMIN_STORAGE);
    return stored ? JSON.parse(stored).roles || systemRoles : systemRoles;
  });
  const [groups, setGroups] = useState<UserGroup[]>(() => {
    const stored = localStorage.getItem(ADMIN_STORAGE);
    return stored ? JSON.parse(stored).groups || userGroups : userGroups;
  });
  
  const [filterText, setFilterText] = useState("");
  const [roleSelection, setRoleSelection] = useState<string>("all");
  const [statusSelection, setStatusSelection] = useState<string>("all");
  const [displayAddUser, setDisplayAddUser] = useState(false);
  const [displayEditUser, setDisplayEditUser] = useState(false);
  const [displayAddRole, setDisplayAddRole] = useState(false);
  const [displayAddGroup, setDisplayAddGroup] = useState(false);
  const [activeUser, setActiveUser] = useState<SystemUser | null>(null);
  const [activeRole, setActiveRole] = useState<PermissionRole | null>(null);
  
  // Authentication settings
  const [authMethods, setAuthMethods] = useState({
    emailAuth: true,
    googleAuth: false,
    microsoftAuth: false
  });
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [passRequirements, setPassRequirements] = useState({
    minChars: 8,
    needsUpper: true,
    needsDigit: true,
    needsSymbol: true
  });
  const [sessionMinutes, setSessionMinutes] = useState(30);
  const [profileControls, setProfileControls] = useState({
    nameEditable: true,
    photoUpload: true,
    bioEditable: true,
    forceComplete: false
  });

  // Activity tracking
  const [activityRecords] = useState<UserActivity[]>([
    { id: "1", userId: "1", userName: "Admin User", action: "System login", timestamp: "2024-01-28 10:30 AM", ipAddress: "192.168.1.1" },
    { id: "2", userId: "2", userName: "Instructor User", action: "Course published", timestamp: "2024-01-28 09:15 AM", ipAddress: "192.168.1.2" }
  ]);

  // Persist data
  useEffect(() => {
    localStorage.setItem(ADMIN_STORAGE, JSON.stringify({ users: systemUsers, roles: permissionRoles, groups }));
  }, [systemUsers, permissionRoles, groups]);

  // Apply filters
  const displayedUsers = systemUsers.filter(user => {
    const textMatch = user.name.toLowerCase().includes(filterText.toLowerCase()) ||
                     user.email.toLowerCase().includes(filterText.toLowerCase());
    const roleMatch = roleSelection === "all" || user.role === roleSelection;
    const statusMatch = statusSelection === "all" || user.status === statusSelection;
    return textMatch && roleMatch && statusMatch;
  });

  // User operations
  const createUser = (userData: Partial<SystemUser>) => {
    const newUser: SystemUser = {
      id: String(Date.now()),
      name: userData.name || "",
      email: userData.email || "",
      role: userData.role || "user",
      status: "active",
      lastLogin: "Never",
      joinedDate: new Date().toISOString().split('T')[0],
      department: userData.department
    };
    setSystemUsers([...systemUsers, newUser]);
    setDisplayAddUser(false);
  };

  const modifyUser = (userId: string, changes: Partial<SystemUser>) => {
    setSystemUsers(systemUsers.map(u => u.id === userId ? { ...u, ...changes } : u));
    setDisplayEditUser(false);
    setActiveUser(null);
  };

  const removeUser = (userId: string) => {
    if (window.confirm("Confirm user deletion?")) {
      setSystemUsers(systemUsers.filter(u => u.id !== userId));
    }
  };

  const switchStatus = (userId: string) => {
    setSystemUsers(systemUsers.map(u => 
      u.id === userId 
        ? { ...u, status: u.status === "active" ? "inactive" : "active" } 
        : u
    ));
  };

  // Role operations
  const createRole = (roleData: Partial<PermissionRole>) => {
    const newRole: PermissionRole = {
      id: String(Date.now()),
      name: roleData.name || "",
      description: roleData.description || "",
      permissions: roleData.permissions || [],
      isCustom: true
    };
    setPermissionRoles([...permissionRoles, newRole]);
    setDisplayAddRole(false);
  };

  const removeRole = (roleId: string) => {
    const role = permissionRoles.find(r => r.id === roleId);
    if (role?.isCustom && window.confirm("Remove this custom role?")) {
      setPermissionRoles(permissionRoles.filter(r => r.id !== roleId));
    }
  };

  // Group operations
  const createGroup = (groupName: string) => {
    const newGroup: UserGroup = {
      id: String(Date.now()),
      name: groupName,
      userCount: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setGroups([...groups, newGroup]);
    setDisplayAddGroup(false);
  };

  const removeGroup = (groupId: string) => {
    if (window.confirm("Delete this group?")) {
      setGroups(groups.filter(g => g.id !== groupId));
    }
  };

  // Export utilities
  const downloadUserList = () => {
    const csvData = [
      ["Name", "Email", "Role", "Status", "Last Login", "Joined"],
      ...systemUsers.map(u => [u.name, u.email, u.role, u.status, u.lastLogin, u.joinedDate])
    ].map(row => row.join(",")).join("\n");
    
    const file = new Blob([csvData], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = `users-export-${Date.now()}.csv`;
    link.click();
  };

  const downloadActivityLog = () => {
    const csvData = [
      ["User", "Action", "Time", "IP"],
      ...activityRecords.map(log => [log.userName, log.action, log.timestamp, log.ipAddress])
    ].map(row => row.join(",")).join("\n");
    
    const file = new Blob([csvData], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = `activity-${Date.now()}.csv`;
    link.click();
  };

  const roleColorClass = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-700";
      case "instructor": return "bg-blue-100 text-blue-700";
      case "contentCreator": return "bg-green-100 text-green-700";
      default: return "bg-purple-100 text-purple-700";
    }
  };

  const statusIconDisplay = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "inactive": return <XCircle className="w-5 h-5 text-gray-400" />;
      case "suspended": return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System User Management</h1>
              <p className="text-gray-600 mt-1">Control users, roles, permissions and system access</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={downloadUserList} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Download size={18} />
                Export Data
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Settings size={18} />
                Configuration
              </button>
            </div>
          </div>

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{systemUsers.length}</p>
                </div>
                <Users className="w-10 h-10 text-blue-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{systemUsers.filter(u => u.status === "active").length}</p>
                </div>
                <UserCheck className="w-10 h-10 text-green-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inactive</p>
                  <p className="text-2xl font-bold text-gray-600">{systemUsers.filter(u => u.status === "inactive").length}</p>
                </div>
                <UserX className="w-10 h-10 text-gray-400" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Groups</p>
                  <p className="text-2xl font-bold text-purple-600">{groups.length}</p>
                </div>
                <BarChart3 className="w-10 h-10 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b overflow-x-auto">
            {[
              { id: "users", label: "User Accounts", icon: <Users size={18} /> },
              { id: "roles", label: "Roles & Permissions", icon: <Shield size={18} /> },
              { id: "access", label: "Access Control", icon: <Lock size={18} /> },
              { id: "groups", label: "Groups", icon: <Users size={18} /> },
              { id: "activity", label: "Activity Tracking", icon: <Activity size={18} /> },
              { id: "profile", label: "Profile Settings", icon: <Settings size={18} /> },
              { id: "notifications", label: "Communications", icon: <Bell size={18} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  currentTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {/* USER ACCOUNTS TAB */}
          {currentTab === "users" && (
            <div>
              {/* Search & Controls */}
              <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={roleSelection}
                  onChange={(e) => setRoleSelection(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="instructor">Instructor</option>
                  <option value="contentCreator">Creator</option>
                  <option value="user">Student</option>
                </select>
                <select
                  value={statusSelection}
                  onChange={(e) => setStatusSelection(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <button
                  onClick={() => setDisplayAddUser(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus size={18} />
                  Add User
                </button>
              </div>

              {/* User Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Account</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Group</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Last Active</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {displayedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleColorClass(user.role)}`}>
                            {user.role === "contentCreator" ? "Creator" : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{user.department || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {statusIconDisplay(user.status)}
                            <span className="text-sm capitalize">{user.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{user.lastLogin}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setActiveUser(user);
                                setDisplayEditUser(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Modify"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => switchStatus(user.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded"
                              title={user.status === "active" ? "Disable" : "Enable"}
                            >
                              {user.status === "active" ? <XCircle size={16} /> : <CheckCircle size={16} />}
                            </button>
                            <button
                              onClick={() => removeUser(user.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Remove"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add more tab content here... */}
        </div>
      </div>
    </main>
  );
}