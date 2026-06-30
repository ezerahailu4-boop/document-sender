import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS, DOCUMENT_STATUS_CONFIG, daysOpen } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RefNumber } from "@/components/ui/ref-number";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { FileStack, Clock, CheckCircle2, Inbox } from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (user.role !== "REGISTRY_STAFF" && user.role !== "ADMIN") redirect("/inbox");

  const [documents, counts] = await Promise.all([
    prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        routes: {
          orderBy: { sequence: "desc" },
          take: 1,
          include: { toDept: true },
        },
      },
    }),
    prisma.document.groupBy({ by: ["status"], _count: { status: true } }),
  ]);

  const countFor = (s: string) => counts.find((c) => c.status === s)?._count.status ?? 0;

  const stats = [
    { label: "Total Documents", value: documents.length, icon: FileStack, color: "text-navy" },
    { label: "Pending", value: countFor("PENDING"), icon: Inbox, color: "text-status-pending" },
    { label: "In Progress", value: countFor("IN_PROGRESS"), icon: Clock, color: "text-status-progress" },
    { label: "Completed", value: countFor("COMPLETED"), icon: CheckCircle2, color: "text-status-completed" },
  ];

  return (
    <>
      <Topbar
        title="Master Ledger"
        subtitle="Real-time location and status of every registered document"
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-rule bg-paper-raised p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-ink-soft">{s.label}</p>
                <s.icon className={s.color} size={18} />
              </div>
              <p className="text-2xl font-semibold text-ink">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border border-rule bg-paper-raised shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule bg-paper text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">Reference No.</th>
                <th className="px-4 py-3 font-medium">Sender</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Currently At</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Days Open</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const cfg = DOCUMENT_STATUS_CONFIG[doc.status];
                const currentDept = doc.routes[0]?.toDept.name ?? "—";
                return (
                  <tr key={doc.id} className="border-b border-rule last:border-0 hover:bg-paper">
                    <td className="px-4 py-3">
                      <Link href={`/documents/${doc.id}`}>
                        <RefNumber value={doc.referenceNumber} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink">{doc.senderName}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-ink-soft">{doc.subject}</td>
                    <td className="px-4 py-3 text-ink">{currentDept}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={cfg.label} textClass={cfg.text} bgClass={cfg.bg} />
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {daysOpen(doc.receivedDate, doc.completedAt)} day(s)
                    </td>
                  </tr>
                );
              })}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">
                    No documents registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
