import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "./actions";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, channel: "IN_APP", readAt: null },
  });

  return (
    <AppShell role={user.role} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
