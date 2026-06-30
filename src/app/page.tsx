import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!profile) redirect("/login?error=no-profile");

  if (profile.role === "REGISTRY_STAFF" || profile.role === "ADMIN") {
    redirect("/dashboard");
  }
  redirect("/inbox");
}
