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
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-2">
          {notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-rule bg-paper-raised py-16 text-center">
              <Bell className="mb-3 text-ink-soft" size={28} />
              <p className="text-sm text-ink-soft">No notifications yet.</p>
            </div>
          )}
          {notifications.map((n) => (
            <div key={n.id} className="rounded-lg border border-rule bg-paper-raised p-4 shadow-sm">
              <p className="text-sm font-medium text-ink">{n.title}</p>
              <p className="text-sm text-ink-soft">{n.body}</p>
              <p className="mt-1 text-xs text-ink-soft">{format(new Date(n.createdAt), "PPp")}</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
