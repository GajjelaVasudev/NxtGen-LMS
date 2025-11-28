import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { auth } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export const SocialLogin = ({ text = "Or login using" }: { text?: string }) => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const doSocial = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      const email = fbUser?.email;
      const name = fbUser?.displayName;

      if (!email) {
        alert("Google sign-in did not return an email address");
        return;
      }

      // Get ID token from Firebase client and post to server to obtain canonical user
      try {
        const idToken = await fbUser.getIdToken();
        const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
        const resp = await fetch(`${API}/auth/firebase-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (resp.ok) {
          const body = await resp.json().catch(() => ({}));
          if (body?.user) {
            // If server reports the user was just created, set a transient flag so Overview shows a welcome message
            try {
              if (body.created) localStorage.setItem('nxtgen_justSignedUp', '1');
            } catch {}
            await login(body.user);
            window.location.href = "/app";
            return;
          }
        }
      } catch (err) {
        console.warn('firebase-login failed, falling back to client login', err);
      }

      // Fallback to client-side login/canonicalization
      await login({ email, name });
      window.location.href = "/app";
    } catch (err: any) {
      console.error("Firebase social login failed:", err);
      alert("Google sign-in failed: " + (err?.message || String(err)));
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 w-full">
        <div className="h-[0.5px] flex-1 bg-[#313131] opacity-25"></div>
        <div className="text-[#313131] font-poppins text-sm opacity-50">{text}</div>
        <div className="h-[0.5px] flex-1 bg-[#313131] opacity-25"></div>
      </div>

      <div className="flex items-start w-full mt-3">
        <button
          onClick={() => doSocial()}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-[#515DEF] rounded-lg hover:bg-gray-50 transition-colors shadow-sm mt-2"
          aria-label="Continue with Google"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M21.35 11.1h-9.18v2.92h5.26c-.23 1.48-1.53 4.34-5.26 4.34-3.16 0-5.74-2.6-5.74-5.8s2.58-5.8 5.74-5.8c1.8 0 3.01.77 3.7 1.43l2.52-2.44C17.27 3.18 15.4 2.2 12.17 2.2 6.86 2.2 2.6 6.58 2.6 12s4.26 9.8 9.57 9.8c5.52 0 9.17-3.86 9.17-9.5 0-.64-.07-1.12-.0-1.4z" fill="#4285F4"/>
            <path d="M3.88 7.64l2.9 2.12C7.3 8.2 9.63 6.8 12.17 6.8c1.8 0 3.01.77 3.7 1.43l2.52-2.44C17.27 3.18 15.4 2.2 12.17 2.2 8.3 2.2 5.11 4.4 3.88 7.64z" fill="#34A853"/>
            <path d="M12.17 21.8c3.23 0 5.1-1 6.33-2.5l-3.06-2.38c-.88.6-1.98.95-3.27.95-3.73 0-5.02-2.86-5.26-4.34l-2.91 2.24C6.43 19.2 8.85 21.8 12.17 21.8z" fill="#FBBC05"/>
            <path d="M21.35 11.1h-9.18v2.92h5.26c-.23 1.48-1.53 4.34-5.26 4.34-3.16 0-5.74-2.6-5.74-5.8 0-.34.03-.68.08-1L3.88 7.64C3.62 8.28 3.5 8.96 3.5 9.68 3.5 14.1 7.76 18.5 13.07 18.5c3.73 0 6.38-1.76 8.28-4.02.0-.2.0-.37.0-.5z" fill="none"/>
          </svg>
          <span className="text-sm font-medium text-[#313131]">Continue with Google</span>
        </button>
      </div>
    </>
  );
};