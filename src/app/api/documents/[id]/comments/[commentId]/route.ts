import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id: documentId, commentId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me || !me.isActive) {
    return NextResponse.json({ error: "No profile found" }, { status: 403 });
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { author: { select: { id: true, fullName: true, email: true } } },
  });

  if (!comment || comment.documentId !== documentId) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Only the author or an admin can edit a comment
  if (comment.authorId !== me.id && me.role !== "ADMIN") {
    return NextResponse.json({ error: "You can only edit your own comments" }, { status: 403 });
  }

  const { content } = await req.json().catch(() => ({}));
  if (!content?.trim()) {
    return NextResponse.json({ error: "Comment content cannot be empty" }, { status: 400 });
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content: content.trim() },
    include: { author: { select: { id: true, fullName: true, email: true } } },
  });

  return NextResponse.json({ comment: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id: documentId, commentId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me || !me.isActive) {
    return NextResponse.json({ error: "No profile found" }, { status: 403 });
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment || comment.documentId !== documentId) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Only the author or an admin can delete a comment
  if (comment.authorId !== me.id && me.role !== "ADMIN") {
    return NextResponse.json({ error: "You can only delete your own comments" }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: commentId } });

  return NextResponse.json({ success: true });
}
