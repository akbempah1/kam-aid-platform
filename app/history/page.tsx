"use client";
import ProtectedLayout from "../components/ProtectedLayout";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, Calendar, LayoutDashboard, MapPin, Package } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type MonthlyReport = {
  id: number;
  month: number;
  year: number;
  totals: { totalSales: number; netProfit: number };
  createdAt: string;
};

type WeeklyReport = {
  id: number;
  weekStart: string;
  weekEnd: string;
  totals: { grandTotalSales: number; totalExpenses: number };
  createdAt: string;
};

type BranchVisitReport = {
  id: number;
  reportType: "single" | "consolidated";
  branch: string;
  visitDate: string;
  visitedBy: string;
  stats: { overall: { complianceRate: number } };
  createdAt: string;
};

type ShortagesReport = {
  id: number;
  reportDate: string;
  reportedBy: string;
  shortages: any[];
  stats: { total: number; critical: number };
  createdAt: string;
};

export default function HistoryPage() {
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [branchVisits, setBranchVisits] = useState<BranchVisitReport[]>([]);
  const [shortagesReports, setShortagesReports] = useState<ShortagesReport[]>([]);
  const [activeTab, setActiveTab] = useState<"monthly" | "weekly" | "branch" | "shortages">("monthly");
  const router = useRouter();

  // Load all reports from localStorage
  useEffect(() => {
    const savedMonthly = JSON.parse(localStorage.getItem("kam_aid_reports") || "[]");
    const savedWeekly = JSON.parse(localStorage.getItem("kam_aid_weekly_reports") || "[]");
    const savedBranchVisits = JSON.parse(localStorage.getItem("kam_aid_branch_visits") || "[]");
    const savedShortages = JSON.parse(localStorage.getItem("kam_aid_shortages") || "[]");

    // Sort by date, newest first
    savedMonthly.sort((a: MonthlyReport, b: MonthlyReport) => b.id - a.id);
    savedWeekly.sort((a: WeeklyReport, b: WeeklyReport) => b.id - a.id);
    savedBranchVisits.sort((a: BranchVisitReport, b: BranchVisitReport) => b.id - a.id);
    savedShortages.sort((a: ShortagesReport, b: ShortagesReport) => b.id - a.id);

    setMonthlyReports(savedMonthly);
    setWeeklyReports(savedWeekly);
    setBranchVisits(savedBranchVisits);
    setShortagesReports(savedShortages);
  }, []);

  // Delete functions
  const deleteReport = (type: string, id: number) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    switch (type) {
      case "monthly":
        const updatedMonthly = monthlyReports.filter((r) => r.id !== id);
        setMonthlyReports(updatedMonthly);
        localStorage.setItem("kam_aid_reports", JSON.stringify(updatedMonthly));
        break;
      case "weekly":
        const updatedWeekly = weeklyReports.filter((r) => r.id !== id);
        setWeeklyReports(updatedWeekly);
        localStorage.setItem("kam_aid_weekly_reports", JSON.stringify(updatedWeekly));
        break;
      case "branch":
        const updatedBranch = branchVisits.filter((r) => r.id !== id);
        setBranchVisits(updatedBranch);
        localStorage.setItem("kam_aid_branch_visits", JSON.stringify(updatedBranch));
        break;
      case "shortages":
        const updatedShortages = shortagesReports.filter((r) => r.id !== id);
        setShortagesReports(updatedShortages);
        localStorage.setItem("kam_aid_shortages", JSON.stringify(updatedShortages));
        break;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Tab data
  const tabs = [
    { id: "monthly", label: "Monthly", icon: LayoutDashboard, count: monthlyReports.length, color: "sky" },
    { id: "weekly", label: "Weekly", icon: Calendar, count: weeklyReports.length, color: "violet" },
    { id: "branch", label: "Branch Visits", icon: MapPin, count: branchVisits.length, color: "emerald" },
    { id: "shortages", label: "Shortages", icon: Package, count: shortagesReports.length, color: "amber" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Report History</h1>
        <p className="text-slate-500">View and manage all your saved reports</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                isActive
                  ? `bg-${tab.color}-50 text-${tab.color}-600 border border-${tab.color}-200`
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
              style={isActive ? {
                backgroundColor: tab.color === "sky" ? "#f0f9ff" : tab.color === "violet" ? "#f5f3ff" : tab.color === "emerald" ? "#ecfdf5" : "#fffbeb",
                color: tab.color === "sky" ? "#0284c7" : tab.color === "violet" ? "#7c3aed" : tab.color === "emerald" ? "#059669" : "#d97706",
                borderColor: tab.color === "sky" ? "#bae6fd" : tab.color === "violet" ? "#ddd6fe" : tab.color === "emerald" ? "#a7f3d0" : "#fde68a"
              } : {}}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span 
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: tab.color === "sky" ? "#e0f2fe" : tab.color === "violet" ? "#ede9fe" : tab.color === "emerald" ? "#d1fae5" : "#fef3c7",
                    color: tab.color === "sky" ? "#0369a1" : tab.color === "violet" ? "#6d28d9" : tab.color === "emerald" ? "#047857" : "#b45309"
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Monthly Reports */}
      {activeTab === "monthly" && (
        <>
          {monthlyReports.length === 0 ? (
            <EmptyState icon="📊" title="No Monthly Reports" subtitle="Create your first monthly financial report to see it here." />
          ) : (
            <div className="space-y-4">
              {monthlyReports.map((report) => (
                <ReportCard
                  key={report.id}
                  badge={`${MONTHS[report.month]?.slice(0, 3)} ${report.year}`}
                  badgeColor="sky"
                  title="Monthly Financial Report"
                  subtitle={`Created ${formatDate(report.createdAt)}`}
                  metric={`GHS ${report.totals?.netProfit?.toLocaleString() || 0}`}
                  metricLabel="Net Profit"
                  metricColor={report.totals?.netProfit >= 0 ? "emerald" : "red"}
                  onEdit={() => router.push(`/?edit=${report.id}`)}
                  onDelete={() => deleteReport("monthly", report.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Weekly Reports */}
      {activeTab === "weekly" && (
        <>
          {weeklyReports.length === 0 ? (
            <EmptyState icon="📅" title="No Weekly Reports" subtitle="Create your first weekly operating report to see it here." />
          ) : (
            <div className="space-y-4">
              {weeklyReports.map((report) => (
                <ReportCard
                  key={report.id}
                  badge={`${formatDate(report.weekStart)} - ${formatDate(report.weekEnd)}`}
                  badgeColor="violet"
                  title="Weekly Operating Report"
                  subtitle={`Created ${formatDate(report.createdAt)}`}
                  metric={`GHS ${report.totals?.grandTotalSales?.toLocaleString() || 0}`}
                  metricLabel="Total Sales"
                  metricColor="slate"
                  onEdit={() => router.push(`/weekly?edit=${report.id}`)}
                  onDelete={() => deleteReport("weekly", report.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Branch Visit Reports */}
      {activeTab === "branch" && (
        <>
          {branchVisits.length === 0 ? (
            <EmptyState icon="📍" title="No Branch Visit Reports" subtitle="Create your first branch visit report to see it here." />
          ) : (
            <div className="space-y-4">
              {branchVisits.map((report) => (
                <ReportCard
                  key={report.id}
                  badge={report.branch}
                  badgeColor="emerald"
                  badgeExtra={report.reportType === "consolidated" ? "CONSOLIDATED" : undefined}
                  title="Branch Visit Report"
                  subtitle={`${formatDate(report.visitDate)} • By ${report.visitedBy}`}
                  metric={`${report.stats?.overall?.complianceRate?.toFixed(0) || 0}%`}
                  metricLabel="Compliance"
                  metricColor={
                    (report.stats?.overall?.complianceRate || 0) >= 80 ? "emerald" :
                    (report.stats?.overall?.complianceRate || 0) >= 60 ? "amber" : "red"
                  }
                  onEdit={() => router.push(`/branch-visit?edit=${report.id}`)}
                  onDelete={() => deleteReport("branch", report.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Shortages Reports */}
      {activeTab === "shortages" && (
        <>
          {shortagesReports.length === 0 ? (
            <EmptyState icon="📦" title="No Shortages Reports" subtitle="Create your first shortages report to see it here." />
          ) : (
            <div className="space-y-4">
              {shortagesReports.map((report) => (
                <ReportCard
                  key={report.id}
                  badge={formatDate(report.reportDate)}
                  badgeColor="amber"
                  title="Inventory Shortages Report"
                  subtitle={`By ${report.reportedBy} • ${report.shortages?.length || 0} items`}
                  metric={`${report.stats?.critical || 0}`}
                  metricLabel="Critical Items"
                  metricColor={report.stats?.critical > 0 ? "red" : "emerald"}
                  onEdit={() => router.push(`/shortages?edit=${report.id}`)}
                  onDelete={() => deleteReport("shortages", report.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Empty State Component
function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-12 shadow-sm text-center">
      <p className="text-4xl mb-4">{icon}</p>
      <p className="text-lg font-semibold text-slate-800 mb-2">{title}</p>
      <p className="text-slate-500">{subtitle}</p>
    </div>
  );
}

// Report Card Component
function ReportCard({
  badge,
  badgeColor,
  badgeExtra,
  title,
  subtitle,
  metric,
  metricLabel,
  metricColor,
  onEdit,
  onDelete
}: {
  badge: string;
  badgeColor: string;
  badgeExtra?: string;
  title: string;
  subtitle: string;
  metric: string;
  metricLabel: string;
  metricColor: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const badgeStyles: Record<string, { bg: string; text: string }> = {
    sky: { bg: "#e0f2fe", text: "#0369a1" },
    violet: { bg: "#ede9fe", text: "#6d28d9" },
    emerald: { bg: "#d1fae5", text: "#047857" },
    amber: { bg: "#fef3c7", text: "#b45309" },
  };

  const metricStyles: Record<string, string> = {
    emerald: "#059669",
    red: "#dc2626",
    amber: "#d97706",
    slate: "#1e293b",
  };

  return (
    <ProtectedLayout>
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between hover:border-slate-300 transition-colors">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div
            className="font-mono font-semibold px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: badgeStyles[badgeColor]?.bg, color: badgeStyles[badgeColor]?.text }}
          >
            {badge}
          </div>
          {badgeExtra && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
              {badgeExtra}
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold text-slate-800">{title}</p>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-sm text-slate-500">{metricLabel}</p>
          <p className="font-bold" style={{ color: metricStyles[metricColor] }}>{metric}</p>
        </div>
        <button
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
        >
          <Pencil className="w-5 h-5" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
    </ProtectedLayout>
  );
}