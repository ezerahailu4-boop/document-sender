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

  const { name, code, isGmOffice, isActive } = await req.json().catch(() => ({}));

  if (isGmOffice) {
    await prisma.department.updateMany({ where: { isGmOffice: true, NOT: { id } }, data: { isGmOffice: false } });
  }

  const dept = await prisma.department.update({
    where: { id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(code ? { code: code.trim().toUpperCase() } : {}),
      ...(isGmOffice !== undefined ? { isGmOffice: !!isGmOffice } : {}),
      ...(isActive !== undefined ? { isActive: !!isActive } : {}),
    },
  });

  return NextResponse.json({ department: dept });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  // Check all foreign key dependencies before attempting hard delete
  const [routeTo, routeFrom, createdDoc, hasUsers] = await Promise.all([
    prisma.documentRoute.findFirst({ where: { toDeptId: id } }),
    prisma.documentRoute.findFirst({ where: { fromDeptId: id } }),
    prisma.document.findFirst({ where: { originDeptId: id } }),
    prisma.user.findFirst({ where: { departmentId: id } }),
  ]);

  if (routeTo || routeFrom || createdDoc || hasUsers) {
    return NextResponse.json(
      { error: "This department has assigned users or document history. Please deactivate it instead of deleting." },
      { status: 409 }
    );
  }

  await prisma.department.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
