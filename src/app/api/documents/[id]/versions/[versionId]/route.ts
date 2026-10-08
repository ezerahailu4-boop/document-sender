import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id: documentId, versionId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { me, allowed, document } = await checkAccess(documentId, authUser.id);
  if (!me) return NextResponse.json({ error: "No profile found" }, { status: 403 });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "You don't have access to this document" }, { status: 403 });

  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId },
  });

  if (!version) {
    return NextResponse.json({ error: "Document version not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documents";

  const { data, error } = await admin.storage.from(bucket).download(version.filePath);
  if (error || !data) {
    return NextResponse.json({ error: "Failed to download document version file" }, { status: 500 });
  }

  const fileName = version.filePath.split("/").pop() || `version_${version.versionNum}`;
  const contentType = version.mimeType || "application/octet-stream";

  return new NextResponse(data, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  return POST(req, { params });
}