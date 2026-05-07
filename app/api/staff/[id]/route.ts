import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...body } = await req.json();
    const member = await prisma.staff.update({ where: { id: Number(id) }, data: body });
    return NextResponse.json(member);
  } catch {
    return NextResponse.json({ error: "Failed to update staff member" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.staff.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete staff member" }, { status: 500 });
  }
}
