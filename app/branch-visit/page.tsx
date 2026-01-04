"use client";
import ProtectedLayout from "../components/ProtectedLayout";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MapPin, Plus, Trash2, Save, Eye, X, Download, CheckCircle, XCircle, AlertTriangle, Building2 } from "lucide-react";

const BRANCHES = ["Oyarifa", "Ghana Flag", "Madina"];

const CHECKLIST_ITEMS = [
  { id: "cleanliness", category: "Store Condition", label: "Store cleanliness and organization" },
  { id: "shelving", category: "Store Condition", label: "Products properly shelved and labeled" },
  { id: "expiry", category: "Inventory", label: "Expiry dates checked and managed" },
  { id: "stockLevels", category: "Inventory", label: "Adequate stock levels maintained" },
  { id: "coldChain", category: "Inventory", label: "Cold chain products properly stored" },
  { id: "staffPresent", category: "Staff", label: "All scheduled staff present" },
  { id: "uniformCompliance", category: "Staff", label: "Staff in proper uniform" },
  { id: "customerService", category: "Staff", label: "Good customer service observed" },
  { id: "posWorking", category: "Equipment", label: "POS system functioning properly" },
  { id: "airconWorking", category: "Equipment", label: "Air conditioning working" },
  { id: "securityMeasures", category: "Security", label: "Security measures in place" },
  { id: "cashHandling", category: "Security", label: "Proper cash handling procedures" },
];

type ChecklistStatus = "pass" | "fail" | "na";

type BranchChecklist = {
  [branch: string]: {
    [itemId: string]: { status: ChecklistStatus; notes: string };
  };
};

type Issue = {
  id: number;
  description: string;
  priority: "high" | "medium" | "low";
  branch: string;
  assignedTo: string;
};

type ActionItem = {
  id: number;
  action: string;
  dueDate: string;
  responsible: string;
  branch: string;
};

type BranchRating = {
  [branch: string]: number;
};

