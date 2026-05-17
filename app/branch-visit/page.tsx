"use client";
import { Suspense } from "react";
import ProtectedLayout from "../components/ProtectedLayout";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MapPin, Plus, Trash2, Save, Eye, X, Download,
  Building2, AlertTriangle, Shield, Package,
  Wifi, Users, FileText, DollarSign, Settings,
  MessageSquare, ShoppingCart,
} from "lucide-react";
import { branchVisits, BranchVisit } from "@/lib/dataService";

function VisitTrend({ current, prev }: { current: number; prev: number | undefined }) {
  if (prev === undefined || prev === 0 || current === 0) return null;
  const diff = current - prev;
  const pts = Math.abs(diff);
  if (pts < 0.1) return null;
  return (
    <span className={`text-xs font-semibold mt-1 block ${diff > 0 ? "text-emerald-300" : "text-red-300"}`}>
      {diff > 0 ? "↑" : "↓"} {pts.toFixed(1)}pts vs prev visit
    </span>
  );
}

function VisitTrendDark({ current, prev }: { current: number; prev: number | undefined }) {
  if (prev === undefined || prev === 0 || current === 0) return null;
  const diff = current - prev;
  const pts = Math.abs(diff);
  if (pts < 0.1) return null;
  return (
    <span className={`text-xs font-semibold mt-1 block ${diff > 0 ? "text-emerald-600" : "text-red-500"}`}>
      {diff > 0 ? "↑" : "↓"} {pts.toFixed(1)}pts vs prev visit
    </span>
  );
}

const BRANCHES = ["Oyarifa", "Ghana Flag", "Madina"];

// ─── Types ────────────────────────────────────────────────────────────────────

type QualityItem = { rating: number; observation: string };
type BinaryItem  = { value: boolean | null; notes: string };

type ExpiredDrug   = { id: number; drugName: string; expiryDate: string; quantity: string; shelfLocation: string };
type NearExpiryDrug = { id: number; drugName: string; expiryDate: string; quantity: string; stickerApplied: boolean | null };
type OutOfStockItem = { id: number; productName: string; duration: string };
type ShelfEntry     = { id: number; workerName: string; shelfArea: string; shelfCleanliness: number; drugCleanliness: number; noEmptySpots: number; observation: string; rating?: number };
type StaffEntry     = { id: number; name: string; present: boolean | null; inLabCoat: boolean | null };
type ActionItem     = { id: number; action: string; dueDate: string; responsible: string; branch: string };
type AutoIssue      = { id: number; description: string; priority: "high" | "medium"; branch: string; assignedTo: string };
type CashShiftEntry = { date: string; shift: "Morning" | "Afternoon"; pos: string; onHand: string };
type CashReconciliation = Record<string, CashShiftEntry[]>;

type BranchInspection = {
  exterior:      { frontCleanliness: QualityItem; signageWorking: BinaryItem };
  interiorSpaces:{ floors: QualityItem; washroom: QualityItem; storeroom: QualityItem };
  shelvesProducts: {
    overallAppearance: QualityItem;
    individualShelves: ShelfEntry[];
    expiredDrugsFound: BinaryItem;
    expiredDrugs: ExpiredDrug[];
    nearExpiryFound: BinaryItem;
    nearExpiryItems: NearExpiryDrug[];
    counterCleanliness: QualityItem;
  };
  inventory:    { outOfStockItems: OutOfStockItem[] };
  systems:      { posOperational: BinaryItem; noPendingTransfers: BinaryItem; internetConnectivity: BinaryItem; devicesCharged: BinaryItem; airtimeAvailable: BinaryItem };
  personnel:    { staffEntries: StaffEntry[]; staffAttitude: QualityItem };
  utilities:    { acWorking: BinaryItem; fridgeWorking: BinaryItem; lightBulbsFunctional: BinaryItem };
  documentation:{ handoverBookSignedOff: BinaryItem };
  security:     { cctvOperational: BinaryItem; safeCashBoxSecured: BinaryItem };
  adminComms:   { allMessagesReplied: BinaryItem; dailySalesReportSubmitted: BinaryItem; customerComplaints: BinaryItem };
  pettyCash:    { openingBalance: string; amountSpent: string; notes: string };
};

type InspectionData = Record<string, BranchInspection>;

// ─── Constants ────────────────────────────────────────────────────────────────

const RATING_LABELS: Record<number, string> = {
  0: "", 1: "Very Poor", 2: "Poor", 3: "Acceptable", 4: "Good", 5: "Excellent",
};

const CASH_DIFF_HIGH = 20;
const CASH_DIFF_LOW  = -5;

function get7Days(visitDate: string): string[] {
  if (!visitDate) return [];
  const days: string[] = [];
  const base = new Date(visitDate + "T12:00:00");
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function createCashRecon(visitDate: string): CashReconciliation {
  const days = get7Days(visitDate);
  const recon: CashReconciliation = {};
  BRANCHES.forEach(branch => {
    recon[branch] = days.flatMap(date => ([
      { date, shift: "Morning" as const,   pos: "", onHand: "" },
      { date, shift: "Afternoon" as const, pos: "", onHand: "" },
    ]));
  });
  return recon;
}

function getCashDiff(pos: string, onHand: string): number | null {
  const p = parseFloat(pos), oh = parseFloat(onHand);
  if (isNaN(p) || isNaN(oh) || pos === "" || onHand === "") return null;
  return oh - p;
}

function isCashFlagged(diff: number | null): boolean {
  return diff !== null && (diff > CASH_DIFF_HIGH || diff < CASH_DIFF_LOW);
}

function fmtDay(iso: string): string {
  if (!iso) return iso;
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// ─── Branch templates ─────────────────────────────────────────────────────────

type BranchTemplate  = { staff: { name: string }[]; shelves: { workerName: string; shelfArea: string }[] };
type BranchTemplates = Record<string, BranchTemplate>;

const TEMPLATES_KEY = "kam-aid-branch-templates";

const DEFAULT_TEMPLATES: BranchTemplates = {
  "Oyarifa": {
    staff: [{ name: "Pharm Sandy" }, { name: "Jennifer" }],
    shelves: [
      { workerName: "Jennifer",  shelfArea: "Prescription" },
      { workerName: "Grace",     shelfArea: "Antibiotics, cold tablets" },
      { workerName: "Berlinda",  shelfArea: "Cough and cold" },
      { workerName: "Jennifer",  shelfArea: "Medical disposals (gloves, bandages), ivs" },
      { workerName: "Jennifer",  shelfArea: "Snacks" },
      { workerName: "Berlinda",  shelfArea: "Multivitamins" },
      { workerName: "Grace",     shelfArea: "Herbals" },
      { workerName: "Grace",     shelfArea: "Baby food" },
      { workerName: "Grace",     shelfArea: "Antiseptics, diapers" },
      { workerName: "Berlinda",  shelfArea: "Cosmetics" },
    ],
  },
  "Ghana Flag": {
    staff: [{ name: "Twumwaa" }, { name: "Pharm David" }, { name: "MCA" }],
    shelves: [
      { workerName: "Matilda",  shelfArea: "Vitamins, hematinics" },
      { workerName: "Matilda",  shelfArea: "Herbals, Antacids, ointments" },
      { workerName: "Matilda",  shelfArea: "Diapers, toothpastes, mouthwashes" },
      { workerName: "Matilda",  shelfArea: "Cosmetics, sanitary pads, antiseptics" },
      { workerName: "Matilda",  shelfArea: "Snacks and baby food" },
      { workerName: "Matilda",  shelfArea: "Toys" },
      { workerName: "Twumwaa", shelfArea: "Prescription shelf" },
      { workerName: "Twumwaa", shelfArea: "Cough and cold, creams" },
      { workerName: "Twumwaa", shelfArea: "Medical disposals (gloves, cotton)" },
    ],
  },
  "Madina": {
    staff: [{ name: "Mr. Eric" }, { name: "Dr. Kingsley" }, { name: "Prince" }],
    shelves: [
      { workerName: "Prince", shelfArea: "Herbals and ointment" },
      { workerName: "Prince", shelfArea: "Hematinics" },
      { workerName: "Prince", shelfArea: "Multivitamins and creams" },
      { workerName: "Prince", shelfArea: "Prescriptions" },
      { workerName: "",       shelfArea: "Eye drops and other tablets shelf" },
      { workerName: "",       shelfArea: "Cough and cold shelf" },
      { workerName: "",       shelfArea: "Cosmetics" },
      { workerName: "",       shelfArea: "Baby food" },
      { workerName: "",       shelfArea: "Snacks" },
      { workerName: "",       shelfArea: "Toothpastes, mouthwashes" },
    ],
  },
};

function getTemplates(): BranchTemplates {
  if (typeof window === "undefined") return DEFAULT_TEMPLATES;
  try {
    const stored = localStorage.getItem(TEMPLATES_KEY);
    return stored ? { ...DEFAULT_TEMPLATES, ...JSON.parse(stored) } : DEFAULT_TEMPLATES;
  } catch { return DEFAULT_TEMPLATES; }
}

function saveTemplates(templates: BranchTemplates) {
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates)); } catch {}
}

function templateToEntries(t: BranchTemplate): { staffEntries: StaffEntry[]; individualShelves: ShelfEntry[] } {
  const base = Date.now();
  return {
    staffEntries: t.staff.map((s, i) => ({ id: base + i, name: s.name, present: null, inLabCoat: null })),
    individualShelves: t.shelves.map((s, i) => ({ id: base + i + 10000, workerName: s.workerName, shelfArea: s.shelfArea, shelfCleanliness: 0, drugCleanliness: 0, noEmptySpots: 0, observation: "" })),
  };
}

