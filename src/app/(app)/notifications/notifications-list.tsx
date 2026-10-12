"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Bell, Check, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { refreshUnreadCount } from "@/components/layout/app-shell";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  documentId?: string | null;
};

export function NotificationsList({
  initialNotifications,
  hasUnread,
}: {
  initialNotifications: NotificationItem[];
  hasUnread: boolean;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);

  useEffect(() => {
    if (!hasUnread) return;
    const timer = setTimeout(async () => {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
      );
      refreshUnreadCount();
    }, 1200);
    return () => clearTimeout(timer);
  }, [hasUnread]);

  async function markOneRead(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    refreshUnreadCount();
  }

  // Extract reference number from title or body (e.g., TAF/IN/2026/001)
  function getDocLink(n: NotificationItem) {
    if (n.documentId) return `/documents/${n.documentId}`;
    const refMatch = (n.title + " " + n.body).match(/TAF\/[A-Z0-9\/_-]+/i);
    if (refMatch) return `/find?query=${encodeURIComponent(refMatch[0])}`;
    return "/inbox";
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16 text-center">
        <Bell className="mb-3 text-muted-foreground" size={28} />
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {notifications.map((n) => {
        const unread = !n.readAt;
        const linkHref = getDocLink(n);

        return (
          <div
            key={n.id}
            className={cn(
              "group relative flex items-start justify-between gap-3 rounded-lg border p-4 shadow-sm transition-all hover:border-primary/50",
              unread ? "border-primary/40 bg-accent/40" : "border-border bg-card"
            )}
          >
            <Link href={linkHref} className="min-w-0 flex-1 block">
              <div className="mb-1 flex items-center gap-2">
                {unread ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                ) : (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/30" />
                )}
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {n.title}
                </p>
                <ArrowRight
                  size={12}
                  className="opacity-0 group-hover:opacity-100 text-primary transition-opacity"
                />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 pl-4">{n.body}</p>
              <div className="mt-2 flex items-center gap-3 pl-4 text-[11px] text-muted-foreground">
                <span>{format(new Date(n.createdAt), "PPp")}</span>
                <span>•</span>
                <span className="text-primary hover:underline inline-flex items-center gap-0.5">
                  View Document <ExternalLink size={10} />
                </span>
              </div>
            </Link>

            {unread && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => markOneRead(n.id, e)}
                title="Mark as read"
                className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Check size={14} />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
