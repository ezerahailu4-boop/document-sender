import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) return NextResponse.json({ error: "No profile found" }, { status: 403 });

  // Every active registered user — including ones with no department
  // (e.g. Registry staff), who now receive documents in their own
  // personal inbox rather than needing a department. Used by both the
  // GM's "forward to a person" picker and Registry's "choose a person"
  // routing option at registration time.
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, role: true, departmentId: true, department: { select: { name: true } } },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      role: u.role,
      departmentId: u.departmentId,
      departmentName: u.department?.name ?? "No department",
    })),
  });
}
