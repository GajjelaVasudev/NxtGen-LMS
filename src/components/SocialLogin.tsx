import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const SocialLogin = ({ text = "Or login with" }: { text?: string }) => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const doSocial = async (provider: string) => {
    // Open OAuth popup to server endpoint which will postMessage back the user
    const API = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_URL as string) || "/api";
    const url = `${API}/auth/google`;

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2.5;

    const popup = window.open(
      url,
      "oauth_popup",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    );

    if (!popup) {
      alert("Unable to open popup. Please allow popups for this site.");
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      // ensure message origin is same origin (server uses BASE_URL env which should match client origin)
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data?.type !== "oauth") return;
      window.removeEventListener("message", handleMessage);
      try {
        if (data.error) {
          alert("Social login failed: " + data.error);
          return;
        }
        const user = data.user;
        if (!user) {
          alert("Social login failed: no user returned");
          return;
        }
        login(user);
        navigate("/app");
      } finally {
        try {
          popup.close();
        } catch (e) {}
      }
    };

    window.addEventListener("message", handleMessage);

    // fallback: if popup closed without message, cleanup
    const poll = setInterval(() => {
      if (popup.closed) {
        clearInterval(poll);
        window.removeEventListener("message", handleMessage);
      }
    }, 500);
  };

  return (
    <>
      <div className="flex items-center gap-4 w-full">
        <div className="h-[0.5px] flex-1 bg-[#313131] opacity-25"></div>
        <div className="text-[#313131] font-poppins text-sm opacity-50">{text}</div>
        <div className="h-[0.5px] flex-1 bg-[#313131] opacity-25"></div>
      </div>

      <div className="flex items-start w-full">
        <button onClick={() => doSocial("google")} className="w-full flex items-center justify-center py-4 px-6 border border-[#515DEF] rounded hover:bg-gray-50 transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 12.0733C24 5.40554 18.6274 0 12 0C5.37258 0 0 5.40544 0 12.0733C0 18.0994 4.38823 23.0943 10.125 24V15.5633H7.07812V12.0733H10.125V9.41343C10.125 6.38748 11.9166 4.71615 14.6575 4.71615C15.9705 4.71615 17.3438 4.95203 17.3438 4.95203V7.92313H15.8306C14.3398 7.92313 13.875 8.85384 13.875 9.80857V12.0733H17.2031L16.6711 15.5633H13.875V24C19.6118 23.0943 24 18.0995 24 12.0733Z" fill="#1877F2"/>
          </svg>
        </button>
      </div>
    </>
  );
};