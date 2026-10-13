"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
  Loader2,
  Tag,
  ListFilter,
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
  { href: "/admin/tags", label: "Tags", icon: Tag },
  { href: "/admin/custom-fields", label: "Custom Fields", icon: ListFilter },
  { href: "/admin/audit-log", label: "Audit Log", icon: ClipboardList },
  { href: "/admin/saved-searches", label: "Saved Searches", icon: Share2 },
];

function NavLinks({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);

  const activeNavigatingHref = navigatingHref === pathname ? null : navigatingHref;

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      setTimeout(onNavigate, 120);
    }

    if (pathname === href) {
      e.preventDefault();
      return;
    }

    setNavigatingHref(href);

    setTimeout(() => {
      if (window.location.pathname !== href) {
        window.location.assign(href);
      }
    }, 2000);
  };

  return (
    <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
      {NAV.filter((item) => item.roles.includes(role)).map((item) => {
        const active = pathname?.startsWith(item.href);
        const isNavigating = activeNavigatingHref === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onClick={(e) => handleLinkClick(e, item.href)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
              active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              isNavigating && "opacity-80 font-semibold text-primary"
            )}
          >
            {isNavigating ? (
              <Loader2 size={18} className="animate-spin text-primary shrink-0" />
            ) : (
              <item.icon size={18} className="shrink-0" />
            )}
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}

      {role === "ADMIN" && (
        <>
          <p className="mt-5 mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin</p>
          {ADMIN_NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
            const isNavigating = activeNavigatingHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={(e) => handleLinkClick(e, item.href)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  isNavigating && "opacity-80 font-semibold text-primary"
                )}
              >
                {isNavigating ? (
                  <Loader2 size={18} className="animate-spin text-primary shrink-0" />
                ) : (
                  <item.icon size={18} className="shrink-0" />
                )}
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </>
      )}
    </nav>
  );
}

function SidebarFooter({ unreadCount, onNavigate }: { unreadCount: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);

  const activeNavigatingHref = navigatingHref === pathname ? null : navigatingHref;

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      setTimeout(onNavigate, 120);
    }

    if (pathname === href) {
      e.preventDefault();
      return;
    }

    setNavigatingHref(href);

    setTimeout(() => {
      if (window.location.pathname !== href) {
        window.location.assign(href);
      }
    }, 2000);
  };

  return (
    <div className="border-t border-border px-3 py-4 shrink-0">
      <Link
        href="/notifications"
        prefetch={false}
        onClick={(e) => handleLinkClick(e, "/notifications")}
        className={cn(
          "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors",
          activeNavigatingHref === "/notifications" && "opacity-80 text-primary"
        )}
      >
        <span className="flex items-center gap-3">
          {activeNavigatingHref === "/notifications" ? (
            <Loader2 size={18} className="animate-spin text-primary shrink-0" />
          ) : (
            <Bell size={18} className="shrink-0" />
          )}
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
        prefetch={false}
        onClick={(e) => handleLinkClick(e, "/settings")}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors",
          activeNavigatingHref === "/settings" && "opacity-80 text-primary"
        )}
      >
        {activeNavigatingHref === "/settings" ? (
          <Loader2 size={18} className="animate-spin text-primary shrink-0" />
        ) : (
          <Settings size={18} className="shrink-0" />
        )}
        Settings
      </Link>
    </div>
  );
}

function BrandHeader({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  const activeIsNavigating = isNavigating && pathname !== "/dashboard";

  const handleBrandClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClose) {
      setTimeout(onClose, 120);
    }

    if (pathname === "/dashboard") {
      e.preventDefault();
      return;
    }

    setIsNavigating(true);

    setTimeout(() => {
      if (window.location.pathname !== "/dashboard") {
        window.location.assign("/dashboard");
      }
    }, 2000);
  };

  return (
    <div className="flex h-16 items-center justify-between border-b border-border px-5 shrink-0">
      <Link
        href="/dashboard"
        prefetch={false}
        onClick={handleBrandClick}
        className="flex items-center gap-3 text-left group cursor-pointer"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card border border-border shadow-xs transition-transform group-hover:scale-105 shrink-0">
          {activeIsNavigating ? (
            <Loader2 size={24} className="animate-spin text-primary" />
          ) : (
            <TafLogo size={32} />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm tracking-tight truncate leading-tight group-hover:text-primary transition-colors">
            TAF Energies
          </p>
          <p className="text-xs text-muted-foreground tracking-wide uppercase font-mono">
            Doc Tracker
          </p>
        </div>
      </Link>

      {onClose && (
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

export function Sidebar({
  role,
  unreadCount,
}: {
  role: string;
  unreadCount: number;
}) {
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col border-r border-border bg-card shrink-0 h-screen sticky top-0">
      <BrandHeader />
      <NavLinks role={role} />
      <SidebarFooter unreadCount={unreadCount} />
    </aside>
  );
}

export function MobileSidebar({
  role,
  unreadCount,
  open,
  onClose,
}: {
  role: string;
  unreadCount: number;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close automatically only when the route actually changes
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  // Close on Escape key press
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-10 flex h-full w-[85vw] max-w-72 flex-col bg-card shadow-2xl overflow-hidden animate-in slide-in-from-left duration-200">
        <BrandHeader onClose={onClose} />
        <NavLinks role={role} onNavigate={onClose} />
        <SidebarFooter unreadCount={unreadCount} onNavigate={onClose} />
      </aside>
    </div>
  );
}
