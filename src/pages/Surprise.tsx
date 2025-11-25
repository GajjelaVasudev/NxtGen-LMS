import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';

/*
  Surprise (memory vault) page
  - Loads shared row from Supabase table `special_surprise` (id='princess')
  - Shows message (preserve line breaks) and single shared photo (Supabase Storage)
  - Allows editing and photo replacement for emails listed in VITE_SURPRISE_ALLOWED_EDITORS
*/

type SurpriseRow = {
  id: string;
  message: string | null;
  photo_url: string | null;
  updated_by: string | null;
  updated_at: string | null;
};

function formatDate(ts?: string | null) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch { return ts; }
}

export default function Surprise() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [row, setRow] = useState<SurpriseRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const fileRef = useRef<HTMLInputElement | null>(null);

  // Create Supabase client from Vite env vars
  const SUPA_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const allowedRaw = (import.meta.env.VITE_SURPRISE_ALLOWED_EDITORS as string | undefined) || '';
  const allowedEditors = allowedRaw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

  const isEditor = !!user?.email && allowedEditors.includes(user.email.toLowerCase());

  function createSupabaseClient(): SupabaseClient | null {
    if (!SUPA_URL || !SUPA_KEY) {
      console.warn('Surprise: missing Supabase VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
      return null;
    }
    return createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      const supabase = createSupabaseClient();
      if (!supabase) {
        if (mounted) {
          setError('Configuration missing. Surprise is unavailable.');
          setLoading(false);
        }
        return;
      }

      try {
        // Try to fetch the row
        const { data, error: fetchErr } = await supabase.from<SurpriseRow>('special_surprise').select('*').eq('id', 'princess').maybeSingle();
        if (fetchErr) {
          console.error('[surprise] fetch error', fetchErr);
          throw fetchErr;
        }

        if (!data) {
          // create default row
          const defaultMsg = `Hey princess,\nYou make everything in my life beautiful.\nI’m lucky to love you every day.\n\nForever ours ❤️`;
          const { data: insData, error: insErr } = await supabase.from('special_surprise').upsert({ id: 'princess', message: defaultMsg, photo_url: null, updated_by: null }).select().maybeSingle();
          if (insErr) {
            console.error('[surprise] insert error', insErr);
            throw insErr;
          }
          if (mounted) setRow(insData as SurpriseRow);
        } else {
          if (mounted) setRow(data as SurpriseRow);
        }
      } catch (ex) {
        console.error('Surprise load failed', ex);
        if (mounted) setError('Could not load surprise.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // handle auto-unlock via route state
  useEffect(() => {
    const anyState = (location as any).state;
    if (anyState && anyState.autoUnlock) {
      // no-op for now; access to this route is sufficient
    }
  }, [location]);

  async function saveMessage() {
    const supabase = createSupabaseClient();
    if (!supabase) return setError('Supabase not configured');
    try {
      setLoading(true);
      const payload = {
        id: 'princess',
        message: editText,
        updated_by: user?.email || 'unknown',
        updated_at: new Date().toISOString(),
      };
      const { data, error: upErr } = await supabase.from('special_surprise').upsert(payload).select().maybeSingle();
      if (upErr) {
        console.error('[surprise] update message error', upErr);
        setError('Failed to save message');
      } else {
        setRow(data as SurpriseRow);
        setEditing(false);
      }
    } catch (ex) {
      console.error(ex);
      setError('Failed to save message');
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const supabase = createSupabaseClient();
    if (!supabase) return setError('Supabase not configured');
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const path = 'princess/main.jpg';
      const bucket = 'surprise-photos';
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (upErr) {
        console.error('[surprise] storage upload error', upErr);
        setError('Photo upload failed');
        return;
      }
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = (publicData as any)?.publicUrl || null;
      // save url to row
      const { data: rowData, error: rowErr } = await supabase.from('special_surprise').upsert({ id: 'princess', photo_url: publicUrl, updated_by: user?.email || null, updated_at: new Date().toISOString() }).select().maybeSingle();
      if (rowErr) {
        console.error('[surprise] update photo url error', rowErr);
        setError('Failed to attach photo');
      } else {
        setRow(rowData as SurpriseRow);
      }
    } catch (ex) {
      console.error(ex);
      setError('Upload failed');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Preparing your surprise…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  const message = row?.message || '';
  const photoUrl = row?.photo_url || '';

  return (
    <div className="surprise-page min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-pink-50 via-white to-rose-50 p-6 relative overflow-hidden">
      <div className="max-w-4xl w-full bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-6 md:p-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-extrabold text-rose-600">For My Princess</h1>
          <div className="flex gap-3">
            <button onClick={() => navigate('/')} className="px-4 py-2 rounded-lg border border-pink-200 text-pink-600 bg-white">Close</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-6">
          <div className="rounded-xl overflow-hidden shadow-lg bg-white p-4 flex items-center justify-center">
            {photoUrl ? (
              <img src={photoUrl} alt="Special" className="w-full h-64 object-cover rounded-md" />
            ) : (
              <div className="text-center text-gray-500">
                <div className="mb-3">No special photo yet</div>
                {isEditor && (
                  <div>
                    <label className="surprise-btn inline-flex items-center gap-2 cursor-pointer">
                      Change photo
                      <input ref={fileRef} onChange={handleFile} type="file" accept="image/*" className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-6 bg-pink-50 rounded-xl border border-pink-100 relative overflow-hidden">
              <h3 className="text-xl font-semibold text-rose-600">A love note</h3>
              {!editing ? (
                <div>
                  <pre className="whitespace-pre-wrap mt-3 text-gray-700">{message}</pre>
                  <div className="mt-3 text-sm text-gray-500">{row?.updated_by ? `Last updated by ${row.updated_by} at ${formatDate(row.updated_at)}` : ''}</div>
                  {isEditor && (
                    <div className="mt-4">
                      <button onClick={() => { setEditText(message); setEditing(true); }} className="surprise-btn">Edit message</button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={8} className="w-full p-3 rounded-md border" />
                  <div className="mt-3 flex gap-3">
                    <button onClick={saveMessage} className="surprise-btn">Save</button>
                    <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-md border">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
