import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth, Role } from "@/contexts/AuthContext";

export default function RoleGuard({
  roles,
  children,
  fallbackPath = "/",
}: {
  roles: Role | Role[];
  children: JSX.Element;
  fallbackPath?: string;
}) {
  const { hasRole } = useAuth();
  if (!hasRole(roles)) return <Navigate to={fallbackPath} replace />;
  return children;
}