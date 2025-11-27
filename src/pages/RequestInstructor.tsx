import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const API = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_URL as string) || '/api';

export default function RequestInstructor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const state: any = (location as any).state;
    if (state?.email) setEmail(state.email);
    if (user) {
      setEmail(user.email || '');
      setName(user.name || '');
    }
  }, [location, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) return setError('Email required');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/request-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, requestedRole: 'instructor', reason, bio, portfolio }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
      }
      setMessage('Your request has been submitted. An administrator will review and respond.');
      setTimeout(() => navigate('/app'), 2200);
    } catch (ex: any) {
      setError(ex?.message || String(ex));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-4">Request Instructor Role</h2>
        <p className="text-sm text-gray-600 mb-4">Fill out this short form so administrators can review your request to become an instructor.</p>

        {message ? <div className="p-4 bg-green-50 text-green-800 rounded mb-4">{message}</div> : null}
        {error ? <div className="p-4 bg-red-50 text-red-800 rounded mb-4">{error}</div> : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block">Full Name</label>
            <input className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block">Email</label>
            <input className="w-full border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block">Short Bio / Qualifications</label>
            <textarea className="w-full border rounded px-3 py-2" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block">Portfolio / Website (optional)</label>
            <input className="w-full border rounded px-3 py-2" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block">Why do you want to be an instructor?</label>
            <textarea className="w-full border rounded px-3 py-2" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Submitting...' : 'Submit Request'}</button>
            <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border rounded">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
