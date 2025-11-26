import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabase: ReturnType<typeof createClient> | null = null;

if (url && key) {
  supabase = createClient(url, key, {
    auth: {
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  });
}

export { supabase };

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session || null;
    if (session?.access_token) return session.access_token;

    const refresh = session?.refresh_token || null;
    if (refresh) {
      try {
        const { data: setData } = await supabase.auth.setSession({ refresh_token: refresh });
        return setData?.session?.access_token || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function onAuthChange(cb: (event: string, session: any) => void) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session));
  return () => { data?.unsubscribe?.(); };
}
