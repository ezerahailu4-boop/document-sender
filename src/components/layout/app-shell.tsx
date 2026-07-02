"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { Sidebar, MobileSidebar } from "./sidebar";

const MobileNavContext = createContext<{ open: () => void } | null>(null);

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error("useMobileNav must be used within AppShell");
  return ctx;
}

// Notified components (e.g. the notifications page, after marking things
// read) can call this to force an immediate badge refresh instead of
// waiting for the next poll tick.
const listeners = new Set<() => void>();
export function refreshUnreadCount() {
  listeners.forEach((fn) => fn());
}

const POLL_INTERVAL_MS = 30_000;

export function AppShell({
  role,
  unreadCount: initialUnreadCount,
  children,
}: {
  role: string;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.count === "number") setUnreadCount(data.count);
      } catch {
        // Silent — a failed poll just means the badge stays at its last
        // known value until the next successful tick.
      }
    }

    listeners.add(fetchCount);
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      listeners.delete(fetchCount);
      clearInterval(interval);
    };
  }, []);

  return (
    <MobileNavContext.Provider value={{ open: () => setMobileOpen(true) }}>
      <div className="flex min-h-screen bg-background">
        <Sidebar role={role} unreadCount={unreadCount} />
        <MobileSidebar role={role} unreadCount={unreadCount} open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </MobileNavContext.Provider>
  );
}
