import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const records = await prisma.bonusRecord.findMany({ orderBy: [{ year: "desc" }, { periodType: "asc" }] });
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Failed to fetch bonus records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...body } = await req.json();
    const record = await prisma.bonusRecord.upsert({
      where: { periodType_year: { periodType: body.periodType, year: body.year } },
      create: body,
      update: body,
    });
    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save bonus record" }, { status: 500 });
  }
}
