import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me || me.role !== "ADMIN") return null;
  return me;
}

export async function GET() {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ departments });
}

export async function POST(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, code, isGmOffice } = await req.json();
  if (!name || !code) {
    return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
  }

  if (isGmOffice) {
    // Exactly one department may be the GM office — unset any existing one.
    await prisma.department.updateMany({ where: { isGmOffice: true }, data: { isGmOffice: false } });
  }

  try {
    const dept = await prisma.department.create({
      data: { name, code: code.toUpperCase(), isGmOffice: !!isGmOffice },
    });
    return NextResponse.json({ department: dept });
  } catch {
    return NextResponse.json({ error: "A department with that name or code already exists" }, { status: 409 });
  }
}
