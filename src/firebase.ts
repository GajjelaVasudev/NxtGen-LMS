import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// If not configured, avoid initializing Firebase to prevent runtime errors
// (this commonly happens in local/dev without env vars). Export a flag
// so callers can gracefully degrade behavior.
const configured = !!firebaseConfig.apiKey;
if (!configured) {
  console.warn("Firebase not configured (VITE_FIREBASE_API_KEY missing)");
}

let app: any = undefined;
let _auth: any = null;
if (configured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig as any) : undefined;
    _auth = getAuth(app as any);
  } catch (ex) {
    console.warn('[firebase] initialization failed', ex?.message || ex);
    _auth = null;
  }
}

export const firebaseConfigured = configured && !!_auth;
export const auth = _auth;
