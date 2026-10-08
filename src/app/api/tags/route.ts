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
  if (!me) {
    return NextResponse.json({ error: "No profile found" }, { status: 403 });
  }

  // Get tags - in a real implementation, you might want to show only relevant tags
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ tags });
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

  const { name, color } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
  }

  // Check if tag already exists
  const existingTag = await prisma.tag.findUnique({ where: { name } });
  if (existingTag) {
    return NextResponse.json({ error: "Tag with this name already exists" }, { status: 400 });
  }

  const tag = await prisma.tag.create({
    data: {
      name,
      color: color || null
    }
  });

  return NextResponse.json({ tag }, { status: 201 });
}