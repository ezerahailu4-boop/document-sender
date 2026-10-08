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

  // Get user's private searches and public searches
  const savedSearches = await prisma.savedSearch.findMany({
    where: {
      OR: [
        { userId: me.id },
        { isPublic: true }
      ]
    },
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ savedSearches });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) {
    return NextResponse.json({ error: "No profile found" }, { status: 403 });
  }

  const { name, query, filters, isPublic } = await req.json();

  if (!name || !query) {
    return NextResponse.json({ error: "Name and query are required" }, { status: 400 });
  }

  // Check if user already has a saved search with this name
  const existingSearch = await prisma.savedSearch.findFirst({
    where: { userId: me.id, name }
  });

  if (existingSearch) {
    return NextResponse.json({ error: "You already have a saved search with this name" }, { status: 400 });
  }

  const savedSearch = await prisma.savedSearch.create({
    data: {
      userId: me.id,
      name,
      query,
      filters: filters ? typeof filters === "string" ? filters : JSON.stringify(filters) : null,
      isPublic: isPublic || false
    }
  });

  return NextResponse.json({ savedSearch }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) {
    return NextResponse.json({ error: "No profile found" }, { status: 403 });
  }

  const { id, name, query, filters, isPublic } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Saved search ID is required" }, { status: 400 });
  }

  // Verify the saved search belongs to the user
  const existingSearch = await prisma.savedSearch.findUnique({ where: { id } });
  if (!existingSearch || existingSearch.userId !== me.id) {
    return NextResponse.json({ error: "Saved search not found or insufficient permissions" }, { status: 404 });
  }

  const updatedSearch = await prisma.savedSearch.update({
    where: { id },
    data: {
      name: name || undefined,
      query: query || undefined,
      filters: filters !== undefined ? (typeof filters === "string" ? filters : JSON.stringify(filters)) : undefined,
      isPublic: isPublic !== undefined ? isPublic : undefined
    }
  });

  return NextResponse.json({ savedSearch: updatedSearch });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) {
    return NextResponse.json({ error: "No profile found" }, { status: 403 });
  }

  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Saved search ID is required" }, { status: 400 });
  }

  // Verify the saved search belongs to the user
  const existingSearch = await prisma.savedSearch.findUnique({ where: { id } });
  if (!existingSearch || existingSearch.userId !== me.id) {
    return NextResponse.json({ error: "Saved search not found or insufficient permissions" }, { status: 404 });
  }

  await prisma.savedSearch.delete({
    where: { id }
  });

  return NextResponse.json({ success: true });
}