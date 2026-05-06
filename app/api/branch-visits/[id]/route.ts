import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const visit = await prisma.branchVisit.findUnique({ where: { id: Number(id) } });
    if (!visit) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(visit);
  } catch {
    return NextResponse.json({ error: "Failed to fetch visit" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = { ...body, visitDate: body.visitDate ? new Date(body.visitDate) : undefined };
    const visit = await prisma.branchVisit.update({ where: { id: Number(id) }, data });
    return NextResponse.json(visit);
  } catch {
    return NextResponse.json({ error: "Failed to update visit" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.branchVisit.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete visit" }, { status: 500 });
  }
}
