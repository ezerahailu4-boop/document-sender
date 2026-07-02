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

  const { toDepartmentId, toUserId, comments } = await req.json();
  if (!toDepartmentId && !toUserId) {
    return NextResponse.json({ error: "Select a destination department or person" }, { status: 400 });
  }

  const currentRoute = await prisma.documentRoute.findUnique({
    where: { id: routeId },
    include: { document: true, toDept: true },
  });

  if (!currentRoute) return NextResponse.json({ error: "Route not found" }, { status: 404 });
  if (currentRoute.status === "FORWARDED" || currentRoute.status === "COMPLETED") {
    return NextResponse.json({ error: "This document has already moved on" }, { status: 409 });
  }
  // Authorization: only a member of the department that currently holds the
  // document, the person it's personally assigned to (when there's no
  // department), or an Admin may forward it.
  const isDeptMember = currentRoute.toDeptId && me.departmentId === currentRoute.toDeptId;
  const isPersonalAssignee = !currentRoute.toDeptId && currentRoute.assignedUserId === me.id;
  if (me.role !== "ADMIN" && !isDeptMember && !isPersonalAssignee) {
    return NextResponse.json({ error: "This document is not in your inbox" }, { status: 403 });
  }

  // Resolve destination the same way registration does: a chosen person
  // with no department routes to them directly; a chosen department (with
  // an optional person within it) routes normally.
  let destDept: { id: string; name: string } | null = null;
  let destUser = null;

  if (toUserId && !toDepartmentId) {
    destUser = await prisma.user.findUnique({ where: { id: toUserId }, include: { department: true } });
    if (!destUser || !destUser.isActive) {
      return NextResponse.json({ error: "Selected user is not available for routing" }, { status: 400 });
    }
    destDept = destUser.department ?? null;
  } else if (toDepartmentId) {
    destDept = await prisma.department.findUnique({ where: { id: toDepartmentId } });
    if (!destDept) return NextResponse.json({ error: "Destination department not found" }, { status: 400 });
    if (toUserId) {
      destUser = await prisma.user.findUnique({ where: { id: toUserId } });
      if (!destUser || destUser.departmentId !== destDept.id || !destUser.isActive) {
        return NextResponse.json({ error: "Selected user does not belong to the selected department" }, { status: 400 });
      }
    }
  }

  const fromLabel = currentRoute.toDept?.name ?? "their inbox";
  const toLabel = destDept
    ? destUser
      ? `${destUser.fullName} in ${destDept.name}`
      : destDept.name
    : `${destUser?.fullName} directly`;

  const result = await prisma.$transaction(async (tx) => {
    await tx.documentRoute.update({
      where: { id: routeId },
      data: { status: "FORWARDED", completedAt: new Date(), comments: comments || currentRoute.comments },
    });
    await tx.routeAction.create({
      data: { routeId, userId: me.id, action: "FORWARDED", note: comments || null },
    });

    const newRoute = await tx.documentRoute.create({
      data: {
        documentId: currentRoute.documentId,
        sequence: currentRoute.sequence + 1,
        fromDeptId: currentRoute.toDeptId,
        toDeptId: destDept?.id ?? null,
        assignedUserId: destUser?.id ?? null,
        status: "PENDING",
      },
    });

    await tx.document.update({
      where: { id: currentRoute.documentId },
      data: { status: "IN_PROGRESS" },
    });

    await tx.auditEvent.create({
      data: {
        documentId: currentRoute.documentId,
        actorName: me.fullName,
        event: "FORWARDED",
        detail: `Forwarded by ${me.fullName} from ${fromLabel} to ${toLabel}`,
      },
    });

    return newRoute;
  });

  await notifyRoute(
    result.id,
    currentRoute.document.referenceNumber,
    currentRoute.document.subject,
    destDept?.name ?? "you",
    destUser?.id
  ).catch(() => {});

  return NextResponse.json({ ok: true, newRouteId: result.id });
}
