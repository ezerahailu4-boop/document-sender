import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  // Analytics can be sent anonymously, but we'll try to get the user if available
  let userId = null;
  if (authUser) {
    const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
    userId = me ? me.id : null;
  }

  const { documentId, eventType, eventData } = await req.json();

  try {
    await prisma.analyticsEvent.create({
      data: {
        documentId: documentId || null,
        userId: userId,
        eventType,
        eventData: eventData ? typeof eventData === "string" ? eventData : JSON.stringify(eventData) : null
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to create analytics event:", error);
    // Don't fail the request if analytics fails
    return NextResponse.json({ success: true }); // Always return success to not disrupt user experience
  }
}