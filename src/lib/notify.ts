import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Notifies every active user in `toDept` that a document has landed in
 * their inbox — both in-app (always) and email (best-effort; failures are
 * logged on the Notification row but never throw, so a broken mail
 * provider can't block document routing).
 */
export async function notifyRoute(
  routeId: string,
  referenceNumber: string,
  subject: string,
  deptName: string
) {
  const route = await prisma.documentRoute.findUnique({
    where: { id: routeId },
    include: { toDept: { include: { users: true } } },
  });
  if (!route) return;

  const recipients = route.toDept.users.filter((u) => u.isActive);
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
          from: process.env.EMAIL_FROM || "DocTrack <noreply@example.com>",
          to: recipient.email,
          subject: title,
          text: `${body}\n\nOpen DocTrack to view: ${process.env.NEXT_PUBLIC_APP_URL}/inbox`,
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
