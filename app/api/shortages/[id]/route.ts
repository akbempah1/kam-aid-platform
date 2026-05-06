import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const report = await prisma.shortagesReport.findUnique({ where: { id: Number(id) } });
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Failed to fetch shortage report" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = { ...body, reportDate: body.reportDate ? new Date(body.reportDate) : undefined };
    const report = await prisma.shortagesReport.update({ where: { id: Number(id) }, data });
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Failed to update shortage report" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.shortagesReport.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete shortage report" }, { status: 500 });
  }
}
