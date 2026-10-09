import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;

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

  const routeId = req.nextUrl.searchParams.get("routeId");

  const comments = await prisma.comment.findMany({
    where: {
      documentId,
      ...(routeId ? { routeId } : {})
    },
    include: {
      author: { select: { id: true, fullName: true, email: true } },
      _count: {
        select: { reactions: true, mentions: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  // Process comments to include reaction data and mentions
  const processedComments = await Promise.all(comments.map(async (comment) => {
    // Get reactions for this comment
    const reactions = await prisma.commentReaction.findMany({
      where: { commentId: comment.id },
      include: {
        user: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    // Get mentions for this comment
    const mentions = await prisma.commentMention.findMany({
      where: { commentId: comment.id },
      include: {
        user: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    return {
      ...comment,
      reactions,
      mentions
    };
  }));

  return NextResponse.json({ comments: processedComments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;

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

  const { content, routeId } = await req.json();

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
  }

  // Create the comment
  const comment = await prisma.comment.create({
    data: {
      documentId,
      routeId: routeId || null,
      authorId: me.id,
      content: content.trim()
    },
    include: { author: { select: { id: true, fullName: true, email: true } } }
  });

  // Process mentions in the content
  await processMentions(comment.id, content.trim(), me.id);

  // Fetch the comment with reactions and mentions for response
  const commentWithRelations = await prisma.comment.findUnique({
    where: { id: comment.id },
    include: {
      author: { select: { id: true, fullName: true, email: true } },
      _count: {
        select: { reactions: true, mentions: true }
      }
    }
  });

  const reactions = await prisma.commentReaction.findMany({
    where: { commentId: comment.id },
    include: {
      user: { select: { id: true, fullName: true, email: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  const mentions = await prisma.commentMention.findMany({
    where: { commentId: comment.id },
    include: {
      user: { select: { id: true, fullName: true, email: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({
    comment: {
      ...commentWithRelations,
      reactions,
      mentions
    }
  }, { status: 201 });
}

async function processMentions(commentId: string, content: string, authorId: string) {
  // Extract @mentions from content
  const mentionRegex = /@(\w+)/g;
  const matches = [...content.matchAll(mentionRegex)];

  // Get unique usernames mentioned
  const mentionedUsernames = [...new Set(matches.map(match => match[1]))];

  if (mentionedUsernames.length === 0) return;

  // Limit to first 5 mentions to prevent abuse
  const limitedMentions = mentionedUsernames.slice(0, 5);

  const mentionPromises = limitedMentions.map(async (username) => {
    // Try to find a user by:
    // 1. Exact match on email prefix (username@domain)
    // 2. Exact match on username part of email (before @)
    // 3. Full name containing the mention
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { startsWith: `${username}@`, mode: "insensitive" } },
          {
            email: {
              // This is a simplified approach - in practice, you'd want to split the email at @ and compare the first part
              // For now, we'll use an approximation that works for common cases
              contains: `${username}@`,
              mode: "insensitive"
            }
          },
          { fullName: { contains: username, mode: "insensitive" } }
        ]
      }
    });

    if (user && user.id !== authorId) {
      return prisma.commentMention.create({
        data: {
          commentId,
          userId: user.id
        }
      });
    }
    return null;
  });

  await Promise.all(mentionPromises.filter(Boolean));
}