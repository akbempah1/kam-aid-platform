"use client";
import ProtectedLayout from "../components/ProtectedLayout";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Calendar, Plus, Trash2, Save, Eye, X, Download } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const BRANCHES = ["Oyarifa", "Ghana Flag", "Madina"];

type DailySales = {
  [key: string]: { [branch: string]: string };
};

type WeeklyExpense = {
  id: number;
  name: string;
  amount: string;
  branch: string;
};

type InventoryIssue = {
  id: number;
  item: string;
  issue: string;
  branch: string;
};

export default function WeeklyReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");

  const [reportId, setReportId] = useState<number | null>(null);
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [dailySales, setDailySales] = useState<DailySales>(() => {
    const initial: DailySales = {};
    DAYS.forEach(day => {
      initial[day] = {};
      BRANCHES.forEach(branch => {
        initial[day][branch] = "";
      });
    });
    return initial;
  });
  const [expenses, setExpenses] = useState<WeeklyExpense[]>([]);
  const [newExpense, setNewExpense] = useState({ name: "", amount: "", branch: "Oyarifa" });
  const [issues, setIssues] = useState<InventoryIssue[]>([]);
  const [newIssue, setNewIssue] = useState({ item: "", issue: "", branch: "Oyarifa" });
  const [showPreview, setShowPreview] = useState(false);

  // Load report if editing
  useEffect(() => {
    if (editId) {
      const reports = JSON.parse(localStorage.getItem("kam_aid_weekly_reports") || "[]");
      const report = reports.find((r: any) => r.id === parseInt(editId));
      if (report) {
        setReportId(report.id);
        setWeekStart(report.weekStart);
        setWeekEnd(report.weekEnd);
        setDailySales(report.dailySales);
        setExpenses(report.expenses || []);
        setIssues(report.issues || []);
      }
    }
  }, [editId]);

  // Calculate totals
  const getTotalByBranch = (branch: string) => {
    return DAYS.reduce((sum, day) => sum + (parseFloat(dailySales[day][branch]) || 0), 0);
  };

  const getTotalByDay = (day: string) => {
    return BRANCHES.reduce((sum, branch) => sum + (parseFloat(dailySales[day][branch]) || 0), 0);
  };

  const grandTotalSales = BRANCHES.reduce((sum, branch) => sum + getTotalByBranch(branch), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

  // Update daily sales
  const updateSales = (day: string, branch: string, value: string) => {
    setDailySales(prev => ({
      ...prev,
      [day]: { ...prev[day], [branch]: value }
    }));
  };

  // Add expense
  const addExpense = () => {
    if (newExpense.name && newExpense.amount) {
      setExpenses([...expenses, { ...newExpense, id: Date.now(), amount: newExpense.amount }]);
      setNewExpense({ name: "", amount: "", branch: "Oyarifa" });
    }
  };

  // Remove expense
  const removeExpense = (id: number) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  // Add issue
  const addIssue = () => {
    if (newIssue.item && newIssue.issue) {
      setIssues([...issues, { ...newIssue, id: Date.now() }]);
      setNewIssue({ item: "", issue: "", branch: "Oyarifa" });
    }
  };

  // Remove issue
  const removeIssue = (id: number) => {
    setIssues(issues.filter(i => i.id !== id));
  };

  // Save report
  const saveReport = () => {
    if (!weekStart || !weekEnd) {
      alert("Please select the week start and end dates");
      return;
    }

    const report = {
      id: reportId || Date.now(),
      weekStart,
      weekEnd,
      dailySales,
      expenses,
      issues,
      totals: {
        grandTotalSales,
        totalExpenses,
        byBranch: BRANCHES.reduce((acc, branch) => {
          acc[branch] = getTotalByBranch(branch);
          return acc;
        }, {} as Record<string, number>)
      },
      createdAt: new Date().toISOString()
    };

    const existing = JSON.parse(localStorage.getItem("kam_aid_weekly_reports") || "[]");
    
    if (reportId) {
      const index = existing.findIndex((r: any) => r.id === reportId);
      if (index !== -1) {
        existing[index] = report;
      }
    } else {
      existing.push(report);
    }

    localStorage.setItem("kam_aid_weekly_reports", JSON.stringify(existing));
    alert(`Weekly report ${reportId ? "updated" : "saved"}!`);
    
    if (reportId) {
      router.push("/history");
    }
  };

  // Clear form
  const clearForm = () => {
    setReportId(null);
    setWeekStart("");
    setWeekEnd("");
    setDailySales(() => {
      const initial: DailySales = {};
      DAYS.forEach(day => {
        initial[day] = {};
        BRANCHES.forEach(branch => {
          initial[day][branch] = "";
        });
      });
      return initial;
    });
    setExpenses([]);
    setIssues([]);
    router.push("/weekly");
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Export PDF
  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to export PDF");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>KAM AID Weekly Report - ${formatDate(weekStart)} to ${formatDate(weekEnd)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            background: white;
            color: #1e293b;
            line-height: 1.5;
          }
          .header { 
            display: flex; 
            align-items: center; 
            gap: 20px; 
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
          }
          .logo { 
            width: 50px; 
            height: 50px; 
            background: linear-gradient(135deg, #8b5cf6, #7c3aed); 
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
          }
          .title { font-size: 28px; font-weight: 700; color: #1e293b; }
          .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
          
          .kpi-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 16px; 
            margin-bottom: 30px; 
          }
          .kpi-card { 
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            border: 1px solid #e2e8f0; 
            border-radius: 16px; 
            padding: 20px; 
          }
          .kpi-card.highlight {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            border: none;
          }
          .kpi-card.highlight .kpi-label { color: rgba(255,255,255,0.8); }
          .kpi-card.highlight .kpi-value { color: white; }
          .kpi-label { 
            font-size: 11px; 
            font-weight: 600; 
            text-transform: uppercase; 
            color: #64748b; 
            margin-bottom: 8px; 
          }
          .kpi-value { 
            font-size: 24px; 
            font-weight: 700; 
            color: #1e293b; 
          }
          .kpi-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
          
          .section { margin-bottom: 30px; }
          .section-title { 
            font-size: 14px; 
            font-weight: 700; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
            color: #1e293b; 
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #8b5cf6;
            display: inline-block;
          }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { 
            font-size: 11px; 
            font-weight: 700; 
            color: #64748b; 
            text-transform: uppercase;
            background: #f8fafc;
          }
          td { font-size: 14px; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .total-row { background: #f1f5f9; font-weight: 700; }
          
          .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
          
          .expense-item {
            display: flex;
            justify-content: space-between;
            padding: 12px;
            background: #f8fafc;
            border-radius: 8px;
            margin-bottom: 8px;
          }
          .expense-name { font-weight: 500; }
          .expense-branch { font-size: 12px; color: #64748b; }
          .expense-amount { font-weight: 700; }
          
          .issue-item {
            padding: 12px;
            background: #fef3c7;
            border: 1px solid #fcd34d;
            border-radius: 8px;
            margin-bottom: 8px;
          }
          .issue-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .issue-product { font-weight: 600; }
          .issue-branch { font-size: 11px; background: white; padding: 2px 8px; border-radius: 10px; }
          .issue-desc { font-size: 13px; color: #92400e; }
          
          .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 2px solid #e2e8f0; 
            text-align: center; 
          }
          .footer-title { font-size: 14px; font-weight: 700; color: #1e293b; }
          .footer-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
          
          @media print {
            body { padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">📅</div>
          <div>
            <div class="title">Weekly Operating Report</div>
            <div class="subtitle">${formatDate(weekStart)} - ${formatDate(weekEnd)} • KAM AID Pharmacy</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card highlight">
            <div class="kpi-label">Total Weekly Sales</div>
            <div class="kpi-value">GHS ${grandTotalSales.toLocaleString()}</div>
          </div>
          ${BRANCHES.map(branch => `
            <div class="kpi-card">
              <div class="kpi-label">${branch}</div>
              <div class="kpi-value">GHS ${getTotalByBranch(branch).toLocaleString()}</div>
              <div class="kpi-sub">${grandTotalSales > 0 ? ((getTotalByBranch(branch) / grandTotalSales) * 100).toFixed(1) : 0}% of total</div>
            </div>
          `).join('')}
        </div>

        <div class="section">
          <div class="section-title">Daily Sales Breakdown</div>
          <table>
            <thead>
              <tr>
                <th>Day</th>
                ${BRANCHES.map(b => `<th class="text-right">${b}</th>`).join('')}
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${DAYS.map(day => `
                <tr>
                  <td>${day}</td>
                  ${BRANCHES.map(branch => `
                    <td class="text-right">GHS ${(parseFloat(dailySales[day][branch]) || 0).toLocaleString()}</td>
                  `).join('')}
                  <td class="text-right font-bold">GHS ${getTotalByDay(day).toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td>Weekly Total</td>
                ${BRANCHES.map(branch => `
                  <td class="text-right">GHS ${getTotalByBranch(branch).toLocaleString()}</td>
                `).join('')}
                <td class="text-right">GHS ${grandTotalSales.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="two-col">
          <div class="section">
            <div class="section-title">Weekly Expenses (GHS ${totalExpenses.toLocaleString()})</div>
            ${expenses.length > 0 ? expenses.map(exp => `
              <div class="expense-item">
                <div>
                  <div class="expense-name">${exp.name}</div>
                  <div class="expense-branch">${exp.branch}</div>
                </div>
                <div class="expense-amount">GHS ${parseFloat(exp.amount).toLocaleString()}</div>
              </div>
            `).join('') : '<p style="color: #94a3b8; text-align: center; padding: 20px;">No expenses recorded</p>'}
          </div>

          <div class="section">
            <div class="section-title">Inventory Issues (${issues.length})</div>
            ${issues.length > 0 ? issues.map(issue => `
              <div class="issue-item">
                <div class="issue-header">
                  <span class="issue-product">${issue.item}</span>
                  <span class="issue-branch">${issue.branch}</span>
                </div>
                <div class="issue-desc">${issue.issue}</div>
              </div>
            `).join('') : '<p style="color: #94a3b8; text-align: center; padding: 20px;">No issues reported</p>'}
          </div>
        </div>

        <div class="footer">
          <div class="footer-title">KAM AID Pharmacy • Weekly Operating Report</div>
          <div class="footer-sub">Generated on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  return (
     <ProtectedLayout>
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {reportId ? "Edit Weekly Report" : "Weekly Operating Report"}
          </h1>
          <p className="text-slate-500">
            {reportId 
              ? `Editing report for ${formatDate(weekStart)} - ${formatDate(weekEnd)}`
              : "Track daily sales, expenses, and inventory issues by branch"
            }
          </p>
        </div>
        {reportId && (
          <button
            onClick={clearForm}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Report
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Total Weekly Sales</p>
          <p className="text-2xl font-bold text-slate-800">GHS {grandTotalSales.toLocaleString()}</p>
        </div>
        {BRANCHES.map(branch => (
          <div key={branch} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">{branch}</p>
            <p className="text-2xl font-bold text-sky-600">GHS {getTotalByBranch(branch).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Week Selection */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sky-500" />
          Report Period
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Week Start</label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Week End</label>
            <input
              type="date"
              value={weekEnd}
              onChange={(e) => setWeekEnd(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Daily Sales Matrix */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Daily Sales by Branch</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Day</th>
                {BRANCHES.map(branch => (
                  <th key={branch} className="text-left py-3 px-4 text-sm font-semibold text-slate-600">{branch}</th>
                ))}
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Day Total</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => (
                <tr key={day} className="border-b border-slate-100">
                  <td className="py-3 px-4 font-medium text-slate-800">{day}</td>
                  {BRANCHES.map(branch => (
                    <td key={branch} className="py-3 px-4">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">GHS</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={dailySales[day][branch]}
                          onChange={(e) => updateSales(day, branch, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-12 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </td>
                  ))}
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    GHS {getTotalByDay(day).toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td className="py-3 px-4 font-semibold text-slate-800">Branch Total</td>
                {BRANCHES.map(branch => (
                  <td key={branch} className="py-3 px-4 font-semibold text-sky-600">
                    GHS {getTotalByBranch(branch).toLocaleString()}
                  </td>
                ))}
                <td className="py-3 px-4 font-bold text-slate-800">
                  GHS {grandTotalSales.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly Expenses */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Weekly Expenses</h2>
          <span className="text-sm font-semibold text-slate-600">
            Total: GHS {totalExpenses.toLocaleString()}
          </span>
        </div>

        {expenses.length > 0 && (
          <div className="space-y-3 mb-4">
            {expenses.map(expense => (
              <div key={expense.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{expense.name}</p>
                  <p className="text-sm text-slate-500">{expense.branch}</p>
                </div>
                <p className="font-semibold text-slate-800">GHS {parseFloat(expense.amount).toLocaleString()}</p>
                <button
                  onClick={() => removeExpense(expense.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <input
            type="text"
            placeholder="Expense name"
            value={newExpense.name}
            onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">GHS</span>
            <input
              type="number"
              placeholder="Amount"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-14 pr-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <select
            value={newExpense.branch}
            onChange={(e) => setNewExpense({ ...newExpense, branch: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {BRANCHES.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
            <option value="All">All Branches</option>
          </select>
          <button
            onClick={addExpense}
            className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Inventory Issues */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Inventory Issues & Notes</h2>

        {issues.length > 0 && (
          <div className="space-y-3 mb-4">
            {issues.map(issue => (
              <div key={issue.id} className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{issue.item}</p>
                  <p className="text-sm text-amber-700">{issue.issue}</p>
                </div>
                <span className="text-sm font-medium text-slate-600 bg-white px-3 py-1 rounded-full">
                  {issue.branch}
                </span>
                <button
                  onClick={() => removeIssue(issue.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <input
            type="text"
            placeholder="Item/Product"
            value={newIssue.item}
            onChange={(e) => setNewIssue({ ...newIssue, item: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <input
            type="text"
            placeholder="Issue description"
            value={newIssue.issue}
            onChange={(e) => setNewIssue({ ...newIssue, issue: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <select
            value={newIssue.branch}
            onChange={(e) => setNewIssue({ ...newIssue, branch: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {BRANCHES.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
            <option value="All">All Branches</option>
          </select>
          <button
            onClick={addIssue}
            className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={clearForm}
          className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors"
        >
          Clear Form
        </button>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowPreview(true)}
            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={saveReport}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-white font-medium shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {reportId ? "Update Report" : "Save Report"}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 px-8 py-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Weekly Operating Report</h2>
                  <p className="text-slate-500">{formatDate(weekStart)} - {formatDate(weekEnd)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* KPIs */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-6 text-white">
                  <p className="text-sm opacity-80 mb-1">Total Sales</p>
                  <p className="text-3xl font-bold">GHS {grandTotalSales.toLocaleString()}</p>
                </div>
                {BRANCHES.map(branch => (
                  <div key={branch} className="bg-white border border-slate-200 rounded-2xl p-6">
                    <p className="text-sm text-slate-500 mb-1">{branch}</p>
                    <p className="text-2xl font-bold text-slate-800">GHS {getTotalByBranch(branch).toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {grandTotalSales > 0 ? ((getTotalByBranch(branch) / grandTotalSales) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                ))}
              </div>

              {/* Daily Breakdown Table */}
              <div className="bg-slate-50 rounded-2xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Daily Sales Breakdown</h3>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Day</th>
                      {BRANCHES.map(branch => (
                        <th key={branch} className="text-right py-3 px-4 text-sm font-semibold text-slate-600">{branch}</th>
                      ))}
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map(day => (
                      <tr key={day} className="border-b border-slate-100">
                        <td className="py-3 px-4 font-medium text-slate-800">{day}</td>
                        {BRANCHES.map(branch => (
                          <td key={branch} className="py-3 px-4 text-right text-slate-600">
                            GHS {(parseFloat(dailySales[day][branch]) || 0).toLocaleString()}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-right font-semibold text-slate-800">
                          GHS {getTotalByDay(day).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Expenses & Issues Grid */}
              <div className="grid grid-cols-2 gap-6">
                {/* Expenses */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    Weekly Expenses
                    <span className="text-sm font-normal text-slate-500 ml-2">
                      (GHS {totalExpenses.toLocaleString()})
                    </span>
                  </h3>
                  {expenses.length > 0 ? (
                    <div className="space-y-3">
                      {expenses.map(expense => (
                        <div key={expense.id} className="flex justify-between items-center py-2 border-b border-slate-100">
                          <div>
                            <p className="font-medium text-slate-800">{expense.name}</p>
                            <p className="text-xs text-slate-500">{expense.branch}</p>
                          </div>
                          <p className="font-semibold text-slate-800">GHS {parseFloat(expense.amount).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">No expenses recorded</p>
                  )}
                </div>

                {/* Issues */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    Inventory Issues
                    <span className="text-sm font-normal text-slate-500 ml-2">
                      ({issues.length} items)
                    </span>
                  </h3>
                  {issues.length > 0 ? (
                    <div className="space-y-3">
                      {issues.map(issue => (
                        <div key={issue.id} className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <div className="flex justify-between items-start">
                            <p className="font-medium text-slate-800">{issue.item}</p>
                            <span className="text-xs bg-white px-2 py-1 rounded-full text-slate-600">{issue.branch}</span>
                          </div>
                          <p className="text-sm text-amber-700 mt-1">{issue.issue}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-8">No issues reported</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-8 py-5 flex justify-between items-center">
              <p className="text-sm text-slate-400">
                Generated on {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={exportPDF}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedLayout>
  );
}