const emptyQuality  = (): QualityItem => ({ rating: 0, observation: "" });
const emptyBinary   = (): BinaryItem  => ({ value: null, notes: "" });

const createEmptyInspection = (): BranchInspection => ({
  exterior:       { frontCleanliness: emptyQuality(), signageWorking: emptyBinary() },
  interiorSpaces: { floors: emptyQuality(), washroom: emptyQuality(), storeroom: emptyQuality() },
  shelvesProducts: {
    overallAppearance: emptyQuality(), individualShelves: [],
    expiredDrugsFound: emptyBinary(), expiredDrugs: [],
    nearExpiryFound: emptyBinary(), nearExpiryItems: [],
    counterCleanliness: emptyQuality(),
  },
  inventory:     { outOfStockItems: [] },
  systems:       { posOperational: emptyBinary(), noPendingTransfers: emptyBinary(), internetConnectivity: emptyBinary(), devicesCharged: emptyBinary(), airtimeAvailable: emptyBinary() },
  personnel:     { staffEntries: [], staffAttitude: emptyQuality() },
  utilities:     { acWorking: emptyBinary(), fridgeWorking: emptyBinary(), lightBulbsFunctional: emptyBinary() },
  documentation: { handoverBookSignedOff: emptyBinary() },
  security:      { cctvOperational: emptyBinary(), safeCashBoxSecured: emptyBinary() },
  adminComms:    { allMessagesReplied: emptyBinary(), dailySalesReportSubmitted: emptyBinary(), customerComplaints: emptyBinary() },
  pettyCash:     { openingBalance: "", amountSpent: "", notes: "" },
});

const createInitialData = (): InspectionData => {
  const d: InspectionData = {};
  BRANCHES.forEach(b => { d[b] = createEmptyInspection(); });
  return d;
};

// ─── Small reusable components ────────────────────────────────────────────────

