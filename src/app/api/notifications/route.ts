import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) return NextResponse.json({ error: "No profile found" }, { status: 403 });

  const { notificationId, all } = await req.json().catch(() => ({}));

  if (all) {
    await prisma.notification.updateMany({
      where: { userId: me.id, channel: "IN_APP", readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (!notificationId) {
    return NextResponse.json({ error: "notificationId or all is required" }, { status: 400 });
  }

  // Scope the update to the current user so nobody can mark someone
  // else's notification as read by guessing an id.
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: me.id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
