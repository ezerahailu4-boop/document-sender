import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Notifies recipients that a document has landed in their inbox — both
 * in-app (always) and email (best-effort; failures are logged on the
 * Notification row but never throw, so a broken mail provider can't
 * block document routing).
 *
 * If `targetUserId` is provided, only that specific user is notified
 * (used when a sender/GM explicitly picks a person, not just a
 * department) — this also covers routes with no department at all
 * (routed straight to a departmentless user's personal inbox).
 * Otherwise every active user in `toDept` is notified.
 */
export async function notifyRoute(
  routeId: string,
  referenceNumber: string,
  subject: string,
  deptName: string,
  targetUserId?: string | null
) {
  const route = await prisma.documentRoute.findUnique({
    where: { id: routeId },
    include: { toDept: { include: { users: true } }, assignedUser: true },
  });
  if (!route) return;

  let recipients: { id: string; email: string; isActive: boolean }[] = [];
  if (targetUserId) {
    // Prefer the route's own department roster when available (covers the
    // normal case), but fall back to the assigned user directly — this is
    // the only source of truth when toDept is null.
    const fromDept = route.toDept?.users.find((u) => u.isActive && u.id === targetUserId);
    if (fromDept) {
      recipients = [fromDept];
    } else if (route.assignedUser?.isActive && route.assignedUser.id === targetUserId) {
      recipients = [route.assignedUser];
    }
  } else if (route.toDept) {
    recipients = route.toDept.users.filter((u) => u.isActive);
  }

  const title = `New document: ${referenceNumber}`;
  const body = `"${subject}" has been routed to ${deptName}. Reference: ${referenceNumber}.`;

  for (const recipient of recipients) {
    const inApp = await prisma.notification.create({
      data: { userId: recipient.id, routeId, channel: "IN_APP", status: "SENT", title, body },
    });

    const emailNotif = await prisma.notification.create({
      data: { userId: recipient.id, routeId, channel: "EMAIL", status: "PENDING", title, body },
    });

    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "TAF Energies Doc Tracker <noreply@example.com>",
          to: recipient.email,
          subject: title,
          text: `${body}\n\nOpen the Doc Tracker to view: ${process.env.NEXT_PUBLIC_APP_URL}/inbox`,
        });
        await prisma.notification.update({ where: { id: emailNotif.id }, data: { status: "SENT" } });
      } catch {
        await prisma.notification.update({ where: { id: emailNotif.id }, data: { status: "FAILED" } });
      }
    } else {
      await prisma.notification.update({ where: { id: emailNotif.id }, data: { status: "FAILED" } });
    }

    void inApp;
  }
}
