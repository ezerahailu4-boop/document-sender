import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: savedSearchId } = await params;

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) {
    return NextResponse.json({ error: "No profile found" }, { status: 403 });
  }

  // Get the saved search, verifying ownership or public access
  const savedSearch = await prisma.savedSearch.findFirst({
    where: {
      id: savedSearchId,
      OR: [
        { userId: me.id }, // User's own search
        { isPublic: true } // Or public search
      ]
    }
  });

  if (!savedSearch) {
    return NextResponse.json({ error: "Saved search not found or access denied" }, { status: 404 });
  }

  // Execute the search using the same logic as the document lookup API
  const q = savedSearch.query.trim();
  if (!q) {
    return NextResponse.json({ documents: [] });
  }

  const isRegistryOrAdmin = me.role === "REGISTRY_STAFF" || me.role === "ADMIN";

  const documents = await prisma.document.findMany({
    where: {
      referenceNumber: { contains: q, mode: "insensitive" },
      // Non-Registry/Admin users only ever find documents that have passed
      // through their own department, OR were assigned directly to them
      // with no department at all — never the full ledger.
      ...(isRegistryOrAdmin
        ? {}
        : {
            routes: {
              some: {
                OR: [
                  ...(me.departmentId ? [{ toDeptId: me.departmentId }] : []),
                  { toDeptId: null, assignedUserId: me.id },
                ],
              },
            },
          }),
    },
    orderBy: { createdAt: "desc" },
    take: 50, // Limit results for performance
    include: {
      routes: { orderBy: { sequence: "desc" }, take: 1, include: { toDept: true, assignedUser: true } },
    },
  });

  // Format results for frontend consumption
  const formattedDocuments = documents.map((d) => ({
    id: d.id,
    referenceNumber: d.referenceNumber,
    subject: d.subject,
    senderName: d.senderName,
    status: d.status,
    currentDept: d.routes[0]?.toDept?.name ?? d.routes[0]?.assignedUser?.fullName ?? null,
  }));

  return NextResponse.json({ documents: formattedDocuments, savedSearch });
}