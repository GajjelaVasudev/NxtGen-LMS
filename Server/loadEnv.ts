import fs from 'fs';
import path from 'path';
import { parse } from 'dotenv';
import { fileURLToPath } from 'url';

function loadEnvFileIfExists(envFilePath: string) {
  try {
    if (!fs.existsSync(envFilePath)) return;
    const content = fs.readFileSync(envFilePath, { encoding: 'utf8' });
    const parsed = parse(content);
    for (const [k, v] of Object.entries(parsed)) {
      // Only set the env var if it is not already present in process.env
      if (typeof process.env[k] === 'undefined') {
        process.env[k] = v;
      }
    }
  } catch (ex) {
    // Don't crash the process for env loading issues; log and continue
    try { console.warn('[loadEnv] failed to load', envFilePath, ex); } catch (_) {}
  }
}

export function loadEnv() {
  // Load project root .env and Server/.env, but never overwrite existing process.env values
  try {
    const cwd = process.cwd();
    loadEnvFileIfExists(path.join(cwd, '.env'));

    // Also load Server/.env located next to this file if present
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    loadEnvFileIfExists(path.join(__dirname, '.env'));
  } catch (ex) {
    try { console.warn('[loadEnv] unexpected error', ex); } catch (_) {}
  }
}

// Auto-run when imported to ensure behavior is applied early
loadEnv();

export default loadEnv;
