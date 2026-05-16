const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

// Monthly Reports
export const monthlyReports = {
  list: () => request<MonthlyReport[]>("/reports/monthly"),
  get: (id: number) => request<MonthlyReport>(`/reports/monthly/${id}`),
  create: (data: Omit<MonthlyReport, "id" | "createdAt">) =>
    request<MonthlyReport>("/reports/monthly", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<MonthlyReport>) =>
    request<MonthlyReport>(`/reports/monthly/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) =>
    request<{ success: boolean }>(`/reports/monthly/${id}`, { method: "DELETE" }),
};

// Weekly Reports
export const weeklyReports = {
  list: () => request<WeeklyReport[]>("/reports/weekly"),
  get: (id: number) => request<WeeklyReport>(`/reports/weekly/${id}`),
  create: (data: Omit<WeeklyReport, "id" | "createdAt">) =>
    request<WeeklyReport>("/reports/weekly", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<WeeklyReport>) =>
    request<WeeklyReport>(`/reports/weekly/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) =>
    request<{ success: boolean }>(`/reports/weekly/${id}`, { method: "DELETE" }),
};

// Branch Visits
export const branchVisits = {
  list: () => request<BranchVisit[]>("/branch-visits"),
  get: (id: number) => request<BranchVisit>(`/branch-visits/${id}`),
  create: (data: Omit<BranchVisit, "id" | "createdAt">) =>
    request<BranchVisit>("/branch-visits", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<BranchVisit>) =>
    request<BranchVisit>(`/branch-visits/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) =>
    request<{ success: boolean }>(`/branch-visits/${id}`, { method: "DELETE" }),
};

// Shortages
export const shortagesReports = {
  list: () => request<ShortagesReport[]>("/shortages"),
  get: (id: number) => request<ShortagesReport>(`/shortages/${id}`),
  create: (data: Omit<ShortagesReport, "id" | "createdAt">) =>
    request<ShortagesReport>("/shortages", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<ShortagesReport>) =>
    request<ShortagesReport>(`/shortages/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) =>
    request<{ success: boolean }>(`/shortages/${id}`, { method: "DELETE" }),
};

// Staff
export const staffMembers = {
  list: () => request<Staff[]>("/staff"),
  create: (data: Omit<Staff, "id" | "createdAt" | "updatedAt">) =>
    request<Staff>("/staff", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Staff>) =>
    request<Staff>(`/staff/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) =>
    request<{ success: boolean }>(`/staff/${id}`, { method: "DELETE" }),
};

// Bonus Records
export const bonusRecords = {
  list: () => request<BonusRecord[]>("/bonus"),
  get: (id: number) => request<BonusRecord>(`/bonus/${id}`),
  save: (data: Omit<BonusRecord, "id" | "createdAt" | "updatedAt">) =>
    request<BonusRecord>("/bonus", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<BonusRecord>) =>
    request<BonusRecord>(`/bonus/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) =>
    request<{ success: boolean }>(`/bonus/${id}`, { method: "DELETE" }),
};

// Types
export interface MonthlyReport {
  id: number;
  month: number;
  year: number;
  sales: { oyarifa: string; ghanaFlag: string; madina: string };
  cogs: string;
  expenses: {
    salaries: string; rent: string; electricity: string;
    phone: string; pettyCash: string; maintenance: string; miscellaneous: string;
  };
  customExpenses: { id: number; name: string; amount: string }[];
  totals: { totalSales: number; grossProfit: number; netProfit: number; totalExpenses: number };
  createdAt: string;
}

export interface WeeklyReport {
  id: number;
  weekStart: string;
  weekEnd: string;
  dailySales: Record<string, Record<string, string>>;
  expenses: { id: number; name: string; amount: string; branch: string }[];
  issues: { id: number; item: string; issue: string; branch: string }[];
  totals: { grandTotalSales: number; totalExpenses: number; byBranch: Record<string, number> };
  createdAt: string;
}

export interface BranchVisit {
  id: number;
  reportType: "single" | "consolidated";
  visitDate: string;
  branch?: string | null;
  visitedBy: string;
  // stores BranchInspection data keyed by branch name (new format)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  branchChecklist: Record<string, any>;
  issues: { id: number; description: string; priority: string; branch: string; assignedTo: string }[];
  actionItems: { id: number; action: string; dueDate: string; responsible: string; branch: string }[];
  branchRatings: Record<string, number>;
  generalNotes: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cashReconciliation: Record<string, any[]>;
  stats: {
    overall: { passCount: number; failCount: number; complianceRate: number };
    byBranch: Record<string, { passCount: number; failCount: number; complianceRate: number }>;
  };
  createdAt: string;
}

export interface Staff {
  id: number;
  name: string;
  role: "pharmacist" | "dispensing_technician" | "mca" | "head_of_operations" | "purchasing_officer";
  branch: "Oyarifa" | "Ghana Flag" | "Madina" | "Back Office";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchStaffScore {
  subCriteria?: { c1: number; c2: number; c3: number };
  staffId: number;
  name: string;
  role: string;
  branch: string;
  branchVisitAverage: number;
  visitPoints: number;
  individualRating: number;
  improvementBonus: number;
  salesBonus: number;
  total: number;
}

export interface BackOfficeScores {
  headOfOps: { staffId: number; name: string; visitsOnSchedule: number; reportsOnTime: number; chequeTracking: number; total: number };
  purchasingOfficer: { staffId: number; name: string; fulfillmentRate: number; discretionaryRating: number; total: number };
}

export interface BonusScores {
  branchStaff: BranchStaffScore[];
  backOffice: BackOfficeScores;
  metadata: {
    branchAverages: Record<string, number>;
    previousBranchAverages: Record<string, number>;
    salesTotals: Record<string, number>;
    previousSalesTotals: Record<string, number>;
  };
}

export interface BonusRecord {
  id: number;
  periodType: "Q1" | "Q2" | "Q3" | "Q4" | "Annual";
  year: number;
  scores: BonusScores;
  status: "draft" | "final";
  createdAt: string;
  updatedAt: string;
}

export interface ShortagesReport {
  id: number;
  reportDate: string;
  reportedBy: string;
  shortages: {
    id: number; productName: string; category: string; branch: string;
    currentStock: number; requiredStock: number; unit: string;
    priority: string; supplier: string; notes: string; dateReported: string;
  }[];
  stats: {
    total: number; critical: number; high: number;
    byBranch: Record<string, number>; totalUnitsNeeded: number;
  };
  createdAt: string;
}
