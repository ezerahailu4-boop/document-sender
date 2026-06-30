import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { notifyRoute } from "@/lib/notify";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) return NextResponse.json({ error: "No profile found" }, { status: 403 });

  const { reason } = await req.json();
  if (!reason?.trim()) {
    return NextResponse.json({ error: "A reason is required when returning a document" }, { status: 400 });
  }

  const currentRoute = await prisma.documentRoute.findUnique({
    where: { id: routeId },
    include: { document: true, toDept: true, fromDept: true },
  });

  if (!currentRoute) return NextResponse.json({ error: "Route not found" }, { status: 404 });
  if (currentRoute.status === "FORWARDED" || currentRoute.status === "COMPLETED") {
    return NextResponse.json({ error: "This document has already moved on" }, { status: 409 });
  }
  if (me.role !== "ADMIN" && me.departmentId !== currentRoute.toDeptId) {
    return NextResponse.json({ error: "This document is not in your department's inbox" }, { status: 403 });
  }
  if (!currentRoute.fromDeptId) {
    return NextResponse.json({ error: "This is the first stop for this document — there's nowhere to return it to" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.documentRoute.update({
      where: { id: routeId },
      data: { status: "FORWARDED", completedAt: new Date(), comments: `Returned: ${reason.trim()}` },
    });
    await tx.routeAction.create({
      data: { routeId, userId: me.id, action: "RETURNED", note: reason.trim() },
    });

    const newRoute = await tx.documentRoute.create({
      data: {
        documentId: currentRoute.documentId,
        sequence: currentRoute.sequence + 1,
        fromDeptId: currentRoute.toDeptId,
        toDeptId: currentRoute.fromDeptId!,
        status: "PENDING",
        comments: `Returned from ${currentRoute.toDept.name}: ${reason.trim()}`,
      },
    });

    await tx.document.update({ where: { id: currentRoute.documentId }, data: { status: "IN_PROGRESS" } });

    await tx.auditEvent.create({
      data: {
        documentId: currentRoute.documentId,
        actorName: me.fullName,
        event: "RETURNED",
        detail: `Returned by ${me.fullName} from ${currentRoute.toDept.name} to ${currentRoute.fromDept?.name ?? "Registry"} — reason: ${reason.trim()}`,
      },
    });

    return newRoute;
  });

  await notifyRoute(
    result.id,
    currentRoute.document.referenceNumber,
    `[Returned] ${currentRoute.document.subject}`,
    currentRoute.fromDept?.name ?? "Registry"
  ).catch(() => {});

  return NextResponse.json({ ok: true });
}
