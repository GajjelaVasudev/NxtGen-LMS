import React from "react";
import { NavLink, useMatch } from "react-router-dom";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  badge?: number;
}

export default function NavItem({ icon, label, to, badge }: NavItemProps) {
  const match = useMatch({ path: to, end: to === '/app' });
  const isActive = !!match;

  return (
    <NavLink to={to} className={`relative group block`}> 
      {/* left accent bar */}
      <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-9 rounded-r-full transition-colors ${isActive ? 'bg-yellow-400' : 'bg-transparent'}`} style={{ width: 4 }} aria-hidden></span>

      <div
        className={`flex items-center justify-between gap-3 pl-6 pr-3 py-3 rounded-lg text-sm font-medium transition-all ${
          isActive ? 'bg-white/3 shadow-sm' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 flex items-center justify-center rounded-md shrink-0 transition-all ${
            isActive ? 'bg-yellow-400 text-slate-900' : 'bg-transparent text-[#6B7280]'
          }`}>
            {icon}
          </div>
          <span className={`truncate ${isActive ? 'font-semibold text-slate-900' : ''}`}>{label}</span>
        </div>
        {badge && badge > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>

      
    </NavLink>
  );
}