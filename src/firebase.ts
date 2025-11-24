import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  // Not configured in this environment; warn but allow build to continue.
  console.warn("Firebase not configured (VITE_FIREBASE_API_KEY missing)");
}

const app = !getApps().length ? initializeApp(firebaseConfig as any) : undefined;

export const auth = getAuth(app as any);
