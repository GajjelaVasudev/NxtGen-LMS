import React from "react";
import { NavLink } from "react-router-dom";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  badge?: number;
}

export default function NavItem({ icon, label, to, badge }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-brand text-white"
            : "text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#374151]"
        }`
      }
    >
      <div className="flex items-center gap-3">
        <span className="w-5 h-5">{icon}</span>
        <span>{label}</span>
      </div>
      {badge && badge > 0 && (
        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </NavLink>
  );
}