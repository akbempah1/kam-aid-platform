import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const reports = await prisma.shortagesReport.findMany({
      orderBy: { reportDate: "desc" },
    });
    return NextResponse.json(reports);
  } catch {
    return NextResponse.json({ error: "Failed to fetch shortages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id: _id, createdAt: _ca, ...body } = await req.json();
    const data = { ...body, reportDate: new Date(body.reportDate) };
    const report = await prisma.shortagesReport.create({ data });
    return NextResponse.json(report, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create shortage report" }, { status: 500 });
  }
}
