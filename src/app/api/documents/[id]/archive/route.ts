import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) return NextResponse.json({ error: "No profile found" }, { status: 403 });
  if (me.role !== "REGISTRY_STAFF" && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Only Registry staff or an Admin can archive documents" }, { status: 403 });
  }

  const { archive } = await req.json().catch(() => ({ archive: true }));

  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  if (archive && existing.status !== "COMPLETED") {
    return NextResponse.json({ error: "Only completed documents can be archived" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.update({
      where: { id },
      data: { status: archive ? "ARCHIVED" : "COMPLETED" },
    });
    await tx.auditEvent.create({
      data: {
        documentId: id,
        actorName: me.fullName,
        event: archive ? "ARCHIVED" : "UNARCHIVED",
        detail: `${archive ? "Archived" : "Restored from archive"} by ${me.fullName}`,
      },
    });
    return doc;
  });

  return NextResponse.json({ document: updated });
}
