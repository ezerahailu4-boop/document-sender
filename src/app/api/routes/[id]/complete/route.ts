import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { trackAnalyticsEvent } from "@/lib/analytics";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) return NextResponse.json({ error: "No profile found" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const note: string | undefined = body?.note;

  const route = await prisma.documentRoute.findUnique({ where: { id: routeId }, include: { toDept: true, document: true } });
  if (!route) return NextResponse.json({ error: "Route not found" }, { status: 404 });
  if (route.status === "FORWARDED" || route.status === "COMPLETED") {
    return NextResponse.json({ error: "This document has already moved on" }, { status: 409 });
  }
  if (me.role !== "ADMIN") {
    const isDeptMember = route.toDeptId && me.departmentId === route.toDeptId;
    const isPersonalAssignee = !route.toDeptId && route.assignedUserId === me.id;
    if (!isDeptMember && !isPersonalAssignee) {
      return NextResponse.json({ error: "This document is not in your inbox" }, { status: 403 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.documentRoute.update({
      where: { id: routeId },
      data: { status: "COMPLETED", completedAt: new Date(), comments: note || route.comments },
    });
    await tx.routeAction.create({
      data: { routeId, userId: me.id, action: "COMPLETED", note: note || null },
    });
    await tx.document.update({
      where: { id: route.documentId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await tx.auditEvent.create({
      data: {
        documentId: route.documentId,
        actorName: me.fullName,
        event: "COMPLETED",
        detail: `Marked complete by ${me.fullName}${route.toDept ? ` in ${route.toDept.name}` : ""}`,
      },
    });

    // Track analytics
    await trackAnalyticsEvent("route_completed", route.documentId, me.id, { routeId, note });
  });

  return NextResponse.json({ ok: true });
}
