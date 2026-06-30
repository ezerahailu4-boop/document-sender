import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me || (me.role !== "REGISTRY_STAFF" && me.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const includeArchived = url.searchParams.get("archived") === "1";

  const where: Prisma.DocumentWhereInput = {
    ...(includeArchived ? {} : { status: { not: "ARCHIVED" } }),
    ...(q
      ? {
          OR: [
            { referenceNumber: { contains: q, mode: "insensitive" } },
            { senderName: { contains: q, mode: "insensitive" } },
            { senderOrg: { contains: q, mode: "insensitive" } },
            { subject: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const documents = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { routes: { orderBy: { sequence: "desc" }, take: 1, include: { toDept: true } } },
  });

  const header = ["Reference No.", "Sender", "Sender Org", "Subject", "Received Date", "Currently At", "Status", "Days Open"];
  const rows = documents.map((doc) => {
    const end = doc.completedAt ?? new Date();
    const days = Math.max(0, Math.floor((end.getTime() - new Date(doc.receivedDate).getTime()) / (1000 * 60 * 60 * 24)));
    return [
      doc.referenceNumber,
      doc.senderName,
      doc.senderOrg ?? "",
      doc.subject,
      new Date(doc.receivedDate).toISOString().slice(0, 10),
      doc.routes[0]?.toDept.name ?? "",
      doc.status,
      String(days),
    ];
  });

  const csv = [header, ...rows].map((row) => row.map((v) => csvEscape(String(v))).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="doctrack-ledger-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
