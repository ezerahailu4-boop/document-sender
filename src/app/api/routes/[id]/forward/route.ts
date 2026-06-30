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

  const { toDepartmentId, comments } = await req.json();
  if (!toDepartmentId) {
    return NextResponse.json({ error: "Select a destination department" }, { status: 400 });
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
  // document (or an Admin) may forward it.
  if (me.role !== "ADMIN" && me.departmentId !== currentRoute.toDeptId) {
    return NextResponse.json({ error: "This document is not in your department's inbox" }, { status: 403 });
  }

  const destDept = await prisma.department.findUnique({ where: { id: toDepartmentId } });
  if (!destDept) return NextResponse.json({ error: "Destination department not found" }, { status: 400 });

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
        toDeptId: toDepartmentId,
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
        detail: `Forwarded by ${me.fullName} from ${currentRoute.toDept.name} to ${destDept.name}`,
      },
    });

    return newRoute;
  });

  await notifyRoute(result.id, currentRoute.document.referenceNumber, currentRoute.document.subject, destDept.name).catch(() => {});

  return NextResponse.json({ ok: true, newRouteId: result.id });
}
