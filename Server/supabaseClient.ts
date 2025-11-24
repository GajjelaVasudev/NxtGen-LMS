import { createClient } from '@supabase/supabase-js';
import './loadEnv.js';
import path from 'path';
import { fileURLToPath } from 'url';

// loadEnv runs automatically on import; ensure the SUPABASE-specific Server/.env
// is also considered (loadEnv already reads Server/.env located next to this file).
// No further dotenv.config() calls are necessary and we avoid overwriting existing env vars.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !(serviceRole || anon)) {
  throw new Error(
    'Supabase URL or Key missing. Checked project .env and Server/.env. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(url, serviceRole || anon);
