"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  FilePlus2,
  Bell,
  Settings,
  Stamp,
  Building2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Master Ledger", icon: LayoutDashboard, roles: ["REGISTRY_STAFF", "ADMIN"] },
  { href: "/register", label: "Register Document", icon: FilePlus2, roles: ["REGISTRY_STAFF", "ADMIN"] },
  { href: "/inbox", label: "Inbox", icon: Inbox, roles: ["GM", "DEPARTMENT_USER", "DEPARTMENT_HEAD", "ADMIN"] },
];

const ADMIN_NAV = [
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-rule bg-paper-raised md:flex">
      <div className="flex items-center gap-2 border-b border-rule px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-stamp text-white">
          <Stamp size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-ink">DocTrack</p>
          <p className="text-xs text-ink-soft">Registry & Workflow</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.filter((item) => item.roles.includes(role)).map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-stamp-soft text-stamp" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}

        {role === "ADMIN" && (
          <>
            <p className="mt-5 mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Admin</p>
            {ADMIN_NAV.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-stamp-soft text-stamp" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t border-rule px-3 py-4">
        <Link
          href="/notifications"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink"
        >
          <Bell size={18} />
          Notifications
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink"
        >
          <Settings size={18} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
