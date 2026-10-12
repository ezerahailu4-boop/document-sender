import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { name, fieldType, options, isRequired } = await req.json().catch(() => ({}));
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Field name is required" }, { status: 400 });
  }

  const existing = await prisma.customField.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
  }

  const validTypes = ["text", "number", "date", "select", "checkbox"];
  const typeToUse = fieldType || existing.fieldType;
  if (!validTypes.includes(typeToUse)) {
    return NextResponse.json({ error: "Invalid field type" }, { status: 400 });
  }

  const updated = await prisma.customField.update({
    where: { id },
    data: {
      name: name.trim(),
      fieldType: typeToUse,
      options: options ? (typeof options === "string" ? options : JSON.stringify(options)) : null,
      isRequired: isRequired !== undefined ? !!isRequired : existing.isRequired,
    },
  });

  return NextResponse.json({ customField: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Delete all values associated with this custom field first
  await prisma.documentCustomValue.deleteMany({ where: { customFieldId: id } });
  await prisma.customField.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
