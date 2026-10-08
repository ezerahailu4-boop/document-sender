import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me || !me.isActive) {
    return NextResponse.json({ error: "No profile found" }, { status: 403 });
  }

  const customFields = await prisma.customField.findMany({
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ customFields });
}

export async function POST(req: NextRequest) {
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

  if (!name || !fieldType) {
    return NextResponse.json({ error: "Name and field type are required" }, { status: 400 });
  }

  const validTypes = ["text", "number", "date", "select", "checkbox"];
  if (!validTypes.includes(fieldType)) {
    return NextResponse.json({ error: "Invalid field type" }, { status: 400 });
  }

  if ((fieldType === "select" || fieldType === "checkbox") && (!options || !Array.isArray(options))) {
    return NextResponse.json({ error: "Options array is required for select/checkbox field types" }, { status: 400 });
  }

  // Check if custom field already exists using findFirst since name is indexed but not unique
  const existingField = await prisma.customField.findFirst({ where: { name } });
  if (existingField) {
    return NextResponse.json({ error: "Custom field with this name already exists" }, { status: 400 });
  }

  const customField = await prisma.customField.create({
    data: {
      name: name.trim(),
      fieldType,
      options: options ? JSON.stringify(options) : null,
      isRequired: !!isRequired
    }
  });

  return NextResponse.json({ customField }, { status: 201 });
}