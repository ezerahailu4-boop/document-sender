import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Bell } from "lucide-react";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, channel: "IN_APP" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <Topbar title="Notifications" userName={user.fullName} userRole={ROLE_LABELS[user.role]} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-2">
          {notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16 text-center">
              <Bell className="mb-3 text-muted-foreground" size={28} />
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            </div>
          )}
          {notifications.map((n) => (
            <div key={n.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <p className="text-sm font-medium text-foreground">{n.title}</p>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{format(new Date(n.createdAt), "PPp")}</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
