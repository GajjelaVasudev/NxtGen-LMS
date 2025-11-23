import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Discussions removed — redirect to Inbox
export default function Discussions() {
  const navigate = useNavigate();
  useEffect(() => {
    // Redirect users to the Inbox where notifications and private messages are handled
    navigate("/app/inbox", { replace: true });
  }, [navigate]);
  return null;
}
