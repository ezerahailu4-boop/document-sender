import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateReferenceNumber } from "@/lib/reference-number";
import { notifyRoute } from "@/lib/notify";
import { detectFileType } from "@/lib/file-type";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) return NextResponse.json({ error: "No profile found" }, { status: 403 });
  if (me.role !== "REGISTRY_STAFF" && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Only Registry staff can register documents" }, { status: 403 });
  }

  // Every document's first stop is the GM's office — found dynamically so
  // Admin can reassign which department holds that flag without a code change.
  const gmDept = await prisma.department.findFirst({ where: { isGmOffice: true } });
  if (!gmDept) {
    return NextResponse.json(
      { error: "No GM office department is configured. Ask an Admin to mark one in Departments settings." },
      { status: 400 }
    );
  }

  const form = await req.formData();
  const senderName = String(form.get("senderName") || "").trim();
  const senderOrg = String(form.get("senderOrg") || "").trim();
  const subject = String(form.get("subject") || "").trim();
  const receivedDate = String(form.get("receivedDate") || "");
  const file = form.get("file") as File | null;

  if (!senderName || !subject || !receivedDate || !file) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // --- File validation (defense in depth — never trust the client extension or MIME type) ---
  const MAX_BYTES = 25 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds the 25MB limit" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectFileType(buffer);
  if (!detected) {
    return NextResponse.json(
      { error: "Unsupported file. Please upload a PDF, Word document (.docx/.doc), or image (JPG/PNG/WebP)." },
      { status: 400 }
    );
  }

  // --- Reference number (race-safe, see lib/reference-number.ts) ---
  const referenceNumber = await generateReferenceNumber();

  // --- Upload to storage, renamed to the reference number (never trust client filenames) ---
  const safeRef = referenceNumber.replace(/\//g, "_");
  const storagePath = `${new Date().getFullYear()}/${safeRef}.${detected.extension}`;
  const admin = createAdminClient();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documents";

  const { error: uploadError } = await admin.storage.from(bucket).upload(storagePath, buffer, {
    contentType: detected.mimeType,
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // --- Create document + first hop (Registry -> GM) + audit trail ---
  const document = await prisma.$transaction(async (tx) => {
    return tx.document.create({
      data: {
        referenceNumber,
        senderName,
        senderOrg: senderOrg || null,
        subject,
        receivedDate: new Date(receivedDate),
        scannedFilePath: storagePath,
        fileSizeBytes: file.size,
        originalFileName: file.name,
        mimeType: detected.mimeType,
        registeredById: me.id,
        originDeptId: me.departmentId ?? gmDept.id,
        routes: {
          create: {
            sequence: 1,
            fromDeptId: me.departmentId ?? null,
            toDeptId: gmDept.id,
            status: "PENDING",
          },
        },
        auditEvents: {
          create: {
            actorName: me.fullName,
            event: "REGISTERED",
            detail: `Registered by ${me.fullName} and routed to ${gmDept.name} for review`,
          },
        },
      },
      include: { routes: true },
    });
  });

  await notifyRoute(document.routes[0].id, document.referenceNumber, document.subject, gmDept.name).catch(() => {});

  return NextResponse.json({ id: document.id, referenceNumber: document.referenceNumber });
}
