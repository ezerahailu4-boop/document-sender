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

  const customValues = await prisma.documentCustomValue.findMany({
    where: { documentId },
    include: { customField: { select: { id: true, name: true, fieldType: true, options: true } } }
  });

  const parsedValues = customValues.map(cv => {
    let parsedValue: any = cv.value;
    try {
      if (cv.customField.fieldType === "number") {
        parsedValue = cv.value !== null ? parseFloat(cv.value) : null;
      } else if (cv.customField.fieldType === "date") {
        parsedValue = cv.value !== null ? new Date(cv.value) : null;
      } else if (cv.customField.fieldType === "select" || cv.customField.fieldType === "checkbox") {
        parsedValue = cv.value ? JSON.parse(cv.value) : null;
      }
    } catch {
      parsedValue = cv.value;
    }

    return {
      id: cv.id,
      customFieldId: cv.customFieldId,
      customField: {
        id: cv.customField.id,
        name: cv.customField.name,
        fieldType: cv.customField.fieldType,
        options: cv.customField.options ? JSON.parse(cv.customField.options) : null
      },
      value: parsedValue,
      updatedAt: cv.updatedAt
    };
  });

  return NextResponse.json({ customValues: parsedValues });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { me, allowed, document } = await checkAccess(documentId, authUser.id);
  if (!me || !me.isActive) return NextResponse.json({ error: "No valid profile found" }, { status: 403 });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "You don't have access to this document" }, { status: 403 });

  const { customFieldId, value } = await req.json().catch(() => ({}));

  if (!customFieldId) {
    return NextResponse.json({ error: "Custom field ID is required" }, { status: 400 });
  }

  const customField = await prisma.customField.findUnique({ where: { id: customFieldId } });
  if (!customField) {
    return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
  }

  let validatedValue = value;
  if (customField.isRequired && (value === null || value === undefined || value === "")) {
    return NextResponse.json({ error: "This field is required" }, { status: 400 });
  }

  if (value !== null && value !== undefined && value !== "") {
    try {
      if (customField.fieldType === "number") {
        validatedValue = String(parseFloat(value));
        if (isNaN(parseFloat(validatedValue))) {
          return NextResponse.json({ error: "Invalid number value" }, { status: 400 });
        }
      } else if (customField.fieldType === "date") {
        validatedValue = new Date(value).toISOString();
      } else if (customField.fieldType === "select" || customField.fieldType === "checkbox") {
        validatedValue = typeof value === "string" ? value : JSON.stringify(value);
      } else {
        validatedValue = String(value);
      }
    } catch {
      return NextResponse.json({ error: "Invalid value format" }, { status: 400 });
    }
  }

  const customValue = await prisma.documentCustomValue.upsert({
    where: { documentId_customFieldId: { documentId, customFieldId } },
    update: { value: validatedValue ? String(validatedValue) : "", updatedAt: new Date() },
    create: {
      documentId,
      customFieldId,
      value: validatedValue ? String(validatedValue) : ""
    }
  });

  return NextResponse.json({ customValue });
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

  const { customFieldId } = await req.json().catch(() => ({}));

  if (!customFieldId) {
    return NextResponse.json({ error: "Custom field ID is required" }, { status: 400 });
  }

  await prisma.documentCustomValue.deleteMany({
    where: { documentId, customFieldId }
  });

  return NextResponse.json({ success: true });
}