"use client";

import Link from "next/link";
import { LogOut, Menu, Bell } from "lucide-react";
import { signOutAction } from "@/app/(app)/actions";
import { useAppShell } from "./app-shell";
import { ModeToggle } from "@/components/mode-toggle";

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
  const { open, unreadCount } = useAppShell();

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={open}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden cursor-pointer"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="hidden text-sm text-muted-foreground sm:block">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell in Topbar */}
        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <ModeToggle />

        <div className="hidden text-right sm:block ml-1">
          <p className="text-sm font-medium text-foreground">{userName}</p>
          <p className="text-xs text-muted-foreground">{userRole}</p>
        </div>

        <form action={signOutAction}>
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}
