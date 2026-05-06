import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const visits = await prisma.branchVisit.findMany({
      orderBy: { visitDate: "desc" },
    });
    return NextResponse.json(visits);
  } catch {
    return NextResponse.json({ error: "Failed to fetch visits" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id: _id, createdAt: _ca, ...body } = await req.json();
    const data = { ...body, visitDate: new Date(body.visitDate) };
    const visit = await prisma.branchVisit.create({ data });
    return NextResponse.json(visit, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create visit" }, { status: 500 });
  }
}
