"use client";
import { X } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface ReportViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "monthly" | "weekly" | "branch" | "shortages";
  data: any;
}

export default function ReportViewModal({ isOpen, onClose, type, data }: ReportViewModalProps) {
  if (!isOpen || !data) return null;

  const renderMonthlyContent = () => {
    const sales = data.sales || {};
    const expenses = data.expenses || {};
    const customExpenses = data.customExpenses || [];
    const totals = data.totals || {};

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Sales Revenue by Branch</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { branch: "Oyarifa", value: sales.oyarifa },
              { branch: "Ghana Flag", value: sales.ghanaFlag },
              { branch: "Madina", value: sales.madina },
            ].map(({ branch, value }) => (
              <div key={branch} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">{branch}</p>
                <p className="text-lg font-semibold text-slate-800">GHS {parseFloat(value || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Cost of Goods Sold</h3>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-lg font-semibold text-slate-800">GHS {parseFloat(data.cogs || 0).toLocaleString()}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Operating Expenses</h3>
          <div className="space-y-2">
            {[
              { key: "salaries", label: "Salaries & Wages" },
              { key: "rent", label: "Rent" },
              { key: "electricity", label: "Electricity" },
              { key: "phone", label: "Data / Internet" },
              { key: "pettyCash", label: "Petty Cash" },
              { key: "maintenance", label: "Maintenance & Repairs" },
              { key: "miscellaneous", label: "Miscellaneous" },
            ].map(({ key, label }) => {
              const value = expenses[key as keyof typeof expenses];
              if (!value) return null;
              return (
                <div key={key} className="flex justify-between items-center bg-slate-50 rounded-lg p-2 px-3">
                  <p className="text-sm text-slate-600">{label}</p>
                  <p className="font-semibold text-slate-800">GHS {parseFloat(value).toLocaleString()}</p>
                </div>
              );
            })}
            {customExpenses.length > 0 && (
              <>
                <div className="border-t border-slate-200 pt-2 mt-2"></div>
                {customExpenses.map((expense: any) => (
                  <div key={expense.id} className="flex justify-between items-center bg-slate-50 rounded-lg p-2 px-3">
                    <p className="text-sm text-slate-600">{expense.name}</p>
                    <p className="font-semibold text-slate-800">GHS {parseFloat(expense.amount || 0).toLocaleString()}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 pt-4 border-t border-slate-200">
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-emerald-600 font-semibold">Total Sales</p>
            <p className="text-lg font-bold text-emerald-700">GHS {parseFloat(totals.totalSales || 0).toLocaleString()}</p>
          </div>
          <div className={`rounded-lg p-3 ${totals.grossProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
            <p className={`text-xs font-semibold ${totals.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>Gross Profit</p>
            <p className={`text-lg font-bold ${totals.grossProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>GHS {parseFloat(totals.grossProfit || 0).toLocaleString()}</p>
          </div>
          <div className={`rounded-lg p-3 ${totals.netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
            <p className={`text-xs font-semibold ${totals.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>Net Profit</p>
            <p className={`text-lg font-bold ${totals.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>GHS {parseFloat(totals.netProfit || 0).toLocaleString()}</p>
          </div>
          <div className="bg-slate-100 rounded-lg p-3">
            <p className="text-xs text-slate-600 font-semibold">Total Expenses</p>
            <p className="text-lg font-bold text-slate-700">GHS {parseFloat(totals.totalExpenses || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderWeeklyContent = () => {
    const dailySales = data.dailySales || {};
    const expenses = data.expenses || [];
    const issues = data.issues || [];
    const BRANCHES = ["Oyarifa", "Ghana Flag", "Madina"];
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const getTotalByBranch = (branch: string) =>
      DAYS.reduce((sum, day) => sum + (parseFloat(dailySales[day]?.[branch] || "0") || 0), 0);
    const getTotalByDay = (day: string) =>
      BRANCHES.reduce((sum, branch) => sum + (parseFloat(dailySales[day]?.[branch] || "0") || 0), 0);
    const grandTotal = BRANCHES.reduce((sum, b) => sum + getTotalByBranch(b), 0);

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Daily Sales by Branch</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">Day</th>
                  {BRANCHES.map(b => (
                    <th key={b} className="text-right py-2 px-2 text-xs font-semibold text-slate-500">{b}</th>
                  ))}
                  <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day} className="border-b border-slate-100">
                    <td className="py-2 px-2 font-medium text-slate-700">{day}</td>
                    {BRANCHES.map(b => (
                      <td key={b} className="text-right py-2 px-2 text-slate-600">
                        GHS {(parseFloat(dailySales[day]?.[b] || "0") || 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="text-right py-2 px-2 font-semibold text-slate-700">
                      GHS {getTotalByDay(day).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td className="py-2 px-2 font-semibold text-slate-800">Total</td>
                  {BRANCHES.map(b => (
                    <td key={b} className="text-right py-2 px-2 font-semibold text-sky-600">
                      GHS {getTotalByBranch(b).toLocaleString()}
                    </td>
                  ))}
                  <td className="text-right py-2 px-2 font-bold text-slate-800">
                    GHS {grandTotal.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {expenses.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3">Weekly Expenses</h3>
            <div className="space-y-2">
              {expenses.map((exp: any) => (
                <div key={exp.id} className="flex justify-between items-center bg-slate-50 rounded-lg p-2 px-3">
                  <div>
                    <p className="font-medium text-slate-700">{exp.name}</p>
                    <p className="text-xs text-slate-500">{exp.branch}</p>
                  </div>
                  <p className="font-semibold text-slate-800">GHS {parseFloat(exp.amount || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {issues.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3">Inventory Issues</h3>
            <div className="space-y-2">
              {issues.map((issue: any) => (
                <div key={issue.id} className="bg-amber-50 border border-amber-200 rounded-lg p-2 px-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-slate-700">{issue.item}</p>
                      <p className="text-sm text-amber-700">{issue.issue}</p>
                    </div>
                    <p className="text-xs font-medium text-slate-600 ml-2">{issue.branch}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {type === "monthly" && `${MONTHS[data.month]} ${data.year}`}
              {type === "weekly" && `Week of ${new Date(data.weekStart).toLocaleDateString()}`}
            </h2>
            <p className="text-sm text-slate-500 mt-1">View Only</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {type === "monthly" && renderMonthlyContent()}
          {type === "weekly" && renderWeeklyContent()}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
