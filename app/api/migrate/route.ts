import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { monthlyReports, weeklyReports, branchVisits, shortagesReports } = await req.json();

    const results = { monthly: 0, weekly: 0, branchVisits: 0, shortages: 0, errors: [] as string[] };

    for (const r of monthlyReports ?? []) {
      try {
        await prisma.monthlyReport.upsert({
          where: { month_year: { month: r.month, year: r.year } },
          update: {},
          create: {
            month: r.month,
            year: r.year,
            sales: r.sales,
            cogs: String(r.cogs),
            expenses: r.expenses,
            customExpenses: r.customExpenses ?? [],
            totals: r.totals,
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          },
        });
        results.monthly++;
      } catch (e) {
        results.errors.push(`Monthly ${r.month}/${r.year}: ${e}`);
      }
    }

    for (const r of weeklyReports ?? []) {
      try {
        await prisma.weeklyReport.create({
          data: {
            weekStart: new Date(r.weekStart),
            weekEnd: new Date(r.weekEnd),
            dailySales: r.dailySales,
            expenses: r.expenses ?? [],
            issues: r.issues ?? [],
            totals: r.totals,
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          },
        });
        results.weekly++;
      } catch (e) {
        results.errors.push(`Weekly ${r.weekStart}: ${e}`);
      }
    }

    for (const r of branchVisits ?? []) {
      try {
        await prisma.branchVisit.create({
          data: {
            reportType: r.reportType,
            visitDate: new Date(r.visitDate),
            branch: r.branch ?? null,
            visitedBy: r.visitedBy,
            branchChecklist: r.branchChecklist ?? {},
            issues: r.issues ?? [],
            actionItems: r.actionItems ?? [],
            branchRatings: r.branchRatings ?? {},
            generalNotes: r.generalNotes ?? "",
            stats: r.stats,
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          },
        });
        results.branchVisits++;
      } catch (e) {
        results.errors.push(`BranchVisit ${r.visitDate}: ${e}`);
      }
    }

    for (const r of shortagesReports ?? []) {
      try {
        await prisma.shortagesReport.create({
          data: {
            reportDate: new Date(r.reportDate),
            reportedBy: r.reportedBy,
            shortages: r.shortages ?? [],
            stats: r.stats,
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          },
        });
        results.shortages++;
      } catch (e) {
        results.errors.push(`Shortage ${r.reportDate}: ${e}`);
      }
    }

    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
