import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function checkAccess(documentId: string, authUserId: string) {
  const me = await prisma.user.findUnique({ where: { authId: authUserId } });
  if (!me || !me.isActive) return { me: null, allowed: false, document: null };

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { routes: true },
  });
  if (!document) return { me, allowed: false, document: null };

  const isRegistryOrAdmin = me.role === "REGISTRY_STAFF" || me.role === "ADMIN";
  const hasRouteAccess = document.routes.some(
    (r) => r.toDeptId === me.departmentId || (!r.toDeptId && r.assignedUserId === me.id)
  );

  return { me, allowed: isRegistryOrAdmin || hasRouteAccess, document };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { me, allowed, document } = await checkAccess(documentId, authUser.id);
  if (!me) return NextResponse.json({ error: "No profile found" }, { status: 403 });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "You don't have access to this document" }, { status: 403 });

  const workflowInstances = await prisma.documentWorkflowInstance.findMany({
    where: { documentId },
    include: {
      workflow: {
        select: {
          id: true,
          name: true,
          description: true
        }
      }
    },
    orderBy: { startedAt: "desc" }
  });

  return NextResponse.json({ workflowInstances });
}