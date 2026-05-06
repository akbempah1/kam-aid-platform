"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as dataService from "@/lib/dataService";
import ProtectedLayout from "./components/ProtectedLayout";
import {
  TrendingUp, TrendingDown, Calendar, MapPin,
  LayoutDashboard, ArrowRight, Plus, AlertTriangle,
  CheckCircle, Package, Minus
} from "lucide-react";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MONTHS  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS    = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const BRANCHES = ["Oyarifa", "Ghana Flag", "Madina"];

// ─── helpers ─────────────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  if (b === 0) return null;
  return ((a - b) / b) * 100;
}

function ChangeChip({ current, prev }: { current: number; prev: number }) {
  const p = pct(current, prev);
  if (p === null) return <span className="text-xs text-slate-400">—</span>;
  const up = p >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(p).toFixed(1)}%
    </span>
  );
}

function KpiCard({ label, value, sub, chip, accent }: { label: string; value: string; sub?: string; chip?: React.ReactNode; accent?: string }) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm border ${accent ?? "bg-white border-slate-200"}`}>
      <p className="text-sm font-medium text-slate-500 mb-2">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {chip}
        {sub && <span className="text-xs text-slate-400">{sub}</span>}
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [monthlyReports,  setMonthlyReports]  = useState<dataService.MonthlyReport[]>([]);
  const [weeklyReports,   setWeeklyReports]   = useState<dataService.WeeklyReport[]>([]);
  const [branchVisits,    setBranchVisits]    = useState<dataService.BranchVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dataService.monthlyReports.list(),
      dataService.weeklyReports.list(),
      dataService.branchVisits.list(),
    ]).then(([m, w, v]) => {
      setMonthlyReports(m);
      setWeeklyReports(w);
      setBranchVisits(v);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── Monthly data ────────────────────────────────────────────────────────────
  const sortedMonthly = [...monthlyReports].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );
  const thisMonth = sortedMonthly[sortedMonthly.length - 1];
  const prevMonth = sortedMonthly[sortedMonthly.length - 2];

  const mVal = (r: dataService.MonthlyReport | undefined, key: string) => {
    if (!r) return 0;
    if (key === "sales")    return r.totals?.totalSales   ?? 0;
    if (key === "cogs")     return parseFloat(r.cogs)     || 0;
    if (key === "expenses") return r.totals?.totalExpenses ?? 0;
    if (key === "profit")   return r.totals?.netProfit    ?? 0;
    return 0;
  };

  const expenseKeys: { key: keyof dataService.MonthlyReport["expenses"]; label: string }[] = [
    { key: "salaries",      label: "Salaries" },
    { key: "rent",          label: "Rent" },
    { key: "electricity",   label: "Electricity" },
    { key: "phone",         label: "Phone" },
    { key: "pettyCash",     label: "Petty Cash" },
    { key: "maintenance",   label: "Maintenance" },
    { key: "miscellaneous", label: "Miscellaneous" },
  ];

  // ── Weekly data ─────────────────────────────────────────────────────────────
  const sortedWeekly = [...weeklyReports].sort((a, b) =>
    new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
  );
  const thisWeek = sortedWeekly[sortedWeekly.length - 1];
  const prevWeek = sortedWeekly[sortedWeekly.length - 2];
  const last6Weeks = sortedWeekly.slice(-6);

  // Best/worst day from latest weekly report
  const latestDailySales = thisWeek?.dailySales as Record<string, Record<string, string>> | undefined;
  const getDayTotal = (day: string) =>
    BRANCHES.reduce((s, b) => s + (parseFloat(latestDailySales?.[day]?.[b] ?? "0") || 0), 0);
  const filledDays = DAYS.filter(d => getDayTotal(d) > 0);
  const bestDay  = filledDays.length ? filledDays.reduce((a, b) => getDayTotal(a) >= getDayTotal(b) ? a : b) : null;
  const worstDay = filledDays.length >= 2 ? filledDays.reduce((a, b) => getDayTotal(a) <= getDayTotal(b) ? a : b) : null;

  const getBranchBest = (branch: string) => {
    const filled = DAYS.filter(d => parseFloat(latestDailySales?.[d]?.[branch] ?? "0") > 0);
    if (!filled.length) return null;
    return filled.reduce((a, b) =>
      parseFloat(latestDailySales![a][branch]) >= parseFloat(latestDailySales![b][branch]) ? a : b);
  };
  const getBranchWorst = (branch: string) => {
    const filled = DAYS.filter(d => parseFloat(latestDailySales?.[d]?.[branch] ?? "0") > 0);
    if (filled.length < 2) return null;
    return filled.reduce((a, b) =>
      parseFloat(latestDailySales![a][branch]) <= parseFloat(latestDailySales![b][branch]) ? a : b);
  };

  // ── Branch visit data ───────────────────────────────────────────────────────
  const sortedVisits = [...branchVisits].sort((a, b) =>
    new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
  );
  const lastVisit = sortedVisits[sortedVisits.length - 1];
  const lastVisitScores = lastVisit?.stats?.byBranch ?? {};
  const avgVisitScore = lastVisit?.stats?.overall?.complianceRate ?? 0;

  // Open issues from last visit
  const openIssues = (lastVisit?.issues ?? []) as { description: string; priority: string; branch: string }[];
  const highIssues = openIssues.filter(i => i.priority === "high");
  const medIssues  = openIssues.filter(i => i.priority === "medium");

  // ── Week-on-week bar chart ──────────────────────────────────────────────────
  const weekLabels = last6Weeks.map(r => {
    const d = new Date(r.weekStart);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });
  const weekBarData = {
    labels: weekLabels,
    datasets: BRANCHES.map((branch, i) => ({
      label: branch,
      data: last6Weeks.map(r => (r.totals?.byBranch?.[branch] ?? 0)),
      backgroundColor: ["#3b82f6","#8b5cf6","#06b6d4"][i],
      borderRadius: 6,
    })),
  };
  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const, labels: { usePointStyle: true, padding: 16, font: { size: 11 } } },
      tooltip: { backgroundColor: "#1e293b", padding: 10, cornerRadius: 8,
        callbacks: { label: (ctx: { dataset: { label?: string }; raw: unknown }) => ` ${ctx.dataset.label}: GHS ${(ctx.raw as number).toLocaleString()}` } },
    },
    scales: {
      x: { stacked: false, grid: { display: false }, ticks: { font: { size: 11 }, color: "#64748b" } },
      y: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 11 }, color: "#64748b",
        callback: (v: unknown) => `GHS ${((v as number) / 1000).toFixed(0)}k` } },
    },
  };

  const quickActions = [
    { label: "Monthly Report", href: "/monthly",      icon: LayoutDashboard, color: "sky" },
    { label: "Weekly Report",  href: "/weekly",       icon: Calendar,        color: "violet" },
    { label: "Branch Visit",   href: "/branch-visit", icon: MapPin,          color: "emerald" },
    { label: "View History",   href: "/history",      icon: Package,         color: "amber" },
  ];
  const colorMap: Record<string, { bg: string; icon: string; hover: string }> = {
    sky:     { bg: "bg-sky-50",     icon: "text-sky-500",     hover: "hover:bg-sky-100" },
    violet:  { bg: "bg-violet-50",  icon: "text-violet-500",  hover: "hover:bg-violet-100" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-500", hover: "hover:bg-emerald-100" },
    amber:   { bg: "bg-amber-50",   icon: "text-amber-500",   hover: "hover:bg-amber-100" },
  };

  if (loading) return (
    <ProtectedLayout>
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading dashboard…</p>
        </div>
      </div>
    </ProtectedLayout>
  );

  return (
    <ProtectedLayout>
      <div className="space-y-6">

        {/* Header + Quick Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">KAM AID Pharmacy — overview</p>
          </div>
          <div className="flex gap-3">
            {quickActions.map(a => {
              const Icon = a.icon;
              const c = colorMap[a.color];
              return (
                <button key={a.href} onClick={() => router.push(a.href)}
                  className={`${c.bg} ${c.hover} px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all`}>
                  <Icon className={`w-4 h-4 ${c.icon}`} />
                  <span className="text-sm font-semibold text-slate-700">{a.label}</span>
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Row 1: Top KPIs ── */}
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            label="Revenue — this month"
            value={thisMonth ? `GHS ${mVal(thisMonth,"sales").toLocaleString()}` : "—"}
            chip={thisMonth && prevMonth ? <ChangeChip current={mVal(thisMonth,"sales")} prev={mVal(prevMonth,"sales")} /> : undefined}
            sub={prevMonth ? `Last: GHS ${mVal(prevMonth,"sales").toLocaleString()}` : undefined}
          />
          <KpiCard
            label="Purchases (COGS) — this month"
            value={thisMonth ? `GHS ${mVal(thisMonth,"cogs").toLocaleString()}` : "—"}
            chip={thisMonth && prevMonth ? <ChangeChip current={mVal(thisMonth,"cogs")} prev={mVal(prevMonth,"cogs")} /> : undefined}
            sub={prevMonth ? `Last: GHS ${mVal(prevMonth,"cogs").toLocaleString()}` : undefined}
          />
          <KpiCard
            label="Total Expenses — this month"
            value={thisMonth ? `GHS ${mVal(thisMonth,"expenses").toLocaleString()}` : "—"}
            chip={thisMonth && prevMonth ? <ChangeChip current={mVal(thisMonth,"expenses")} prev={mVal(prevMonth,"expenses")} /> : undefined}
            sub={prevMonth ? `Last: GHS ${mVal(prevMonth,"expenses").toLocaleString()}` : undefined}
          />
          <KpiCard
            label="Net Profit — this month"
            value={thisMonth ? `GHS ${mVal(thisMonth,"profit").toLocaleString()}` : "—"}
            chip={thisMonth && prevMonth ? <ChangeChip current={mVal(thisMonth,"profit")} prev={mVal(prevMonth,"profit")} /> : undefined}
            sub={prevMonth ? `Last: GHS ${mVal(prevMonth,"profit").toLocaleString()}` : undefined}
          />
        </div>

        {/* ── Row 2: Monthly expense breakdown + Branch visit scores ── */}
        <div className="grid grid-cols-3 gap-6">

          {/* Expense category comparison */}
          <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Monthly Expense Breakdown</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {thisMonth ? `${MONTHS[thisMonth.month]} ${thisMonth.year}` : "—"} vs {prevMonth ? `${MONTHS[prevMonth.month]} ${prevMonth.year}` : "previous month"}
                </p>
              </div>
              <button onClick={() => router.push("/history")} className="text-xs text-sky-500 hover:text-sky-600 flex items-center gap-1">
                History <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {thisMonth ? (
              <div className="space-y-2">
                {/* Revenue / COGS / Total expenses summary row */}
                {[
                  { label: "Revenue",        cur: mVal(thisMonth,"sales"),    prev: mVal(prevMonth,"sales") },
                  { label: "Purchases",      cur: mVal(thisMonth,"cogs"),     prev: mVal(prevMonth,"cogs") },
                  { label: "Total Expenses", cur: mVal(thisMonth,"expenses"), prev: mVal(prevMonth,"expenses") },
                  { label: "Net Profit",     cur: mVal(thisMonth,"profit"),   prev: mVal(prevMonth,"profit") },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3 py-2 border-b border-slate-50">
                    <span className="w-28 text-sm font-semibold text-slate-700">{row.label}</span>
                    <span className="w-36 text-sm text-slate-800">GHS {row.cur.toLocaleString()}</span>
                    {prevMonth ? (
                      <>
                        <span className="w-36 text-sm text-slate-400">GHS {row.prev.toLocaleString()}</span>
                        <ChangeChip current={row.cur} prev={row.prev} />
                      </>
                    ) : <span className="text-xs text-slate-300">No prior month</span>}
                  </div>
                ))}
                {/* Individual expense categories */}
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-3 pb-1">Expense categories</p>
                {expenseKeys.map(({ key, label }) => {
                  const cur  = parseFloat(thisMonth.expenses?.[key] ?? "0") || 0;
                  const prev = parseFloat(prevMonth?.expenses?.[key] ?? "0") || 0;
                  const change = pct(cur, prev);
                  const changed = change !== null && Math.abs(change) >= 1;
                  return (
                    <div key={key} className={`flex items-center gap-3 py-1.5 rounded-lg px-2 ${changed && change! > 10 ? "bg-red-50" : changed && change! < -10 ? "bg-emerald-50" : ""}`}>
                      <span className="w-28 text-sm text-slate-600">{label}</span>
                      <span className="w-36 text-sm text-slate-800">GHS {cur.toLocaleString()}</span>
                      {prevMonth ? (
                        <>
                          <span className="w-36 text-sm text-slate-400">GHS {prev.toLocaleString()}</span>
                          {changed ? <ChangeChip current={cur} prev={prev} /> : <span className="text-xs text-slate-300 flex items-center gap-0.5"><Minus className="w-3 h-3" /> No change</span>}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No monthly reports yet</div>
            )}
          </div>

          {/* Branch visit scores */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Last Branch Visit</h2>
                {lastVisit && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(lastVisit.visitDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
              <button onClick={() => router.push("/branch-visit")} className="text-xs text-emerald-500 hover:text-emerald-600 flex items-center gap-1">
                New <Plus className="w-3 h-3" />
              </button>
            </div>
            {lastVisit ? (
              <div className="space-y-3">
                {/* Overall */}
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 text-white text-center mb-4">
                  <p className="text-3xl font-bold">{avgVisitScore.toFixed(0)}%</p>
                  <p className="text-xs opacity-80 mt-1">Overall Score</p>
                </div>
                {/* Per branch */}
                {BRANCHES.map(branch => {
                  const score = lastVisitScores[branch]?.complianceRate ?? 0;
                  return (
                    <div key={branch}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{branch}</span>
                        <span className={`font-bold ${score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                          {score.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${score}%`, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}
                {/* Issue count */}
                <div className="pt-2 border-t border-slate-100 flex gap-2 flex-wrap">
                  {highIssues.length > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {highIssues.length} high
                    </span>
                  )}
                  {medIssues.length > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {medIssues.length} medium
                    </span>
                  )}
                  {openIssues.length === 0 && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> No issues
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No branch visits yet</div>
            )}
          </div>
        </div>

        {/* ── Row 3: Week on week chart + best/worst + open issues ── */}
        <div className="grid grid-cols-3 gap-6">

          {/* Week on week bar chart */}
          <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Week on Week Sales</h2>
                <p className="text-xs text-slate-400 mt-0.5">Last 6 weeks by branch</p>
              </div>
              {thisWeek && prevWeek && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                  <span className="text-xs text-slate-500">This week</span>
                  <span className="text-sm font-bold text-slate-800">GHS {(thisWeek.totals?.grandTotalSales ?? 0).toLocaleString()}</span>
                  <ChangeChip current={thisWeek.totals?.grandTotalSales ?? 0} prev={prevWeek.totals?.grandTotalSales ?? 0} />
                </div>
              )}
            </div>
            {last6Weeks.length > 0 ? (
              <>
                <div className="h-52 mt-4">
                  <Bar data={weekBarData} options={barOptions} />
                </div>
                {/* Best / worst day strip from latest week */}
                {thisWeek && bestDay && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">This week — latest report</p>
                    <div className="grid grid-cols-3 gap-3">
                      {BRANCHES.map(branch => {
                        const best  = getBranchBest(branch);
                        const worst = getBranchWorst(branch);
                        return (
                          <div key={branch} className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs font-semibold text-slate-500 mb-2">{branch}</p>
                            {best ? (
                              <div className="space-y-1">
                                <div className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-1 rounded-lg">
                                  ↑ {best} — GHS {parseFloat(latestDailySales![best][branch]).toLocaleString()}
                                </div>
                                {worst && (
                                  <div className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-1 rounded-lg">
                                    ↓ {worst} — GHS {parseFloat(latestDailySales![worst][branch]).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            ) : <p className="text-xs text-slate-400 italic">No data</p>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {bestDay && <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-1 rounded-lg">Best overall day: {bestDay} — GHS {getDayTotal(bestDay).toLocaleString()}</span>}
                      {worstDay && <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-1 rounded-lg">Worst overall day: {worstDay} — GHS {getDayTotal(worstDay).toLocaleString()}</span>}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-52 text-slate-400 text-sm">No weekly reports yet</div>
            )}
          </div>

          {/* Open issues from last branch visit */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-y-auto max-h-[500px]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Open Issues</h2>
                <p className="text-xs text-slate-400 mt-0.5">From last branch visit</p>
              </div>
              {lastVisit && (
                <button onClick={() => router.push(`/branch-visit?edit=${lastVisit.id}`)}
                  className="text-xs text-emerald-500 hover:text-emerald-600 flex items-center gap-1">
                  View <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
            {openIssues.length > 0 ? (
              <div className="space-y-2">
                {openIssues.map((issue, i) => (
                  <div key={i} className={`p-3 rounded-xl border-l-4 text-sm ${
                    issue.priority === "high" ? "bg-red-50 border-l-red-500" : "bg-amber-50 border-l-amber-400"
                  }`}>
                    <p className="font-medium text-slate-800 leading-snug">{issue.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">{issue.branch}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full text-white ${issue.priority === "high" ? "bg-red-500" : "bg-amber-500"}`}>
                        {issue.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <CheckCircle className="w-10 h-10 text-emerald-300" />
                <p className="text-slate-400 text-sm">{lastVisit ? "No open issues" : "No visits recorded yet"}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </ProtectedLayout>
  );
}
