import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const EDITABLE_FIELDS = ["senderName", "senderOrg", "subject", "receivedDate"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) return NextResponse.json({ error: "No profile found" }, { status: 403 });
  if (me.role !== "REGISTRY_STAFF" && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Only Registry staff or an Admin can correct a document" }, { status: 403 });
  }

  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { senderName, senderOrg, subject, receivedDate, reason } = body;

  if (!senderName?.trim() || !subject?.trim() || !receivedDate) {
    return NextResponse.json({ error: "Sender name, subject, and received date are required" }, { status: 400 });
  }
  if (!reason?.trim()) {
    return NextResponse.json({ error: "A short reason for the correction is required for the audit trail" }, { status: 400 });
  }

  const nextValues: {
    senderName: string;
    senderOrg: string | null;
    subject: string;
    receivedDate: Date;
  } = {
    senderName: senderName.trim(),
    senderOrg: senderOrg?.trim() || null,
    subject: subject.trim(),
    receivedDate: new Date(receivedDate),
  };

  // Build a human-readable diff of only the fields that actually changed,
  // so the audit trail says exactly what was corrected and why.
  const changes: string[] = [];
  for (const field of EDITABLE_FIELDS) {
    const before = existing[field];
    const after = nextValues[field];
    const beforeStr = before instanceof Date ? before.toISOString().slice(0, 10) : String(before ?? "—");
    const afterStr = after instanceof Date ? after.toISOString().slice(0, 10) : String(after ?? "—");
    if (beforeStr !== afterStr) {
      changes.push(`${field}: "${beforeStr}" → "${afterStr}"`);
    }
  }

  if (changes.length === 0) {
    return NextResponse.json({ error: "No changes detected" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.update({
      where: { id },
      data: nextValues,
    });
    await tx.auditEvent.create({
      data: {
        documentId: id,
        actorName: me.fullName,
        event: "CORRECTED",
        detail: `${changes.join("; ")} — reason: ${reason.trim()}`,
      },
    });
    return doc;
  });

  return NextResponse.json({ document: updated });
}
