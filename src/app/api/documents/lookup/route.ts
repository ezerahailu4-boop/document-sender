import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) return NextResponse.json({ error: "No profile found" }, { status: 403 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("ref") || "").trim();
  if (!q) return NextResponse.json({ documents: [] });

  const isRegistryOrAdmin = me.role === "REGISTRY_STAFF" || me.role === "ADMIN";

  const documents = await prisma.document.findMany({
    where: {
      referenceNumber: { contains: q, mode: "insensitive" },
      // Department users only ever find documents that have passed through
      // their own department at some point — never the full ledger.
      ...(isRegistryOrAdmin ? {} : { routes: { some: { toDeptId: me.departmentId ?? "__none__" } } }),
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      routes: { orderBy: { sequence: "desc" }, take: 1, include: { toDept: true } },
    },
  });

  return NextResponse.json({
    documents: documents.map((d) => ({
      id: d.id,
      referenceNumber: d.referenceNumber,
      subject: d.subject,
      senderName: d.senderName,
      status: d.status,
      currentDept: d.routes[0]?.toDept.name ?? null,
    })),
  });
}
