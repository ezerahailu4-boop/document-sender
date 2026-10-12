"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { Sidebar, MobileSidebar } from "./sidebar";

interface AppShellContextType {
  open: () => void;
  unreadCount: number;
}

const AppShellContext = createContext<AppShellContextType | null>(null);

export function useMobileNav() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error("useMobileNav must be used within AppShell");
  return ctx;
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error("useAppShell must be used within AppShell");
  return ctx;
}

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
        // Silent poll
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
    <AppShellContext.Provider value={{ open: () => setMobileOpen(true), unreadCount }}>
      <div className="flex min-h-screen bg-background">
        <Sidebar role={role} unreadCount={unreadCount} />
        <MobileSidebar
          role={role}
          unreadCount={unreadCount}
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </AppShellContext.Provider>
  );
}
