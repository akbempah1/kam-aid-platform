"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { Loader2 } from "lucide-react";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Load saved preference after mount
  useEffect(() => {
    try {
      if (localStorage.getItem("sidebar-collapsed") === "true") setCollapsed(true);
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-sky-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
