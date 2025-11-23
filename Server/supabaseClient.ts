import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from current working directory first (common case)
dotenv.config();

// If the Supabase vars are not present, attempt to load the .env located next to this file (Server/.env)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
  const envPath = path.join(__dirname, '.env');
  dotenv.config({ path: envPath });
}

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !(serviceRole || anon)) {
  throw new Error(
    'Supabase URL or Key missing. Checked project .env and Server/.env. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(url, serviceRole || anon);
