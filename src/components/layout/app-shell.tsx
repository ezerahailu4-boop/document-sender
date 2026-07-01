"use client";

import { useState, createContext, useContext } from "react";
import { Sidebar, MobileSidebar } from "./sidebar";

const MobileNavContext = createContext<{ open: () => void } | null>(null);

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error("useMobileNav must be used within AppShell");
  return ctx;
}

export function AppShell({
  role,
  unreadCount,
  children,
}: {
  role: string;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
