export const Logo = ({ className = "" }: { className?: string }) => {
  // Include both landing-scoped classes (text-brand-*) and global Tailwind classes (text-nxtgen-*)
  // so the same visual appears inside .landing-root and in the dashboard/header/sidebar.
  return (
    <div className={`text-4xl md:text-5xl lg:text-6xl font-bold ${className}`}>
      <span className="text-brand-blue text-nxtgen-blue">Nxt</span>
      <span className="text-brand-yellow text-nxtgen-yellow text-[#FFCC00]">Gen</span>
    </div>
  );
};
