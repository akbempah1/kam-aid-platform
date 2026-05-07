import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const staff = await prisma.staff.findMany({ orderBy: { branch: "asc" } });
    return NextResponse.json(staff);
  } catch {
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id: _id, createdAt: _ca, updatedAt: _ua, ...body } = await req.json();
    const member = await prisma.staff.create({ data: body });
    return NextResponse.json(member, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
  }
}
