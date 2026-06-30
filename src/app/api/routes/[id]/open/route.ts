import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) return NextResponse.json({ error: "No profile found" }, { status: 403 });

  const route = await prisma.documentRoute.findUnique({ where: { id: routeId } });
  if (!route) return NextResponse.json({ error: "Route not found" }, { status: 404 });
  if (me.role !== "ADMIN" && me.departmentId !== route.toDeptId) {
    return NextResponse.json({ error: "This document is not in your department's inbox" }, { status: 403 });
  }

  if (route.status === "PENDING") {
    await prisma.$transaction([
      prisma.documentRoute.update({
        where: { id: routeId },
        data: { status: "OPENED", openedAt: new Date(), assignedUserId: me.id },
      }),
      prisma.routeAction.create({ data: { routeId, userId: me.id, action: "OPENED" } }),
    ]);
  }

  return NextResponse.json({ ok: true });
}
