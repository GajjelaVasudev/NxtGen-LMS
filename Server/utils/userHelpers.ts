import { supabase } from "../supabaseClient.js";
import { REGISTERED_USERS } from "../routes/auth.js";

// Given a raw id (could be UUID, numeric demo id, or email), return a canonical UUID
export async function canonicalizeUserId(raw: string | undefined | null): Promise<string | null> {
  const key = String(raw || "").trim();
  if (!key) return null;

  // Email -> find or create
  if (key.includes("@")) {
    try {
      const { data, error } = await supabase.from("users").select("id, email, role").ilike("email", key).maybeSingle();
      if (error) {
        console.warn('[userHelpers] Supabase lookup by email error', { key, error });
      }
      if (data && data.id) return data.id as string;

      // If not found but matches demo user, create
      const demo = REGISTERED_USERS.find((u) => u.email.toLowerCase() === key.toLowerCase());
      if (demo) {
        try {
          const { data: created, error: createErr } = await supabase.from('users').insert([{ email: demo.email, role: demo.role }]).select('id').maybeSingle();
          if (createErr) console.warn('[userHelpers] failed to create demo DB user', { key, createErr });
          if (created && created.id) {
            console.log('[userHelpers] created DB user for demo', { email: demo.email, id: created.id });
            return created.id as string;
          }
        } catch (ex) {
          console.error('[userHelpers] exception creating demo DB user', ex);
        }
      }
      return null;
    } catch (ex) {
      console.error('[userHelpers] exception in email canonicalize', ex);
      return null;
    }
  }

  // UUID-like (contains '-') -> assume canonical
  if (key.includes("-")) return key;

  // Numeric/demo id (no hyphen): map to demo list if present and ensure DB row
  const demo = REGISTERED_USERS.find((u) => u.id === key || u.id === String(Number(key)));
  if (demo) {
    try {
      const { data, error } = await supabase.from('users').select('id').ilike('email', demo.email).maybeSingle();
      if (data && data.id) return data.id as string;
      const { data: created, error: createErr } = await supabase.from('users').insert([{ email: demo.email, role: demo.role }]).select('id').maybeSingle();
      if (createErr) console.warn('[userHelpers] failed to create DB user for demo numeric id', { key, createErr });
      if (created && created.id) {
        console.log('[userHelpers] created DB user for demo (numeric id mapping)', { demoId: key, email: demo.email, id: created.id });
        return created.id as string;
      }
    } catch (ex) {
      console.error('[userHelpers] exception creating/finding demo user', ex);
    }
  }

  // Unknown format — cannot canonicalize
  return null;
}

export default { canonicalizeUserId };
