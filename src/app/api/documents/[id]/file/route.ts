import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (!me) return NextResponse.json({ error: "No profile found" }, { status: 403 });

  const document = await prisma.document.findUnique({
    where: { id },
    include: { routes: true },
  });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Access control: Registry/Admin can always view. A department user may
  // view only if their department appears somewhere in this document's
  // routing history (current or past hop) — never arbitrary documents.
  const isRegistryOrAdmin = me.role === "REGISTRY_STAFF" || me.role === "ADMIN";
  const hasRouteAccess = document.routes.some((r) => r.toDeptId === me.departmentId);
  if (!isRegistryOrAdmin && !hasRouteAccess) {
    return NextResponse.json({ error: "You don't have access to this document" }, { status: 403 });
  }

  const admin = createAdminClient();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documents";
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(document.scannedFilePath, 60 * 5);

  if (error || !data) {
    return NextResponse.json({ error: "Could not generate file link" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
