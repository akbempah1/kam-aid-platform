"use client";
import ProtectedLayout from "../components/ProtectedLayout";
import { useState } from "react";
import { Database, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";

export default function MigratePage() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [results, setResults] = useState<{
    monthly: number; weekly: number; branchVisits: number; shortages: number; errors: string[];
  } | null>(null);

  const runMigration = async () => {
    setStatus("running");

    const monthlyReports = JSON.parse(localStorage.getItem("kam_aid_reports") || "[]");
    const weeklyReports = JSON.parse(localStorage.getItem("kam_aid_weekly_reports") || "[]");
    const branchVisits = JSON.parse(localStorage.getItem("kam_aid_branch_visits") || "[]");
    const shortagesReports = JSON.parse(localStorage.getItem("kam_aid_shortages") || "[]");

    const total = monthlyReports.length + weeklyReports.length + branchVisits.length + shortagesReports.length;
    if (total === 0) {
      setStatus("done");
      setResults({ monthly: 0, weekly: 0, branchVisits: 0, shortages: 0, errors: [] });
      return;
    }

    try {
      const res = await fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyReports, weeklyReports, branchVisits, shortagesReports }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Migration failed");
      setResults(data);
      setStatus("done");
    } catch (e: unknown) {
      setStatus("error");
      setResults({ monthly: 0, weekly: 0, branchVisits: 0, shortages: 0, errors: [String(e)] });
    }
  };

  const counts = {
    monthly: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("kam_aid_reports") || "[]").length : 0,
    weekly: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("kam_aid_weekly_reports") || "[]").length : 0,
    branch: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("kam_aid_branch_visits") || "[]").length : 0,
    shortages: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("kam_aid_shortages") || "[]").length : 0,
  };
  const total = counts.monthly + counts.weekly + counts.branch + counts.shortages;

  return (
    <ProtectedLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Migrate Data to Database</h1>
          <p className="text-slate-500">
            This will copy all your existing browser data into the PostgreSQL database so it is shared across devices and won&apos;t be lost.
          </p>
        </div>

        {/* What will be migrated */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Data found in this browser</h2>
          <div className="space-y-3">
            {[
              { label: "Monthly financial reports", count: counts.monthly },
              { label: "Weekly operating reports", count: counts.weekly },
              { label: "Branch visit reports", count: counts.branch },
              { label: "Shortage reports", count: counts.shortages },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-slate-600">{item.label}</span>
                <span className={`font-semibold ${item.count > 0 ? "text-sky-600" : "text-slate-400"}`}>
                  {item.count} record{item.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>

          {total === 0 && (
            <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              No local data found. Nothing to migrate.
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <div className={`rounded-2xl p-6 mb-6 border ${status === "done" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center gap-2 mb-3">
              {status === "done"
                ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                : <AlertTriangle className="w-5 h-5 text-red-500" />}
              <h3 className={`font-semibold ${status === "done" ? "text-emerald-800" : "text-red-800"}`}>
                {status === "done" ? "Migration complete" : "Migration encountered errors"}
              </h3>
            </div>
            <div className="text-sm space-y-1">
              <p className="text-slate-600">Monthly reports migrated: <strong>{results.monthly}</strong></p>
              <p className="text-slate-600">Weekly reports migrated: <strong>{results.weekly}</strong></p>
              <p className="text-slate-600">Branch visits migrated: <strong>{results.branchVisits}</strong></p>
              <p className="text-slate-600">Shortage reports migrated: <strong>{results.shortages}</strong></p>
            </div>
            {results.errors.length > 0 && (
              <div className="mt-3 text-sm text-red-700">
                <p className="font-semibold mb-1">Errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {results.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action */}
        <div className="flex gap-4">
          <button
            onClick={runMigration}
            disabled={status === "running" || total === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-white font-medium shadow-lg shadow-sky-500/25 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Database className="w-4 h-4" />
            {status === "running" ? "Migrating..." : "Run Migration"}
            {status === "idle" && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Your browser data will not be deleted after migration — it stays as a backup. You can run this migration multiple times safely; duplicate monthly reports (same month/year) will be skipped.
        </p>
      </div>
    </ProtectedLayout>
  );
}
