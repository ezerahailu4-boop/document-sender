import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    // Return a default user for development/testing
    return NextResponse.json({
      id: "dev-user",
      fullName: "Dev User",
      email: "dev@example.com"
    });
  }

  const me = await prisma.user.findUnique({
    where: { authId: authUser.id },
    select: {
      id: true,
      fullName: true,
      email: true
    }
  });

  if (!me) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  return NextResponse.json(me);
}