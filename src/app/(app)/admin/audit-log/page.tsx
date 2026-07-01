import { getCurrentUser } from "../../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RefNumber } from "@/components/ui/ref-number";
import Link from "next/link";
import { format } from "date-fns";

const EVENT_COLORS: Record<string, string> = {
  REGISTERED: "text-secondary",
  FORWARDED: "text-secondary",
  RETURNED: "text-warning",
  COMPLETED: "text-success",
  CORRECTED: "text-primary",
  ARCHIVED: "text-muted-foreground",
  UNARCHIVED: "text-muted-foreground",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect("/dashboard");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const PAGE_SIZE = 40;

  const [events, totalCount] = await Promise.all([
    prisma.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { document: { select: { id: true, referenceNumber: true, subject: true } } },
    }),
    prisma.auditEvent.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <>
      <Topbar
        title="Audit Log"
        subtitle="Full history of every action across every document"
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{format(new Date(ev.createdAt), "PP p")}</td>
                  <td className="px-4 py-3">
                    <Link href={`/documents/${ev.document.id}`}>
                      <RefNumber value={ev.document.referenceNumber} />
                    </Link>
                  </td>
                  <td className={`px-4 py-3 font-medium ${EVENT_COLORS[ev.event] ?? "text-foreground"}`}>
                    {ev.event.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-foreground">{ev.actorName}</td>
                  <td className="max-w-md truncate px-4 py-3 text-muted-foreground">{ev.detail}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No activity yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <p>Page {page} of {totalPages} ({totalCount} events)</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/audit-log?page=${page - 1}`} className="rounded-md border border-border px-3 py-1.5 hover:bg-background">
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/audit-log?page=${page + 1}`} className="rounded-md border border-border px-3 py-1.5 hover:bg-background">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
