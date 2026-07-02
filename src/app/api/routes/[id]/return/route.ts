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
  if (me.role !== "ADMIN") {
    const isDeptMember = currentRoute.toDeptId && me.departmentId === currentRoute.toDeptId;
    const isPersonalAssignee = !currentRoute.toDeptId && currentRoute.assignedUserId === me.id;
    if (!isDeptMember && !isPersonalAssignee) {
      return NextResponse.json({ error: "This document is not in your inbox" }, { status: 403 });
    }
  }
  // "Nowhere to return to" now means no prior hop at all — a route with no
  // department can still have a fromDeptId (it was forwarded from a real
  // department to a departmentless person), so this only blocks the very
  // first hop of a document's journey.
  if (!currentRoute.fromDeptId && currentRoute.sequence === 1) {
    return NextResponse.json({ error: "This is the first stop for this document — there's nowhere to return it to" }, { status: 400 });
  }

  const fromLabel = currentRoute.toDept?.name ?? me.fullName;
  const backToLabel = currentRoute.fromDept?.name ?? "Registry";

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
        toDeptId: currentRoute.fromDeptId ?? null,
        status: "PENDING",
        comments: `Returned from ${fromLabel}: ${reason.trim()}`,
      },
    });

    await tx.document.update({ where: { id: currentRoute.documentId }, data: { status: "IN_PROGRESS" } });

    await tx.auditEvent.create({
      data: {
        documentId: currentRoute.documentId,
        actorName: me.fullName,
        event: "RETURNED",
        detail: `Returned by ${me.fullName} from ${fromLabel} to ${backToLabel} — reason: ${reason.trim()}`,
      },
    });

    return newRoute;
  });

  await notifyRoute(
    result.id,
    currentRoute.document.referenceNumber,
    `[Returned] ${currentRoute.document.subject}`,
    backToLabel
  ).catch(() => {});

  return NextResponse.json({ ok: true });
}
