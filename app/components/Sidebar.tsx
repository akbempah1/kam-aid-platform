"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Pill, LayoutDashboard, Calendar, ClipboardCheck, Package, History, Settings, Home, LogOut, User, Database, Award } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home, section: "OVERVIEW" },
  { href: "/monthly", label: "Monthly Financial", icon: LayoutDashboard, section: "REPORTS" },
  { href: "/weekly", label: "Weekly Report", icon: Calendar, section: "REPORTS" },
  { href: "/branch-visit", label: "Branch Visit", icon: ClipboardCheck, section: "REPORTS" },
  { href: "/shortages", label: "Shortages", icon: Package, section: "REPORTS" },
  { href: "/bonus", label: "Performance Bonus", icon: Award, section: "REPORTS" },
  { href: "/history", label: "History", icon: History, section: "DATA" },
  { href: "/migrate", label: "Migrate Data", icon: Database, section: "DATA" },
  { href: "/settings", label: "Settings", icon: Settings, section: "DATA" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Group items by section
  const sections = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen p-6 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/25">
          <Pill className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-slate-800">KAM AID</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-4">
              {section}
            </p>
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-sky-50 text-sky-600 font-medium"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-sky-500" : "text-slate-400"}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="pt-6 border-t border-slate-200">
        {session?.user && (
          <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-slate-50 rounded-xl">
            <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-blue-500 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{session.user.name}</p>
              <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}