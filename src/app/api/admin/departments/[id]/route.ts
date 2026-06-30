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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const { name, code, isGmOffice } = await req.json();

  if (isGmOffice) {
    await prisma.department.updateMany({ where: { isGmOffice: true, NOT: { id } }, data: { isGmOffice: false } });
  }

  const dept = await prisma.department.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(code ? { code: code.toUpperCase() } : {}),
      ...(isGmOffice !== undefined ? { isGmOffice } : {}),
    },
  });

  return NextResponse.json({ department: dept });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const inUse = await prisma.documentRoute.findFirst({ where: { toDeptId: id } });
  if (inUse) {
    return NextResponse.json(
      { error: "This department has document history and cannot be deleted. Consider renaming it instead." },
      { status: 409 }
    );
  }

  await prisma.department.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
