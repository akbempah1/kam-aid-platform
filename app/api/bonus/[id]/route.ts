import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = await prisma.bonusRecord.findUnique({ where: { id: Number(id) } });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Failed to fetch bonus record" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...body } = await req.json();
    const record = await prisma.bonusRecord.update({ where: { id: Number(id) }, data: body });
    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Failed to update bonus record" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.bonusRecord.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete bonus record" }, { status: 500 });
  }
}
