import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const reports = await prisma.weeklyReport.findMany({
      orderBy: { weekStart: "desc" },
    });
    return NextResponse.json(reports);
  } catch {
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id: _id, createdAt: _ca, ...body } = await req.json();
    const data = {
      ...body,
      weekStart: new Date(body.weekStart),
      weekEnd: new Date(body.weekEnd),
    };
    const report = await prisma.weeklyReport.create({ data });
    return NextResponse.json(report, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}
