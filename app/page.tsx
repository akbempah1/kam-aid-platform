"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as dataService from "@/lib/dataService";
import ProtectedLayout from "./components/ProtectedLayout";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  MapPin,
  LayoutDashboard,
  ArrowRight,
  Plus
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const BRANCHES = ["Oyarifa", "Ghana Flag", "Madina"];

export default function DashboardPage() {
  const router = useRouter();
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<any[]>([]);
  const [branchVisits, setBranchVisits] = useState<any[]>([]);
  const [shortagesReports, setShortagesReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      dataService.monthlyReports.list(),
      dataService.weeklyReports.list(),
      dataService.branchVisits.list(),
      dataService.shortagesReports.list(),
    ]).then(([monthly, weekly, visits, shortages]) => {
      setMonthlyReports(monthly);
      setWeeklyReports(weekly);
      setBranchVisits(visits);
      setShortagesReports(shortages);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Calculate overall stats
  const totalReports = monthlyReports.length + weeklyReports.length + branchVisits.length + shortagesReports.length;

  const latestMonthly = [...monthlyReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const latestWeekly = [...weeklyReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  
  const totalRevenue = monthlyReports.reduce((sum, r) => sum + (r.totals?.totalSales || 0), 0);
  const totalProfit = monthlyReports.reduce((sum, r) => sum + (r.totals?.netProfit || 0), 0);
  
  const avgCompliance = branchVisits.length > 0
    ? branchVisits.reduce((sum, r) => sum + (r.stats?.overall?.complianceRate || 0), 0) / branchVisits.length
    : 0;

  const totalShortages = shortagesReports.reduce((sum, r) => sum + (r.shortages?.length || 0), 0);
  const criticalShortages = shortagesReports.reduce((sum, r) => sum + (r.stats?.critical || 0), 0);
  
  // Prepare monthly trend data (last 6 months)
  const sortedMonthly = [...monthlyReports].sort((a, b) => {
    const dateA = new Date(a.year, a.month);
    const dateB = new Date(b.year, b.month);
    return dateA.getTime() - dateB.getTime();
  }).slice(-6);

  const monthlyTrendData = {
    labels: sortedMonthly.map(r => `${MONTHS[r.month]} ${r.year}`),
    datasets: [
      {
        label: "Revenue",
        data: sortedMonthly.map(r => r.totals?.totalSales || 0),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Net Profit",
        data: sortedMonthly.map(r => r.totals?.netProfit || 0),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4,
      }
    ]
  };

  // Prepare weekly trend data (last 8 weeks)
  const sortedWeekly = [...weeklyReports].sort((a, b) => {
    return new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime();
  }).slice(-8);

  const weeklyTrendData = {
    labels: sortedWeekly.map(r => {
      const date = new Date(r.weekStart);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }),
    datasets: [
      {
        label: "Weekly Sales",
        data: sortedWeekly.map(r => r.totals?.grandTotalSales || 0),
        backgroundColor: "#8b5cf6",
        borderRadius: 8,
      }
    ]
  };

  // Branch performance from weekly reports
  const branchPerformance = BRANCHES.map(branch => {
    const total = weeklyReports.reduce((sum, r) => {
      return sum + (r.totals?.byBranch?.[branch] || 0);
    }, 0);
    return { branch, total };
  });

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { 
          usePointStyle: true,
          padding: 20,
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: "#1e293b",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => ` GHS ${context.raw.toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: "#64748b" }
      },
      y: {
        grid: { color: "#f1f5f9" },
        ticks: {
          font: { size: 11 },
          color: "#64748b",
          callback: (value: any) => `GHS ${(value / 1000).toFixed(0)}k`
        }
      }
    }
  };

  const barOptions: any = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: { display: false }
    }
  };

  // Quick actions
  const quickActions = [
    { label: "Monthly Financial", href: "/monthly", icon: LayoutDashboard, color: "sky" },
    { label: "Weekly Report", href: "/weekly", icon: Calendar, color: "violet" },
    { label: "Branch Visit", href: "/branch-visit", icon: MapPin, color: "emerald" },
    { label: "Shortages", href: "/shortages", icon: Package, color: "amber" },
  ];

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
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Dashboard</h1>
          <p className="text-slate-500">Welcome back! Here's an overview of KAM AID Pharmacy performance.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const colors: Record<string, { bg: string; icon: string; hover: string }> = {
              sky: { bg: "bg-sky-50", icon: "text-sky-500", hover: "hover:bg-sky-100" },
              violet: { bg: "bg-violet-50", icon: "text-violet-500", hover: "hover:bg-violet-100" },
              emerald: { bg: "bg-emerald-50", icon: "text-emerald-500", hover: "hover:bg-emerald-100" },
              amber: { bg: "bg-amber-50", icon: "text-amber-500", hover: "hover:bg-amber-100" },
            };
            const c = colors[action.color];
            return (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className={`${c.bg} ${c.hover} p-4 rounded-2xl flex items-center gap-4 transition-all group`}
              >
                <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${c.icon}`} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-slate-800">{action.label}</p>
                  <p className="text-sm text-slate-500">Create new</p>
                </div>
                <Plus className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </button>
            );
          })}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">Total Revenue (YTD)</span>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">GHS {totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-slate-400 mt-1">{monthlyReports.length} monthly reports</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">Total Net Profit</span>
              {totalProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              GHS {totalProfit.toLocaleString()}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}% margin
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">Avg. Compliance</span>
              <MapPin className="w-5 h-5 text-emerald-500" />
            </div>
            <p className={`text-2xl font-bold ${
              avgCompliance >= 80 ? "text-emerald-600" : avgCompliance >= 60 ? "text-amber-600" : "text-red-600"
            }`}>
              {avgCompliance.toFixed(0)}%
            </p>
            <p className="text-sm text-slate-400 mt-1">{branchVisits.length} branch visits</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">Active Shortages</span>
              <Package className={`w-5 h-5 ${criticalShortages > 0 ? "text-red-500" : "text-amber-500"}`} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{totalShortages}</p>
            <p className="text-sm text-red-500 mt-1">{criticalShortages} critical</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Monthly Trends */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Monthly Trends</h2>
                <p className="text-sm text-slate-500">Revenue & profit over time</p>
              </div>
              <button
                onClick={() => router.push("/history")}
                className="text-sm text-sky-500 hover:text-sky-600 flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {sortedMonthly.length > 0 ? (
              <div className="h-64">
                <Line data={monthlyTrendData} options={chartOptions} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <LayoutDashboard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No monthly data yet</p>
                </div>
              </div>
            )}
          </div>

          {/* Weekly Sales Trend */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Weekly Sales</h2>
                <p className="text-sm text-slate-500">Last 8 weeks performance</p>
              </div>
              <button
                onClick={() => router.push("/weekly")}
                className="text-sm text-violet-500 hover:text-violet-600 flex items-center gap-1"
              >
                Add report <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {sortedWeekly.length > 0 ? (
              <div className="h-64">
                <Bar data={weeklyTrendData} options={barOptions} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No weekly data yet</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-3 gap-6">
          {/* Branch Performance */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Branch Performance</h2>
            {branchPerformance.some(b => b.total > 0) ? (
              <div className="space-y-4">
                {branchPerformance.map((branch, i) => {
                  const maxTotal = Math.max(...branchPerformance.map(b => b.total));
                  const percent = maxTotal > 0 ? (branch.total / maxTotal) * 100 : 0;
                  const colors = ["#3b82f6", "#8b5cf6", "#06b6d4"];
                  return (
                    <div key={branch.branch}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{branch.branch}</span>
                        <span className="text-slate-500">GHS {branch.total.toLocaleString()}</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%`, backgroundColor: colors[i] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
                No branch data available
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {[
                ...monthlyReports.slice(0, 2).map(r => ({
                  type: "Monthly Report",
                  date: r.createdAt,
                  icon: LayoutDashboard,
                  color: "sky"
                })),
                ...weeklyReports.slice(0, 2).map(r => ({
                  type: "Weekly Report",
                  date: r.createdAt,
                  icon: Calendar,
                  color: "violet"
                })),
                ...branchVisits.slice(0, 2).map(r => ({
                  type: "Branch Visit",
                  date: r.createdAt,
                  icon: MapPin,
                  color: "emerald"
                }))
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((activity, i) => {
                  const Icon = activity.icon;
                  const colorClasses: Record<string, string> = {
                    sky: "bg-sky-50 text-sky-500",
                    violet: "bg-violet-50 text-violet-500",
                    emerald: "bg-emerald-50 text-emerald-500"
                  };
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[activity.color]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{activity.type}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(activity.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              {totalReports === 0 && (
                <div className="text-center text-slate-400 text-sm py-4">
                  No recent activity
                </div>
              )}
            </div>
          </div>

          {/* Critical Shortages */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Critical Shortages</h2>
              <button
                onClick={() => router.push("/shortages")}
                className="text-sm text-amber-500 hover:text-amber-600 flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {shortagesReports.length > 0 ? (
              <div className="space-y-3">
                {shortagesReports
                  .flatMap(r => r.shortages || [])
                  .filter(s => s.priority === "critical")
                  .slice(0, 4)
                  .map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{item.productName}</p>
                        <p className="text-xs text-slate-500">{item.branch} • Need {item.requiredStock - item.currentStock} {item.unit}</p>
                      </div>
                    </div>
                  ))}
                {criticalShortages === 0 && (
                  <div className="text-center py-4">
                    <p className="text-emerald-600 font-medium">✓ No critical shortages</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
                No shortage reports yet
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}