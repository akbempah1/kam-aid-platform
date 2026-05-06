import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const reports = await prisma.monthlyReport.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return NextResponse.json(reports);
  } catch {
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id: _id, createdAt: _ca, ...body } = await req.json();
    const report = await prisma.monthlyReport.create({ data: body });
    return NextResponse.json(report, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}
