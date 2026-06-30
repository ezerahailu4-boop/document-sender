"use client";

import { LogOut, Menu } from "lucide-react";
import { signOutAction } from "@/app/(app)/actions";
import { useMobileNav } from "./app-shell";

export function Topbar({
  title,
  subtitle,
  userName,
  userRole,
}: {
  title: string;
  subtitle?: string;
  userName: string;
  userRole: string;
}) {
  const { open } = useMobileNav();

  return (
    <header className="flex items-center justify-between border-b border-rule bg-paper-raised px-4 py-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={open}
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-ink/5 hover:text-ink md:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-ink">{title}</h1>
          {subtitle && <p className="hidden text-sm text-ink-soft sm:block">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-ink">{userName}</p>
          <p className="text-xs text-ink-soft">{userRole}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-ink/5 hover:text-ink"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}
