"use client";
import ProtectedLayout from "../components/ProtectedLayout";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, Calendar, LayoutDashboard, MapPin, Package, Download } from "lucide-react";
import * as dataService from "@/lib/dataService";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const router = useRouter();

  // Load all reports from database
  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      dataService.monthlyReports.list(),
      dataService.weeklyReports.list(),
      dataService.branchVisits.list(),
      dataService.shortagesReports.list(),
    ]).then(([monthly, weekly, visits, shortages]) => {
      setMonthlyReports(monthly as MonthlyReport[]);
      setWeeklyReports(weekly as WeeklyReport[]);
      setBranchVisits(visits as BranchVisitReport[]);
      setShortagesReports(shortages as ShortagesReport[]);
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to load reports. Please try refreshing.");
    }).finally(() => setLoading(false));
  }, []);

  // Delete functions
  const deleteReport = async (type: string, id: number) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    try {
      switch (type) {
        case "monthly":
          await dataService.monthlyReports.remove(id);
          setMonthlyReports(monthlyReports.filter((r) => r.id !== id));
          break;
        case "weekly":
          await dataService.weeklyReports.remove(id);
          setWeeklyReports(weeklyReports.filter((r) => r.id !== id));
          break;
        case "branch":
          await dataService.branchVisits.remove(id);
          setBranchVisits(branchVisits.filter((r) => r.id !== id));
          break;
        case "shortages":
          await dataService.shortagesReports.remove(id);
          setShortagesReports(shortagesReports.filter((r) => r.id !== id));
          break;
      }
    } catch (e: unknown) {
      alert(`Failed to delete: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // Download branch visit report as PDF
  const downloadBranchVisit = async (id: number) => {
    setDownloadingId(id);
    try {
      const report = await dataService.branchVisits.get(id);
      generateBranchVisitPDF(report as unknown as Record<string, unknown>);
    } catch {
      alert("Failed to generate report. Please try again.");
    } finally {
      setDownloadingId(null);
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

  if (loading) return (
    <ProtectedLayout>
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading reports…</p>
        </div>
      </div>
    </ProtectedLayout>
  );

  if (error) return (
    <ProtectedLayout>
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-red-500 font-semibold mb-2">Failed to load reports</p>
          <p className="text-slate-500 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded-lg bg-sky-500 text-white text-sm hover:bg-sky-600">
            Retry
          </button>
        </div>
      </div>
    </ProtectedLayout>
  );

  return (
    <ProtectedLayout>
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
                  onDownload={() => downloadBranchVisit(report.id)}
                  downloading={downloadingId === report.id}
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
    </ProtectedLayout>
  );
}

// ─── PDF export for history ───────────────────────────────────────────────────

function generateBranchVisitPDF(report: Record<string, unknown>) {
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow popups to download the report"); return; }

  const BRANCHES = ["Oyarifa", "Ghana Flag", "Madina"];
  const RATING_LABELS: Record<number, string> = { 0: "", 1: "Very Poor", 2: "Poor", 3: "Acceptable", 4: "Good", 5: "Excellent" };
  const inspectionData = (report.branchChecklist || {}) as Record<string, Record<string, unknown>>;
  const reportType = report.reportType as string;
  const activeBranches = reportType === "consolidated" ? BRANCHES : [report.branch as string];
  const stats = (report.stats || {}) as Record<string, unknown>;
  const byBranch = (stats.byBranch || {}) as Record<string, { complianceRate: number }>;
  const overall = ((stats.overall || {}) as { complianceRate?: number }).complianceRate || 0;
  const issues = (report.issues as { id: number; description: string; priority: string; branch: string; assignedTo: string }[]) || [];
  const actionItems = (report.actionItems as { id: number; action: string; branch: string; responsible: string; dueDate: string }[]) || [];
  const generalNotes = (report.generalNotes as string) || "";

  const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "";
  const rc = (r: number) => r <= 2 ? "#ef4444" : r === 3 ? "#f59e0b" : "#10b981";
  const sc = (s: number) => s >= 80 ? "#059669" : s >= 60 ? "#d97706" : "#dc2626";
  const getBScore = (b: string) => byBranch[b]?.complianceRate || 0;

  const renderBranch = (branch: string) => {
    const d = inspectionData[branch] as Record<string, unknown> | undefined;
    if (!d) return "";
    const q = (label: string, item: unknown) => {
      const it = item as { rating?: number; observation?: string } | null;
      if (!it || !it.rating) return "";
      return `<div class="check-row"><span class="label">${label}</span><span class="rating-badge" style="background:${rc(it.rating)}20;color:${rc(it.rating)}">${it.rating}/5 ${RATING_LABELS[it.rating] || ""}</span>${it.observation ? `<span class="obs">${it.observation}</span>` : ""}</div>`;
    };
    const b = (label: string, item: unknown) => {
      const it = item as { value?: boolean | null; notes?: string } | null;
      if (!it || it.value === null || it.value === undefined) return "";
      return `<div class="check-row"><span class="label">${label}</span><span class="yn-badge" style="background:${it.value ? "#d1fae5" : "#fee2e2"};color:${it.value ? "#059669" : "#dc2626"}">${it.value ? "YES" : "NO"}</span>${it.notes ? `<span class="obs">${it.notes}</span>` : ""}</div>`;
    };
    const ext = d.exterior as Record<string, unknown> || {};
    const int = d.interiorSpaces as Record<string, unknown> || {};
    const sp = d.shelvesProducts as Record<string, unknown> || {};
    const sys = d.systems as Record<string, unknown> || {};
    const per = d.personnel as Record<string, unknown> || {};
    const util = d.utilities as Record<string, unknown> || {};
    const doc = d.documentation as Record<string, unknown> || {};
    const sec = d.security as Record<string, unknown> || {};
    const adm = d.adminComms as Record<string, unknown> || {};
    const pc = d.pettyCash as Record<string, unknown> || {};
    const staffEntries = (per.staffEntries as { name: string; present?: boolean | null; inLabCoat?: boolean | null }[]) || [];
    const indShelves = (sp.individualShelves as { workerName?: string; shelfArea?: string; shelfCleanliness?: number; drugCleanliness?: number; noEmptySpots?: number; rating?: number; observation?: string }[]) || [];

    const shelvesHtml = indShelves.length > 0 ? `
      <div style="margin:6px 0 2px 0;font-size:11px;font-weight:600;color:#64748b">Individual Shelves</div>
      ${indShelves.map(s => {
        const scc = s.shelfCleanliness || 0, dc = s.drugCleanliness || 0, nes = s.noEmptySpots || 0;
        const hasNew = scc > 0 || dc > 0 || nes > 0;
        if (hasNew) {
          const active = [scc, dc, nes].filter(v => v > 0);
          const avg = active.reduce((a, v) => a + v, 0) / active.length;
          return `<div class="check-row"><span class="label">${s.workerName ? s.workerName + " — " : ""}${s.shelfArea}</span><span class="rating-badge" style="background:${rc(Math.round(avg))}20;color:${rc(Math.round(avg))}">${avg.toFixed(1)}/5</span><span class="obs">Shelf: ${scc || "—"}/5 · Drugs: ${dc || "—"}/5 · Stocked: ${nes || "—"}/5</span></div>`;
        }
        return `<div class="check-row"><span class="label">${s.workerName ? s.workerName + " — " : ""}${s.shelfArea}</span><span class="rating-badge" style="background:${rc(s.rating || 0)}20;color:${rc(s.rating || 0)}">${s.rating || 0}/5</span>${s.observation ? `<span class="obs">${s.observation}</span>` : ""}</div>`;
      }).join("")}` : "";

    const staffHtml = staffEntries.length > 0 ? `
      <table class="inner-table"><tr><th>Name</th><th>Present</th><th>Lab Coat</th></tr>
      ${staffEntries.map(s => `<tr><td>${s.name}</td><td style="color:${s.present ? "#059669" : "#dc2626"}">${s.present === true ? "Yes" : s.present === false ? "No" : "—"}</td><td style="color:${s.inLabCoat ? "#059669" : "#dc2626"}">${s.inLabCoat === true ? "Yes" : s.inLabCoat === false ? "No" : "—"}</td></tr>`).join("")}
      </table>` : "";

    const expiredDrugs = (sp.expiredDrugs as { drugName: string; expiryDate: string; quantity: string; shelfLocation: string }[]) || [];
    const nearExpiry = (sp.nearExpiryItems as { drugName: string; expiryDate: string; quantity: string; stickerApplied?: boolean | null }[]) || [];
    const oos = (d.inventory as { outOfStockItems?: { productName: string; duration: string }[] } | null)?.outOfStockItems || [];
    const openBal = pc.openingBalance as string || "0";
    const spent = pc.amountSpent as string || "0";

    return `<div class="branch-block">
      <div class="branch-title">${branch} — Score: <span style="color:${sc(getBScore(branch))}">${getBScore(branch).toFixed(0)}%</span></div>
      <div class="cat-title">Exterior</div>
      ${q("Front of shop cleanliness", ext.frontCleanliness)}${b("Signage working", ext.signageWorking)}
      <div class="cat-title">Interior Spaces</div>
      ${q("Floors", int.floors)}${q("Washroom", int.washroom)}${q("Storeroom", int.storeroom)}
      <div class="cat-title">Shelves & Products</div>
      ${q("Overall shelf appearance", sp.overallAppearance)}
      ${shelvesHtml}
      ${b("Expired drugs found", sp.expiredDrugsFound)}
      ${expiredDrugs.length > 0 ? `<table class="inner-table"><tr><th>Drug</th><th>Expiry</th><th>Qty</th><th>Location</th></tr>${expiredDrugs.map(x => `<tr><td>${x.drugName}</td><td>${x.expiryDate}</td><td>${x.quantity}</td><td>${x.shelfLocation}</td></tr>`).join("")}</table>` : ""}
      ${b("Near-expiry items", sp.nearExpiryFound)}
      ${nearExpiry.length > 0 ? `<table class="inner-table"><tr><th>Drug</th><th>Expiry</th><th>Qty</th><th>Sticker</th></tr>${nearExpiry.map(x => `<tr><td>${x.drugName}</td><td>${x.expiryDate}</td><td>${x.quantity}</td><td>${x.stickerApplied === true ? "Yes" : x.stickerApplied === false ? "No" : "—"}</td></tr>`).join("")}</table>` : ""}
      ${q("Counter cleanliness", sp.counterCleanliness)}
      ${oos.length > 0 ? `<div class="cat-title">Inventory — Out of Stock</div>${oos.map(x => `<div class="check-row"><span class="label">${x.productName}</span><span class="obs">${x.duration}</span></div>`).join("")}` : ""}
      <div class="cat-title">Systems & Connectivity</div>
      ${b("POS/PC operational", sys.posOperational)}${b("No pending transfers (LavaBMS)", sys.noPendingTransfers)}${b("Internet connectivity", sys.internetConnectivity)}${b("Mobile devices charged", sys.devicesCharged)}${b("Airtime/call credit", sys.airtimeAvailable)}
      <div class="cat-title">Personnel</div>
      ${staffHtml}${q("Staff attitude", per.staffAttitude)}
      <div class="cat-title">Utilities & Equipment</div>
      ${b("AC working", util.acWorking)}${b("Fridge working", util.fridgeWorking)}${b("Light bulbs functional", util.lightBulbsFunctional)}
      <div class="cat-title">Documentation</div>
      ${b("Handover book signed off", doc.handoverBookSignedOff)}
      <div class="cat-title">Security</div>
      ${b("CCTV operational", sec.cctvOperational)}${b("Safe/cash box secured", sec.safeCashBoxSecured)}
      <div class="cat-title">Admin & Communication</div>
      ${b("All messages replied", adm.allMessagesReplied)}${b("Daily sales report submitted", adm.dailySalesReportSubmitted)}${b("Customer complaints", adm.customerComplaints)}
      ${(openBal || spent) ? `<div class="cat-title">Petty Cash</div>
        <div class="check-row"><span class="label">Opening</span><span class="obs">GHS ${openBal}</span></div>
        <div class="check-row"><span class="label">Spent</span><span class="obs">GHS ${spent}</span></div>
        <div class="check-row"><span class="label">Closing</span><span class="obs">GHS ${(parseFloat(openBal) - parseFloat(spent)).toFixed(2)}</span></div>
        ${pc.notes ? `<div class="check-row"><span class="label">Notes</span><span class="obs">${pc.notes}</span></div>` : ""}` : ""}
    </div>`;
  };

  const scoreColor = (s: number) => s >= 80 ? "#059669" : s >= 60 ? "#d97706" : "#dc2626";

  const html = `<!DOCTYPE html><html><head><title>Branch Visit Report</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#1e293b;line-height:1.5}
    .header{display:flex;align-items:center;gap:16px;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #e2e8f0}
    .title{font-size:24px;font-weight:700}.subtitle{font-size:13px;color:#64748b;margin-top:4px}
    .scores{display:grid;grid-template-columns:repeat(${activeBranches.length + 1},1fr);gap:12px;margin-bottom:28px}
    .score-card{padding:16px;border-radius:12px;text-align:center}.score-card.overall{background:linear-gradient(135deg,#10b981,#059669);color:white}
    .score-card.branch{background:#f8fafc;border:1px solid #e2e8f0}.score-val{font-size:28px;font-weight:700}.score-lbl{font-size:11px;opacity:.8;margin-top:2px}
    .branch-block{margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:12px}
    .branch-title{font-size:15px;font-weight:700;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e2e8f0}
    .cat-title{font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;margin:10px 0 4px 0;letter-spacing:.05em}
    .check-row{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:12px}
    .label{flex:1;color:#334155}.obs{font-size:11px;color:#64748b;font-style:italic;max-width:220px}
    .rating-badge,.yn-badge{padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap}
    .inner-table{width:100%;border-collapse:collapse;margin:4px 0 8px 0;font-size:11px}
    .inner-table th,.inner-table td{padding:5px 8px;text-align:left;border-bottom:1px solid #e2e8f0}
    .inner-table th{background:#f1f5f9;font-weight:600;color:#475569}
    .issues-section{margin-bottom:24px}.issue-item{padding:10px 12px;margin-bottom:6px;border-radius:8px;border-left:4px solid;font-size:12px}
    .issue-high{background:#fee2e2;border-left-color:#ef4444}.issue-medium{background:#fef3c7;border-left-color:#f59e0b}
    .issue-desc{font-weight:500;color:#1e293b}.issue-meta{font-size:10px;color:#64748b;margin-top:2px}
    .priority-badge{font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;color:white;float:right}
    .ph{background:#ef4444}.pm{background:#f59e0b}
    .footer{margin-top:32px;padding-top:16px;border-top:2px solid #e2e8f0;text-align:center;font-size:12px;color:#64748b}
    @media print{body{padding:20px}-webkit-print-color-adjust:exact;print-color-adjust:exact}
  </style></head><body>
  <div class="header"><div>
    <div class="title">Branch Visit Report${reportType === "consolidated" ? " <span style='font-size:12px;background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:12px;font-weight:600'>CONSOLIDATED</span>" : ""}</div>
    <div class="subtitle">${reportType === "consolidated" ? "All Branches" : report.branch as string} &bull; ${fmtDate(report.visitDate as string)} &bull; Visited by ${report.visitedBy as string}</div>
  </div></div>
  <div class="scores">
    <div class="score-card overall"><div class="score-val">${overall.toFixed(0)}%</div><div class="score-lbl">Overall Score</div></div>
    ${activeBranches.map(branch => `<div class="score-card branch"><div class="score-val" style="color:${scoreColor(getBScore(branch))}">${getBScore(branch).toFixed(0)}%</div><div class="score-lbl">${branch}</div></div>`).join("")}
  </div>
  ${activeBranches.map(renderBranch).join("")}
  ${issues.length > 0 ? `<div class="issues-section"><div style="font-size:14px;font-weight:700;margin-bottom:10px">Auto-Flagged Issues (${issues.length})</div>${issues.map(i => `<div class="issue-item issue-${i.priority}"><span class="priority-badge p${i.priority[0]}">${i.priority.toUpperCase()}</span><div class="issue-desc">${i.description}</div><div class="issue-meta">${i.branch}${i.assignedTo ? ` &bull; ${i.assignedTo}` : ""}</div></div>`).join("")}</div>` : ""}
  ${actionItems.length > 0 ? `<div class="issues-section"><div style="font-size:14px;font-weight:700;margin-bottom:10px">Action Items (${actionItems.length})</div>${actionItems.map(a => `<div class="issue-item" style="background:#f0f9ff;border-left-color:#3b82f6"><div class="issue-desc">${a.action}</div><div class="issue-meta">${a.branch}${a.responsible ? ` &bull; ${a.responsible}` : ""}${a.dueDate ? ` &bull; Due: ${fmtDate(a.dueDate)}` : ""}</div></div>`).join("")}</div>` : ""}
  ${generalNotes ? `<div style="margin-bottom:24px"><div style="font-size:14px;font-weight:700;margin-bottom:8px">General Notes</div><div style="background:#f8fafc;padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap">${generalNotes}</div></div>` : ""}
  <div class="footer">KAM AID Pharmacy &bull; Branch Visit Report &bull; Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </body></html>`;

  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 500);
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
  onDelete,
  onDownload,
  downloading,
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
  onDownload?: () => void;
  downloading?: boolean;
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
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right mr-2">
          <p className="text-sm text-slate-500">{metricLabel}</p>
          <p className="font-bold" style={{ color: metricStyles[metricColor] }}>{metric}</p>
        </div>
        {onDownload && (
          <button
            onClick={onDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-40 shrink-0"
            title="Download PDF"
          >
            {downloading
              ? <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">Download</span>
          </button>
        )}
        <button
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors shrink-0"
        >
          <Pencil className="w-5 h-5" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}