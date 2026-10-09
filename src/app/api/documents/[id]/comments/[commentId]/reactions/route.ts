import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id: documentId, commentId } = await params;

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me || !me.isActive) {
    return NextResponse.json({ error: "No valid profile found" }, { status: 403 });
  }

  // Check if user has access to this document
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true }
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Verify the comment belongs to this document
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, documentId },
    select: { id: true }
  });

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const { emoji } = await req.json();

  if (!emoji) {
    return NextResponse.json({ error: "Emoji is required for reaction" }, { status: 400 });
  }

  // Check if the user already reacted with this emoji to this comment
  const existingReaction = await prisma.commentReaction.findFirst({
    where: {
      commentId: commentId,
      userId: me.id,
      emoji: emoji
    }
  });

  if (existingReaction) {
    // Remove the reaction (toggle off)
    await prisma.commentReaction.delete({
      where: { id: existingReaction.id }
    });

    return NextResponse.json({
      success: true,
      action: "removed",
      reaction: null
    });
  } else {
    // Add the reaction
    const reaction = await prisma.commentReaction.create({
      data: {
        commentId,
        userId: me.id,
        emoji: emoji
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } }
      }
    });

    return NextResponse.json({
      success: true,
      action: "added",
      reaction
    }, { status: 201 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id: documentId, commentId } = await params;

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) {
    return NextResponse.json({ error: "No profile found" }, { status: 403 });
  }

  // Check if user has access to this document
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true }
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Verify the comment belongs to this document
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, documentId },
    select: { id: true }
  });

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Get all reactions for this comment
  const reactions = await prisma.commentReaction.findMany({
    where: { commentId: commentId },
    include: {
      user: { select: { id: true, fullName: true, email: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  // Group reactions by emoji for easier consumption in UI
  const reactionGroups: Record<string, { count: number; users: Array<{ id: string; fullName: string; email: string }>; hasReactedByMe: boolean }> = {};

  reactions.forEach(reaction => {
    if (!reactionGroups[reaction.emoji]) {
      reactionGroups[reaction.emoji] = {
        count: 0,
        users: [],
        hasReactedByMe: false
      };
    }

    reactionGroups[reaction.emoji].count += 1;
    reactionGroups[reaction.emoji].users.push({
      id: reaction.user.id,
      fullName: reaction.user.fullName,
      email: reaction.user.email
    });

    if (reaction.userId === me.id) {
      reactionGroups[reaction.emoji].hasReactedByMe = true;
    }
  });

  return NextResponse.json({ reactions: reactionGroups });
}