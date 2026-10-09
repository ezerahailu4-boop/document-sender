"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Inbox,
  FilePlus2,
  Bell,
  Settings,
  Building2,
  Users,
  ClipboardList,
  Search,
  Crown,
  MapPin,
  BarChart3,
  X,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TafLogo } from "@/components/logo";

const NAV = [
  { href: "/dashboard", label: "Master Ledger", icon: LayoutDashboard, roles: ["REGISTRY_STAFF", "ADMIN"] },
  { href: "/register", label: "Register Document", icon: FilePlus2, roles: ["REGISTRY_STAFF", "GM", "DEPARTMENT_USER", "DEPARTMENT_HEAD", "ADMIN"] },
  { href: "/gm", label: "GM's Office", icon: Crown, roles: ["GM", "ADMIN"] },
  { href: "/inbox", label: "Inbox", icon: Inbox, roles: ["REGISTRY_STAFF", "GM", "DEPARTMENT_USER", "DEPARTMENT_HEAD", "ADMIN"] },
  { href: "/find", label: "Find Document", icon: Search, roles: ["REGISTRY_STAFF", "GM", "DEPARTMENT_USER", "DEPARTMENT_HEAD", "ADMIN"] },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/routing", label: "Document Routing", icon: MapPin },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit-log", label: "Audit Log", icon: ClipboardList },
  { href: "/admin/saved-searches", label: "Saved Searches", icon: Share2 },
];

function NavLinks({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
  const pathname = usePathname();

  const handleLinkClick = () => {
    if (onNavigate) {
      setTimeout(onNavigate, 120);
    }
  };

  return (
    <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
      {NAV.filter((item) => item.roles.includes(role)).map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        );
      })}

      {role === "ADMIN" && (
        <>
          <p className="mt-5 mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin</p>
          {ADMIN_NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
  );
}

function SidebarFooter({ unreadCount, onNavigate }: { unreadCount: number; onNavigate?: () => void }) {
  const handleLinkClick = () => {
    if (onNavigate) {
      setTimeout(onNavigate, 120);
    }
  };

  return (
    <div className="border-t border-border px-3 py-4 shrink-0">
      <Link
        href="/notifications"
        onClick={handleLinkClick}
        className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <span className="flex items-center gap-3">
          <Bell size={18} />
          Notifications
        </span>
        {unreadCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
      <Link
        href="/settings"
        onClick={handleLinkClick}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Settings size={18} />
        Settings
      </Link>
    </div>
  );
}

function BrandHeader({ onClose }: { onClose?: () => void }) {
  const handleBrandClick = () => {
    if (onClose) {
      setTimeout(onClose, 120);
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-5 shrink-0">
      <Link
        href="/dashboard"
        onClick={handleBrandClick}
        className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
      >
        <div className="flex h-9 w-9 items-center justify-center">
          <TafLogo size={36} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-foreground">TAF Energies</p>
          <p className="text-xs text-muted-foreground">Doc Tracker</p>
        </div>
      </Link>
      {onClose && (
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground md:hidden" aria-label="Close menu">
          <X size={20} />
        </button>
      )}
    </div>
  );
}

// Desktop: fixed sidebar, always visible at md+.
export function Sidebar({ role, unreadCount = 0 }: { role: string; unreadCount?: number }) {
  return (
    <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex sticky top-0 h-screen overflow-hidden shrink-0">
      <BrandHeader />
      <NavLinks role={role} />
      <SidebarFooter unreadCount={unreadCount} />
    </aside>
  );
}

// Mobile: slide-over drawer triggered by the Topbar's menu button.
export function MobileSidebar({
  role,
  unreadCount = 0,
  open,
  onClose,
}: {
  role: string;
  unreadCount?: number;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close automatically on route change
  useEffect(() => {
    if (open) {
      onClose();
    }
  }, [pathname]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-10 flex h-full w-[85vw] max-w-72 flex-col bg-card shadow-2xl overflow-hidden">
        <BrandHeader onClose={onClose} />
        <NavLinks role={role} onNavigate={onClose} />
        <SidebarFooter unreadCount={unreadCount} onNavigate={onClose} />
      </aside>
    </div>
  );
}
