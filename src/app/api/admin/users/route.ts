import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me || me.role !== "ADMIN") return null;
  return me;
}

export async function GET() {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await prisma.user.findMany({
    include: { department: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { fullName, email, password, role, departmentId } = await req.json();
  if (!fullName || !email || !password || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if ((role === "DEPARTMENT_USER" || role === "DEPARTMENT_HEAD" || role === "GM") && !departmentId) {
    return NextResponse.json({ error: "Select a department for this role" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || "Could not create the account" }, { status: 400 });
  }

  try {
    const profile = await prisma.user.create({
      data: {
        authId: created.user.id,
        fullName,
        email,
        role,
        departmentId: departmentId || null,
      },
    });
    return NextResponse.json({ user: profile });
  } catch {
    // Roll back the auth user if the profile insert fails, so we never end
    // up with an orphaned login that can't reach the app.
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
  }
}