function RatingButtons({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5 items-center flex-wrap">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n} type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
            value === n
              ? n <= 2 ? "bg-red-500 text-white shadow-sm"
                : n === 3 ? "bg-amber-500 text-white shadow-sm"
                : "bg-emerald-500 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-400 hover:border-slate-400"
          }`}
        >{n}</button>
      ))}
      {value > 0 && (
        <span className={`text-xs font-semibold ml-1 ${value <= 2 ? "text-red-500" : value === 3 ? "text-amber-500" : "text-emerald-600"}`}>
          {RATING_LABELS[value]}
        </span>
      )}
    </div>
  );
}

function QualityRow({ label, item, onChange }: { label: string; item: QualityItem; onChange: (u: Partial<QualityItem>) => void }) {
  return (
    <div className="p-4 bg-slate-50 rounded-xl space-y-2">
      <p className="font-medium text-slate-800 text-sm">{label}</p>
      <RatingButtons value={item.rating} onChange={rating => onChange({ rating })} />
      <textarea
        placeholder="What did you observe?"
        value={item.observation}
        onChange={e => onChange({ observation: e.target.value })}
        rows={2}
        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
      />
    </div>
  );
}

function BinaryRow({ label, item, onChange, critical }: { label: string; item: BinaryItem; onChange: (u: Partial<BinaryItem>) => void; critical?: boolean }) {
  return (
    <div className="p-4 bg-slate-50 rounded-xl space-y-2">
      <div className="flex items-center gap-3">
        <p className="flex-1 font-medium text-slate-800 text-sm">{label}</p>
        <div className="flex gap-2 shrink-0">
          <button type="button"
            onClick={() => onChange({ value: item.value === true ? null : true })}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${item.value === true ? "bg-emerald-500 text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-emerald-300"}`}
          >Yes</button>
          <button type="button"
            onClick={() => onChange({ value: item.value === false ? null : false })}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${item.value === false ? (critical ? "bg-red-500 text-white" : "bg-amber-500 text-white") : "bg-white border border-slate-200 text-slate-500 hover:border-red-300"}`}
          >No</button>
        </div>
      </div>
      {(item.value === false || item.notes) && (
        <input type="text" placeholder="Add notes..."
          value={item.notes} onChange={e => onChange({ notes: e.target.value })}
          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      )}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">{icon}{title}</h2>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function BranchVisitContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");

  const [reportId, setReportId]     = useState<number | null>(null);
  const [reportType, setReportType] = useState<"single" | "consolidated">("consolidated");
  const [visitDate, setVisitDate]   = useState("");
  const [selectedBranch, setSelectedBranch] = useState("Oyarifa");
  const [visitedBy, setVisitedBy]   = useState("");
  const [activeBranchTab, setActiveBranchTab] = useState("Oyarifa");
  const [inspectionData, setInspectionData]   = useState<InspectionData>(createInitialData);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newAction, setNewAction]   = useState({ action: "", dueDate: "", responsible: "", branch: "Oyarifa" });
  const [generalNotes, setGeneralNotes] = useState("");
  const [cashReconciliation, setCashReconciliation] = useState<CashReconciliation>({});
  const [showPreview, setShowPreview]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [prevVisitReport, setPrevVisitReport] = useState<BranchVisit | null>(null);
  const [templateEditorBranch, setTemplateEditorBranch] = useState("Oyarifa");
  const [draftTemplate, setDraftTemplate] = useState<BranchTemplate | null>(null);

  const activeBranches = reportType === "single" ? [selectedBranch] : BRANCHES;
  const currentBranch  = reportType === "single" ? selectedBranch : activeBranchTab;

  // ── State helpers ───────────────────────────────────────────────────────────

  const updateBranch = (branch: string, fn: (p: BranchInspection) => BranchInspection) =>
    setInspectionData(prev => ({ ...prev, [branch]: fn(prev[branch]) }));

  const upd = (fn: (p: BranchInspection) => BranchInspection) => updateBranch(currentBranch, fn);

  // ── Scoring ─────────────────────────────────────────────────────────────────

  const getBranchScore = (branch: string): number => {
    const d = inspectionData[branch];
    if (!d) return 0;
    const qualityRatings = [
      d.exterior.frontCleanliness.rating,
      d.interiorSpaces.floors.rating, d.interiorSpaces.washroom.rating, d.interiorSpaces.storeroom.rating,
      d.shelvesProducts.overallAppearance.rating, d.shelvesProducts.counterCleanliness.rating,
      d.personnel.staffAttitude.rating,
      ...d.shelvesProducts.individualShelves.map(s => {
        const sc = s.shelfCleanliness || 0, dc = s.drugCleanliness || 0, nes = s.noEmptySpots || 0;
        const active = [sc, dc, nes].filter(v => v > 0);
        return active.length > 0 ? active.reduce((a, b) => a + b, 0) / active.length : (s.rating || 0);
      }),
    ].filter(r => r > 0);
    const binaryValues = [
      d.exterior.signageWorking.value, d.systems.posOperational.value, d.systems.noPendingTransfers.value,
      d.systems.internetConnectivity.value, d.systems.devicesCharged.value, d.systems.airtimeAvailable.value,
      d.utilities.acWorking.value, d.utilities.fridgeWorking.value, d.utilities.lightBulbsFunctional.value,
      d.documentation.handoverBookSignedOff.value, d.security.cctvOperational.value,
      d.security.safeCashBoxSecured.value, d.adminComms.allMessagesReplied.value,
      d.adminComms.dailySalesReportSubmitted.value,
    ].filter(v => v !== null) as boolean[];
    const qualityScore = qualityRatings.length > 0
      ? (qualityRatings.reduce((a, b) => a + b, 0) / qualityRatings.length / 5) * 100 : 0;
    const binaryScore  = binaryValues.length > 0
      ? (binaryValues.filter(Boolean).length / binaryValues.length) * 100 : 0;
    if (qualityRatings.length > 0 && binaryValues.length > 0) return (qualityScore + binaryScore) / 2;
    return qualityScore || binaryScore;
  };

  const getOverallScore = () => {
    const scores = activeBranches.map(getBranchScore).filter(s => s > 0);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  };

  // ── Auto-issue generation ───────────────────────────────────────────────────

  const generateIssues = (): AutoIssue[] => {
    const issues: AutoIssue[] = [];
    let id = Date.now();
    activeBranches.forEach(branch => {
      const d = inspectionData[branch];
      if (!d) return;
      // Quality items ≤ 2
      [
        { item: d.exterior.frontCleanliness,          label: "Front of shop cleanliness" },
        { item: d.interiorSpaces.floors,               label: "Floor condition" },
        { item: d.interiorSpaces.washroom,             label: "Washroom condition" },
        { item: d.interiorSpaces.storeroom,            label: "Storeroom condition" },
        { item: d.shelvesProducts.overallAppearance,   label: "Shelf appearance" },
        { item: d.shelvesProducts.counterCleanliness,  label: "Counter cleanliness" },
        { item: d.personnel.staffAttitude,             label: "Staff attitude" },
      ].forEach(({ item, label }) => {
        if (item.rating > 0 && item.rating <= 2)
          issues.push({ id: id++, description: `${label} rated ${item.rating}/5${item.observation ? ` — ${item.observation}` : ""}`, priority: item.rating === 1 ? "high" : "medium", branch, assignedTo: "" });
      });
      // Individual shelves ≤ 2
      d.shelvesProducts.individualShelves.forEach(s => {
        const sc = s.shelfCleanliness || 0, dc = s.drugCleanliness || 0, nes = s.noEmptySpots || 0;
        const hasNew = sc > 0 || dc > 0 || nes > 0;
        const lbl = `${s.workerName ? s.workerName + " — " : ""}${s.shelfArea}`;
        if (hasNew) {
          ([{ v: sc, t: "Shelf cleanliness" }, { v: dc, t: "Drug cleanliness" }, { v: nes, t: "Empty spots on shelf" }] as const).forEach(({ v, t }) => {
            if (v > 0 && v <= 2) issues.push({ id: id++, description: `${t}: ${lbl} rated ${v}/5`, priority: v === 1 ? "high" : "medium", branch, assignedTo: s.workerName });
          });
        } else if ((s.rating || 0) > 0 && (s.rating || 0) <= 2) {
          issues.push({ id: id++, description: `Shelf cleanliness: ${s.workerName} (${s.shelfArea}) rated ${s.rating}/5${s.observation ? ` — ${s.observation}` : ""}`, priority: (s.rating || 0) === 1 ? "high" : "medium", branch, assignedTo: s.workerName });
        }
      });
      // Expired drugs
      d.shelvesProducts.expiredDrugs.forEach(drug =>
        issues.push({ id: id++, description: `Expired drug: ${drug.drugName} | Exp: ${drug.expiryDate} | Qty: ${drug.quantity} | Location: ${drug.shelfLocation}`, priority: "high", branch, assignedTo: "" })
      );
      // Critical binary No
      if (d.utilities.fridgeWorking.value === false)
        issues.push({ id: id++, description: `Fridge not working${d.utilities.fridgeWorking.notes ? ` — ${d.utilities.fridgeWorking.notes}` : ""}`, priority: "high", branch, assignedTo: "" });
      if (d.systems.noPendingTransfers.value === false)
        issues.push({ id: id++, description: `Pending transfers on LavaBMS${d.systems.noPendingTransfers.notes ? ` — ${d.systems.noPendingTransfers.notes}` : ""}`, priority: "high", branch, assignedTo: "" });
      // Medium binary No
      [
        { item: d.exterior.signageWorking,                  label: "Signage not working" },
        { item: d.systems.posOperational,                   label: "POS not operational" },
        { item: d.systems.internetConnectivity,             label: "No internet connectivity" },
        { item: d.systems.devicesCharged,                   label: "Mobile devices not charged" },
        { item: d.systems.airtimeAvailable,                 label: "No airtime/call credit" },
        { item: d.utilities.acWorking,                      label: "AC not working" },
        { item: d.utilities.lightBulbsFunctional,           label: "Light bulbs not all functional" },
        { item: d.documentation.handoverBookSignedOff,      label: "Handover book not properly signed off" },
        { item: d.security.cctvOperational,                 label: "CCTV not operational" },
        { item: d.security.safeCashBoxSecured,              label: "Safe/cash box not secured" },
        { item: d.adminComms.allMessagesReplied,            label: "Not all messages replied" },
        { item: d.adminComms.dailySalesReportSubmitted,     label: "Daily sales report not submitted" },
      ].forEach(({ item, label }) => {
        if (item.value === false)
          issues.push({ id: id++, description: `${label}${item.notes ? ` — ${item.notes}` : ""}`, priority: "medium", branch, assignedTo: "" });
      });
      // Customer complaints
      if (d.adminComms.customerComplaints.value === true)
        issues.push({ id: id++, description: `Customer complaints reported${d.adminComms.customerComplaints.notes ? ` — ${d.adminComms.customerComplaints.notes}` : ""}`, priority: "medium", branch, assignedTo: "" });
      // Cash reconciliation — flagged shifts
      (cashReconciliation[branch] || []).forEach(entry => {
        const diff = getCashDiff(entry.pos, entry.onHand);
        if (isCashFlagged(diff)) {
          const sign = diff! > 0 ? "+" : "";
          issues.push({ id: id++, description: `Cash difference: ${entry.shift} shift on ${fmtDay(entry.date)} — GHS ${sign}${diff!.toFixed(2)} (POS: ${entry.pos}, On Hand: ${entry.onHand})`, priority: Math.abs(diff!) > 50 ? "high" : "medium", branch, assignedTo: "" });
        }
      });
    });
    return issues;
  };

  // ── Load for edit ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!editId) return;
    branchVisits.get(parseInt(editId)).then(report => {
      if (!report) return;
      setReportId(report.id);
      setReportType((report.reportType as "single" | "consolidated") || "single");
      setVisitDate(report.visitDate.slice(0, 10));
      setSelectedBranch(report.branch || "Oyarifa");
      setVisitedBy(report.visitedBy);
      const raw = report.branchChecklist as unknown as Record<string, unknown>;
      if (raw && typeof raw === "object") {
        const first = raw[Object.keys(raw)[0]];
        if (first && typeof first === "object" && "exterior" in (first as object))
          setInspectionData(raw as InspectionData);
      }
      setActionItems(report.actionItems as ActionItem[]);
      setGeneralNotes(report.generalNotes || "");
      const storedRecon = report.cashReconciliation as CashReconciliation;
      if (storedRecon && Object.keys(storedRecon).length > 0) {
        setCashReconciliation(storedRecon);
      } else {
        setCashReconciliation(createCashRecon(report.visitDate.slice(0, 10)));
      }
    }).catch(() => {});
  }, [editId]);

  // ── Auto-load branch templates for new reports ──────────────────────────────

  useEffect(() => {
    if (editId) return;
    const templates = getTemplates();
    setInspectionData(prev => {
      const next = { ...prev };
      BRANCHES.forEach(branch => {
        const t = templates[branch];
        if (!t) return;
        const { staffEntries, individualShelves } = templateToEntries(t);
        next[branch] = {
          ...next[branch],
          personnel: { ...next[branch].personnel, staffEntries },
          shelvesProducts: { ...next[branch].shelvesProducts, individualShelves },
        };
      });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize cash recon dates when visitDate is set (new reports only)
  useEffect(() => {
    if (editId || !visitDate) return;
    setCashReconciliation(createCashRecon(visitDate));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitDate]);

  // Fetch previous visit for comparison
  useEffect(() => {
    if (!visitDate) { setPrevVisitReport(null); return; }
    branchVisits.list().then(all => {
      const matchBranch = reportType === "consolidated" ? "All Branches" : selectedBranch;
      const prev = all
        .filter(r => r.visitDate.slice(0, 10) < visitDate && r.branch === matchBranch)
        .sort((a, b) => b.visitDate.localeCompare(a.visitDate))[0] ?? null;
      setPrevVisitReport(prev);
    }).catch(() => {});
  }, [visitDate, selectedBranch, reportType]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const clearForm = () => {
    setReportId(null); setReportType("consolidated"); setVisitDate(""); setSelectedBranch("Oyarifa");
    setVisitedBy(""); setInspectionData(createInitialData()); setActionItems([]); setGeneralNotes("");
    setCashReconciliation({});
    router.push("/branch-visit");
  };

  const formatDate = (s: string) => s ? new Date(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "";

  const saveReport = async () => {
    if (!visitDate || !visitedBy) { alert("Please fill in visit date and visited by"); return; }
    const autoIssues = generateIssues();
    const overall    = getOverallScore();
    const payload = {
      reportType, visitDate,
      branch: reportType === "single" ? selectedBranch : "All Branches",
      visitedBy,
      branchChecklist: inspectionData as unknown as Record<string, Record<string, { status: "pass" | "fail" | "na"; notes: string }>>,
      issues: autoIssues as unknown as { id: number; description: string; priority: string; branch: string; assignedTo: string }[],
      actionItems, branchRatings: {}, generalNotes, cashReconciliation,
      stats: {
        overall: { passCount: 0, failCount: 0, complianceRate: overall },
        byBranch: activeBranches.reduce((acc, b) => { acc[b] = { passCount: 0, failCount: 0, complianceRate: getBranchScore(b) }; return acc; }, {} as Record<string, { passCount: number; failCount: number; complianceRate: number }>),
      },
    };
    setSaving(true);
    try {
      if (reportId) { await branchVisits.update(reportId, payload); alert("Report updated!"); router.push("/history"); }
      else { const created = await branchVisits.create(payload); alert("Report saved!"); router.push(`/branch-visit?edit=${created.id}`); }
    } catch (e: unknown) { alert(`Failed to save: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setSaving(false); }
  };

  // ── PDF export ──────────────────────────────────────────────────────────────

  const exportPDF = () => {
    const win = window.open("", "_blank");
    if (!win) { alert("Please allow popups"); return; }
    const issues = generateIssues();
    const overall = getOverallScore();
    const ratingColor = (r: number) => r <= 2 ? "#ef4444" : r === 3 ? "#f59e0b" : "#10b981";
    const scoreColor  = (s: number) => s >= 80 ? "#059669" : s >= 60 ? "#d97706" : "#dc2626";

    const renderBranchSections = (branch: string) => {
      const d = inspectionData[branch];
      if (!d) return "";
      const q = (label: string, item: QualityItem) => item.rating > 0 ? `
        <div class="check-row">
          <span class="label">${label}</span>
          <span class="rating-badge" style="background:${ratingColor(item.rating)}20;color:${ratingColor(item.rating)}">${item.rating}/5 ${RATING_LABELS[item.rating]}</span>
          ${item.observation ? `<span class="obs">${item.observation}</span>` : ""}
        </div>` : "";
      const b = (label: string, item: BinaryItem) => item.value !== null ? `
        <div class="check-row">
          <span class="label">${label}</span>
          <span class="yn-badge" style="background:${item.value ? "#d1fae5" : "#fee2e2"};color:${item.value ? "#059669" : "#dc2626"}">${item.value ? "YES" : "NO"}</span>
          ${item.notes ? `<span class="obs">${item.notes}</span>` : ""}
        </div>` : "";

      return `
        <div class="branch-block">
          <div class="branch-title">${branch} — Score: <span style="color:${scoreColor(getBranchScore(branch))}">${getBranchScore(branch).toFixed(0)}%</span></div>
          <div class="cat-title">Exterior</div>
          ${q("Front of shop cleanliness", d.exterior.frontCleanliness)}
          ${b("Signage working", d.exterior.signageWorking)}
          <div class="cat-title">Interior Spaces</div>
          ${q("Floors", d.interiorSpaces.floors)}${q("Washroom", d.interiorSpaces.washroom)}${q("Storeroom", d.interiorSpaces.storeroom)}
          <div class="cat-title">Shelves & Products</div>
          ${q("Overall shelf appearance", d.shelvesProducts.overallAppearance)}
          ${d.shelvesProducts.individualShelves.length > 0 ? `
            <div style="margin:6px 0 2px 0;font-size:11px;font-weight:600;color:#64748b">Individual Shelves</div>
            ${d.shelvesProducts.individualShelves.map(s => {
              const sc = s.shelfCleanliness || 0, dc = s.drugCleanliness || 0, nes = s.noEmptySpots || 0;
              const hasNew = sc > 0 || dc > 0 || nes > 0;
              if (hasNew) {
                const active = [sc, dc, nes].filter(v => v > 0);
                const avg = active.reduce((a, b) => a + b, 0) / active.length;
                return `<div class="check-row"><span class="label">${s.workerName ? s.workerName + " — " : ""}${s.shelfArea}</span><span class="rating-badge" style="background:${ratingColor(Math.round(avg))}20;color:${ratingColor(Math.round(avg))}">${avg.toFixed(1)}/5</span><span class="obs">Shelf: ${sc || "—"}/5 · Drugs: ${dc || "—"}/5 · Stocked: ${nes || "—"}/5</span></div>`;
              }
              return `<div class="check-row"><span class="label">${s.workerName ? s.workerName + " — " : ""}${s.shelfArea}</span><span class="rating-badge" style="background:${ratingColor(s.rating || 0)}20;color:${ratingColor(s.rating || 0)}">${s.rating || 0}/5</span>${s.observation ? `<span class="obs">${s.observation}</span>` : ""}</div>`;
            }).join("")}
          ` : ""}
          ${b("Expired drugs found", d.shelvesProducts.expiredDrugsFound)}
          ${d.shelvesProducts.expiredDrugs.length > 0 ? `
            <table class="inner-table"><tr><th>Drug</th><th>Expiry</th><th>Qty</th><th>Location</th></tr>
            ${d.shelvesProducts.expiredDrugs.map(x => `<tr><td>${x.drugName}</td><td>${x.expiryDate}</td><td>${x.quantity}</td><td>${x.shelfLocation}</td></tr>`).join("")}
            </table>` : ""}
          ${b("Near-expiry items", d.shelvesProducts.nearExpiryFound)}
          ${d.shelvesProducts.nearExpiryItems.length > 0 ? `
            <table class="inner-table"><tr><th>Drug</th><th>Expiry</th><th>Qty</th><th>Sticker</th></tr>
            ${d.shelvesProducts.nearExpiryItems.map(x => `<tr><td>${x.drugName}</td><td>${x.expiryDate}</td><td>${x.quantity}</td><td>${x.stickerApplied === true ? "Yes" : x.stickerApplied === false ? "No" : "—"}</td></tr>`).join("")}
            </table>` : ""}
          ${q("Counter cleanliness", d.shelvesProducts.counterCleanliness)}
          ${d.inventory.outOfStockItems.length > 0 ? `
            <div class="cat-title">Inventory — Out of Stock</div>
            ${d.inventory.outOfStockItems.map(x => `<div class="check-row"><span class="label">${x.productName}</span><span class="obs">${x.duration}</span></div>`).join("")}
          ` : ""}
          <div class="cat-title">Systems & Connectivity</div>
          ${b("POS/PC operational", d.systems.posOperational)}
          ${b("No pending transfers (LavaBMS)", d.systems.noPendingTransfers)}
          ${b("Internet connectivity", d.systems.internetConnectivity)}
          ${b("Mobile devices charged", d.systems.devicesCharged)}
          ${b("Airtime/call credit", d.systems.airtimeAvailable)}
          <div class="cat-title">Personnel</div>
          ${d.personnel.staffEntries.length > 0 ? `
            <table class="inner-table"><tr><th>Name</th><th>Present</th><th>Lab Coat</th></tr>
            ${d.personnel.staffEntries.map(s => `<tr><td>${s.name}</td><td style="color:${s.present ? "#059669" : "#dc2626"}">${s.present === true ? "Yes" : s.present === false ? "No" : "—"}</td><td style="color:${s.inLabCoat ? "#059669" : "#dc2626"}">${s.inLabCoat === true ? "Yes" : s.inLabCoat === false ? "No" : "—"}</td></tr>`).join("")}
            </table>` : ""}
          ${q("Staff attitude", d.personnel.staffAttitude)}
          <div class="cat-title">Utilities & Equipment</div>
          ${b("AC working", d.utilities.acWorking)}${b("Fridge working", d.utilities.fridgeWorking)}${b("Light bulbs functional", d.utilities.lightBulbsFunctional)}
          <div class="cat-title">Documentation</div>
          ${b("Handover book signed off", d.documentation.handoverBookSignedOff)}
          <div class="cat-title">Security</div>
          ${b("CCTV operational", d.security.cctvOperational)}${b("Safe/cash box secured", d.security.safeCashBoxSecured)}
          <div class="cat-title">Admin & Communication</div>
          ${b("All messages replied", d.adminComms.allMessagesReplied)}
          ${b("Daily sales report submitted", d.adminComms.dailySalesReportSubmitted)}
          ${b("Customer complaints", d.adminComms.customerComplaints)}
          ${(d.pettyCash.openingBalance || d.pettyCash.amountSpent) ? `
            <div class="cat-title">Petty Cash</div>
            <div class="check-row"><span class="label">Opening</span><span class="obs">GHS ${d.pettyCash.openingBalance || "0"}</span></div>
            <div class="check-row"><span class="label">Spent</span><span class="obs">GHS ${d.pettyCash.amountSpent || "0"}</span></div>
            <div class="check-row"><span class="label">Closing</span><span class="obs">GHS ${(parseFloat(d.pettyCash.openingBalance || "0") - parseFloat(d.pettyCash.amountSpent || "0")).toFixed(2)}</span></div>
            ${d.pettyCash.notes ? `<div class="check-row"><span class="label">Notes</span><span class="obs">${d.pettyCash.notes}</span></div>` : ""}
          ` : ""}
          ${(() => {
            const entries = cashReconciliation[branch] || [];
            const hasData = entries.some(e => e.pos || e.onHand);
            if (!hasData) return "";
            const rows = entries.map(e => {
              const diff = getCashDiff(e.pos, e.onHand);
              const flagged = isCashFlagged(diff);
              const diffStr = diff !== null ? (diff > 0 ? "+" : "") + diff.toFixed(2) : "—";
              return `<tr style="${flagged ? "background:#fee2e2" : ""}"><td>${fmtDay(e.date)}</td><td>${e.shift}</td><td>${e.pos || "—"}</td><td>${e.onHand || "—"}</td><td style="font-weight:700;color:${flagged ? "#dc2626" : "#059669"}">${diffStr}${flagged ? " ⚠" : ""}</td></tr>`;
            }).join("");
            return `<div class="cat-title">Cash Reconciliation — Last 7 Days</div><table class="inner-table"><tr><th>Date</th><th>Shift</th><th>POS (GHS)</th><th>On Hand (GHS)</th><th>Difference</th></tr>${rows}</table>`;
          })()}
        </div>`;
    };

    const html = `<!DOCTYPE html><html><head><title>Branch Visit Report</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#1e293b;line-height:1.5}
      .header{display:flex;align-items:center;gap:16px;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #e2e8f0}
      .title{font-size:24px;font-weight:700}.subtitle{font-size:13px;color:#64748b;margin-top:4px}
      .scores{display:grid;grid-template-columns:repeat(${activeBranches.length + 1},1fr);gap:12px;margin-bottom:28px}
      .score-card{padding:16px;border-radius:12px;text-align:center}.score-card.overall{background:linear-gradient(135deg,#10b981,#059669);color:white}
      .score-card.branch{background:#f8fafc;border:1px solid #e2e8f0}.score-val{font-size:28px;font-weight:700}.score-lbl{font-size:11px;opacity:.8;margin-top:2px}
      .branch-block{margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:12px}
      .branch-title{font-size:15px;font-weight:700;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e2e8f0}
      .cat-title{font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;margin:10px 0 4px 0;letter-spacing:.05em}
      .check-row{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:12px}
      .label{flex:1;color:#334155}.obs{font-size:11px;color:#64748b;font-style:italic;max-width:220px}
      .rating-badge,.yn-badge{padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap}
      .inner-table{width:100%;border-collapse:collapse;margin:4px 0 8px 0;font-size:11px}
      .inner-table th,.inner-table td{padding:5px 8px;text-align:left;border-bottom:1px solid #e2e8f0}
      .inner-table th{background:#f1f5f9;font-weight:600;color:#475569}
      .issues-section{margin-bottom:24px}.issue-item{padding:10px 12px;margin-bottom:6px;border-radius:8px;border-left:4px solid;font-size:12px}
      .issue-high{background:#fee2e2;border-left-color:#ef4444}.issue-medium{background:#fef3c7;border-left-color:#f59e0b}
      .issue-desc{font-weight:500;color:#1e293b}.issue-meta{font-size:10px;color:#64748b;margin-top:2px}
      .priority-badge{font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;color:white;float:right}
      .ph{background:#ef4444}.pm{background:#f59e0b}
      .footer{margin-top:32px;padding-top:16px;border-top:2px solid #e2e8f0;text-align:center;font-size:12px;color:#64748b}
      @media print{body{padding:20px}-webkit-print-color-adjust:exact;print-color-adjust:exact}
    </style></head><body>
    <div class="header">
      <div>
        <div class="title">Branch Visit Report${reportType === "consolidated" ? " <span style='font-size:12px;background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:12px;font-weight:600'>CONSOLIDATED</span>" : ""}</div>
        <div class="subtitle">${reportType === "consolidated" ? "All Branches" : selectedBranch} &bull; ${formatDate(visitDate)} &bull; Visited by ${visitedBy}</div>
      </div>
    </div>
    <div class="scores">
      <div class="score-card overall"><div class="score-val">${overall.toFixed(0)}%</div><div class="score-lbl">Overall Score</div></div>
      ${activeBranches.map(b => `<div class="score-card branch"><div class="score-val" style="color:${scoreColor(getBranchScore(b))}">${getBranchScore(b).toFixed(0)}%</div><div class="score-lbl">${b}</div></div>`).join("")}
    </div>
    ${activeBranches.map(renderBranchSections).join("")}
    ${issues.length > 0 ? `
      <div class="issues-section">
        <div style="font-size:14px;font-weight:700;margin-bottom:10px">Auto-Flagged Issues (${issues.length})</div>
        ${issues.map(i => `<div class="issue-item issue-${i.priority}"><span class="priority-badge p${i.priority[0]}">${i.priority.toUpperCase()}</span><div class="issue-desc">${i.description}</div><div class="issue-meta">${i.branch}${i.assignedTo ? ` &bull; ${i.assignedTo}` : ""}</div></div>`).join("")}
      </div>` : ""}
    ${actionItems.length > 0 ? `
      <div class="issues-section">
        <div style="font-size:14px;font-weight:700;margin-bottom:10px">Action Items (${actionItems.length})</div>
        ${actionItems.map(a => `<div class="issue-item" style="background:#f0f9ff;border-left-color:#3b82f6"><div class="issue-desc">${a.action}</div><div class="issue-meta">${a.branch}${a.responsible ? ` &bull; ${a.responsible}` : ""}${a.dueDate ? ` &bull; Due: ${formatDate(a.dueDate)}` : ""}</div></div>`).join("")}
      </div>` : ""}
    ${generalNotes ? `<div style="margin-bottom:24px"><div style="font-size:14px;font-weight:700;margin-bottom:8px">General Notes</div><div style="background:#f8fafc;padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap">${generalNotes}</div></div>` : ""}
    <div class="footer">KAM AID Pharmacy &bull; Branch Visit Report &bull; Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
    </body></html>`;

    win.document.write(html);
    win.document.close();
    win.onload = () => setTimeout(() => win.print(), 500);
  };

  // ── Render inspection for a branch ─────────────────────────────────────────

  const d = inspectionData[currentBranch];

  // ── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <ProtectedLayout>
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{reportId ? "Edit Branch Visit" : "Branch Visit Report"}</h1>
          <p className="text-slate-500">{reportId ? `Editing ${reportType} visit report` : "Structured inspection across 11 areas"}</p>
        </div>
        {reportId && (
          <button onClick={clearForm} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Report
          </button>
        )}
      </div>

      {/* Report Type */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Report Type</h2>
        <div className="grid grid-cols-2 gap-4">
          {(["single", "consolidated"] as const).map(type => (
            <button key={type} onClick={() => setReportType(type)}
              className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${reportType === type ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${reportType === type ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                {type === "single" ? <MapPin className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-800">{type === "single" ? "Single Branch" : "Consolidated"}</p>
                <p className="text-sm text-slate-500">{type === "single" ? "Inspect one branch at a time" : "Inspect all 3 branches & compare"}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Score Cards */}
      <div className={`grid gap-4 mb-6 ${reportType === "consolidated" ? "grid-cols-4" : "grid-cols-2"}`}>
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white">
          <p className="text-sm opacity-80 mb-1">Overall Score</p>
          <p className="text-3xl font-bold">{getOverallScore().toFixed(0)}%</p>
          <VisitTrend current={getOverallScore()} prev={prevVisitReport?.stats?.overall?.complianceRate} />
        </div>
        {reportType === "consolidated" ? BRANCHES.map(branch => {
          const score = getBranchScore(branch);
          return (
            <div key={branch} className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-sm text-slate-500 mb-1">{branch}</p>
              <p className={`text-2xl font-bold ${score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600"}`}>{score.toFixed(0)}%</p>
              <VisitTrendDark current={score} prev={prevVisitReport?.stats?.byBranch?.[branch]?.complianceRate} />
            </div>
          );
        }) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-sm text-slate-500 mb-1">Issues Found</p>
            <p className="text-2xl font-bold text-amber-600">{generateIssues().length}</p>
          </div>
        )}
      </div>

      {/* Visit Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-500" /> Visit Information
        </h2>
        <div className={`grid gap-4 ${reportType === "single" ? "grid-cols-3" : "grid-cols-2"}`}>
          {reportType === "single" && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Branch</label>
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Visit Date</label>
            <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Visited By</label>
            <input type="text" placeholder="Inspector name" value={visitedBy} onChange={e => setVisitedBy(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
      </div>

      {/* Branch Tabs */}
      {reportType === "consolidated" && (
        <div className="flex gap-2 mb-4">
          {BRANCHES.map(branch => {
            const score = getBranchScore(branch);
            return (
              <button key={branch} onClick={() => setActiveBranchTab(branch)}
                className={`flex-1 p-3 rounded-xl font-medium transition-all ${activeBranchTab === branch ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-500" : "bg-white text-slate-600 border-2 border-slate-200 hover:border-slate-300"}`}>
                {branch}
                {score > 0 && <span className={`ml-2 text-sm ${score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600"}`}>{score.toFixed(0)}%</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Inspection Sections ── */}
      {d && (
        <div className="space-y-4">

          {/* 1. Exterior */}
          <SectionCard title="1. Exterior" icon={<MapPin className="w-4 h-4 text-emerald-500" />}>
            <div className="space-y-3">
              <QualityRow label="Front of shop cleanliness" item={d.exterior.frontCleanliness}
                onChange={u => upd(p => ({ ...p, exterior: { ...p.exterior, frontCleanliness: { ...p.exterior.frontCleanliness, ...u } } }))} />
              <BinaryRow label="Signage working" item={d.exterior.signageWorking}
                onChange={u => upd(p => ({ ...p, exterior: { ...p.exterior, signageWorking: { ...p.exterior.signageWorking, ...u } } }))} />
            </div>
          </SectionCard>

          {/* 2. Interior Spaces */}
          <SectionCard title="2. Interior Spaces" icon={<Building2 className="w-4 h-4 text-emerald-500" />}>
            <div className="space-y-3">
              <QualityRow label="Floors (swept/mopped)" item={d.interiorSpaces.floors}
                onChange={u => upd(p => ({ ...p, interiorSpaces: { ...p.interiorSpaces, floors: { ...p.interiorSpaces.floors, ...u } } }))} />
              <QualityRow label="Washroom condition" item={d.interiorSpaces.washroom}
                onChange={u => upd(p => ({ ...p, interiorSpaces: { ...p.interiorSpaces, washroom: { ...p.interiorSpaces.washroom, ...u } } }))} />
              <QualityRow label="Storeroom condition" item={d.interiorSpaces.storeroom}
                onChange={u => upd(p => ({ ...p, interiorSpaces: { ...p.interiorSpaces, storeroom: { ...p.interiorSpaces.storeroom, ...u } } }))} />
            </div>
          </SectionCard>

          {/* 3. Shelves & Products */}
          <SectionCard title="3. Shelves & Products" icon={<Package className="w-4 h-4 text-emerald-500" />}>
            <div className="space-y-3">
              <QualityRow label="Overall shelf appearance (alignment, arrangement, fullness)" item={d.shelvesProducts.overallAppearance}
                onChange={u => upd(p => ({ ...p, shelvesProducts: { ...p.shelvesProducts, overallAppearance: { ...p.shelvesProducts.overallAppearance, ...u } } }))} />

              {/* Individual shelves */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="font-medium text-slate-800 text-sm">Individual shelf cleanliness (per worker)</p>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => {
                        setTemplateEditorBranch(currentBranch);
                        setDraftTemplate(JSON.parse(JSON.stringify(getTemplates()[currentBranch] || { staff: [], shelves: [] })));
                        setShowTemplateEditor(true);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium border border-slate-200 rounded-lg px-2.5 py-1 bg-white hover:bg-slate-50 transition-colors">
                      Edit defaults
                    </button>
                    <button type="button"
                      onClick={() => upd(p => ({ ...p, shelvesProducts: { ...p.shelvesProducts, individualShelves: [...p.shelvesProducts.individualShelves, { id: Date.now(), workerName: "", shelfArea: "", shelfCleanliness: 0, drugCleanliness: 0, noEmptySpots: 0, observation: "" }] } }))}
                      className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                      <Plus className="w-4 h-4" /> Add shelf
                    </button>
                  </div>
                </div>
                {d.shelvesProducts.individualShelves.length === 0 && <p className="text-sm text-slate-400 italic">No shelves added yet</p>}
                <div className="space-y-3">
                  {d.shelvesProducts.individualShelves.map((shelf, idx) => (
                    <div key={shelf.id} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex gap-3 mb-3">
                        <input type="text" placeholder="Worker name" value={shelf.workerName}
                          onChange={e => upd(p => { const s = [...p.shelvesProducts.individualShelves]; s[idx] = { ...s[idx], workerName: e.target.value }; return { ...p, shelvesProducts: { ...p.shelvesProducts, individualShelves: s } }; })}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        <input type="text" placeholder="Shelf / products" value={shelf.shelfArea}
                          onChange={e => upd(p => { const s = [...p.shelvesProducts.individualShelves]; s[idx] = { ...s[idx], shelfArea: e.target.value }; return { ...p, shelvesProducts: { ...p.shelvesProducts, individualShelves: s } }; })}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        <button type="button"
                          onClick={() => upd(p => ({ ...p, shelvesProducts: { ...p.shelvesProducts, individualShelves: p.shelvesProducts.individualShelves.filter((_, i) => i !== idx) } }))}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-2 mt-1">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Shelf cleanliness</p>
                          <RatingButtons value={shelf.shelfCleanliness || 0}
                            onChange={v => upd(p => { const s = [...p.shelvesProducts.individualShelves]; s[idx] = { ...s[idx], shelfCleanliness: v }; return { ...p, shelvesProducts: { ...p.shelvesProducts, individualShelves: s } }; })} />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Drug cleanliness</p>
                          <RatingButtons value={shelf.drugCleanliness || 0}
                            onChange={v => upd(p => { const s = [...p.shelvesProducts.individualShelves]; s[idx] = { ...s[idx], drugCleanliness: v }; return { ...p, shelvesProducts: { ...p.shelvesProducts, individualShelves: s } }; })} />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">No empty spots (stockouts)</p>
                          <RatingButtons value={shelf.noEmptySpots || 0}
                            onChange={v => upd(p => { const s = [...p.shelvesProducts.individualShelves]; s[idx] = { ...s[idx], noEmptySpots: v }; return { ...p, shelvesProducts: { ...p.shelvesProducts, individualShelves: s } }; })} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expired drugs */}
              <BinaryRow label="Expired drugs found" item={d.shelvesProducts.expiredDrugsFound} critical
                onChange={u => upd(p => ({ ...p, shelvesProducts: { ...p.shelvesProducts, expiredDrugsFound: { ...p.shelvesProducts.expiredDrugsFound, ...u } } }))} />
              {d.shelvesProducts.expiredDrugsFound.value === true && (
                <div className="ml-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-red-700">Record expired drugs</p>
                    <button type="button"
                      onClick={() => upd(p => ({ ...p, shelvesProducts: { ...p.shelvesProducts, expiredDrugs: [...p.shelvesProducts.expiredDrugs, { id: Date.now(), drugName: "", expiryDate: "", quantity: "", shelfLocation: "" }] } }))}
                      className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium"><Plus className="w-4 h-4" /> Add drug</button>
                  </div>
                  <div className="space-y-2">
                    {d.shelvesProducts.expiredDrugs.map((drug, idx) => (
                      <div key={drug.id} className="bg-white border border-red-100 rounded-lg p-3 grid grid-cols-4 gap-2">
                        <input type="text" placeholder="Drug name" value={drug.drugName}
                          onChange={e => upd(p => { const dr = [...p.shelvesProducts.expiredDrugs]; dr[idx] = { ...dr[idx], drugName: e.target.value }; return { ...p, shelvesProducts: { ...p.shelvesProducts, expiredDrugs: dr } }; })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                        <input type="date" value={drug.expiryDate}
                          onChange={e => upd(p => { const dr = [...p.shelvesProducts.expiredDrugs]; dr[idx] = { ...dr[idx], expiryDate: e.target.value }; return { ...p, shelvesProducts: { ...p.shelvesProducts, expiredDrugs: dr } }; })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                        <input type="text" placeholder="Qty" value={drug.quantity}
                          onChange={e => upd(p => { const dr = [...p.shelvesProducts.expiredDrugs]; dr[idx] = { ...dr[idx], quantity: e.target.value }; return { ...p, shelvesProducts: { ...p.shelvesProducts, expiredDrugs: dr } }; })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                        <div className="flex gap-2">
                          <input type="text" placeholder="Shelf / location" value={drug.shelfLocation}
                            onChange={e => upd(p => { const dr = [...p.shelvesProducts.expiredDrugs]; dr[idx] = { ...dr[idx], shelfLocation: e.target.value }; return { ...p, shelvesProducts: { ...p.shelvesProducts, expiredDrugs: dr } }; })}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                          <button type="button"
                            onClick={() => upd(p => ({ ...p, shelvesProducts: { ...p.shelvesProducts, expiredDrugs: p.shelvesProducts.expiredDrugs.filter((_, i) => i !== idx) } }))}
                            className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Near-expiry */}
              <BinaryRow label="Near-expiry items found" item={d.shelvesProducts.nearExpiryFound}
                onChange={u => upd(p => ({ ...p, shelvesProducts: { ...p.shelvesProducts, nearExpiryFound: { ...p.shelvesProducts.nearExpiryFound, ...u } } }))} />
              {d.shelvesProducts.nearExpiryFound.value === true && (
                <div className="ml-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-amber-700">Record near-expiry items</p>
                    <button type="button"
                      onClick={() => upd(p => ({ ...p, shelvesProducts: { ...p.shelvesProducts, nearExpiryItems: [...p.shelvesProducts.nearExpiryItems, { id: Date.now(), drugName: "", expiryDate: "", quantity: "", stickerApplied: null }] } }))}
                      className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"><Plus className="w-4 h-4" /> Add item</button>
                  </div>
                  <div className="space-y-2">
                    {d.shelvesProducts.nearExpiryItems.map((item, idx) => (
                      <div key={item.id} className="bg-white border border-amber-100 rounded-lg p-3 grid grid-cols-5 gap-2 items-center">
                        <input type="text" placeholder="Drug name" value={item.drugName}
                          onChange={e => upd(p => { const ni = [...p.shelvesProducts.nearExpiryItems]; ni[idx] = { ...ni[idx], drugName: e.target.value }; return { ...p, shelvesProducts: { ...p.shelvesProducts, nearExpiryItems: ni } }; })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                        <input type="date" value={item.expiryDate}
                          onChange={e => upd(p => { const ni = [...p.shelvesProducts.nearExpiryItems]; ni[idx] = { ...ni[idx], expiryDate: e.target.value }; return { ...p, shelvesProducts: { ...p.shelvesProducts, nearExpiryItems: ni } }; })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                        <input type="text" placeholder="Qty" value={item.quantity}
                          onChange={e => upd(p => { const ni = [...p.shelvesProducts.nearExpiryItems]; ni[idx] = { ...ni[idx], quantity: e.target.value }; return { ...p, shelvesProducts: { ...p.shelvesProducts, nearExpiryItems: ni } }; })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                        <div className="flex gap-1 items-center justify-center">
                          <span className="text-xs text-slate-500 shrink-0">Sticker:</span>
                          <button type="button"
                            onClick={() => upd(p => { const ni = [...p.shelvesProducts.nearExpiryItems]; ni[idx] = { ...ni[idx], stickerApplied: ni[idx].stickerApplied === true ? null : true }; return { ...p, shelvesProducts: { ...p.shelvesProducts, nearExpiryItems: ni } }; })}
                            className={`px-2 py-1 rounded text-xs font-semibold ${item.stickerApplied === true ? "bg-emerald-500 text-white" : "bg-white border border-slate-200 text-slate-500"}`}>Yes</button>
                          <button type="button"
                            onClick={() => upd(p => { const ni = [...p.shelvesProducts.nearExpiryItems]; ni[idx] = { ...ni[idx], stickerApplied: ni[idx].stickerApplied === false ? null : false }; return { ...p, shelvesProducts: { ...p.shelvesProducts, nearExpiryItems: ni } }; })}
                            className={`px-2 py-1 rounded text-xs font-semibold ${item.stickerApplied === false ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-500"}`}>No</button>
                        </div>
                        <button type="button"
                          onClick={() => upd(p => ({ ...p, shelvesProducts: { ...p.shelvesProducts, nearExpiryItems: p.shelvesProducts.nearExpiryItems.filter((_, i) => i !== idx) } }))}
                          className="p-2 text-amber-400 hover:text-red-500 justify-self-end"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <QualityRow label="Counter area cleanliness" item={d.shelvesProducts.counterCleanliness}
                onChange={u => upd(p => ({ ...p, shelvesProducts: { ...p.shelvesProducts, counterCleanliness: { ...p.shelvesProducts.counterCleanliness, ...u } } }))} />
            </div>
          </SectionCard>

          {/* 4. Inventory */}
          <SectionCard title="4. Inventory" icon={<ShoppingCart className="w-4 h-4 text-emerald-500" />}>
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-slate-800 text-sm">Notable out-of-stock items</p>
                <button type="button"
                  onClick={() => upd(p => ({ ...p, inventory: { outOfStockItems: [...p.inventory.outOfStockItems, { id: Date.now(), productName: "", duration: "" }] } }))}
                  className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"><Plus className="w-4 h-4" /> Add item</button>
              </div>
              {d.inventory.outOfStockItems.length === 0 && <p className="text-sm text-slate-400 italic">No out-of-stock items to record</p>}
              <div className="space-y-2">
                {d.inventory.outOfStockItems.map((item, idx) => (
                  <div key={item.id} className="flex gap-2">
                    <input type="text" placeholder="Product name" value={item.productName}
                      onChange={e => upd(p => { const oos = [...p.inventory.outOfStockItems]; oos[idx] = { ...oos[idx], productName: e.target.value }; return { ...p, inventory: { outOfStockItems: oos } }; })}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <input type="text" placeholder="How long out of stock" value={item.duration}
                      onChange={e => upd(p => { const oos = [...p.inventory.outOfStockItems]; oos[idx] = { ...oos[idx], duration: e.target.value }; return { ...p, inventory: { outOfStockItems: oos } }; })}
                      className="w-44 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <button type="button"
                      onClick={() => upd(p => ({ ...p, inventory: { outOfStockItems: p.inventory.outOfStockItems.filter((_, i) => i !== idx) } }))}
                      className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* 5. Systems & Connectivity */}
          <SectionCard title="5. Systems & Connectivity" icon={<Wifi className="w-4 h-4 text-emerald-500" />}>
            <div className="space-y-3">
              <BinaryRow label="POS / PC operational" item={d.systems.posOperational}
                onChange={u => upd(p => ({ ...p, systems: { ...p.systems, posOperational: { ...p.systems.posOperational, ...u } } }))} />
              <BinaryRow label="No pending transfers on LavaBMS" item={d.systems.noPendingTransfers} critical
                onChange={u => upd(p => ({ ...p, systems: { ...p.systems, noPendingTransfers: { ...p.systems.noPendingTransfers, ...u } } }))} />
              <BinaryRow label="Internet connectivity" item={d.systems.internetConnectivity}
                onChange={u => upd(p => ({ ...p, systems: { ...p.systems, internetConnectivity: { ...p.systems.internetConnectivity, ...u } } }))} />
              <BinaryRow label="Mobile devices charged" item={d.systems.devicesCharged}
                onChange={u => upd(p => ({ ...p, systems: { ...p.systems, devicesCharged: { ...p.systems.devicesCharged, ...u } } }))} />
              <BinaryRow label="Airtime / call credit available" item={d.systems.airtimeAvailable}
                onChange={u => upd(p => ({ ...p, systems: { ...p.systems, airtimeAvailable: { ...p.systems.airtimeAvailable, ...u } } }))} />
            </div>
          </SectionCard>

          {/* 6. Personnel */}
          <SectionCard title="6. Personnel" icon={<Users className="w-4 h-4 text-emerald-500" />}>
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-slate-800 text-sm">Staff attendance & compliance</p>
                  <button type="button"
                    onClick={() => upd(p => ({ ...p, personnel: { ...p.personnel, staffEntries: [...p.personnel.staffEntries, { id: Date.now(), name: "", present: null, inLabCoat: null }] } }))}
                    className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"><Plus className="w-4 h-4" /> Add staff</button>
                </div>
                {d.personnel.staffEntries.length === 0 && <p className="text-sm text-slate-400 italic">No staff added yet</p>}
                <div className="space-y-2">
                  {d.personnel.staffEntries.map((staff, idx) => (
                    <div key={staff.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 flex-wrap">
                      <input type="text" placeholder="Staff name" value={staff.name}
                        onChange={e => upd(p => { const se = [...p.personnel.staffEntries]; se[idx] = { ...se[idx], name: e.target.value }; return { ...p, personnel: { ...p.personnel, staffEntries: se } }; })}
                        className="flex-1 min-w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Present:</span>
                        {[true, false].map(val => (
                          <button key={String(val)} type="button"
                            onClick={() => upd(p => { const se = [...p.personnel.staffEntries]; se[idx] = { ...se[idx], present: se[idx].present === val ? null : val }; return { ...p, personnel: { ...p.personnel, staffEntries: se } }; })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${staff.present === val ? (val ? "bg-emerald-500 text-white" : "bg-red-500 text-white") : "bg-white border border-slate-200 text-slate-500"}`}>
                            {val ? "Yes" : "No"}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Lab coat:</span>
                        {[true, false].map(val => (
                          <button key={String(val)} type="button"
                            onClick={() => upd(p => { const se = [...p.personnel.staffEntries]; se[idx] = { ...se[idx], inLabCoat: se[idx].inLabCoat === val ? null : val }; return { ...p, personnel: { ...p.personnel, staffEntries: se } }; })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${staff.inLabCoat === val ? (val ? "bg-emerald-500 text-white" : "bg-amber-500 text-white") : "bg-white border border-slate-200 text-slate-500"}`}>
                            {val ? "Yes" : "No"}
                          </button>
                        ))}
                      </div>
                      <button type="button"
                        onClick={() => upd(p => ({ ...p, personnel: { ...p.personnel, staffEntries: p.personnel.staffEntries.filter((_, i) => i !== idx) } }))}
                        className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <QualityRow label="Staff attitude & engagement" item={d.personnel.staffAttitude}
                onChange={u => upd(p => ({ ...p, personnel: { ...p.personnel, staffAttitude: { ...p.personnel.staffAttitude, ...u } } }))} />
            </div>
          </SectionCard>

          {/* 7. Utilities & Equipment */}
          <SectionCard title="7. Utilities & Equipment" icon={<Settings className="w-4 h-4 text-emerald-500" />}>
            <div className="space-y-3">
              <BinaryRow label="AC working" item={d.utilities.acWorking}
                onChange={u => upd(p => ({ ...p, utilities: { ...p.utilities, acWorking: { ...p.utilities.acWorking, ...u } } }))} />
              <BinaryRow label="Fridge working" item={d.utilities.fridgeWorking} critical
                onChange={u => upd(p => ({ ...p, utilities: { ...p.utilities, fridgeWorking: { ...p.utilities.fridgeWorking, ...u } } }))} />
              <BinaryRow label="Light bulbs all functional" item={d.utilities.lightBulbsFunctional}
                onChange={u => upd(p => ({ ...p, utilities: { ...p.utilities, lightBulbsFunctional: { ...p.utilities.lightBulbsFunctional, ...u } } }))} />
            </div>
          </SectionCard>

          {/* 8. Documentation */}
          <SectionCard title="8. Documentation" icon={<FileText className="w-4 h-4 text-emerald-500" />}>
            <BinaryRow label="Handover book signed off properly (previous shift)" item={d.documentation.handoverBookSignedOff}
              onChange={u => upd(p => ({ ...p, documentation: { handoverBookSignedOff: { ...p.documentation.handoverBookSignedOff, ...u } } }))} />
          </SectionCard>

          {/* 9. Security */}
          <SectionCard title="9. Security" icon={<Shield className="w-4 h-4 text-emerald-500" />}>
            <div className="space-y-3">
              <BinaryRow label="CCTV operational" item={d.security.cctvOperational}
                onChange={u => upd(p => ({ ...p, security: { ...p.security, cctvOperational: { ...p.security.cctvOperational, ...u } } }))} />
              <BinaryRow label="Safe / cash box secured" item={d.security.safeCashBoxSecured}
                onChange={u => upd(p => ({ ...p, security: { ...p.security, safeCashBoxSecured: { ...p.security.safeCashBoxSecured, ...u } } }))} />
            </div>
          </SectionCard>

          {/* 10. Admin & Communication */}
          <SectionCard title="10. Admin & Communication" icon={<MessageSquare className="w-4 h-4 text-emerald-500" />}>
            <div className="space-y-3">
              <BinaryRow label="All messages replied" item={d.adminComms.allMessagesReplied}
                onChange={u => upd(p => ({ ...p, adminComms: { ...p.adminComms, allMessagesReplied: { ...p.adminComms.allMessagesReplied, ...u } } }))} />
              <BinaryRow label="Daily sales report submitted" item={d.adminComms.dailySalesReportSubmitted}
                onChange={u => upd(p => ({ ...p, adminComms: { ...p.adminComms, dailySalesReportSubmitted: { ...p.adminComms.dailySalesReportSubmitted, ...u } } }))} />
              <BinaryRow label="Customer complaints since last visit" item={d.adminComms.customerComplaints}
                onChange={u => upd(p => ({ ...p, adminComms: { ...p.adminComms, customerComplaints: { ...p.adminComms.customerComplaints, ...u } } }))} />
            </div>
          </SectionCard>

          {/* 11. Petty Cash */}
          <SectionCard title="11. Petty Cash" icon={<DollarSign className="w-4 h-4 text-emerald-500" />}>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Opening Balance (GHS)</label>
                <input type="number" placeholder="0.00" value={d.pettyCash.openingBalance}
                  onChange={e => upd(p => ({ ...p, pettyCash: { ...p.pettyCash, openingBalance: e.target.value } }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Amount Spent (GHS)</label>
                <input type="number" placeholder="0.00" value={d.pettyCash.amountSpent}
                  onChange={e => upd(p => ({ ...p, pettyCash: { ...p.pettyCash, amountSpent: e.target.value } }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Closing Balance (GHS)</label>
                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-800 font-semibold">
                  {d.pettyCash.openingBalance && d.pettyCash.amountSpent
                    ? `GHS ${(parseFloat(d.pettyCash.openingBalance) - parseFloat(d.pettyCash.amountSpent)).toFixed(2)}`
                    : "—"}
                </div>
              </div>
            </div>
            <label className="block text-sm font-medium text-slate-600 mb-2">What was it spent on?</label>
            <textarea placeholder="Describe what petty cash was used for..." value={d.pettyCash.notes} rows={3}
              onChange={e => upd(p => ({ ...p, pettyCash: { ...p.pettyCash, notes: e.target.value } }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </SectionCard>

          {/* 12. Cash Reconciliation */}
          <SectionCard title="12. Cash Reconciliation — Last 7 Days" icon={<DollarSign className="w-4 h-4 text-blue-500" />}>
            {(cashReconciliation[currentBranch] || []).length > 0 ? (
              <div className="overflow-x-auto">
                <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Flagged: difference &gt; GHS {CASH_DIFF_HIGH} or &lt; GHS {CASH_DIFF_LOW}
                </div>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="pb-2 pr-2 font-semibold">Date</th>
                      <th className="pb-2 pr-2 font-semibold">Shift</th>
                      <th className="pb-2 pr-2 font-semibold">POS (GHS)</th>
                      <th className="pb-2 pr-2 font-semibold">On Hand (GHS)</th>
                      <th className="pb-2 font-semibold">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cashReconciliation[currentBranch] || []).map((entry, i) => {
                      const diff = getCashDiff(entry.pos, entry.onHand);
                      const flagged = isCashFlagged(diff);
                      return (
                        <tr key={i} className={`border-b border-slate-100 ${flagged ? "bg-red-50" : ""}`}>
                          <td className="py-2 pr-2 text-slate-600 text-xs font-medium whitespace-nowrap">
                            {fmtDay(entry.date)}
                          </td>
                          <td className="py-2 pr-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${entry.shift === "Morning" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                              {entry.shift}
                            </span>
                          </td>
                          <td className="py-2 pr-2">
                            <input type="number" placeholder="0.00" value={entry.pos}
                              onChange={e => {
                                const updated = [...(cashReconciliation[currentBranch] || [])];
                                updated[i] = { ...updated[i], pos: e.target.value };
                                setCashReconciliation(prev => ({ ...prev, [currentBranch]: updated }));
                              }}
                              className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                          </td>
                          <td className="py-2 pr-2">
                            <input type="number" placeholder="0.00" value={entry.onHand}
                              onChange={e => {
                                const updated = [...(cashReconciliation[currentBranch] || [])];
                                updated[i] = { ...updated[i], onHand: e.target.value };
                                setCashReconciliation(prev => ({ ...prev, [currentBranch]: updated }));
                              }}
                              className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                          </td>
                          <td className="py-2">
                            {diff !== null ? (
                              <span className={`font-bold text-sm ${flagged ? "text-red-600" : "text-emerald-600"}`}>
                                {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                                {flagged && <span className="ml-1 text-xs">⚠</span>}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Set the visit date above to populate the last 7 days.</p>
            )}
          </SectionCard>

        </div>
      )}

      {/* Action Items */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mt-4 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" /> Action Items
        </h2>
        {actionItems.length > 0 && (
          <div className="space-y-3 mb-4">
            {actionItems.map(action => (
              <div key={action.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{action.action}</p>
                  <p className="text-sm text-slate-500">{action.branch}{action.responsible && ` • ${action.responsible}`}{action.dueDate && ` • Due: ${formatDate(action.dueDate)}`}</p>
                </div>
                <button onClick={() => setActionItems(prev => prev.filter(a => a.id !== action.id))}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-5 gap-3 pt-4 border-t border-slate-100">
          <input type="text" placeholder="Action to take" value={newAction.action} onChange={e => setNewAction({ ...newAction, action: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <select value={newAction.branch} onChange={e => setNewAction({ ...newAction, branch: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {activeBranches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <input type="text" placeholder="Responsible" value={newAction.responsible} onChange={e => setNewAction({ ...newAction, responsible: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <input type="date" value={newAction.dueDate} onChange={e => setNewAction({ ...newAction, dueDate: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <button onClick={() => { if (newAction.action) { setActionItems(prev => [...prev, { ...newAction, id: Date.now() }]); setNewAction({ action: "", dueDate: "", responsible: "", branch: currentBranch }); } }}
            className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* General Notes */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">General Notes</h2>
        <textarea placeholder="Additional observations or comments..." value={generalNotes} rows={4}
          onChange={e => setGeneralNotes(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
      </div>

      {/* Buttons */}
      <div className="flex justify-between">
        <button onClick={clearForm} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors">Clear Form</button>
        <div className="flex gap-4">
          <button onClick={() => setShowPreview(true)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors flex items-center gap-2">
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button onClick={saveReport} disabled={saving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
            <Save className="w-4 h-4" /> {saving ? "Saving…" : reportId ? "Update Report" : "Save Report"}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="bg-white border-b border-slate-100 px-8 py-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Branch Visit Report
                    {reportType === "consolidated" && <span className="ml-2 text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">CONSOLIDATED</span>}
                  </h2>
                  <p className="text-slate-500 text-sm">{reportType === "consolidated" ? "All Branches" : selectedBranch} • {formatDate(visitDate)} • {visitedBy}</p>
                </div>
              </div>
              <button onClick={() => setShowPreview(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-8 space-y-6">
              {/* Scores */}
              <div className={`grid gap-4 ${reportType === "consolidated" ? "grid-cols-4" : "grid-cols-2"}`}>
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white text-center">
                  <p className="text-3xl font-bold">{getOverallScore().toFixed(0)}%</p>
                  <p className="text-sm opacity-80 mt-1">Overall Score</p>
                </div>
                {reportType === "consolidated" ? BRANCHES.map(branch => {
                  const score = getBranchScore(branch);
                  return (
                    <div key={branch} className="bg-slate-50 rounded-2xl p-5 text-center">
                      <p className={`text-2xl font-bold ${score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600"}`}>{score.toFixed(0)}%</p>
                      <p className="text-sm text-slate-500 mt-1">{branch}</p>
                    </div>
                  );
                }) : (
                  <div className="bg-slate-50 rounded-2xl p-5 text-center">
                    <p className="text-2xl font-bold text-amber-600">{generateIssues().length}</p>
                    <p className="text-sm text-slate-500 mt-1">Issues Found</p>
                  </div>
                )}
              </div>

              {/* Auto-flagged issues */}
              {(() => {
                const issues = generateIssues();
                if (issues.length === 0) return null;
                return (
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 mb-3">Auto-Flagged Issues ({issues.length})</h3>
                    <div className="space-y-2">
                      {issues.map(issue => (
                        <div key={issue.id} className={`p-3 rounded-lg border-l-4 ${issue.priority === "high" ? "bg-red-50 border-l-red-500" : "bg-amber-50 border-l-amber-500"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800">{issue.description}</p>
                            <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${issue.priority === "high" ? "bg-red-500 text-white" : "bg-amber-500 text-white"}`}>{issue.priority.toUpperCase()}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{issue.branch}{issue.assignedTo && ` • ${issue.assignedTo}`}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Action Items */}
              {actionItems.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-slate-800 mb-3">Action Items ({actionItems.length})</h3>
                  <div className="space-y-2">
                    {actionItems.map(action => (
                      <div key={action.id} className="p-3 bg-slate-50 rounded-lg border-l-4 border-l-blue-400">
                        <p className="text-sm font-medium text-slate-800">{action.action}</p>
                        <p className="text-xs text-slate-500 mt-1">{action.branch}{action.responsible && ` • ${action.responsible}`}{action.dueDate && ` • Due: ${formatDate(action.dueDate)}`}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generalNotes && (
                <div>
                  <h3 className="text-base font-semibold text-slate-800 mb-2">General Notes</h3>
                  <div className="bg-slate-50 rounded-xl p-4"><p className="text-slate-600 whitespace-pre-wrap text-sm">{generalNotes}</p></div>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 px-8 py-5 flex justify-between items-center">
              <p className="text-sm text-slate-400">Visited by: {visitedBy}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowPreview(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors">Close</button>
                <button onClick={exportPDF} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Template Editor Modal */}
      {showTemplateEditor && draftTemplate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-white border-b border-slate-100 px-6 py-5 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Edit Defaults — {templateEditorBranch}</h2>
                <p className="text-sm text-slate-500">Pre-fill staff and shelves for every new inspection</p>
              </div>
              <button onClick={() => setShowTemplateEditor(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Staff defaults */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800">Staff</h3>
                  <button type="button"
                    onClick={() => setDraftTemplate(prev => prev ? { ...prev, staff: [...prev.staff, { name: "" }] } : prev)}
                    className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {draftTemplate.staff.length === 0 && <p className="text-sm text-slate-400 italic">No staff added</p>}
                  {draftTemplate.staff.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" placeholder="Staff name" value={s.name}
                        onChange={e => setDraftTemplate(prev => { if (!prev) return prev; const st = [...prev.staff]; st[i] = { name: e.target.value }; return { ...prev, staff: st }; })}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      <button type="button"
                        onClick={() => setDraftTemplate(prev => prev ? { ...prev, staff: prev.staff.filter((_, j) => j !== i) } : prev)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
              {/* Shelf defaults */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800">Shelves</h3>
                  <button type="button"
                    onClick={() => setDraftTemplate(prev => prev ? { ...prev, shelves: [...prev.shelves, { workerName: "", shelfArea: "" }] } : prev)}
                    className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {draftTemplate.shelves.length === 0 && <p className="text-sm text-slate-400 italic">No shelves added</p>}
                  {draftTemplate.shelves.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" placeholder="Worker name" value={s.workerName}
                        onChange={e => setDraftTemplate(prev => { if (!prev) return prev; const sh = [...prev.shelves]; sh[i] = { ...sh[i], workerName: e.target.value }; return { ...prev, shelves: sh }; })}
                        className="w-36 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      <input type="text" placeholder="Shelf / products" value={s.shelfArea}
                        onChange={e => setDraftTemplate(prev => { if (!prev) return prev; const sh = [...prev.shelves]; sh[i] = { ...sh[i], shelfArea: e.target.value }; return { ...prev, shelves: sh }; })}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      <button type="button"
                        onClick={() => setDraftTemplate(prev => prev ? { ...prev, shelves: prev.shelves.filter((_, j) => j !== i) } : prev)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-4 flex justify-between items-center">
              <button onClick={() => setShowTemplateEditor(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const templates = getTemplates();
                    templates[templateEditorBranch] = draftTemplate;
                    saveTemplates(templates);
                    setShowTemplateEditor(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors">
                  Save for next time
                </button>
                <button
                  onClick={() => {
                    const templates = getTemplates();
                    templates[templateEditorBranch] = draftTemplate;
                    saveTemplates(templates);
                    const { staffEntries, individualShelves } = templateToEntries(draftTemplate);
                    updateBranch(templateEditorBranch, p => ({
                      ...p,
                      personnel: { ...p.personnel, staffEntries },
                      shelvesProducts: { ...p.shelvesProducts, individualShelves },
                    }));
                    setShowTemplateEditor(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors">
                  Save &amp; Apply now
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

export default function BranchVisitPage() {
  return <Suspense><BranchVisitContent /></Suspense>;
}
