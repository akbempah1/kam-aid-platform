"use client";
import { Suspense } from "react";
import ProtectedLayout from "../components/ProtectedLayout";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Package, Plus, Trash2, Save, Eye, X, Download, AlertTriangle, Search } from "lucide-react";
import { shortagesReports } from "@/lib/dataService";

const BRANCHES = ["Oyarifa", "Ghana Flag", "Madina"];

const SHORTAGE_CATEGORIES = [
  "Antibiotics",
  "Pain Relief",
  "Cardiovascular",
  "Diabetes",
  "Respiratory",
  "Gastrointestinal",
  "Vitamins & Supplements",
  "Skin Care",
  "First Aid",
  "Baby Products",
  "Personal Care",
  "Other"
];

type ShortageItem = {
  id: number;
  productName: string;
  category: string;
  branch: string;
  currentStock: number;
  requiredStock: number;
  unit: string;
  priority: "critical" | "high" | "medium" | "low";
  supplier: string;
  notes: string;
  dateReported: string;
};

function ShortagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");

  const [reportId, setReportId] = useState<number | null>(null);
  const [reportDate, setReportDate] = useState("");
  const [reportedBy, setReportedBy] = useState("");
  const [shortages, setShortages] = useState<ShortageItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // New shortage form
  const [newShortage, setNewShortage] = useState<Omit<ShortageItem, "id" | "dateReported">>({
    productName: "",
    category: "Other",
    branch: "Oyarifa",
    currentStock: 0,
    requiredStock: 0,
    unit: "units",
    priority: "medium",
    supplier: "",
    notes: ""
  });

  // Load report if editing
  useEffect(() => {
    if (editId) {
      shortagesReports.get(parseInt(editId)).then((report) => {
        if (report) {
          setReportId(report.id);
          setReportDate(report.reportDate.slice(0, 10));
          setReportedBy(report.reportedBy);
          setShortages(report.shortages as typeof shortages);
        }
      }).catch(() => {});
    }
  }, [editId]);

  // Add shortage
  const addShortage = () => {
    if (newShortage.productName && newShortage.requiredStock > 0) {
      setShortages([
        ...shortages,
        {
          ...newShortage,
          id: Date.now(),
          dateReported: new Date().toISOString()
        }
      ]);
      setNewShortage({
        productName: "",
        category: "Other",
        branch: "Oyarifa",
        currentStock: 0,
        requiredStock: 0,
        unit: "units",
        priority: "medium",
        supplier: "",
        notes: ""
      });
    }
  };

  // Remove shortage
  const removeShortage = (id: number) => {
    setShortages(shortages.filter(s => s.id !== id));
  };

  // Update shortage priority
  const updatePriority = (id: number, priority: ShortageItem["priority"]) => {
    setShortages(shortages.map(s => s.id === id ? { ...s, priority } : s));
  };

  // Filter shortages
  const filteredShortages = shortages.filter(s => {
    const matchesSearch = s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = filterBranch === "All" || s.branch === filterBranch;
    const matchesPriority = filterPriority === "All" || s.priority === filterPriority;
    return matchesSearch && matchesBranch && matchesPriority;
  });

  // Calculate stats
  const stats = {
    total: shortages.length,
    critical: shortages.filter(s => s.priority === "critical").length,
    high: shortages.filter(s => s.priority === "high").length,
    byBranch: BRANCHES.reduce((acc, branch) => {
      acc[branch] = shortages.filter(s => s.branch === branch).length;
      return acc;
    }, {} as Record<string, number>),
    totalUnitsNeeded: shortages.reduce((sum, s) => sum + (s.requiredStock - s.currentStock), 0)
  };

  // Save report
  const saveReport = async () => {
    if (!reportDate || !reportedBy) {
      alert("Please fill in the report date and reported by fields");
      return;
    }

    if (shortages.length === 0) {
      alert("Please add at least one shortage item");
      return;
    }

    setSaving(true);
    try {
      if (reportId) {
        await shortagesReports.update(reportId, { reportDate, reportedBy, shortages, stats });
        alert("Shortages report updated!");
        router.push("/history");
      } else {
        await shortagesReports.create({ reportDate, reportedBy, shortages, stats });
        alert("Shortages report saved!");
        clearForm();
      }
    } catch (e: unknown) {
      alert(`Failed to save: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  // Clear form
  const clearForm = () => {
    setReportId(null);
    setReportDate("");
    setReportedBy("");
    setShortages([]);
    router.push("/shortages");
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-amber-500 text-white";
      case "low": return "bg-blue-500 text-white";
      default: return "bg-slate-500 text-white";
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-50 border-l-red-500";
      case "high": return "bg-orange-50 border-l-orange-500";
      case "medium": return "bg-amber-50 border-l-amber-500";
      case "low": return "bg-blue-50 border-l-blue-500";
      default: return "bg-slate-50 border-l-slate-500";
    }
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
        <title>Shortages Report - ${formatDate(reportDate)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: white; color: #1e293b; line-height: 1.5; }
          .header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
          .logo { width: 50px; height: 50px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
          .title { font-size: 28px; font-weight: 700; color: #1e293b; }
          .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
          
          .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 30px; }
          .stat-card { border-radius: 12px; padding: 16px; text-align: center; }
          .stat-card.total { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
          .stat-card.critical { background: #fee2e2; }
          .stat-card.high { background: #ffedd5; }
          .stat-card.branch { background: #f8fafc; border: 1px solid #e2e8f0; }
          .stat-value { font-size: 28px; font-weight: 700; }
          .stat-card.critical .stat-value { color: #dc2626; }
          .stat-card.high .stat-value { color: #ea580c; }
          .stat-label { font-size: 11px; text-transform: uppercase; margin-top: 4px; opacity: 0.8; }
          
          .section { margin-bottom: 30px; }
          .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; color: #1e293b; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #f59e0b; display: inline-block; }
          
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          th { background: #f8fafc; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px; }
          
          .priority-badge { padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          .priority-critical { background: #ef4444; color: white; }
          .priority-high { background: #f97316; color: white; }
          .priority-medium { background: #f59e0b; color: white; }
          .priority-low { background: #3b82f6; color: white; }
          
          .stock-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; width: 80px; display: inline-block; vertical-align: middle; margin-left: 8px; }
          .stock-fill { height: 100%; border-radius: 4px; }
          .stock-critical { background: #ef4444; }
          .stock-low { background: #f59e0b; }
          .stock-ok { background: #10b981; }
          
          .branch-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
          .branch-card { background: #f8fafc; border-radius: 12px; padding: 16px; }
          .branch-name { font-weight: 600; margin-bottom: 8px; }
          .branch-count { font-size: 24px; font-weight: 700; color: #f59e0b; }
          
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; }
          .footer-title { font-size: 14px; font-weight: 700; color: #1e293b; }
          .footer-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
          
          @media print { body { padding: 20px; } -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">📦</div>
          <div>
            <div class="title">Inventory Shortages Report</div>
            <div class="subtitle">${formatDate(reportDate)} • Reported by ${reportedBy}</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card total">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total Shortages</div>
          </div>
          <div class="stat-card critical">
            <div class="stat-value">${stats.critical}</div>
            <div class="stat-label">Critical</div>
          </div>
          <div class="stat-card high">
            <div class="stat-value">${stats.high}</div>
            <div class="stat-label">High Priority</div>
          </div>
          <div class="stat-card branch">
            <div class="stat-value">${stats.totalUnitsNeeded}</div>
            <div class="stat-label">Units Needed</div>
          </div>
          <div class="stat-card branch">
            <div class="stat-value">${new Set(shortages.map(s => s.category)).size}</div>
            <div class="stat-label">Categories</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Shortages by Branch</div>
          <div class="branch-summary">
            ${BRANCHES.map(branch => `
              <div class="branch-card">
                <div class="branch-name">${branch}</div>
                <div class="branch-count">${stats.byBranch[branch]} items</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Shortage Details</div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Branch</th>
                <th>Stock Level</th>
                <th>Needed</th>
                <th>Priority</th>
                <th>Supplier</th>
              </tr>
            </thead>
            <tbody>
              ${shortages.sort((a, b) => {
                const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
              }).map(item => {
                const stockPercent = item.requiredStock > 0 ? (item.currentStock / item.requiredStock) * 100 : 0;
                const stockClass = stockPercent < 25 ? 'stock-critical' : stockPercent < 50 ? 'stock-low' : 'stock-ok';
                return `
                  <tr>
                    <td><strong>${item.productName}</strong></td>
                    <td>${item.category}</td>
                    <td>${item.branch}</td>
                    <td>
                      ${item.currentStock}/${item.requiredStock} ${item.unit}
                      <div class="stock-bar"><div class="stock-fill ${stockClass}" style="width: ${stockPercent}%"></div></div>
                    </td>
                    <td><strong>${item.requiredStock - item.currentStock}</strong> ${item.unit}</td>
                    <td><span class="priority-badge priority-${item.priority}">${item.priority}</span></td>
                    <td>${item.supplier || '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <div class="footer-title">KAM AID Pharmacy • Inventory Shortages Report</div>
          <div class="footer-sub">Generated on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
  };

  return (
    <ProtectedLayout>
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {reportId ? "Edit Shortages Report" : "Inventory Shortages"}
          </h1>
          <p className="text-slate-500">
            {reportId
              ? `Editing report from ${formatDate(reportDate)}`
              : "Track and manage product shortages across all branches"
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
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white">
          <p className="text-sm opacity-80 mb-1">Total Shortages</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <p className="text-sm text-red-600 mb-1">Critical</p>
          <p className="text-3xl font-bold text-red-700">{stats.critical}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
          <p className="text-sm text-orange-600 mb-1">High Priority</p>
          <p className="text-3xl font-bold text-orange-700">{stats.high}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500 mb-1">Units Needed</p>
          <p className="text-3xl font-bold text-slate-800">{stats.totalUnitsNeeded}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <p className="text-sm text-slate-500 mb-1">Categories</p>
          <p className="text-3xl font-bold text-slate-800">{new Set(shortages.map(s => s.category)).size}</p>
        </div>
      </div>

      {/* Report Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-500" />
          Report Information
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Report Date</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Reported By</label>
            <input
              type="text"
              placeholder="Your name"
              value={reportedBy}
              onChange={(e) => setReportedBy(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Add New Shortage */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Shortage Item</h2>
        
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-2">Product Name</label>
            <input
              type="text"
              placeholder="e.g., Paracetamol 500mg"
              value={newShortage.productName}
              onChange={(e) => setNewShortage({ ...newShortage, productName: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Category</label>
            <select
              value={newShortage.category}
              onChange={(e) => setNewShortage({ ...newShortage, category: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {SHORTAGE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Branch</label>
            <select
              value={newShortage.branch}
              onChange={(e) => setNewShortage({ ...newShortage, branch: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {BRANCHES.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Current Stock</label>
            <input
              type="number"
              min="0"
              value={newShortage.currentStock}
              onChange={(e) => setNewShortage({ ...newShortage, currentStock: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Required Stock</label>
            <input
              type="number"
              min="0"
              value={newShortage.requiredStock}
              onChange={(e) => setNewShortage({ ...newShortage, requiredStock: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Unit</label>
            <select
              value={newShortage.unit}
              onChange={(e) => setNewShortage({ ...newShortage, unit: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="units">Units</option>
              <option value="boxes">Boxes</option>
              <option value="packs">Packs</option>
              <option value="bottles">Bottles</option>
              <option value="strips">Strips</option>
              <option value="tubes">Tubes</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Priority</label>
            <select
              value={newShortage.priority}
              onChange={(e) => setNewShortage({ ...newShortage, priority: e.target.value as ShortageItem["priority"] })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Supplier</label>
            <input
              type="text"
              placeholder="Supplier name"
              value={newShortage.supplier}
              onChange={(e) => setNewShortage({ ...newShortage, supplier: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={addShortage}
              className="w-full px-4 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Shortages List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Shortage Items ({filteredShortages.length})</h2>
          
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">All Branches</option>
              {BRANCHES.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {filteredShortages.length > 0 ? (
          <div className="space-y-3">
            {filteredShortages.sort((a, b) => {
              const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            }).map(item => {
              const stockPercent = item.requiredStock > 0 ? (item.currentStock / item.requiredStock) * 100 : 0;
              const unitsNeeded = item.requiredStock - item.currentStock;
              
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border-l-4 ${getPriorityBg(item.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-800">{item.productName}</h3>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getPriorityColor(item.priority)}`}>
                          {item.priority.toUpperCase()}
                        </span>
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {item.branch}
                        </span>
                        <span>
                          Stock: <strong>{item.currentStock}</strong> / {item.requiredStock} {item.unit}
                        </span>
                        <span className="text-amber-600 font-semibold">
                          Need: {unitsNeeded} {item.unit}
                        </span>
                        {item.supplier && (
                          <span>Supplier: {item.supplier}</span>
                        )}
                      </div>
                      {/* Stock bar */}
                      <div className="mt-2 w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            stockPercent < 25 ? "bg-red-500" : stockPercent < 50 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${stockPercent}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeShortage(item.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No shortage items added yet</p>
          </div>
        )}
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
            disabled={shortages.length === 0}
            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={saveReport}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : reportId ? "Update Report" : "Save Report"}
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
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Inventory Shortages Report</h2>
                  <p className="text-slate-500">{formatDate(reportDate)} • {reportedBy}</p>
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
              {/* Stats */}
              <div className="grid grid-cols-5 gap-4 mb-8">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white text-center">
                  <p className="text-4xl font-bold">{stats.total}</p>
                  <p className="text-sm opacity-80 mt-1">Total Items</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-6 text-center">
                  <p className="text-3xl font-bold text-red-600">{stats.critical}</p>
                  <p className="text-sm text-red-700">Critical</p>
                </div>
                <div className="bg-orange-50 rounded-2xl p-6 text-center">
                  <p className="text-3xl font-bold text-orange-600">{stats.high}</p>
                  <p className="text-sm text-orange-700">High</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 text-center">
                  <p className="text-3xl font-bold text-slate-800">{stats.totalUnitsNeeded}</p>
                  <p className="text-sm text-slate-500">Units Needed</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 text-center">
                  <p className="text-3xl font-bold text-slate-800">{new Set(shortages.map(s => s.category)).size}</p>
                  <p className="text-sm text-slate-500">Categories</p>
                </div>
              </div>

              {/* By Branch */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {BRANCHES.map(branch => (
                  <div key={branch} className="bg-slate-50 rounded-2xl p-6">
                    <h3 className="font-semibold text-slate-800 mb-2">{branch}</h3>
                    <p className="text-2xl font-bold text-amber-600">{stats.byBranch[branch]} items</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="bg-slate-50 rounded-2xl p-6 overflow-x-auto">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Shortage Details</h3>
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Product</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Category</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Branch</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Stock</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Needed</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shortages.sort((a, b) => {
                      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                      return priorityOrder[a.priority] - priorityOrder[b.priority];
                    }).map(item => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-3 px-4 font-medium text-slate-800">{item.productName}</td>
                        <td className="py-3 px-4 text-slate-600">{item.category}</td>
                        <td className="py-3 px-4 text-slate-600">{item.branch}</td>
                        <td className="py-3 px-4 text-slate-600">{item.currentStock}/{item.requiredStock} {item.unit}</td>
                        <td className="py-3 px-4 font-semibold text-amber-600">{item.requiredStock - item.currentStock}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getPriorityColor(item.priority)}`}>
                            {item.priority.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-8 py-5 flex justify-between items-center">
              <p className="text-sm text-slate-400">Reported by: {reportedBy}</p>
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
export default function ShortagesPage() {
  return <Suspense><ShortagesContent /></Suspense>;
}
