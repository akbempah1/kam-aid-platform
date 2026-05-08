"use client";
import { Suspense } from "react";
import ProtectedLayout from "../components/ProtectedLayout";
import FileUpload from "../components/FileUpload";
import DashboardModal from "../components/DashboardModal";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { monthlyReports, weeklyReports, type WeeklyReport } from "@/lib/dataService";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// ─── Expense keyword routing ───────────────────────────────────────────────────

type ExpenseKey = "salaries" | "rent" | "electricity" | "phone" | "pettyCash" | "maintenance" | "miscellaneous";

const EXPENSE_RULES: { key: ExpenseKey; keywords: string[] }[] = [
  { key: "electricity", keywords: ["electricity", "electric", "power", "ecg", "light bill", "utilities"] },
  { key: "phone",       keywords: ["broadband", "router", "data", "internet", "airtime", "wifi", "wi-fi", "network bundle"] },
  { key: "pettyCash",   keywords: ["petty cash", "petty"] },
  { key: "maintenance", keywords: ["maintenance", "repair"] },
  { key: "miscellaneous", keywords: ["miscellaneous", "misc"] },
];

function matchExpenseKey(name: string): ExpenseKey | null {
  const lower = name.toLowerCase();
  for (const rule of EXPENSE_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) return rule.key;
  }
  return null;
}

function MonthlyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");

  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportId, setReportId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [sales, setSales] = useState({
    oyarifa: "",
    ghanaFlag: "",
    madina: ""
  });
  
  const [cogs, setCogs] = useState("");
  
  const [expenses, setExpenses] = useState({
    salaries: "",
    rent: "",
    electricity: "",
    phone: "",
    pettyCash: "",
    maintenance: "",
    miscellaneous: ""
  });

  const [customExpenses, setCustomExpenses] = useState<{id: number, name: string, amount: string}[]>([]);
  const [newExpenseName, setNewExpenseName] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);
  const [allWeekly, setAllWeekly] = useState<WeeklyReport[]>([]);
  const [weeklySource, setWeeklySource] = useState<{ count: number; weeks: string[] } | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<ExpenseKey>>(new Set());

  // Load report if editing
  useEffect(() => {
    if (editId) {
      monthlyReports.get(parseInt(editId)).then((report) => {
        if (report) {
          setReportId(report.id);
          setMonth(report.month);
          setYear(report.year);
          setSales(report.sales as typeof sales);
          setCogs(report.cogs);
          setExpenses(report.expenses as typeof expenses);
          setCustomExpenses((report.customExpenses as typeof customExpenses) || []);
        }
      }).catch(() => {});
    }
  }, [editId]);

  // Load all weekly reports once on mount
  useEffect(() => {
    weeklyReports.list().then(setAllWeekly).catch(() => {});
  }, []);

  // Pull sales + expenses from weekly reports for the selected month
  const applyWeeklyData = useCallback((m: number, y: number, weekly: WeeklyReport[]) => {
    const relevant = weekly.filter(w => {
      const start = new Date(w.weekStart);
      return start.getMonth() === m && start.getFullYear() === y;
    });
    if (relevant.length === 0) {
      setWeeklySource(null);
      return;
    }

    // Sum per-branch sales across all relevant weeks
    let oya = 0, gf = 0, mad = 0;
    relevant.forEach(w => {
      oya += w.totals.byBranch["Oyarifa"]    || 0;
      gf  += w.totals.byBranch["Ghana Flag"] || 0;
      mad += w.totals.byBranch["Madina"]     || 0;
    });
    setSales({
      oyarifa:   oya > 0 ? String(parseFloat(oya.toFixed(2)))  : "",
      ghanaFlag: gf  > 0 ? String(parseFloat(gf.toFixed(2)))   : "",
      madina:    mad > 0 ? String(parseFloat(mad.toFixed(2)))   : "",
    });

    // Route each expense item to a standard field or custom
    const standardSums: Partial<Record<ExpenseKey, number>> = {};
    const customMap: Record<string, number> = {};

    relevant.forEach(w => {
      w.expenses.forEach(e => {
        const name = e.name.trim();
        if (!name) return;
        const matched = matchExpenseKey(name);
        if (matched) {
          standardSums[matched] = (standardSums[matched] || 0) + (parseFloat(e.amount) || 0);
        } else {
          customMap[name] = (customMap[name] || 0) + (parseFloat(e.amount) || 0);
        }
      });
    });

    // Reset auto-fillable standard fields, then apply matches
    const filled = new Set<ExpenseKey>();
    const patch: Partial<Record<ExpenseKey, string>> = {
      electricity: "", phone: "", pettyCash: "", maintenance: "", miscellaneous: "",
    };
    (Object.entries(standardSums) as [ExpenseKey, number][]).forEach(([k, v]) => {
      if (v > 0) { patch[k] = String(parseFloat(v.toFixed(2))); filled.add(k); }
    });
    setExpenses(prev => ({ ...prev, ...patch }));
    setAutoFilledFields(filled);

    // Unmatched items → custom expenses
    const loaded = Object.entries(customMap)
      .filter(([, amt]) => amt > 0)
      .map(([name, amt], i) => ({ id: Date.now() + i, name, amount: String(parseFloat(amt.toFixed(2))) }));
    setCustomExpenses(loaded);

    setWeeklySource({
      count: relevant.length,
      weeks: relevant.map(w => {
        const s = new Date(w.weekStart);
        const e = new Date(w.weekEnd);
        return `${s.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
      }),
    });
  }, []);

  // Auto-apply when creating a new report and month/year changes
  useEffect(() => {
    if (!editId && allWeekly.length > 0) {
      applyWeeklyData(month, year, allWeekly);
    }
  }, [month, year, allWeekly, editId, applyWeeklyData]);

  // Calculations
  const totalSales = Object.values(sales).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    + customExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  const grossProfit = totalSales - (parseFloat(cogs) || 0);
  const netProfit = grossProfit - totalExpenses;

  const resetForm = () => {
    setReportId(null);
    setMonth(new Date().getMonth());
    setYear(new Date().getFullYear());
    setSales({ oyarifa: "", ghanaFlag: "", madina: "" });
    setCogs("");
    setExpenses({ salaries: "", rent: "", electricity: "", phone: "", pettyCash: "", maintenance: "", miscellaneous: "" });
    setCustomExpenses([]);
    setWeeklySource(null);
    setAutoFilledFields(new Set());
  };

  // Save report
  const handleSave = async () => {
    if (totalSales === 0) {
      alert("Please enter sales figures before saving.");
      return;
    }
    setSaving(true);
    const payload = {
      month, year, sales, cogs, expenses, customExpenses,
      totals: { totalSales, grossProfit, netProfit, totalExpenses },
    };
    try {
      if (reportId) {
        await monthlyReports.update(reportId, payload);
        alert(`Report updated for ${MONTHS[month]} ${year}!`);
        router.push("/history");
      } else {
        const created = await monthlyReports.create(payload);
        alert(`Report saved for ${MONTHS[month]} ${year}!`);
        router.push(`/monthly?edit=${created.id}`);
      }
    } catch (e: unknown) {
      alert(`Failed to save: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  // Clear form for new report
  const handleNew = () => {
    setReportId(null);
    setMonth(new Date().getMonth());
    setYear(new Date().getFullYear());
    setSales({ oyarifa: "", ghanaFlag: "", madina: "" });
    setCogs("");
    setExpenses({
      salaries: "",
      rent: "",
      electricity: "",
      phone: "",
      pettyCash: "",
      maintenance: "",
      miscellaneous: ""
    });
    setCustomExpenses([]);
    router.push("/");
  };

  // Add custom expense
  const addCustomExpense = () => {
    if (newExpenseName.trim()) {
      setCustomExpenses([...customExpenses, {
        id: Date.now(),
        name: newExpenseName.trim(),
        amount: ""
      }]);
      setNewExpenseName("");
    }
  };
  // Handle file upload data
const handleFileData = (data: {
  sales: { oyarifa: string; ghanaFlag: string; madina: string };
  cogs: string;
  expenses: Record<string, string>;
  customExpenses: { id: number; name: string; amount: string }[];
}) => {
  setSales(data.sales);
  setCogs(data.cogs);
  setExpenses(prev => ({ ...prev, ...data.expenses }));
  if (data.customExpenses.length > 0) {
    setCustomExpenses(prev => [...prev, ...data.customExpenses]);
  }
};

  // Remove custom expense
  const removeCustomExpense = (id: number) => {
    setCustomExpenses(customExpenses.filter(exp => exp.id !== id));
  };

  // Update custom expense amount
  const updateCustomExpense = (id: number, amount: string) => {
    setCustomExpenses(customExpenses.map(exp => 
      exp.id === id ? { ...exp, amount } : exp
    ));
  };

  return (
    <ProtectedLayout>
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {reportId ? "Edit Report" : "Monthly Financial Report"}
          </h1>
          <p className="text-slate-500">
            {reportId 
              ? `Editing ${MONTHS[month]} ${year}` 
              : "Enter your branch sales, costs, and expenses to generate the dashboard"
            }
          </p>
        </div>
        {reportId && (
          <button
            onClick={handleNew}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors"
          >
            + New Report
          </button>
        )}
      </div>
      {/* File Upload */}
{!reportId && <FileUpload onDataParsed={handleFileData} />}

      {/* Live Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Total Sales</p>
          <p className="text-2xl font-bold text-slate-800">GHS {totalSales.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Gross Profit</p>
          <p className={`text-2xl font-bold ${grossProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            GHS {grossProfit.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Net Profit</p>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            GHS {netProfit.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-slate-800">GHS {totalExpenses.toLocaleString()}</p>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Report Period</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Branch Sales */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Sales Revenue by Branch</h2>
            {weeklySource ? (
              <p className="text-xs text-emerald-600 mt-0.5">
                Loaded from {weeklySource.count} weekly report{weeklySource.count !== 1 ? "s" : ""}
                <span className="text-slate-400 ml-1">({weeklySource.weeks.join(", ")})</span>
              </p>
            ) : allWeekly.length > 0 ? (
              <p className="text-xs text-slate-400 mt-0.5">No weekly reports found for {MONTHS[month]} {year}</p>
            ) : null}
          </div>
          <button
            onClick={() => applyWeeklyData(month, year, allWeekly)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Load from weekly
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Oyarifa Branch</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">GHS</span>
              <input
                type="number"
                placeholder="0.00"
                value={sales.oyarifa}
                onChange={(e) => setSales({ ...sales, oyarifa: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-14 pr-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Ghana Flag Branch</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">GHS</span>
              <input
                type="number"
                placeholder="0.00"
                value={sales.ghanaFlag}
                onChange={(e) => setSales({ ...sales, ghanaFlag: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-14 pr-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Madina Branch</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">GHS</span>
              <input
                type="number"
                placeholder="0.00"
                value={sales.madina}
                onChange={(e) => setSales({ ...sales, madina: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-14 pr-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cost of Goods Sold */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Cost of Goods Sold</h2>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">Total Purchases (All Suppliers)</label>
          <div className="relative max-w-md">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">GHS</span>
            <input
              type="number"
              placeholder="0.00"
              value={cogs}
              onChange={(e) => setCogs(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-14 pr-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Operating Expenses */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Operating Expenses</h2>
        <div className="space-y-4">
          {[
            { key: "salaries",      label: "Salaries & Wages" },
            { key: "rent",          label: "Rent" },
            { key: "electricity",   label: "Electricity" },
            { key: "phone",         label: "Data / Internet" },
            { key: "pettyCash",     label: "Petty Cash" },
            { key: "maintenance",   label: "Maintenance & Repairs" },
            { key: "miscellaneous", label: "Miscellaneous" },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-4">
              <label className="w-48 text-sm font-medium text-slate-600 flex items-center gap-1.5">
                {item.label}
                {autoFilledFields.has(item.key as ExpenseKey) && (
                  <span className="text-xs font-normal text-emerald-500">· from weekly</span>
                )}
              </label>
              <div className="relative flex-1 max-w-xs">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">GHS</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={expenses[item.key as keyof typeof expenses]}
                  onChange={(e) => setExpenses({ ...expenses, [item.key]: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-14 pr-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>
          ))}

          {/* Weekly-sourced + manual custom expenses */}
          {customExpenses.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-500">
                  {weeklySource ? `Weekly operating expenses (${weeklySource.count} weeks)` : "Additional expenses"}
                </p>
                {weeklySource && (
                  <button
                    onClick={() => applyWeeklyData(month, year, allWeekly)}
                    className="flex items-center gap-1 text-xs text-sky-500 hover:text-sky-700 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Reload
                  </button>
                )}
              </div>
            </div>
          )}
          {customExpenses.map((expense) => (
            <div key={expense.id} className="flex items-center gap-4">
              <label className="w-48 text-sm font-medium text-slate-600">{expense.name}</label>
              <div className="relative flex-1 max-w-xs">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">GHS</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={expense.amount}
                  onChange={(e) => updateCustomExpense(expense.id, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-14 pr-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => removeCustomExpense(expense.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Add New Expense */}
          <div className="flex items-center gap-4 pt-4 border-t border-slate-100 mt-4">
            <input
              type="text"
              placeholder="Add extra expense (e.g. Salaries, Insurance)..."
              value={newExpenseName}
              onChange={(e) => setNewExpenseName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addCustomExpense()}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
            <button
              onClick={addCustomExpense}
              className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors"
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
       <button 
  onClick={() => setShowDashboard(true)}
  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors"
>
  Preview Dashboard
</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-white font-medium shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : reportId ? "Update Report" : "Save Report"}
        </button>
      </div>
      {/* Dashboard Modal */}
      <DashboardModal
        isOpen={showDashboard}
        onClose={() => setShowDashboard(false)}
        data={{
          month,
          year,
          sales,
          cogs,
          expenses,
          customExpenses,
          totals: {
            totalSales,
            grossProfit,
            netProfit,
            totalExpenses
          }
        }}
      />
    </div>
    </ProtectedLayout>
  );
}
export default function Home() {
  return <Suspense><MonthlyContent /></Suspense>;
}
