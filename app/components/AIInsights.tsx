"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

type AIInsightsProps = {
  data: {
    month: number;
    year: number;
    sales: { oyarifa: string; ghanaFlag: string; madina: string };
    cogs: string;
    expenses: Record<string, string>;
    customExpenses: { id: number; name: string; amount: string }[];
    totals: {
      totalSales: number;
      grossProfit: number;
      netProfit: number;
      totalExpenses: number;
    };
  };
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function AIInsights({ data }: AIInsightsProps) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { month, year, sales, cogs, expenses, customExpenses, totals } = data;
  
  const grossMargin = totals.totalSales > 0 ? (totals.grossProfit / totals.totalSales * 100) : 0;
  const netMargin = totals.totalSales > 0 ? (totals.netProfit / totals.totalSales * 100) : 0;
  const cogsPercent = totals.totalSales > 0 ? ((parseFloat(cogs) || 0) / totals.totalSales * 100) : 0;
  const expensePercent = totals.totalSales > 0 ? (totals.totalExpenses / totals.totalSales * 100) : 0;

  // Calculate branch performance
  const branches = [
    { name: "Oyarifa", value: parseFloat(sales.oyarifa) || 0 },
    { name: "Ghana Flag", value: parseFloat(sales.ghanaFlag) || 0 },
    { name: "Madina", value: parseFloat(sales.madina) || 0 },
  ];
  const topBranch = branches.reduce((a, b) => a.value > b.value ? a : b);
  const lowBranch = branches.reduce((a, b) => a.value < b.value ? a : b);

  // All expenses sorted
  const allExpenses = [
    { name: "Salaries & Wages", amount: parseFloat(expenses.salaries) || 0 },
    { name: "Rent", amount: parseFloat(expenses.rent) || 0 },
    { name: "Electricity", amount: parseFloat(expenses.electricity) || 0 },
    { name: "Phone & Internet", amount: parseFloat(expenses.phone) || 0 },
    { name: "Petty Cash", amount: parseFloat(expenses.pettyCash) || 0 },
    { name: "Maintenance", amount: parseFloat(expenses.maintenance) || 0 },
    { name: "Miscellaneous", amount: parseFloat(expenses.miscellaneous) || 0 },
    ...customExpenses.map(e => ({ name: e.name, amount: parseFloat(e.amount) || 0 }))
  ].filter(e => e.amount > 0).sort((a, b) => b.amount - a.amount);

  const topExpense = allExpenses[0];

  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: MONTHS[month],
          year,
          totalSales: totals.totalSales,
          grossProfit: totals.grossProfit,
          netProfit: totals.netProfit,
          totalExpenses: totals.totalExpenses,
          grossMargin,
          netMargin,
          cogsPercent,
          expensePercent,
          branches,
          topBranch,
          lowBranch,
          expenses: allExpenses,
          topExpense,
          cogs: parseFloat(cogs) || 0
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate insights");
      }

      const result = await response.json();
      setInsights(result.insights);
    } catch (err) {
      setError("Failed to generate AI insights. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Generate quick local insights if AI is not available
  const getQuickInsights = () => {
    const insights = [];
    
    // Profitability analysis
    if (netMargin >= 20) {
      insights.push({ type: "success", text: `Excellent profitability! Net margin of ${netMargin.toFixed(1)}% is well above the 10-15% industry benchmark for retail pharmacies.` });
    } else if (netMargin >= 10) {
      insights.push({ type: "success", text: `Healthy profitability with ${netMargin.toFixed(1)}% net margin. This is within the expected range for retail pharmacies.` });
    } else if (netMargin > 0) {
      insights.push({ type: "warning", text: `Net margin of ${netMargin.toFixed(1)}% is below optimal. Target 10-15% for sustainable growth.` });
    } else {
      insights.push({ type: "danger", text: `Operating at a loss with ${netMargin.toFixed(1)}% margin. Immediate cost review required.` });
    }

    // COGS analysis
    if (cogsPercent > 75) {
      insights.push({ type: "warning", text: `COGS at ${cogsPercent.toFixed(1)}% is high. Consider negotiating better supplier terms or reviewing pricing strategy.` });
    } else if (cogsPercent < 60) {
      insights.push({ type: "success", text: `COGS at ${cogsPercent.toFixed(1)}% shows strong purchasing efficiency and healthy margins.` });
    }

    // Branch performance
    if (topBranch.value > 0 && lowBranch.value > 0) {
      const gap = ((topBranch.value - lowBranch.value) / topBranch.value * 100);
      if (gap > 30) {
        insights.push({ type: "warning", text: `${lowBranch.name} branch is underperforming by ${gap.toFixed(0)}% compared to ${topBranch.name}. Investigate local market conditions or operational issues.` });
      } else {
        insights.push({ type: "success", text: `Balanced branch performance. ${topBranch.name} leads but all branches are contributing effectively.` });
      }
    }

    // Expense analysis
    if (topExpense && totals.totalExpenses > 0) {
      const expenseShare = (topExpense.amount / totals.totalExpenses * 100);
      if (expenseShare > 50) {
        insights.push({ type: "warning", text: `${topExpense.name} accounts for ${expenseShare.toFixed(0)}% of expenses. Review if this allocation is optimal.` });
      }
    }

    // Operating expense ratio
    if (expensePercent > 25) {
      insights.push({ type: "warning", text: `Operating expenses at ${expensePercent.toFixed(1)}% of revenue. Target below 20% for better profitability.` });
    } else if (expensePercent < 15) {
      insights.push({ type: "success", text: `Operating expenses well controlled at ${expensePercent.toFixed(1)}% of revenue.` });
    }

    return insights;
  };

  const quickInsights = getQuickInsights();

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 max-h-[500px] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Financial Insights</h3>
            <p className="text-sm text-slate-400">Powered by intelligent analysis</p>
          </div>
        </div>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Deep Analysis
            </>
          )}
        </button>
      </div>

      {/* Quick Insights */}
      <div className="space-y-3 mb-4">
        {quickInsights.map((insight, i) => (
          <div 
            key={i} 
            className={`flex items-start gap-3 p-4 rounded-xl ${
              insight.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20" :
              insight.type === "warning" ? "bg-amber-500/10 border border-amber-500/20" :
              "bg-red-500/10 border border-red-500/20"
            }`}
          >
            {insight.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : insight.type === "warning" ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm text-slate-300">{insight.text}</p>
          </div>
        ))}
      </div>

      {/* AI Generated Insights */}
      {insights && (
        <div className="mt-6 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-violet-400">AI Deep Analysis</span>
          </div>
          <div className="text-sm text-slate-300 whitespace-pre-wrap">{insights}</div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}