import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { detectFileType } from "@/lib/file-type";

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

  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    include: { createdBy: { select: { id: true, fullName: true, email: true } } },
    orderBy: { versionNum: "desc" }
  });

  return NextResponse.json({ versions });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { me, allowed, document } = await checkAccess(documentId, authUser.id);
  if (!me || !me.isActive) return NextResponse.json({ error: "No profile found" }, { status: 403 });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "You don't have access to this document" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const notes = form.get("notes") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const MAX_BYTES = 25 * 1024 * 1024; // 25MB
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds the 25MB limit" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectFileType(buffer);
  if (!detected) {
    return NextResponse.json(
      { error: "Unsupported file. Please upload a PDF, Word document, or image." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documents";

  // Generate a unique filename for the version
  const timestamp = Date.now();
  const safeFilename = `${documentId}_v${timestamp}.${detected.extension}`;
  const storagePath = `${new Date().getFullYear()}/${safeFilename}`;

  const { error: uploadError } = await admin.storage.from(bucket).upload(storagePath, buffer, {
    contentType: detected.mimeType,
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Get the latest version number for this document
  const latestVersion = await prisma.documentVersion.findFirst({
    where: { documentId },
    orderBy: { versionNum: "desc" },
    select: { versionNum: true }
  });

  const nextVersionNum = (latestVersion?.versionNum || 0) + 1;

  const version = await prisma.documentVersion.create({
    data: {
      documentId,
      versionNum: nextVersionNum,
      filePath: storagePath,
      fileSizeBytes: file.size,
      mimeType: detected.mimeType,
      createdById: me.id,
      notes: notes || null
    },
    include: { createdBy: { select: { id: true, fullName: true, email: true } } }
  });

  // Update active document file reference to latest version
  await prisma.document.update({
    where: { id: documentId },
    data: {
      scannedFilePath: storagePath,
      fileSizeBytes: file.size,
      mimeType: detected.mimeType,
      originalFileName: file.name
    }
  });

  // Record audit event
  await prisma.auditEvent.create({
    data: {
      documentId,
      actorName: me.fullName,
      event: "VERSION_UPLOADED",
      detail: `Version ${nextVersionNum} uploaded by ${me.fullName}${notes ? `: ${notes}` : ""}`
    }
  });

  return NextResponse.json({ version }, { status: 201 });
}