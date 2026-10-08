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

  const documentTags = await prisma.documentTag.findMany({
    where: { documentId },
    include: {
      tag: { select: { id: true, name: true, color: true } },
      appliedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { appliedAt: "desc" },
  });

  return NextResponse.json({ documentTags });
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

  const { tagId } = await req.json().catch(() => ({}));
  if (!tagId) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }

  const tag = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  // Check if tag already applied
  const existing = await prisma.documentTag.findUnique({
    where: { documentId_tagId: { documentId, tagId } },
  });

  if (existing) {
    return NextResponse.json({ error: "Tag is already applied to this document" }, { status: 400 });
  }

  const documentTag = await prisma.documentTag.create({
    data: {
      documentId,
      tagId,
      appliedById: me.id,
    },
    include: {
      tag: { select: { id: true, name: true, color: true } },
      appliedBy: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json({ documentTag }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { tagId } = await req.json().catch(() => ({}));
  if (!tagId) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }

  await prisma.documentTag.deleteMany({
    where: { documentId, tagId },
  });

  return NextResponse.json({ success: true });
}
