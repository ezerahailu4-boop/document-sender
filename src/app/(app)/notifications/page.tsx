import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { NotificationsList } from "./notifications-list";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, channel: "IN_APP" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <>
      <Topbar title="Notifications" userName={user.fullName} userRole={ROLE_LABELS[user.role]} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          <NotificationsList
            initialNotifications={notifications.map((n) => ({
              id: n.id,
              title: n.title,
              body: n.body,
              createdAt: n.createdAt.toISOString(),
              readAt: n.readAt ? n.readAt.toISOString() : null,
            }))}
            hasUnread={hasUnread}
          />
        </div>
      </main>
    </>
  );
}
