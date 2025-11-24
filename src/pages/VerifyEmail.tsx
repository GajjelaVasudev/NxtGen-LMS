import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { login } = useAuth();
  const [status, setStatus] = useState<'pending'|'success'|'error'>('pending');
  const [message, setMessage] = useState<string>('Verifying...');

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(search);
      const token = params.get('token');
      if (!token) {
        setStatus('error'); setMessage('No verification token provided.'); return;
      }
      try {
        const API = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_URL as string) || '/api';
        const res = await fetch(`${API}/auth/verify-email`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token })
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus('error'); setMessage(body?.error || 'Verification failed'); return;
        }
        if (body?.user) {
          try { if (body?.created) localStorage.setItem('nxtgen_justSignedUp', '1'); } catch {}
          await login(body.user);
          setStatus('success'); setMessage('Email verified — redirecting to your dashboard');
          setTimeout(() => navigate('/app'), 1200);
          return;
        }
        setStatus('error'); setMessage('No user returned after verification');
      } catch (ex) {
        console.error(ex);
        setStatus('error'); setMessage('Unexpected error during verification');
      }
    })();
  }, [search, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="p-8 bg-white rounded shadow">
        <h2 className="text-lg font-bold mb-2">Email verification</h2>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}
