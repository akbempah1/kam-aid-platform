"use client";
import { Suspense } from "react";
import ProtectedLayout from "../components/ProtectedLayout";
import { useState, useEffect, useCallback } from "react";
import {
  Award, Plus, Trash2, Save, Users, X, ChevronDown, ChevronUp,
  Star, TrendingUp, Building2, Briefcase, CheckCircle2, Clock,
} from "lucide-react";
import {
  staffMembers, bonusRecords,
  branchVisits, monthlyReports,
  type Staff, type BonusRecord, type BonusScores, type BranchStaffScore,
  type BranchVisit, type MonthlyReport,
} from "@/lib/dataService";

// ─── Constants ────────────────────────────────────────────────────────────────

const BRANCHES = ["Oyarifa", "Ghana Flag", "Madina"] as const;
const PERIOD_TYPES = ["Q1", "Q2", "Q3", "Q4", "Annual"] as const;
type PeriodType = typeof PERIOD_TYPES[number];

const ROLE_LABELS: Record<string, string> = {
  pharmacist: "Pharmacist",
  dispensing_technician: "Dispensing Technician",
  mca: "MCA",
  head_of_operations: "Head of Operations",
  purchasing_officer: "Purchasing Officer",
};

const BRANCH_SALES_KEY: Record<string, string> = {
  Oyarifa: "oyarifa",
  "Ghana Flag": "ghanaFlag",
  Madina: "madina",
};

// ─── Period helpers ────────────────────────────────────────────────────────────

