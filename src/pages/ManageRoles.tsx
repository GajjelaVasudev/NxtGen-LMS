import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmModal from '@/components/ConfirmModal';
import { getAccessToken } from '@/utils/supabaseBrowser';

function makeSupabase() {
  return {
    auth: {
      getSession: async () => {
        const token = await getAccessToken();
        return { data: { session: token ? { access_token: token } : null } } as any;
      }
    }
  };
}

type RoleRequest = {
  email: string;
  requestedRole: string;
  name?: string;
  details?: { reason?: string; bio?: string; portfolio?: string } | null;
};

export default function ManageRoles() {
  const { user } = useAuth();
  const [unauthorized, setUnauthorized] = useState(false);
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [confirmActionType, setConfirmActionType] = useState<'approve' | 'deny' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Try to fetch using current supabase session token first, else use env secret
    (async () => {
      const supabase = makeSupabase();
      let token: string | null = null;
      if (supabase) {
        try {
          const resp: any = await supabase.auth.getSession?.();
          token = resp?.data?.session?.access_token || null;
        } catch (_) {
          try {
            // fallback to older SDK method
            const r: any = await (supabase as any).auth.getUser?.();
            token = r?.data?.user?.id || null;
          } catch (_) { token = null; }
        }
      }
      if (token) {
        fetchRequests(undefined, token);
        return;
      }
      // No bearer token available. If the client-side auth context indicates
      // this user is an admin (demo flow), allow the page to render in read-only
      // mode (requests will be empty). Otherwise mark unauthorized.
      if (user && (user as any).role === 'admin') {
        setUnauthorized(false);
        setRequests([]);
        return;
      }
      setUnauthorized(true);
    })();
  }, []);

  async function fetchRequests(secret?: string, bearerToken?: string | null) {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`;
      else { setUnauthorized(true); setRequests([]); setLoading(false); return; }

      const res = await fetch('/api/auth/role-requests', { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || `Failed to load requests (${res.status})`);
        setRequests([]);
      } else {
        const body = await res.json();
        setRequests(body?.requests || []);
      }
    } catch (ex: any) {
      setError(String(ex?.message || ex));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  async function performAction(email: string, action: 'approve' | 'deny') {
    setActionLoading((s) => ({ ...s, [email]: true }));
    try {
      const supabase = makeSupabase();
      let token: string | null = null;
      if (supabase) {
        try {
          const resp: any = await supabase.auth.getSession?.();
          token = resp?.data?.session?.access_token || null;
        } catch (_) { token = null; }
      }

      const endpoint = action === 'approve' ? '/api/auth/approve-role' : '/api/auth/deny-role';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      else { setUnauthorized(true); return alert('Admin session required to approve/deny requests'); }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert('Action failed: ' + (body?.error || res.statusText));
        return;
      }
      // remove from list and show success message
      setRequests((r) => r.filter((q) => q.email.toLowerCase() !== email.toLowerCase()));
      setSuccessMessage(`Successfully ${action}d role request for ${email}`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (ex: any) {
      console.error('role action failed', ex);
      alert('Action failed: ' + String(ex?.message || ex));
    } finally {
      setActionLoading((s) => ({ ...s, [email]: false }));
    }
  }

  function openConfirm(email: string, action: 'approve' | 'deny') {
    setConfirmEmail(email);
    setConfirmActionType(action);
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!confirmEmail || !confirmActionType) return;
    setConfirmOpen(false);
    await performAction(confirmEmail, confirmActionType);
    setConfirmEmail(null);
    setConfirmActionType(null);
  }
  if (unauthorized) {
    return (
      <main className="flex-1 p-6 min-h-0 overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <h2 className="text-2xl font-bold text-red-600">Unauthorized</h2>
            <p className="mt-4 text-gray-700">You must sign in as an administrator to manage role requests. Please sign in with an admin account.</p>
            <div className="mt-6">
              <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded">Sign in</a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 min-h-0 overflow-y-auto bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Roles</h1>
            <p className="text-sm text-gray-600 mt-1">Review and approve role elevation requests from users.</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Signed in as</div>
            <div className="font-medium">{user?.email || 'Unknown'}</div>
          </div>
        </div>

        <div className="mb-4 p-4 rounded border bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-700">Pending requests load automatically when you are signed in as an administrator.</p>
              <p className="text-sm text-gray-500">If you see no requests, ensure you are signed in and have the Admin role.</p>
            </div>
          </div>
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Pending Role Requests</h2>
          {loading && <div className="text-sm text-gray-500">Loading requests…</div>}
          {successMessage && <div className="mb-3 text-sm text-green-700">{successMessage}</div>}
          {!loading && requests.length === 0 && (
            <div className="text-sm text-gray-600">No pending requests.</div>
          )}

          {!loading && requests.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left text-sm text-gray-600 border-b">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Requested Role</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.email} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3 text-sm">{r.name || r.email.split('@')[0]}</td>
                      <td className="px-3 py-3 text-sm">{r.email}</td>
                      <td className="px-3 py-3 text-sm">
                        <div>{r.requestedRole}</div>
                        {r.details && (
                          <div className="mt-2 text-xs text-gray-600">
                            {r.details.reason && <div><strong>Reason:</strong> {r.details.reason}</div>}
                            {r.details.bio && <div><strong>Bio:</strong> {r.details.bio}</div>}
                            {r.details.portfolio && <div><strong>Portfolio:</strong> <a href={r.details.portfolio} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">Link</a></div>}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openConfirm(r.email, 'approve')}
                            disabled={!!actionLoading[r.email]}
                            className="px-3 py-1 bg-green-600 text-white rounded-md"
                          >
                            {actionLoading[r.email] ? '…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => openConfirm(r.email, 'deny')}
                            disabled={!!actionLoading[r.email]}
                            className="px-3 py-1 bg-red-600 text-white rounded-md"
                          >
                            {actionLoading[r.email] ? '…' : 'Deny'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {confirmOpen && (
        <ConfirmModal
          title={confirmActionType === 'approve' ? 'Approve Role Request' : 'Deny Role Request'}
          message={
            <div>
              Are you sure you want to <strong>{confirmActionType}</strong> the role request for <strong>{confirmEmail}</strong>?
            </div>
          }
          confirmText={confirmActionType === 'approve' ? 'Approve' : 'Deny'}
          cancelText="Cancel"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmOpen(false)}
          loading={false}
        />
      )}
    </main>
  );
}
