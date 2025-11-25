import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

function makeSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase may place the recovery token in the query string or the URL hash.
    try {
      const params = new URLSearchParams(window.location.search);
      let access = params.get('access_token') || params.get('token') || params.get('oobCode');
      if (!access && window.location.hash) {
        const hash = window.location.hash.replace(/^#/, '');
        const hparams = new URLSearchParams(hash);
        access = hparams.get('access_token') || hparams.get('token') || hparams.get('oobCode');
      }
      if (access) setToken(access);
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!token) return setStatus('Missing token. Use the link from your email.');
    if (!password || password.length < 6) return setStatus('Password must be at least 6 characters');
    if (password !== confirm) return setStatus('Passwords do not match');

    setLoading(true);
    try {
      const supabase = makeSupabase();
      if (!supabase) throw new Error('Missing Supabase configuration');

      // Establish a temporary session using the access token, then update the user's password.
      await supabase.auth.setSession({ access_token: token });
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setStatus('Password updated. You can now log in with your new password.');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: any) {
      console.error('Reset password failed', err);
      setStatus(err?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800">Set a New Password</h1>
        <p className="mt-2 text-sm text-gray-600">Enter a new password to update your account.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Confirm password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="w-full px-4 py-3 border rounded-lg" />
          </div>

          <div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700">
              {loading ? 'Saving…' : 'Save new password'}
            </button>
          </div>
        </form>

        {status && <div className="mt-4 text-sm text-gray-700">{status}</div>}

        <div className="mt-6 text-sm text-gray-600">
          <Link to="/login" className="text-rose-600 hover:underline">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