export default function BranchVisitPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");

  const [reportId, setReportId] = useState<number | null>(null);
  const [reportType, setReportType] = useState<"single" | "consolidated">("consolidated");
  const [visitDate, setVisitDate] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("Oyarifa");
  const [visitedBy, setVisitedBy] = useState("");
  
  // For consolidated report - checklist per branch
  const [branchChecklist, setBranchChecklist] = useState<BranchChecklist>(() => {
    const initial: BranchChecklist = {};
    BRANCHES.forEach(branch => {
      initial[branch] = {};
      CHECKLIST_ITEMS.forEach(item => {
        initial[branch][item.id] = { status: "na", notes: "" };
      });
    });
    return initial;
  });

  const [issues, setIssues] = useState<Issue[]>([]);
  const [newIssue, setNewIssue] = useState({ description: "", priority: "medium" as "high" | "medium" | "low", branch: "Oyarifa", assignedTo: "" });
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newAction, setNewAction] = useState({ action: "", dueDate: "", responsible: "", branch: "Oyarifa" });
  const [branchRatings, setBranchRatings] = useState<BranchRating>({ Oyarifa: 0, "Ghana Flag": 0, Madina: 0 });
  const [generalNotes, setGeneralNotes] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [activeBranchTab, setActiveBranchTab] = useState("Oyarifa");

  // Load report if editing
  useEffect(() => {
    if (editId) {
      const reports = JSON.parse(localStorage.getItem("kam_aid_branch_visits") || "[]");
      const report = reports.find((r: any) => r.id === parseInt(editId));
      if (report) {
        setReportId(report.id);
        setReportType(report.reportType || "single");
        setVisitDate(report.visitDate);
        setSelectedBranch(report.branch || "Oyarifa");
        setVisitedBy(report.visitedBy);
        setBranchChecklist(report.branchChecklist || report.checklist);
        setIssues(report.issues || []);
        setActionItems(report.actionItems || []);
        setBranchRatings(report.branchRatings || { Oyarifa: report.overallRating || 0, "Ghana Flag": 0, Madina: 0 });
        setGeneralNotes(report.generalNotes || "");
      }
    }
  }, [editId]);

  // Get branches to show based on report type
  const activeBranches = reportType === "single" ? [selectedBranch] : BRANCHES;

  // Update checklist item
  const updateChecklistStatus = (branch: string, itemId: string, status: ChecklistStatus) => {
    setBranchChecklist(prev => ({
      ...prev,
      [branch]: {
        ...prev[branch],
        [itemId]: { ...prev[branch][itemId], status }
      }
    }));
  };

  const updateChecklistNotes = (branch: string, itemId: string, notes: string) => {
    setBranchChecklist(prev => ({
      ...prev,
      [branch]: {
        ...prev[branch],
        [itemId]: { ...prev[branch][itemId], notes }
      }
    }));
  };

  // Calculate stats per branch
  const getBranchStats = (branch: string) => {
    const items = branchChecklist[branch];
    if (!items) return { passCount: 0, failCount: 0, complianceRate: 0 };
    
    const passCount = Object.values(items).filter(item => item.status === "pass").length;
    const failCount = Object.values(items).filter(item => item.status === "fail").length;
    const totalChecked = passCount + failCount;
    const complianceRate = totalChecked > 0 ? (passCount / totalChecked) * 100 : 0;
    
    return { passCount, failCount, complianceRate };
  };

  // Calculate overall stats
  const getOverallStats = () => {
    let totalPass = 0, totalFail = 0;
    activeBranches.forEach(branch => {
      const stats = getBranchStats(branch);
      totalPass += stats.passCount;
      totalFail += stats.failCount;
    });
    const totalChecked = totalPass + totalFail;
    const complianceRate = totalChecked > 0 ? (totalPass / totalChecked) * 100 : 0;
    return { passCount: totalPass, failCount: totalFail, complianceRate };
  };

  const overallStats = getOverallStats();

  // Add issue
  const addIssue = () => {
    if (newIssue.description) {
      setIssues([...issues, { ...newIssue, id: Date.now() }]);
      setNewIssue({ description: "", priority: "medium", branch: activeBranchTab, assignedTo: "" });
    }
  };

  const removeIssue = (id: number) => setIssues(issues.filter(i => i.id !== id));

  // Add action item
  const addActionItem = () => {
    if (newAction.action) {
      setActionItems([...actionItems, { ...newAction, id: Date.now() }]);
      setNewAction({ action: "", dueDate: "", responsible: "", branch: activeBranchTab });
    }
  };

  const removeActionItem = (id: number) => setActionItems(actionItems.filter(a => a.id !== id));

  // Save report
  const saveReport = () => {
    if (!visitDate || !visitedBy) {
      alert("Please fill in the visit date and visited by fields");
      return;
    }

    const report = {
      id: reportId || Date.now(),
      reportType,
      visitDate,
      branch: reportType === "single" ? selectedBranch : "All Branches",
      visitedBy,
      branchChecklist,
      issues,
      actionItems,
      branchRatings,
      generalNotes,
      stats: {
        overall: overallStats,
        byBranch: activeBranches.reduce((acc, branch) => {
          acc[branch] = getBranchStats(branch);
          return acc;
        }, {} as Record<string, any>)
      },
      createdAt: new Date().toISOString()
    };

    const existing = JSON.parse(localStorage.getItem("kam_aid_branch_visits") || "[]");

    if (reportId) {
      const index = existing.findIndex((r: any) => r.id === reportId);
      if (index !== -1) existing[index] = report;
    } else {
      existing.push(report);
    }

    localStorage.setItem("kam_aid_branch_visits", JSON.stringify(existing));
    alert(`Branch visit report ${reportId ? "updated" : "saved"}!`);

    if (reportId) router.push("/history");
  };

  // Clear form
  const clearForm = () => {
    setReportId(null);
    setReportType("consolidated");
    setVisitDate("");
    setSelectedBranch("Oyarifa");
    setVisitedBy("");
    setBranchChecklist(() => {
      const initial: BranchChecklist = {};
      BRANCHES.forEach(branch => {
        initial[branch] = {};
        CHECKLIST_ITEMS.forEach(item => {
          initial[branch][item.id] = { status: "na", notes: "" };
        });
      });
      return initial;
    });
    setIssues([]);
    setActionItems([]);
    setBranchRatings({ Oyarifa: 0, "Ghana Flag": 0, Madina: 0 });
    setGeneralNotes("");
    router.push("/branch-visit");
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

  // Group checklist by category
  const groupedChecklist = CHECKLIST_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof CHECKLIST_ITEMS>);

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
        <title>Branch Visit Report - ${reportType === "consolidated" ? "All Branches" : selectedBranch} - ${formatDate(visitDate)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: white; color: #1e293b; line-height: 1.5; }
          .header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
          .logo { width: 50px; height: 50px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
          .title { font-size: 28px; font-weight: 700; color: #1e293b; }
          .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
          .badge { display: inline-block; background: #dbeafe; color: #2563eb; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-left: 12px; }
          
          .stats-grid { display: grid; grid-template-columns: repeat(${activeBranches.length + 1}, 1fr); gap: 16px; margin-bottom: 30px; }
          .stat-card { border-radius: 16px; padding: 20px; text-align: center; }
          .stat-card.overall { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
          .stat-card.branch { background: #f8fafc; border: 1px solid #e2e8f0; }
          .stat-value { font-size: 28px; font-weight: 700; }
          .stat-label { font-size: 12px; opacity: 0.8; margin-top: 4px; }
          .stat-detail { font-size: 11px; margin-top: 8px; opacity: 0.7; }
          
          .section { margin-bottom: 30px; }
          .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; color: #1e293b; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #10b981; display: inline-block; }
          
          .branch-section { background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
          .branch-header { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
          .branch-stats { display: flex; gap: 16px; font-size: 12px; }
          .branch-stat { padding: 4px 12px; border-radius: 20px; }
          .branch-stat.pass { background: #d1fae5; color: #059669; }
          .branch-stat.fail { background: #fee2e2; color: #dc2626; }
          
          .category-title { font-size: 12px; font-weight: 600; color: #64748b; margin: 12px 0 8px 0; text-transform: uppercase; }
          .checklist-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .status-badge { width: 50px; text-align: center; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; }
          .status-pass { background: #d1fae5; color: #059669; }
          .status-fail { background: #fee2e2; color: #dc2626; }
          .status-na { background: #f1f5f9; color: #64748b; }
          .checklist-label { flex: 1; font-size: 13px; }
          .checklist-notes { font-size: 11px; color: #64748b; font-style: italic; max-width: 200px; }
          
          .comparison-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .comparison-table th, .comparison-table td { padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0; }
          .comparison-table th { background: #f8fafc; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
          .comparison-table td { font-size: 13px; }
          .comparison-table td.label { text-align: left; font-weight: 500; }
          
          .issue-item { padding: 12px; margin-bottom: 8px; border-radius: 8px; border-left: 4px solid; }
          .issue-high { background: #fee2e2; border-left-color: #ef4444; }
          .issue-medium { background: #fef3c7; border-left-color: #f59e0b; }
          .issue-low { background: #dbeafe; border-left-color: #3b82f6; }
          .issue-header { display: flex; justify-content: space-between; align-items: start; }
          .issue-desc { font-size: 13px; font-weight: 500; }
          .issue-meta { font-size: 11px; color: #64748b; margin-top: 4px; }
          .priority-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 10px; color: white; }
          .priority-high { background: #ef4444; }
          .priority-medium { background: #f59e0b; }
          .priority-low { background: #3b82f6; }
          
          .ratings-grid { display: grid; grid-template-columns: repeat(${activeBranches.length}, 1fr); gap: 16px; }
          .rating-card { background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center; }
          .rating-branch { font-weight: 600; margin-bottom: 8px; }
          .rating-stars { font-size: 20px; }
          
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; }
          .footer-title { font-size: 14px; font-weight: 700; color: #1e293b; }
          .footer-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
          
          @media print { body { padding: 20px; } -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">📍</div>
          <div>
            <div class="title">
              Branch Visit Report
              ${reportType === "consolidated" ? '<span class="badge">CONSOLIDATED</span>' : ''}
            </div>
            <div class="subtitle">${reportType === "consolidated" ? "All Branches" : selectedBranch} • ${formatDate(visitDate)} • Visited by ${visitedBy}</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card overall">
            <div class="stat-value">${overallStats.complianceRate.toFixed(0)}%</div>
            <div class="stat-label">Overall Compliance</div>
            <div class="stat-detail">${overallStats.passCount} passed / ${overallStats.failCount} failed</div>
          </div>
          ${activeBranches.map(branch => {
            const stats = getBranchStats(branch);
            return `
              <div class="stat-card branch">
                <div class="stat-value" style="color: ${stats.complianceRate >= 80 ? '#059669' : stats.complianceRate >= 60 ? '#d97706' : '#dc2626'}">${stats.complianceRate.toFixed(0)}%</div>
                <div class="stat-label">${branch}</div>
                <div class="stat-detail">⭐ ${branchRatings[branch]}/5</div>
              </div>
            `;
          }).join('')}
        </div>

        ${reportType === "consolidated" ? `
          <div class="section">
            <div class="section-title">Compliance Comparison</div>
            <table class="comparison-table">
              <thead>
                <tr>
                  <th style="text-align: left;">Checklist Item</th>
                  ${BRANCHES.map(b => `<th>${b}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${CHECKLIST_ITEMS.map(item => `
                  <tr>
                    <td class="label">${item.label}</td>
                    ${BRANCHES.map(branch => {
                      const check = branchChecklist[branch]?.[item.id];
                      return `<td><span class="status-badge status-${check?.status || 'na'}">${(check?.status || 'N/A').toUpperCase()}</span></td>`;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="section">
            <div class="section-title">Inspection Checklist - ${selectedBranch}</div>
            ${Object.entries(groupedChecklist).map(([category, items]) => `
              <div class="category-title">${category}</div>
              ${items.map(item => {
                const check = branchChecklist[selectedBranch]?.[item.id];
                return `
                  <div class="checklist-item">
                    <span class="status-badge status-${check?.status || 'na'}">${(check?.status || 'N/A').toUpperCase()}</span>
                    <span class="checklist-label">${item.label}</span>
                    ${check?.notes ? `<span class="checklist-notes">${check.notes}</span>` : ''}
                  </div>
                `;
              }).join('')}
            `).join('')}
          </div>
        `}

        ${issues.length > 0 ? `
          <div class="section">
            <div class="section-title">Issues Found (${issues.length})</div>
            ${issues.map(issue => `
              <div class="issue-item issue-${issue.priority}">
                <div class="issue-header">
                  <span class="issue-desc">${issue.description}</span>
                  <span class="priority-badge priority-${issue.priority}">${issue.priority}</span>
                </div>
                <div class="issue-meta">${issue.branch}${issue.assignedTo ? ` • Assigned to: ${issue.assignedTo}` : ''}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${actionItems.length > 0 ? `
          <div class="section">
            <div class="section-title">Action Items (${actionItems.length})</div>
            ${actionItems.map(action => `
              <div class="issue-item" style="background: #f8fafc; border-left-color: #3b82f6;">
                <div class="issue-desc">${action.action}</div>
                <div class="issue-meta">${action.branch} • ${action.responsible}${action.dueDate ? ` • Due: ${formatDate(action.dueDate)}` : ''}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Branch Ratings</div>
          <div class="ratings-grid">
            ${activeBranches.map(branch => `
              <div class="rating-card">
                <div class="rating-branch">${branch}</div>
                <div class="rating-stars">${'⭐'.repeat(branchRatings[branch])}${'☆'.repeat(5 - branchRatings[branch])}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${branchRatings[branch]}/5</div>
              </div>
            `).join('')}
          </div>
        </div>

        ${generalNotes ? `
          <div class="section">
            <div class="section-title">General Notes</div>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${generalNotes}</div>
          </div>
        ` : ''}

        <div class="footer">
          <div class="footer-title">KAM AID Pharmacy • Branch Visit Report</div>
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
            {reportId ? "Edit Branch Visit" : "Branch Visit Report"}
          </h1>
          <p className="text-slate-500">
            {reportId
              ? `Editing ${reportType} visit report`
              : "Document branch inspections, issues, and action items"
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

      {/* Report Type Selection */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Report Type</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setReportType("single")}
            className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
              reportType === "single"
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              reportType === "single" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              <MapPin className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-slate-800">Single Branch</p>
              <p className="text-sm text-slate-500">Inspect one branch at a time</p>
            </div>
          </button>
          <button
            onClick={() => setReportType("consolidated")}
            className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
              reportType === "consolidated"
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              reportType === "consolidated" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              <Building2 className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-slate-800">Consolidated</p>
              <p className="text-sm text-slate-500">Inspect all 3 branches & compare</p>
            </div>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={`grid gap-4 mb-6 ${reportType === "consolidated" ? "grid-cols-5" : "grid-cols-4"}`}>
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white">
          <p className="text-sm opacity-80 mb-1">Overall Compliance</p>
          <p className="text-3xl font-bold">{overallStats.complianceRate.toFixed(0)}%</p>
        </div>
        {reportType === "consolidated" ? (
          BRANCHES.map(branch => {
            const stats = getBranchStats(branch);
            return (
              <div key={branch} className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-sm text-slate-500 mb-1">{branch}</p>
                <p className={`text-2xl font-bold ${
                  stats.complianceRate >= 80 ? "text-emerald-600" : 
                  stats.complianceRate >= 60 ? "text-amber-600" : "text-red-600"
                }`}>
                  {stats.complianceRate.toFixed(0)}%
                </p>
              </div>
            );
          })
        ) : (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <p className="text-sm text-emerald-600 mb-1">Passed</p>
              <p className="text-2xl font-bold text-emerald-700">{overallStats.passCount}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <p className="text-sm text-red-600 mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-700">{overallStats.failCount}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="text-sm text-amber-600 mb-1">Issues</p>
              <p className="text-2xl font-bold text-amber-700">{issues.length}</p>
            </div>
          </>
        )}
      </div>

      {/* Visit Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-500" />
          Visit Information
        </h2>
        <div className={`grid gap-4 ${reportType === "single" ? "grid-cols-3" : "grid-cols-2"}`}>
          {reportType === "single" && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {BRANCHES.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Visit Date</label>
            <input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Visited By</label>
            <input
              type="text"
              placeholder="Inspector name"
              value={visitedBy}
              onChange={(e) => setVisitedBy(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Checklist - Branch Tabs for Consolidated */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Inspection Checklist</h2>

        {reportType === "consolidated" && (
          <div className="flex gap-2 mb-6">
            {BRANCHES.map(branch => {
              const stats = getBranchStats(branch);
              return (
                <button
                  key={branch}
                  onClick={() => setActiveBranchTab(branch)}
                  className={`flex-1 p-3 rounded-xl font-medium transition-all ${
                    activeBranchTab === branch
                      ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-500"
                      : "bg-slate-50 text-slate-600 border-2 border-transparent hover:border-slate-200"
                  }`}
                >
                  <span>{branch}</span>
                  <span className={`ml-2 text-sm ${
                    stats.complianceRate >= 80 ? "text-emerald-600" : 
                    stats.complianceRate >= 60 ? "text-amber-600" : "text-red-600"
                  }`}>
                    {stats.complianceRate.toFixed(0)}%
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {Object.entries(groupedChecklist).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{category}</h3>
            <div className="space-y-3">
              {items.map(item => {
                const currentBranch = reportType === "single" ? selectedBranch : activeBranchTab;
                const checkItem = branchChecklist[currentBranch]?.[item.id];
                return (
                  <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateChecklistStatus(currentBranch, item.id, "pass")}
                        className={`p-2 rounded-lg transition-all ${
                          checkItem?.status === "pass"
                            ? "bg-emerald-500 text-white"
                            : "bg-white border border-slate-200 text-slate-400 hover:border-emerald-300"
                        }`}
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => updateChecklistStatus(currentBranch, item.id, "fail")}
                        className={`p-2 rounded-lg transition-all ${
                          checkItem?.status === "fail"
                            ? "bg-red-500 text-white"
                            : "bg-white border border-slate-200 text-slate-400 hover:border-red-300"
                        }`}
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{item.label}</p>
                    </div>
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={checkItem?.notes || ""}
                      onChange={(e) => updateChecklistNotes(currentBranch, item.id, e.target.value)}
                      className="w-48 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Issues Found */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Issues Found
        </h2>

        {issues.length > 0 && (
          <div className="space-y-3 mb-4">
            {issues.map(issue => (
              <div
                key={issue.id}
                className={`flex items-center gap-4 p-4 rounded-xl border-l-4 ${
                  issue.priority === "high"
                    ? "bg-red-50 border-l-red-500"
                    : issue.priority === "medium"
                    ? "bg-amber-50 border-l-amber-500"
                    : "bg-blue-50 border-l-blue-500"
                }`}
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{issue.description}</p>
                  <p className="text-sm text-slate-500">
                    {issue.branch}
                    {issue.assignedTo && ` • Assigned to: ${issue.assignedTo}`}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    issue.priority === "high"
                      ? "bg-red-500 text-white"
                      : issue.priority === "medium"
                      ? "bg-amber-500 text-white"
                      : "bg-blue-500 text-white"
                  }`}
                >
                  {issue.priority.toUpperCase()}
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

        <div className="grid grid-cols-5 gap-3 pt-4 border-t border-slate-100">
          <input
            type="text"
            placeholder="Issue description"
            value={newIssue.description}
            onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
            className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={newIssue.branch}
            onChange={(e) => setNewIssue({ ...newIssue, branch: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {activeBranches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select
            value={newIssue.priority}
            onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value as "high" | "medium" | "low" })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
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

      {/* Action Items */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Action Items</h2>

        {actionItems.length > 0 && (
          <div className="space-y-3 mb-4">
            {actionItems.map(action => (
              <div key={action.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{action.action}</p>
                  <p className="text-sm text-slate-500">
                    {action.branch}
                    {action.responsible && ` • ${action.responsible}`}
                    {action.dueDate && ` • Due: ${formatDate(action.dueDate)}`}
                  </p>
                </div>
                <button
                  onClick={() => removeActionItem(action.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-5 gap-3 pt-4 border-t border-slate-100">
          <input
            type="text"
            placeholder="Action to take"
            value={newAction.action}
            onChange={(e) => setNewAction({ ...newAction, action: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={newAction.branch}
            onChange={(e) => setNewAction({ ...newAction, branch: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {activeBranches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Responsible"
            value={newAction.responsible}
            onChange={(e) => setNewAction({ ...newAction, responsible: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="date"
            value={newAction.dueDate}
            onChange={(e) => setNewAction({ ...newAction, dueDate: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={addActionItem}
            className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Ratings & Notes */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Branch Ratings</h2>
            <div className="space-y-4">
              {activeBranches.map(branch => (
                <div key={branch} className="flex items-center gap-4">
                  <span className="w-24 font-medium text-slate-700">{branch}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setBranchRatings(prev => ({ ...prev, [branch]: star }))}
                        className={`text-2xl transition-transform hover:scale-110 ${
                          star <= branchRatings[branch] ? "opacity-100" : "opacity-30"
                        }`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">General Notes</h2>
            <textarea
              placeholder="Additional observations or comments..."
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              rows={5}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
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
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all flex items-center gap-2"
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
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                  {reportType === "consolidated" ? (
                    <Building2 className="w-6 h-6 text-white" />
                  ) : (
                    <MapPin className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    Branch Visit Report
                    {reportType === "consolidated" && (
                      <span className="ml-2 text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                        CONSOLIDATED
                      </span>
                    )}
                  </h2>
                  <p className="text-slate-500">
                    {reportType === "consolidated" ? "All Branches" : selectedBranch} • {formatDate(visitDate)}
                  </p>
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
              <div className={`grid gap-4 mb-8 ${reportType === "consolidated" ? "grid-cols-4" : "grid-cols-4"}`}>
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white text-center">
                  <p className="text-4xl font-bold">{overallStats.complianceRate.toFixed(0)}%</p>
                  <p className="text-sm opacity-80 mt-1">Overall Compliance</p>
                </div>
                {reportType === "consolidated" ? (
                  BRANCHES.map(branch => {
                    const stats = getBranchStats(branch);
                    return (
                      <div key={branch} className="bg-slate-50 rounded-2xl p-6 text-center">
                        <p className={`text-3xl font-bold ${
                          stats.complianceRate >= 80 ? "text-emerald-600" :
                          stats.complianceRate >= 60 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {stats.complianceRate.toFixed(0)}%
                        </p>
                        <p className="text-sm text-slate-500 mt-1">{branch}</p>
                        <p className="text-xs text-slate-400 mt-2">⭐ {branchRatings[branch]}/5</p>
                      </div>
                    );
                  })
                ) : (
                  <>
                    <div className="bg-emerald-50 rounded-2xl p-6 text-center">
                      <p className="text-3xl font-bold text-emerald-600">{overallStats.passCount}</p>
                      <p className="text-sm text-emerald-700">Passed</p>
                    </div>
                    <div className="bg-red-50 rounded-2xl p-6 text-center">
                      <p className="text-3xl font-bold text-red-600">{overallStats.failCount}</p>
                      <p className="text-sm text-red-700">Failed</p>
                    </div>
                    <div className="bg-amber-50 rounded-2xl p-6 text-center">
                      <p className="text-3xl font-bold text-amber-600">{branchRatings[selectedBranch]}/5</p>
                      <p className="text-sm text-amber-700">Rating</p>
                    </div>
                  </>
                )}
              </div>

              {/* Comparison Table for Consolidated */}
              {reportType === "consolidated" && (
                <div className="bg-slate-50 rounded-2xl p-6 mb-6 overflow-x-auto">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Branch Comparison</h3>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Checklist Item</th>
                        {BRANCHES.map(b => (
                          <th key={b} className="text-center py-3 px-4 text-sm font-semibold text-slate-600">{b}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {CHECKLIST_ITEMS.map(item => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-3 px-4 text-sm text-slate-700">{item.label}</td>
                          {BRANCHES.map(branch => {
                            const check = branchChecklist[branch]?.[item.id];
                            return (
                              <td key={branch} className="py-3 px-4 text-center">
                                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                  check?.status === "pass" ? "bg-emerald-100 text-emerald-700" :
                                  check?.status === "fail" ? "bg-red-100 text-red-700" :
                                  "bg-slate-200 text-slate-500"
                                }`}>
                                  {check?.status.toUpperCase() || "N/A"}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Single Branch Checklist */}
              {reportType === "single" && (
                <div className="bg-slate-50 rounded-2xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Inspection Results - {selectedBranch}</h3>
                  {Object.entries(groupedChecklist).map(([category, items]) => (
                    <div key={category} className="mb-4">
                      <h4 className="text-sm font-semibold text-slate-500 uppercase mb-2">{category}</h4>
                      {items.map(item => {
                        const check = branchChecklist[selectedBranch]?.[item.id];
                        return (
                          <div key={item.id} className="flex items-center gap-3 py-2 border-b border-slate-200 last:border-0">
                            <span className={`w-16 text-center text-xs font-semibold px-2 py-1 rounded-full ${
                              check?.status === "pass" ? "bg-emerald-100 text-emerald-700" :
                              check?.status === "fail" ? "bg-red-100 text-red-700" :
                              "bg-slate-200 text-slate-600"
                            }`}>
                              {check?.status.toUpperCase() || "N/A"}
                            </span>
                            <span className="flex-1 text-slate-700">{item.label}</span>
                            {check?.notes && (
                              <span className="text-sm text-slate-500 italic">{check.notes}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Issues & Actions */}
              {(issues.length > 0 || actionItems.length > 0) && (
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {issues.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Issues ({issues.length})</h3>
                      <div className="space-y-2">
                        {issues.map(issue => (
                          <div key={issue.id} className={`p-3 rounded-lg border-l-4 ${
                            issue.priority === "high" ? "bg-red-50 border-l-red-500" :
                            issue.priority === "medium" ? "bg-amber-50 border-l-amber-500" :
                            "bg-blue-50 border-l-blue-500"
                          }`}>
                            <p className="text-sm font-medium text-slate-800">{issue.description}</p>
                            <p className="text-xs text-slate-500">{issue.branch}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {actionItems.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">Actions ({actionItems.length})</h3>
                      <div className="space-y-2">
                        {actionItems.map(action => (
                          <div key={action.id} className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-sm font-medium text-slate-800">{action.action}</p>
                            <p className="text-xs text-slate-500">{action.branch} • {action.responsible}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {generalNotes && (
                <div className="bg-slate-50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">General Notes</h3>
                  <p className="text-slate-600 whitespace-pre-wrap">{generalNotes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-8 py-5 flex justify-between items-center">
              <p className="text-sm text-slate-400">Visited by: {visitedBy}</p>
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