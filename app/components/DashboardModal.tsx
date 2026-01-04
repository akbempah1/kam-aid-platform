"use client";

import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import AIInsights from "./AIInsights";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { X, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

type DashboardModalProps = {
  isOpen: boolean;
  onClose: () => void;
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

export default function DashboardModal({ isOpen, onClose, data }: DashboardModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [onClose, isOpen]);

  const exportPDF = async () => {
  setExporting(true);

  try {
    // Get chart canvases and convert to images
    const chartCanvases = contentRef.current?.querySelectorAll('canvas');
    const chartImages: string[] = [];
    
    chartCanvases?.forEach(canvas => {
      chartImages.push((canvas as HTMLCanvasElement).toDataURL('image/png'));
    });

    // Get AI insights text
    const aiInsightsElement = contentRef.current?.querySelector('.ai-insights-content');
    const aiInsightsText = aiInsightsElement?.textContent || '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to export PDF");
      setExporting(false);
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>KAM AID Financial Report - ${MONTHS[month]} ${year}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            background: white;
            color: #1e293b;
            line-height: 1.5;
          }
          .page-break { page-break-before: always; }
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
            background: linear-gradient(135deg, #3b82f6, #06b6d4); 
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
          .kpi-label { 
            font-size: 10px; 
            font-weight: 700; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
            color: #64748b; 
            margin-bottom: 8px; 
          }
          .kpi-value { 
            font-size: 26px; 
            font-weight: 800; 
            color: #1e293b; 
          }
          .kpi-value.positive { color: #059669; }
          .kpi-value.negative { color: #dc2626; }
          .kpi-badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 20px;
            margin-top: 8px;
          }
          .kpi-badge.green { background: #d1fae5; color: #059669; }
          .kpi-badge.amber { background: #fef3c7; color: #d97706; }
          .kpi-badge.red { background: #fee2e2; color: #dc2626; }
          .kpi-badge.gray { background: #f1f5f9; color: #475569; }
          
          .section { margin-bottom: 30px; }
          .section-title { 
            font-size: 12px; 
            font-weight: 700; 
            text-transform: uppercase; 
            letter-spacing: 1px;
            color: #1e293b; 
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #3b82f6;
            display: inline-block;
          }
          
          .charts-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .chart-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 20px;
            text-align: center;
          }
          .chart-card img {
            max-width: 100%;
            height: auto;
            max-height: 200px;
          }
          .chart-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 12px;
          }
          
          .branch-table { 
            width: 100%; 
            border-collapse: collapse; 
            background: #f8fafc;
            border-radius: 12px;
            overflow: hidden;
          }
          .branch-table th, .branch-table td { 
            padding: 14px 16px; 
            text-align: left; 
          }
          .branch-table th { 
            font-size: 11px; 
            font-weight: 700; 
            color: #64748b; 
            text-transform: uppercase;
            background: #f1f5f9;
            border-bottom: 2px solid #e2e8f0;
          }
          .branch-table td {
            border-bottom: 1px solid #e2e8f0;
            font-weight: 500;
          }
          .branch-table tr:last-child td { border-bottom: none; }
          
          .expense-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .expense-item { 
            display: flex; 
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #f8fafc;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
          }
          .expense-name { font-weight: 500; color: #475569; }
          .expense-amount { font-weight: 700; color: #1e293b; }
          
          .ratio-section {
            background: #f8fafc;
            border-radius: 16px;
            padding: 24px;
            border: 1px solid #e2e8f0;
          }
          .ratio-item { margin-bottom: 20px; }
          .ratio-item:last-child { margin-bottom: 0; }
          .ratio-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .ratio-label { font-weight: 600; color: #475569; }
          .ratio-value { font-weight: 700; color: #1e293b; }
          .ratio-bar { 
            height: 10px; 
            background: #e2e8f0; 
            border-radius: 5px; 
            overflow: hidden; 
          }
          .ratio-fill { height: 100%; border-radius: 5px; }
          .ratio-fill.green { background: linear-gradient(90deg, #10b981, #059669); }
          .ratio-fill.blue { background: linear-gradient(90deg, #3b82f6, #2563eb); }
          .ratio-fill.purple { background: linear-gradient(90deg, #8b5cf6, #7c3aed); }
          .ratio-fill.amber { background: linear-gradient(90deg, #f59e0b, #d97706); }
          .ratio-fill.red { background: linear-gradient(90deg, #ef4444, #dc2626); }
          
          .ai-section {
            background: linear-gradient(135deg, #1e293b, #334155);
            border-radius: 16px;
            padding: 24px;
            color: white;
            margin-top: 30px;
          }
          .ai-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
          }
          .ai-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #8b5cf6, #a855f7);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
          }
          .ai-title { font-size: 16px; font-weight: 700; }
          .ai-subtitle { font-size: 12px; color: #94a3b8; }
          .ai-insight {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 14px 16px;
            margin-bottom: 12px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }
          .ai-insight:last-child { margin-bottom: 0; }
          .ai-insight-icon { font-size: 18px; }
          .ai-insight-text { font-size: 13px; line-height: 1.6; color: #e2e8f0; }
          .insight-success { border-left: 3px solid #10b981; }
          .insight-warning { border-left: 3px solid #f59e0b; }
          .insight-danger { border-left: 3px solid #ef4444; }
          
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
            .kpi-grid { grid-template-columns: repeat(4, 1fr); }
            .charts-grid { grid-template-columns: repeat(3, 1fr); }
            .ai-section { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">📊</div>
          <div>
            <div class="title">Financial Report</div>
            <div class="subtitle">${MONTHS[month]} ${year} • KAM AID Pharmacy</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total Revenue</div>
            <div class="kpi-value">GHS ${totals.totalSales.toLocaleString()}</div>
            <div class="kpi-badge gray">All branches</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Gross Profit</div>
            <div class="kpi-value positive">GHS ${totals.grossProfit.toLocaleString()}</div>
            <div class="kpi-badge ${grossMargin >= 30 ? 'green' : 'amber'}">${grossMargin.toFixed(1)}% margin</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Net Profit</div>
            <div class="kpi-value ${totals.netProfit >= 0 ? 'positive' : 'negative'}">GHS ${totals.netProfit.toLocaleString()}</div>
            <div class="kpi-badge ${netMargin >= 15 ? 'green' : netMargin >= 0 ? 'amber' : 'red'}">${netMargin.toFixed(1)}% margin</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Operating Expenses</div>
            <div class="kpi-value">GHS ${totals.totalExpenses.toLocaleString()}</div>
            <div class="kpi-badge gray">${expensePercent.toFixed(1)}% of revenue</div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-card">
            <div class="chart-title">Sales by Branch</div>
            ${chartImages[0] ? `<img src="${chartImages[0]}" alt="Sales Chart"/>` : ''}
            <div style="margin-top: 12px; text-align: left;">
              ${branches.map(b => `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-size: 12px; color: #475569;">${b.name}</span>
                  <span style="font-size: 12px; font-weight: 600;">GHS ${b.value.toLocaleString()} (${totals.totalSales > 0 ? ((b.value / totals.totalSales) * 100).toFixed(0) : 0}%)</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-title">Expense Breakdown</div>
            ${chartImages[1] ? `<img src="${chartImages[1]}" alt="Expense Chart"/>` : ''}
            <div style="margin-top: 12px; font-size: 18px; font-weight: 700;">GHS ${totals.totalExpenses.toLocaleString()}</div>
            <div style="font-size: 11px; color: #64748b;">Total Operating Expenses</div>
          </div>
          <div class="chart-card">
            <div class="chart-title">Key Ratios</div>
            <div class="ratio-section" style="background: transparent; border: none; padding: 0;">
              <div class="ratio-item">
                <div class="ratio-header">
                  <span class="ratio-label">Gross Margin</span>
                  <span class="ratio-value">${grossMargin.toFixed(1)}%</span>
                </div>
                <div class="ratio-bar"><div class="ratio-fill green" style="width: ${Math.min(grossMargin, 100)}%"></div></div>
              </div>
              <div class="ratio-item">
                <div class="ratio-header">
                  <span class="ratio-label">Net Margin</span>
                  <span class="ratio-value">${netMargin.toFixed(1)}%</span>
                </div>
                <div class="ratio-bar"><div class="ratio-fill ${netMargin >= 0 ? 'purple' : 'red'}" style="width: ${Math.min(Math.abs(netMargin), 100)}%"></div></div>
              </div>
              <div class="ratio-item">
                <div class="ratio-header">
                  <span class="ratio-label">COGS Ratio</span>
                  <span class="ratio-value">${cogsPercent.toFixed(1)}%</span>
                </div>
                <div class="ratio-bar"><div class="ratio-fill blue" style="width: ${Math.min(cogsPercent, 100)}%"></div></div>
              </div>
              <div class="ratio-item">
                <div class="ratio-header">
                  <span class="ratio-label">Expense Ratio</span>
                  <span class="ratio-value">${expensePercent.toFixed(1)}%</span>
                </div>
                <div class="ratio-bar"><div class="ratio-fill amber" style="width: ${Math.min(expensePercent, 100)}%"></div></div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Expense Breakdown</div>
          <div class="expense-grid">
            ${allExpenses.map(e => `
              <div class="expense-item">
                <span class="expense-name">${e.name}</span>
                <span class="expense-amount">GHS ${e.amount.toLocaleString()}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="ai-section">
          <div class="ai-header">
            <div class="ai-icon">✨</div>
            <div>
              <div class="ai-title">AI Financial Insights</div>
              <div class="ai-subtitle">Powered by intelligent analysis</div>
            </div>
          </div>
          
          ${netMargin >= 20 ? `
            <div class="ai-insight insight-success">
              <span class="ai-insight-icon">✓</span>
              <span class="ai-insight-text">Excellent profitability! Net margin of ${netMargin.toFixed(1)}% is well above the 10-15% industry benchmark for retail pharmacies.</span>
            </div>
          ` : netMargin >= 10 ? `
            <div class="ai-insight insight-success">
              <span class="ai-insight-icon">✓</span>
              <span class="ai-insight-text">Healthy profitability with ${netMargin.toFixed(1)}% net margin. This is within the expected range for retail pharmacies.</span>
            </div>
          ` : netMargin > 0 ? `
            <div class="ai-insight insight-warning">
              <span class="ai-insight-icon">⚠</span>
              <span class="ai-insight-text">Net margin of ${netMargin.toFixed(1)}% is below optimal. Target 10-15% for sustainable growth.</span>
            </div>
          ` : `
            <div class="ai-insight insight-danger">
              <span class="ai-insight-icon">⚠</span>
              <span class="ai-insight-text">Operating at a loss with ${netMargin.toFixed(1)}% margin. Immediate cost review required.</span>
            </div>
          `}
          
          ${cogsPercent > 75 ? `
            <div class="ai-insight insight-warning">
              <span class="ai-insight-icon">⚠</span>
              <span class="ai-insight-text">COGS at ${cogsPercent.toFixed(1)}% is high. Consider negotiating better supplier terms or reviewing pricing strategy.</span>
            </div>
          ` : cogsPercent < 60 ? `
            <div class="ai-insight insight-success">
              <span class="ai-insight-icon">✓</span>
              <span class="ai-insight-text">COGS at ${cogsPercent.toFixed(1)}% shows strong purchasing efficiency and healthy margins.</span>
            </div>
          ` : ''}
          
          ${(() => {
            const topBranch = branches.reduce((a, b) => a.value > b.value ? a : b);
            const lowBranch = branches.reduce((a, b) => a.value < b.value ? a : b);
            const gap = topBranch.value > 0 ? ((topBranch.value - lowBranch.value) / topBranch.value * 100) : 0;
            
            if (gap > 30) {
              return `
                <div class="ai-insight insight-warning">
                  <span class="ai-insight-icon">⚠</span>
                  <span class="ai-insight-text">${lowBranch.name} branch is underperforming by ${gap.toFixed(0)}% compared to ${topBranch.name}. Investigate local market conditions or operational issues.</span>
                </div>
              `;
            } else {
              return `
                <div class="ai-insight insight-success">
                  <span class="ai-insight-icon">✓</span>
                  <span class="ai-insight-text">Balanced branch performance. ${topBranch.name} leads but all branches are contributing effectively.</span>
                </div>
              `;
            }
          })()}
          
          ${expensePercent > 25 ? `
            <div class="ai-insight insight-warning">
              <span class="ai-insight-icon">⚠</span>
              <span class="ai-insight-text">Operating expenses at ${expensePercent.toFixed(1)}% of revenue. Target below 20% for better profitability.</span>
            </div>
          ` : expensePercent < 15 ? `
            <div class="ai-insight insight-success">
              <span class="ai-insight-icon">✓</span>
              <span class="ai-insight-text">Operating expenses well controlled at ${expensePercent.toFixed(1)}% of revenue.</span>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <div class="footer-title">KAM AID Pharmacy • Financial Report</div>
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
        setExporting(false);
      }, 500);
    };

  } catch (error) {
    console.error("PDF export error:", error);
    alert("Failed to export PDF. Please try again.");
    setExporting(false);
  }
};
  if (!isOpen) return null;

  const { month, year, sales, cogs, expenses, customExpenses, totals } = data;
  const grossMargin = totals.totalSales > 0 ? (totals.grossProfit / totals.totalSales * 100) : 0;
  const netMargin = totals.totalSales > 0 ? (totals.netProfit / totals.totalSales * 100) : 0;
  const cogsPercent = totals.totalSales > 0 ? ((parseFloat(cogs) || 0) / totals.totalSales * 100) : 0;
  const expensePercent = totals.totalSales > 0 ? (totals.totalExpenses / totals.totalSales * 100) : 0;

  // Branch data
  const branches = [
    { name: "Oyarifa", value: parseFloat(sales.oyarifa) || 0, color: "#3b82f6" },
    { name: "Ghana Flag", value: parseFloat(sales.ghanaFlag) || 0, color: "#8b5cf6" },
    { name: "Madina", value: parseFloat(sales.madina) || 0, color: "#06b6d4" },
  ];

  // Branch sales chart
  const branchChartData = {
    labels: branches.map(b => b.name),
    datasets: [{
      data: branches.map(b => b.value),
      backgroundColor: branches.map(b => b.color),
      borderWidth: 0,
      cutout: "75%",
      borderRadius: 4,
    }]
  };

  // All expenses
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

  const expenseColors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1"];

  // Expense chart
  const expenseChartData = {
    labels: allExpenses.map(e => e.name),
    datasets: [{
      data: allExpenses.map(e => e.amount),
      backgroundColor: expenseColors.slice(0, allExpenses.length),
      borderWidth: 0,
      cutout: "75%",
      borderRadius: 4,
    }]
  };

  // Revenue breakdown horizontal bar
  const revenueBreakdownData = {
    labels: ["Revenue", "COGS", "Gross Profit", "Operating Exp.", "Net Profit"],
    datasets: [{
      data: [totals.totalSales, parseFloat(cogs) || 0, totals.grossProfit, totals.totalExpenses, totals.netProfit],
      backgroundColor: ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", totals.netProfit >= 0 ? "#8b5cf6" : "#ef4444"],
      borderRadius: 6,
      barThickness: 32,
    }]
  };

  const chartOptions: any = {
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e293b",
        titleFont: { size: 13, weight: "600" },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context: any) => ` GHS ${context.raw.toLocaleString()}`
        }
      }
    }
  };

  const barOptions: any = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e293b",
        titleFont: { size: 13, weight: "600" },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => ` GHS ${context.raw.toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: "#f1f5f9", drawBorder: false },
        ticks: {
          font: { size: 11 },
          color: "#94a3b8",
          callback: (value: any) => `GHS ${(value / 1000).toFixed(0)}k`
        }
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 12, weight: "500" }, color: "#475569" }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        className="bg-gradient-to-b from-slate-50 to-white rounded-3xl max-w-7xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-slate-200/50"
      >
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-10 py-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white text-xl">📊</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Financial Report</h2>
              <p className="text-slate-500 font-medium">{MONTHS[month]} {year} • KAM AID Pharmacy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-10" ref={contentRef}>
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-5 mb-10">
            {/* Total Revenue */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</span>
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 tracking-tight">
                GHS {totals.totalSales.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium text-slate-400">All branches combined</span>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Profit</span>
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 tracking-tight">
                GHS {totals.grossProfit.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${grossMargin >= 30 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                  {grossMargin.toFixed(1)}% margin
                </span>
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Profit</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${totals.netProfit >= 0 ? "bg-violet-50" : "bg-red-50"}`}>
                  {totals.netProfit >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-violet-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              <p className={`text-3xl font-bold tracking-tight ${totals.netProfit >= 0 ? "text-slate-800" : "text-red-600"}`}>
                GHS {totals.netProfit.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${netMargin >= 15 ? "bg-emerald-50 text-emerald-600" : netMargin >= 0 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                  {netMargin.toFixed(1)}% margin
                </span>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operating Expenses</span>
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-amber-500" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800 tracking-tight">
                GHS {totals.totalExpenses.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {expensePercent.toFixed(1)}% of revenue
                </span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Branch Performance */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-6">Sales by Branch</h3>
              <div className="relative h-52 flex items-center justify-center">
                <Doughnut data={branchChartData} options={chartOptions} />
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <p className="text-2xl font-bold text-slate-800">GHS {(totals.totalSales / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-slate-400">Total Sales</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {branches.map((branch) => (
                  <div key={branch.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: branch.color }}></div>
                      <span className="text-sm font-medium text-slate-600">{branch.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-800">GHS {branch.value.toLocaleString()}</span>
                      <span className="text-xs text-slate-400 ml-2">
                        ({totals.totalSales > 0 ? ((branch.value / totals.totalSales) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-6">Expense Breakdown</h3>
              {allExpenses.length > 0 ? (
                <>
                  <div className="relative h-52 flex items-center justify-center">
                    <Doughnut data={expenseChartData} options={chartOptions} />
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <p className="text-2xl font-bold text-slate-800">GHS {(totals.totalExpenses / 1000).toFixed(0)}k</p>
                      <p className="text-xs text-slate-400">Total Expenses</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3 max-h-32 overflow-y-auto">
                    {allExpenses.slice(0, 5).map((expense, i) => (
                      <div key={expense.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: expenseColors[i] }}></div>
                          <span className="text-sm font-medium text-slate-600 truncate max-w-[120px]">{expense.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-800">GHS {expense.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-52 flex items-center justify-center text-slate-400">
                  No expenses recorded
                </div>
              )}
            </div>

            {/* Profit Margins */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-6">Key Ratios</h3>
              <div className="space-y-6">
                {/* Gross Margin */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-600">Gross Margin</span>
                    <span className="text-sm font-bold text-slate-800">{grossMargin.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(grossMargin, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Net Margin */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-600">Net Margin</span>
                    <span className="text-sm font-bold text-slate-800">{netMargin.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${netMargin >= 0 ? "bg-gradient-to-r from-violet-400 to-violet-500" : "bg-gradient-to-r from-red-400 to-red-500"}`}
                      style={{ width: `${Math.min(Math.abs(netMargin), 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* COGS Ratio */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-600">COGS Ratio</span>
                    <span className="text-sm font-bold text-slate-800">{cogsPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(cogsPercent, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Expense Ratio */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-600">Expense Ratio</span>
                    <span className="text-sm font-bold text-slate-800">{expensePercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(expensePercent, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Flow */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-6">Financial Summary</h3>
            <div className="h-64">
              <Bar data={revenueBreakdownData} options={barOptions} />
            </div>
          </div>

          {/* AI Insights */}
          <div className="mt-8">
            <AIInsights data={data} />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-100 px-10 py-5 flex justify-between items-center">
          <p className="text-sm text-slate-400">
            Generated on {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            <button 
              onClick={exportPDF}
              disabled={exporting}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {exporting ? "Exporting..." : "Export PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}