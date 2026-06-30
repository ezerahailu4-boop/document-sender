"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Resolves the signed-in Supabase auth user to our app-level User profile
 * (role, department). Redirects to /login if there's no session, and
 * throws a clear error if auth succeeded but no profile row exists yet
 * (e.g. an Admin hasn't provisioned them) rather than silently 500-ing.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await prisma.user.findUnique({
    where: { authId: user.id },
    include: { department: true },
  });

  if (!profile) {
    redirect("/login?error=no-profile");
  }

  if (!profile.isActive) {
    redirect("/login?error=inactive");
  }

  return profile;
}
