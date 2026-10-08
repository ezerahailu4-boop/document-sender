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

  const comments = await prisma.comment.findMany({
    where: { documentId },
    include: { author: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { content, routeId } = await req.json().catch(() => ({}));
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
  }

  // Verify routeId belongs to this document if provided
  if (routeId) {
    const route = await prisma.documentRoute.findFirst({
      where: { id: routeId, documentId }
    });
    if (!route) {
      return NextResponse.json({ error: "Invalid route ID for this document" }, { status: 400 });
    }
  }

  const comment = await prisma.comment.create({
    data: {
      documentId,
      routeId: routeId || null,
      authorId: me.id,
      content: content.trim()
    },
    include: { author: { select: { id: true, fullName: true, email: true } } }
  });

  return NextResponse.json({ comment }, { status: 201 });
}