import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from '@supabase/supabase-js';
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
  const { user } = useAuth();
  // Supabase client helper
  function makeSupabase() {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    if (!url || !key) return null;
    return createClient(url, key);
  }
  const ENV_SECRET = '';
  const [unauthorized, setUnauthorized] = useState(false);
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
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<{ id: string; message: string; type?: 'success' | 'error' }[]>([]);
  
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

  // Activity state (populated from server)
  const [activity, setActivity] = useState<UserActivity[]>([]);

  // Activity tracking (server-backed)
  // initial seed removed; activity is populated from server into `activity` state

  // Persist data
  useEffect(() => {
    localStorage.setItem(ADMIN_STORAGE, JSON.stringify({ users: systemUsers, roles: permissionRoles, groups }));
  }, [systemUsers, permissionRoles, groups]);


  // Fetch real users from server if current user is admin (fallback to local data otherwise)
  useEffect(() => {
    (async () => {
      try {
        const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
        // prefer Authorization Bearer token from supabase session
        const supabase = makeSupabase();
        let token: string | null = null;
        if (supabase) {
          try {
            const resp: any = await supabase.auth.getSession?.();
            token = resp?.data?.session?.access_token || null;
          } catch (_) { token = null; }
        }

        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        else {
          // no admin token -> mark unauthorized UI
          setUnauthorized(true);
          setLoading(false);
          return;
        }

        setLoading(true);
        const res = await fetch(`${API}/admin/users`, { headers });
        if (!res.ok) {
          if (res.status === 401) {
            setUnauthorized(true);
          }
          console.warn('Failed to fetch admin users', res.status);
          return;
        }
        const body = await res.json().catch(() => ({}));
        if (body?.users && Array.isArray(body.users)) {
          // map server rows into SystemUser shape conservatively
          const mapped = body.users.map((u: any) => ({
            id: u.id || String(Date.now()),
            name: u.email?.split('@')[0] || u.email || 'User',
            email: u.email || '',
            role: u.role === 'content_creator' ? 'contentCreator' : (u.role === 'student' ? 'user' : u.role),
            status: 'active',
            lastLogin: 'Unknown',
            joinedDate: 'Unknown'
          }));
          setSystemUsers(mapped);
        }
      } catch (e) {
        console.warn('admin users fetch failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Fetch roles, groups, activity when admin
  useEffect(() => {
    (async () => {
      try {
        const supabase = makeSupabase();
        let token: string | null = null;
        if (supabase) {
          try { const resp: any = await supabase.auth.getSession?.(); token = resp?.data?.session?.access_token || null; } catch (_) { token = null; }
        }
        const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
        if (!token) return; // cannot fetch admin data without token

        const headers: Record<string,string> = { 'Authorization': `Bearer ${token}` };

        // Roles
        try {
          const r = await fetch(`${API}/admin/roles`, { headers });
          if (r.status === 401) { setUnauthorized(true); return; }
          const body = await r.json().catch(() => ({}));
          if (body?.roles) {
            const mapped = body.roles.map((rr:any) => ({ id: rr.id || rr.name || String(Date.now()), name: rr.id || rr.name, description: rr.description || '' , permissions: [] , isCustom: false }));
            setPermissionRoles(mapped);
          }
        } catch (e) { console.warn('[roles] fetch failed', e); }

        // Groups
        try {
          const g = await fetch(`${API}/admin/groups`, { headers });
          if (g.status === 401) { setUnauthorized(true); return; }
          const body = await g.json().catch(() => ({}));
          if (body?.groups) {
            const mapped = body.groups.map((gg:any) => ({ id: gg.id, name: gg.name, userCount: gg.member_count || 0, createdAt: gg.created_at }));
            setGroups(mapped);
          }
        } catch (e) { console.warn('[groups] fetch failed', e); }

        // Activity
        try {
          const a = await fetch(`${API}/admin/activity`, { headers });
          if (a.status === 401) { setUnauthorized(true); return; }
          const body = await a.json().catch(() => ({}));
          if (body?.activity) {
            // map into activityRecords shape
            const mapped = (body.activity as any[]).map(act => ({ id: act.id, userId: act.user_id || '', userName: act.metadata?.userName || act.user_id || '', action: act.action, timestamp: act.created_at, ipAddress: act.metadata?.ip || '' }));
            // replace activityRecords via state setter - activityRecords was const, so use local set
            // Use existing toasts to show success
            // temporary: assign to a local state by setting toasts (we'll add state for activity)
            // Create dedicated activity state
            setActivity(mapped as any);
          }
        } catch (e) { console.warn('[activity] fetch failed', e); }

      } catch (e) {
        console.warn('admin auxiliary fetch failed', e);
      }
    })();
  }, [user]);

  

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
    (async () => {
      setLoading(true);
      const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
      const supabase = makeSupabase();
      let token: string | null = null;
      if (supabase) {
        try { const resp: any = await supabase.auth.getSession?.(); token = resp?.data?.session?.access_token || null; } catch(_) { token = null; }
      }
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      else { setUnauthorized(true); pushToast('error', 'Admin session required'); return; }

      try {
        const payload: any = { email: userData.email, role: userData.role || 'student' };
        if (userData.name) {
          const parts = String(userData.name).split(' ');
          payload.first_name = parts.slice(0,1).join(' ');
          payload.last_name = parts.slice(1).join(' ');
        }
        const res = await fetch(`${API}/admin/users`, { method: 'POST', headers, body: JSON.stringify(payload) });
        if (!res.ok) {
          const body = await res.json().catch(()=>({}));
          pushToast('error', body?.error || 'Failed to create user');
          return;
        }
        const body = await res.json().catch(()=>({}));
        const created = body?.user;
        if (created) {
          const mapped: SystemUser = { id: created.id || String(Date.now()), name: created.email.split('@')[0], email: created.email, role: created.role === 'content_creator' ? 'contentCreator' : (created.role === 'student' ? 'user' : created.role), status: 'active', lastLogin: 'Unknown', joinedDate: 'Unknown' };
          setSystemUsers((s) => [mapped, ...s]);
          pushToast('success', 'User created');
        }
      } catch (ex:any) {
        console.error('createUser failed', ex);
        pushToast('error', String(ex?.message || ex));
      } finally {
        setDisplayAddUser(false);
        setLoading(false);
      }
    })();
  };

  const modifyUser = (userId: string, changes: Partial<SystemUser>) => {
    (async () => {
      setActionLoading((s) => ({ ...s, [userId]: true }));
      const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
      const supabase = makeSupabase();
      let token: string | null = null;
      if (supabase) { try { const resp: any = await supabase.auth.getSession?.(); token = resp?.data?.session?.access_token || null; } catch(_) { token = null; } }
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      else { setUnauthorized(true); pushToast('error', 'Admin session required'); return; }

      try {
        const payload: any = {};
        if (changes.email) payload.email = changes.email;
        if (changes.role) payload.role = changes.role === 'contentCreator' ? 'content_creator' : changes.role;
        if (changes.name) {
          const parts = String(changes.name).split(' ');
          payload.first_name = parts.slice(0,1).join(' ');
          payload.last_name = parts.slice(1).join(' ');
        }
        const res = await fetch(`${API}/admin/users/${userId}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
        if (!res.ok) {
          const body = await res.json().catch(()=>({}));
          pushToast('error', body?.error || 'Failed to update user');
          return;
        }
        const body = await res.json().catch(()=>({}));
        const updated = body?.user;
        if (updated) {
          setSystemUsers(systemUsers.map(u => u.id === userId ? { ...u, name: (updated.first_name || updated.email?.split('@')[0]) as string, email: updated.email, role: updated.role === 'content_creator' ? 'contentCreator' : (updated.role === 'student' ? 'user' : updated.role) } : u));
          pushToast('success', 'User updated');
        }
      } catch (ex:any) {
        console.error('modifyUser failed', ex);
        pushToast('error', String(ex?.message || ex));
      } finally {
        setActionLoading((s) => ({ ...s, [userId]: false }));
        setDisplayEditUser(false);
        setActiveUser(null);
      }
    })();
  };

  // Update a user's role on the server (admin only) and update local state
  const updateUserRoleOnServer = async (userId: string, newRole: string) => {
    setActionLoading((s) => ({ ...s, [userId]: true }));
    try {
      const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
      const supabase = makeSupabase();
      let token: string | null = null;
      if (supabase) {
        try {
          const resp: any = await supabase.auth.getSession?.();
          token = resp?.data?.session?.access_token || null;
        } catch (_) { token = null; }
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      else { setUnauthorized(true); pushToast('error', 'Admin session required'); return; }

      const res = await fetch(`${API}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error || res.statusText || 'Failed to update role';
        pushToast('error', msg);
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (body?.user) {
        setSystemUsers(systemUsers.map(u => u.id === userId ? { ...u, role: body.user.role === 'content_creator' ? 'contentCreator' : (body.user.role === 'student' ? 'user' : body.user.role) } : u));
        pushToast('success', 'Role updated');
      }
    } catch (ex: any) {
      console.error('updateUserRoleOnServer failed', ex);
      pushToast('error', String(ex?.message || ex));
    } finally {
      setActionLoading((s) => ({ ...s, [userId]: false }));
    }
  };

  const removeUser = (userId: string) => {
    (async () => {
      if (!window.confirm("Confirm user deletion?")) return;
      setActionLoading((s) => ({ ...s, [userId]: true }));
      const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
      const supabase = makeSupabase();
      let token: string | null = null;
      if (supabase) { try { const resp: any = await supabase.auth.getSession?.(); token = resp?.data?.session?.access_token || null; } catch(_) { token = null; } }
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      else { setUnauthorized(true); pushToast('error', 'Admin session required'); return; }

      try {
        const res = await fetch(`${API}/admin/users/${userId}`, { method: 'DELETE', headers });
        if (!res.ok) {
          const body = await res.json().catch(()=>({}));
          pushToast('error', body?.error || 'Failed to delete user');
          return;
        }
        setSystemUsers(systemUsers.filter(u => u.id !== userId));
        pushToast('success', 'User removed');
      } catch (ex:any) {
        console.error('removeUser failed', ex);
        pushToast('error', String(ex?.message || ex));
      } finally {
        setActionLoading((s) => ({ ...s, [userId]: false }));
      }
    })();
  };

  const switchStatus = (userId: string) => {
    (async () => {
      setActionLoading((s) => ({ ...s, [userId]: true }));
      const target = systemUsers.find(u => u.id === userId);
      if (!target) return;
      const newStatus = target.status === 'active' ? 'inactive' : 'active';
      const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
      const supabase = makeSupabase();
      let token: string | null = null;
      if (supabase) { try { const resp: any = await supabase.auth.getSession?.(); token = resp?.data?.session?.access_token || null; } catch(_) { token = null; } }
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      else { setUnauthorized(true); pushToast('error', 'Admin session required'); return; }

      try {
        // Try to update status via admin API (store in metadata.status if users table supports metadata)
        const res = await fetch(`${API}/admin/users/${userId}`, { method: 'PUT', headers, body: JSON.stringify({ metadata: { status: newStatus } }) });
        if (!res.ok) {
          // fallback to local update
          setSystemUsers(systemUsers.map(u => u.id === userId ? { ...u, status: newStatus } : u));
          pushToast('success', 'Status updated (local fallback)');
          return;
        }
        const body = await res.json().catch(()=>({}));
        if (body?.user) {
          setSystemUsers(systemUsers.map(u => u.id === userId ? { ...u, status: newStatus } : u));
          pushToast('success', 'Status updated');
        }
      } catch (ex:any) {
        console.error('switchStatus failed', ex);
        // local fallback
        setSystemUsers(systemUsers.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        pushToast('success', 'Status updated (local fallback)');
      } finally {
        setActionLoading((s) => ({ ...s, [userId]: false }));
      }
    })();
  };

  function pushToast(type: 'success' | 'error', message: string) {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter(x => x.id !== id));
    }, 4000);
  }

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
      ...activity.map(log => [log.userName, log.action, log.timestamp, log.ipAddress])
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

  if (unauthorized) {
    return (
      <main className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <h2 className="text-2xl font-bold text-red-600">Unauthorized</h2>
            <p className="mt-4 text-gray-700">You must sign in as an administrator to access this section. Please sign in with an admin account.</p>
            <div className="mt-6">
              <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded">Sign in</a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Toasts */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map(t => (
            <div key={t.id} className={`px-4 py-2 rounded shadow ${t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
              {t.message}
            </div>
          ))}
        </div>
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
                              disabled={!!actionLoading[user.id] || loading}
                              title="Modify"
                            >
                              <Edit2 size={16} />
                            </button>
                            {user.role === 'user' && (
                              <button
                                onClick={async () => {
                                  try {
                                    const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
                                    const res = await fetch(`${API}/auth/request-role`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, requestedRole: 'instructor' }) });
                                    if (!res.ok) {
                                      const b = await res.json().catch(()=>({}));
                                      pushToast('error', b?.error || 'Failed to request role');
                                      return;
                                    }
                                    pushToast('success', 'Role request submitted');
                                  } catch (e:any) {
                                    console.error('request role failed', e);
                                    pushToast('error', String(e?.message || e));
                                  }
                                }}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                                disabled={!!actionLoading[user.id] || loading}
                                title="Request Instructor Role"
                              >
                                <UserPlus size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => switchStatus(user.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded"
                              disabled={!!actionLoading[user.id] || loading}
                              title={user.status === "active" ? "Disable" : "Enable"}
                            >
                              {user.status === "active" ? <XCircle size={16} /> : <CheckCircle size={16} />}
                            </button>
                            <button
                              onClick={() => removeUser(user.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              disabled={!!actionLoading[user.id] || loading}
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

          {/* ROLES TAB */}
          {currentTab === 'roles' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Roles & Permissions</h2>
                <button onClick={() => setDisplayAddRole(true)} className="px-3 py-2 bg-blue-600 text-white rounded-md">Add Role</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {permissionRoles.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{r.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{r.description}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => { setActiveRole(r); setDisplayAddRole(true); }} className="px-2 py-1 bg-yellow-100 rounded">Edit</button>
                            <button onClick={() => removeRole(r.id)} className="px-2 py-1 bg-red-100 rounded">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GROUPS TAB */}
          {currentTab === 'groups' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Groups</h2>
                <button onClick={() => setDisplayAddGroup(true)} className="px-3 py-2 bg-blue-600 text-white rounded-md">Create Group</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Group</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Members</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {groups.map(g => (
                      <tr key={g.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{g.name}</td>
                        <td className="px-4 py-3">{g.userCount}</td>
                        <td className="px-4 py-3">{g.createdAt}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => alert('Show members (not implemented)')} className="px-2 py-1 bg-gray-100 rounded">Members</button>
                            <button onClick={() => { if (g.userCount > 0) { alert('Cannot delete non-empty group'); } else removeGroup(g.id); }} className="px-2 py-1 bg-red-100 rounded">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {currentTab === 'activity' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Activity Log</h2>
                <div className="flex gap-2">
                  <button onClick={downloadActivityLog} className="px-3 py-2 bg-blue-600 text-white rounded-md">Export</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">When</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Admin/User</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {activity.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">{a.timestamp}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{a.userName || a.userId}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{a.action}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{a.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}