function periodMonths(type: PeriodType): number[] {
  if (type === "Q1") return [1, 2, 3];
  if (type === "Q2") return [4, 5, 6];
  if (type === "Q3") return [7, 8, 9];
  if (type === "Q4") return [10, 11, 12];
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

function periodDates(type: PeriodType, year: number): { start: Date; end: Date } {
  const months = periodMonths(type);
  const start = new Date(year, months[0] - 1, 1);
  const end = new Date(year, months[months.length - 1], 0, 23, 59, 59);
  return { start, end };
}

function previousPeriod(type: PeriodType, year: number): { type: PeriodType; year: number } {
  if (type === "Q1") return { type: "Q4", year: year - 1 };
  if (type === "Q2") return { type: "Q1", year };
  if (type === "Q3") return { type: "Q2", year };
  if (type === "Q4") return { type: "Q3", year };
  return { type: "Annual", year: year - 1 };
}

function periodLabel(type: PeriodType, year: number) {
  return type === "Annual" ? `Annual ${year}` : `${type} ${year}`;
}

// ─── Score calculations ────────────────────────────────────────────────────────

function calcVisitPoints(avgScore: number, role: string): number {
  const weight = role === "pharmacist" ? 0.6 : 0.7;
  return parseFloat((avgScore * weight).toFixed(1));
}

function calcBranchAverage(visits: BranchVisit[], branch: string): number {
  const rates: number[] = [];
  for (const v of visits) {
    const stats = v.stats as { byBranch?: Record<string, { complianceRate: number }> };
    if (stats?.byBranch?.[branch]?.complianceRate != null) {
      rates.push(stats.byBranch[branch].complianceRate);
    }
  }
  if (!rates.length) return 0;
  return parseFloat((rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1));
}

function calcBranchSales(reports: MonthlyReport[], branch: string): number {
  const key = BRANCH_SALES_KEY[branch];
  return reports.reduce((sum, r) => {
    const sales = r.sales as Record<string, string>;
    return sum + (parseFloat(sales?.[key] ?? "0") || 0);
  }, 0);
}

function calcSalesBonus(current: number, previous: number): number {
  if (previous === 0 || current <= previous) return 0;
  const improvement = ((current - previous) / previous) * 100;
  if (improvement >= 10) return 10;
  if (improvement >= 5) return 7;
  if (improvement >= 2) return 4;
  return 2;
}

// ─── Default scores ────────────────────────────────────────────────────────────

function buildDefaultScores(
  staff: Staff[],
  visits: BranchVisit[],
  prevVisits: BranchVisit[],
  reports: MonthlyReport[],
  prevReports: MonthlyReport[],
  savedScores?: BonusScores,
): BonusScores {
  const branchAverages: Record<string, number> = {};
  const previousBranchAverages: Record<string, number> = {};
  const salesTotals: Record<string, number> = {};
  const previousSalesTotals: Record<string, number> = {};

  for (const branch of BRANCHES) {
    branchAverages[branch] = calcBranchAverage(visits, branch);
    previousBranchAverages[branch] = calcBranchAverage(prevVisits, branch);
    salesTotals[branch] = calcBranchSales(reports, branch);
    previousSalesTotals[branch] = calcBranchSales(prevReports, branch);
  }

  const branchStaff: BranchStaffScore[] = staff
    .filter(s => s.active && s.branch !== "Back Office")
    .map(s => {
      const saved = savedScores?.branchStaff.find(x => x.staffId === s.id);
      const avg = branchAverages[s.branch] ?? 0;
      const prevAvg = previousBranchAverages[s.branch] ?? 0;
      const visitPoints = calcVisitPoints(avg, s.role);
      const improvementBonus = s.role === "pharmacist" && avg > prevAvg ? 10 : 0;
      const salesBonus = calcSalesBonus(salesTotals[s.branch] ?? 0, previousSalesTotals[s.branch] ?? 0);
      const individualRating = saved?.individualRating ?? 0;
      const total = parseFloat((visitPoints + individualRating + improvementBonus + salesBonus).toFixed(1));
      return { staffId: s.id, name: s.name, role: s.role, branch: s.branch, branchVisitAverage: avg, visitPoints, individualRating, improvementBonus, salesBonus, total };
    });

  const headOfOpsStaff = staff.find(s => s.role === "head_of_operations" && s.active);
  const poStaff = staff.find(s => s.role === "purchasing_officer" && s.active);
  const savedHOO = savedScores?.backOffice?.headOfOps;
  const savedPO = savedScores?.backOffice?.purchasingOfficer;

  const hooVOS = savedHOO?.visitsOnSchedule ?? 0;
  const hooROT = savedHOO?.reportsOnTime ?? 0;
  const hooCT = savedHOO?.chequeTracking ?? 0;
  const poFR = savedPO?.fulfillmentRate ?? 0;
  const poDR = savedPO?.discretionaryRating ?? 0;

  return {
    branchStaff,
    backOffice: {
      headOfOps: {
        staffId: headOfOpsStaff?.id ?? 0,
        name: headOfOpsStaff?.name ?? "",
        visitsOnSchedule: hooVOS,
        reportsOnTime: hooROT,
        chequeTracking: hooCT,
        total: hooVOS + hooROT + hooCT,
      },
      purchasingOfficer: {
        staffId: poStaff?.id ?? 0,
        name: poStaff?.name ?? "",
        fulfillmentRate: poFR,
        discretionaryRating: poDR,
        total: poFR + poDR,
      },
    },
    metadata: { branchAverages, previousBranchAverages, salesTotals, previousSalesTotals },
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function PointInput({ value, max, onChange, label }: { value: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-semibold text-slate-700">{value} / {max}</span>
      </div>
      <input
        type="range" min={0} max={max} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-amber-500"
      />
    </div>
  );
}

// ─── Staff Management Modal ────────────────────────────────────────────────────

function StaffModal({ staff, onClose, onSave }: { staff: Staff[]; onClose: () => void; onSave: (updated: Staff[]) => void }) {
  const [list, setList] = useState<Staff[]>(staff);
  const [form, setForm] = useState({ name: "", role: "mca" as Staff["role"], branch: "Oyarifa" as Staff["branch"] });
  const [saving, setSaving] = useState(false);

  async function addMember() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const created = await staffMembers.create({ ...form, active: true });
      const updated = [...list, created];
      setList(updated);
      onSave(updated);
      setForm({ name: "", role: "mca", branch: "Oyarifa" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: Staff) {
    const updated_member = await staffMembers.update(member.id, { active: !member.active });
    const updated = list.map(s => s.id === member.id ? updated_member : s);
    setList(updated);
    onSave(updated);
  }

  async function removeMember(id: number) {
    await staffMembers.remove(id);
    const updated = list.filter(s => s.id !== id);
    setList(updated);
    onSave(updated);
  }

  const byBranch = ["Oyarifa", "Ghana Flag", "Madina", "Back Office"].reduce((acc, b) => {
    acc[b] = list.filter(s => s.branch === b);
    return acc;
  }, {} as Record<string, Staff[]>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" /> Manage Staff
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add new staff */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-3">Add Staff Member</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                placeholder="Full name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as Staff["role"] }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select
                value={form.branch}
                onChange={e => setForm(f => ({ ...f, branch: e.target.value as Staff["branch"] }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                {["Oyarifa", "Ghana Flag", "Madina", "Back Office"].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <button
              onClick={addMember}
              disabled={saving || !form.name.trim()}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Member
            </button>
          </div>

          {/* Staff by branch */}
          {Object.entries(byBranch).map(([branch, members]) => (
            <div key={branch}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{branch}</p>
              {members.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No staff added yet</p>
              ) : (
                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border ${m.active ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-60"}`}>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{m.name}</p>
                        <p className="text-xs text-slate-500">{ROLE_LABELS[m.role]}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive(m)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${m.active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                        >
                          {m.active ? "Active" : "Inactive"}
                        </button>
                        <button onClick={() => removeMember(m.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

function BonusContent() {
  const currentYear = new Date().getFullYear();
  const [periodType, setPeriodType] = useState<PeriodType>("Q1");
  const [year, setYear] = useState(currentYear);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [allVisits, setAllVisits] = useState<BranchVisit[]>([]);
  const [allReports, setAllReports] = useState<MonthlyReport[]>([]);
  const [savedRecord, setSavedRecord] = useState<BonusRecord | null>(null);
  const [scores, setScores] = useState<BonusScores | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({ Oyarifa: true, "Ghana Flag": true, Madina: true });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"scoring" | "history">("scoring");
  const [history, setHistory] = useState<BonusRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, v, r, b] = await Promise.all([
          staffMembers.list(),
          branchVisits.list(),
          monthlyReports.list(),
          bonusRecords.list(),
        ]);
        setStaff(s);
        setAllVisits(v);
        setAllReports(r);
        setHistory(b);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Recalculate scores when period or data changes
  const recalculate = useCallback((
    s: Staff[],
    v: BranchVisit[],
    r: MonthlyReport[],
    h: BonusRecord[],
    pt: PeriodType,
    yr: number,
  ) => {
    const { start, end } = periodDates(pt, yr);
    const prev = previousPeriod(pt, yr);
    const { start: pStart, end: pEnd } = periodDates(prev.type, prev.year);

    const visits = v.filter(x => {
      const d = new Date(x.visitDate);
      return d >= start && d <= end;
    });
    const prevVisits = v.filter(x => {
      const d = new Date(x.visitDate);
      return d >= pStart && d <= pEnd;
    });
    const reports = r.filter(x => {
      const months = periodMonths(pt);
      return x.year === yr && months.includes(x.month);
    });
    const prevReports = r.filter(x => {
      const months = periodMonths(prev.type);
      return x.year === prev.year && months.includes(x.month);
    });

    const existing = h.find(x => x.periodType === pt && x.year === yr) ?? null;
    setSavedRecord(existing);

    const built = buildDefaultScores(s, visits, prevVisits, reports, prevReports, existing?.scores);
    setScores(built);
  }, []);

  useEffect(() => {
    if (!loading) recalculate(staff, allVisits, allReports, history, periodType, year);
  }, [loading, staff, allVisits, allReports, history, periodType, year, recalculate]);

  function updateIndividualRating(staffId: number, value: number) {
    setScores(prev => {
      if (!prev) return prev;
      const updated = prev.branchStaff.map(s => {
        if (s.staffId !== staffId) return s;
        const total = parseFloat((s.visitPoints + value + s.improvementBonus + s.salesBonus).toFixed(1));
        return { ...s, individualRating: value, total };
      });
      return { ...prev, branchStaff: updated };
    });
  }

  function updateBackOffice(field: "headOfOps" | "purchasingOfficer", key: string, value: number) {
    setScores(prev => {
      if (!prev) return prev;
      if (field === "headOfOps") {
        const section = { ...prev.backOffice.headOfOps, [key]: value };
        section.total = section.visitsOnSchedule + section.reportsOnTime + section.chequeTracking;
        return { ...prev, backOffice: { ...prev.backOffice, headOfOps: section } };
      } else {
        const section = { ...prev.backOffice.purchasingOfficer, [key]: value };
        section.total = section.fulfillmentRate + section.discretionaryRating;
        return { ...prev, backOffice: { ...prev.backOffice, purchasingOfficer: section } };
      }
    });
  }

  async function handleSave(status: "draft" | "final") {
    if (!scores) return;
    setSaving(true);
    try {
      const payload = { periodType, year, scores, status };
      const result = await bonusRecords.save(payload);
      setSavedRecord(result);
      setHistory(prev => {
        const idx = prev.findIndex(x => x.periodType === periodType && x.year === year);
        if (idx >= 0) { const n = [...prev]; n[idx] = result; return n; }
        return [result, ...prev];
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function loadHistoryRecord(record: BonusRecord) {
    setPeriodType(record.periodType);
    setYear(record.year);
    setTab("scoring");
  }

  const allBranchStaff = scores?.branchStaff ?? [];
  const allScored = [
    ...allBranchStaff,
    ...(scores ? [
      { staffId: scores.backOffice.headOfOps.staffId, name: scores.backOffice.headOfOps.name, role: "head_of_operations", branch: "Back Office", total: scores.backOffice.headOfOps.total },
      { staffId: scores.backOffice.purchasingOfficer.staffId, name: scores.backOffice.purchasingOfficer.name, role: "purchasing_officer", branch: "Back Office", total: scores.backOffice.purchasingOfficer.total },
    ] : []),
  ].filter(s => s.name).sort((a, b) => b.total - a.total);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-7 h-7 text-amber-500" /> Performance Bonus
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Score staff for quarterly or annual bonus</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowStaffModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Users className="w-4 h-4" /> Manage Staff
          </button>
          <button
            onClick={() => setTab(tab === "scoring" ? "history" : "scoring")}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Clock className="w-4 h-4" /> {tab === "scoring" ? "History" : "Back to Scoring"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      {tab === "history" ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Saved Bonus Records</h2>
          {history.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No bonus records saved yet.</p>
          ) : (
            <div className="space-y-3">
              {history.map(r => (
                <div key={r.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-800">{periodLabel(r.periodType, r.year)}</p>
                    <p className="text-xs text-slate-500">{r.scores.branchStaff.length} branch staff · Saved {new Date(r.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.status === "final" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {r.status === "final" ? "Final" : "Draft"}
                    </span>
                    <button
                      onClick={() => loadHistoryRecord(r)}
                      className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Period selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Period</p>
                <div className="flex gap-2 flex-wrap">
                  {PERIOD_TYPES.map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriodType(p)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${periodType === p ? "bg-amber-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Year</p>
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-500">Scoring period</p>
                <p className="text-lg font-bold text-amber-600">{periodLabel(periodType, year)}</p>
                {savedRecord && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${savedRecord.status === "final" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {savedRecord.status === "final" ? "Finalised" : "Draft saved"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {staff.filter(s => s.active && s.branch !== "Back Office").length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
              <Users className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <p className="font-semibold text-amber-800">No branch staff added yet</p>
              <p className="text-sm text-amber-600 mt-1">Click &quot;Manage Staff&quot; to add your team members first.</p>
            </div>
          )}

          {/* Branch sections */}
          {BRANCHES.map(branch => {
            const branchStaff = allBranchStaff.filter(s => s.branch === branch);
            if (branchStaff.length === 0) return null;
            const avg = scores?.metadata.branchAverages[branch] ?? 0;
            const prevAvg = scores?.metadata.previousBranchAverages[branch] ?? 0;
            const salesCurrent = scores?.metadata.salesTotals[branch] ?? 0;
            const salesPrev = scores?.metadata.previousSalesTotals[branch] ?? 0;
            const isExpanded = expandedBranches[branch] ?? true;

            return (
              <div key={branch} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {/* Branch header */}
                <button
                  onClick={() => setExpandedBranches(prev => ({ ...prev, [branch]: !isExpanded }))}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-800">{branch} Branch</p>
                      <p className="text-xs text-slate-500">{branchStaff.length} staff · Visit avg: {avg.toFixed(1)}%
                        {avg > prevAvg ? <span className="text-emerald-600 ml-1">↑</span> : avg < prevAvg ? <span className="text-red-500 ml-1">↓</span> : null}
                        {salesCurrent > 0 && salesPrev > 0 && salesCurrent > salesPrev && <span className="text-emerald-600 ml-2">Sales ↑</span>}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-slate-100">
                    {/* Branch stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500">Visit Average</p>
                        <p className="text-lg font-bold text-slate-800">{avg.toFixed(1)}%</p>
                        {avg === 0 && <p className="text-xs text-amber-500">No visits found</p>}
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500">Prev Period</p>
                        <p className="text-lg font-bold text-slate-800">{prevAvg.toFixed(1)}%</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500">Sales (Period)</p>
                        <p className="text-lg font-bold text-slate-800">GHC {salesCurrent.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-500">Sales (Prev)</p>
                        <p className="text-lg font-bold text-slate-800">GHC {salesPrev.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Staff cards */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      {branchStaff.map(s => (
                        <div key={s.staffId} className="border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-800">{s.name}</p>
                              <p className="text-xs text-slate-500">{ROLE_LABELS[s.role]}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-amber-600">{s.total.toFixed(0)}</p>
                              <p className="text-xs text-slate-400">/ {s.role === "pharmacist" ? "100+10" : "100+10"} pts</p>
                            </div>
                          </div>

                          {/* Score breakdown */}
                          <div className="space-y-2 bg-slate-50 rounded-lg p-3 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Branch Visit ({s.role === "pharmacist" ? "60" : "70"} pts max)</span>
                              <span className="font-semibold text-slate-700">{s.visitPoints.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Individual Rating (30 pts max)</span>
                              <span className="font-semibold text-slate-700">{s.individualRating}</span>
                            </div>
                            {s.role === "pharmacist" && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Improvement Bonus</span>
                                <span className={`font-semibold ${s.improvementBonus > 0 ? "text-emerald-600" : "text-slate-400"}`}>{s.improvementBonus > 0 ? "+10 ✓" : "0"}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t border-slate-200 pt-1">
                              <span className="text-slate-500">Sales Bonus (extra)</span>
                              <span className={`font-semibold ${s.salesBonus > 0 ? "text-emerald-600" : "text-slate-400"}`}>{s.salesBonus > 0 ? `+${s.salesBonus}` : "0"}</span>
                            </div>
                          </div>

                          {/* Individual rating input */}
                          <PointInput
                            label="Set Individual Rating (0–30)"
                            value={s.individualRating}
                            max={30}
                            onChange={v => updateIndividualRating(s.staffId, v)}
                          />
                          <ScoreBar value={s.total} max={110} color={s.total >= 80 ? "bg-emerald-400" : s.total >= 60 ? "bg-amber-400" : "bg-red-400"} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Back Office */}
          {scores && (scores.backOffice.headOfOps.name || scores.backOffice.purchasingOfficer.name) && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 bg-sky-100 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Back Office</p>
                  <p className="text-xs text-slate-500">Operations & Procurement</p>
                </div>
              </div>

              <div className="p-5 grid sm:grid-cols-2 gap-4">
                {/* Head of Operations */}
                {scores.backOffice.headOfOps.name && (
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{scores.backOffice.headOfOps.name}</p>
                        <p className="text-xs text-slate-500">Head of Operations & Finance</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-sky-600">{scores.backOffice.headOfOps.total}</p>
                        <p className="text-xs text-slate-400">/ 100 pts</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <PointInput label="Branch visits completed on schedule (0–40)" value={scores.backOffice.headOfOps.visitsOnSchedule} max={40} onChange={v => updateBackOffice("headOfOps", "visitsOnSchedule", v)} />
                      <PointInput label="Reports submitted within 48hrs (0–30)" value={scores.backOffice.headOfOps.reportsOnTime} max={30} onChange={v => updateBackOffice("headOfOps", "reportsOnTime", v)} />
                      <PointInput label="Cheque tracking up to date (0–30)" value={scores.backOffice.headOfOps.chequeTracking} max={30} onChange={v => updateBackOffice("headOfOps", "chequeTracking", v)} />
                    </div>
                    <ScoreBar value={scores.backOffice.headOfOps.total} max={100} color={scores.backOffice.headOfOps.total >= 80 ? "bg-emerald-400" : scores.backOffice.headOfOps.total >= 60 ? "bg-amber-400" : "bg-red-400"} />
                  </div>
                )}

                {/* Purchasing Officer */}
                {scores.backOffice.purchasingOfficer.name && (
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{scores.backOffice.purchasingOfficer.name}</p>
                        <p className="text-xs text-slate-500">Purchasing Officer</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-sky-600">{scores.backOffice.purchasingOfficer.total}</p>
                        <p className="text-xs text-slate-400">/ 100 pts</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <PointInput label="Shortage fulfillment rate (0–70)" value={scores.backOffice.purchasingOfficer.fulfillmentRate} max={70} onChange={v => updateBackOffice("purchasingOfficer", "fulfillmentRate", v)} />
                      <PointInput label="Madam's discretionary rating (0–30)" value={scores.backOffice.purchasingOfficer.discretionaryRating} max={30} onChange={v => updateBackOffice("purchasingOfficer", "discretionaryRating", v)} />
                    </div>
                    <ScoreBar value={scores.backOffice.purchasingOfficer.total} max={100} color={scores.backOffice.purchasingOfficer.total >= 80 ? "bg-emerald-400" : scores.backOffice.purchasingOfficer.total >= 60 ? "bg-amber-400" : "bg-red-400"} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          {allScored.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" /> Summary — {periodLabel(periodType, year)}
              </h2>
              <div className="space-y-2">
                {allScored.map((s, i) => (
                  <div key={s.staffId} className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-amber-700/60 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-800 truncate">{s.name}</span>
                        <span className="text-sm font-bold text-slate-800 ml-2 shrink-0">{s.total.toFixed(0)} pts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${s.total >= 80 ? "bg-emerald-400" : s.total >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                            style={{ width: `${Math.min(100, (s.total / 110) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 shrink-0">{s.branch}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save actions */}
          {scores && (
            <div className="flex items-center justify-between gap-3 pb-8">
              <div className="flex items-center gap-2">
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Saved successfully
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSave("draft")}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" /> Save Draft
                </button>
                <button
                  onClick={() => handleSave("final")}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold shadow hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all"
                >
                  <TrendingUp className="w-4 h-4" /> {saving ? "Saving…" : "Finalise Scores"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showStaffModal && (
        <StaffModal
          staff={staff}
          onClose={() => setShowStaffModal(false)}
          onSave={updated => setStaff(updated)}
        />
      )}
    </div>
  );
}

// ─── Export ────────────────────────────────────────────────────────────────────

export default function BonusPage() {
  return (
    <ProtectedLayout>
      <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>}>
        <BonusContent />
      </Suspense>
    </ProtectedLayout>
  );
}
