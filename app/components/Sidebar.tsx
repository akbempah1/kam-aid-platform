"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Pill, LayoutDashboard, Calendar, ClipboardCheck, Package,
  History, Settings, Home, LogOut, User, Database, Award,
  ChevronLeft, ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/",             label: "Dashboard",         icon: Home,           section: "OVERVIEW" },
  { href: "/monthly",      label: "Monthly Financial", icon: LayoutDashboard, section: "REPORTS" },
  { href: "/weekly",       label: "Weekly Report",     icon: Calendar,        section: "REPORTS" },
  { href: "/branch-visit", label: "Branch Visit",      icon: ClipboardCheck,  section: "REPORTS" },
  { href: "/shortages",    label: "Shortages",         icon: Package,         section: "REPORTS" },
  { href: "/bonus",        label: "Performance Bonus", icon: Award,           section: "REPORTS" },
  { href: "/history",      label: "History",           icon: History,         section: "DATA" },
  { href: "/migrate",      label: "Migrate Data",      icon: Database,        section: "DATA" },
  { href: "/settings",     label: "Settings",          icon: Settings,        section: "DATA" },
];

export default function Sidebar({ collapsed, onToggle, onLinkClick }: { collapsed: boolean; onToggle: () => void; onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const sections = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  return (
    <aside
      className={`relative flex flex-col bg-white border-r border-slate-200 min-h-screen transition-all duration-300 ${
        collapsed ? "w-16 p-3" : "w-64 p-6"
      }`}
    >
      {/* Toggle button on right edge */}
      <button
        onClick={onToggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-7 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md hover:border-slate-300 transition-all z-10 text-slate-400 hover:text-slate-600"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Logo */}
      <div className={`flex items-center mb-10 ${collapsed ? "justify-center" : "gap-3"}`}>
        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/25 shrink-0">
          <Pill className="w-5 h-5 text-white" />
        </div>
        {!collapsed && <span className="text-xl font-bold text-slate-800">KAM AID</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="mb-6">
            {!collapsed && (
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-4">
                {section}
              </p>
            )}
            {collapsed && <div className="mb-2 border-t border-slate-100" />}
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center py-3 rounded-xl transition-all ${
                      collapsed ? "justify-center px-2" : "gap-3 px-4"
                    } ${
                      isActive
                        ? "bg-sky-50 text-sky-600 font-medium"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-sky-500" : "text-slate-400"}`} />
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="pt-4 border-t border-slate-200">
        {session?.user && (
          collapsed ? (
            <div className="flex justify-center mb-2">
              <div
                className="w-9 h-9 bg-gradient-to-br from-sky-400 to-blue-500 rounded-lg flex items-center justify-center"
                title={session.user.name ?? ""}
              >
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-slate-50 rounded-xl">
              <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-blue-500 rounded-lg flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{session.user.name}</p>
                <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
              </div>
            </div>
          )
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Sign Out" : undefined}
          className={`flex items-center py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all w-full ${
            collapsed ? "justify-center px-2" : "gap-3 px-4"
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
