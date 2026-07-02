"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { refreshUnreadCount } from "@/components/layout/app-shell";

type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export function NotificationsList({
  initialNotifications,
  hasUnread,
}: {
  initialNotifications: Notification[];
  hasUnread: boolean;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);

  // Mark everything read shortly after the page is actually viewed — a
  // short delay so a person just glancing at the sidebar and clicking
  // away doesn't lose the unread marker before they've actually read
  // anything.
  useEffect(() => {
    if (!hasUnread) return;
    const timer = setTimeout(async () => {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      refreshUnreadCount();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 1200);
    return () => clearTimeout(timer);
  }, [hasUnread]);

  async function markOneRead(id: string) {
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

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16 text-center">
        <Bell className="mb-3 text-muted-foreground" size={28} />
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((n) => {
        const unread = !n.readAt;
        return (
          <div
            key={n.id}
            className={cn(
              "flex items-start justify-between gap-3 rounded-lg border p-4 shadow-sm",
              unread ? "border-primary/40 bg-accent" : "border-border bg-card"
            )}
          >
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-2">
                {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                <p className="text-sm font-medium text-foreground">{n.title}</p>
              </div>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{format(new Date(n.createdAt), "PPp")}</p>
            </div>
            {unread && (
              <Button size="sm" variant="ghost" onClick={() => markOneRead(n.id)} title="Mark as read">
                <Check size={14} />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
