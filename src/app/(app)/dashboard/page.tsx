import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS, DOCUMENT_STATUS_CONFIG, daysOpen, isOverdue, SLA_DAYS } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RefNumber } from "@/components/ui/ref-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchBar } from "./search-bar";
import { ArchiveToggle } from "./archive-toggle";
import { DocumentRowActions } from "./document-row-actions";
import Link from "next/link";
import { FileStack, Clock, CheckCircle2, Inbox, AlertTriangle, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; archived?: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "REGISTRY_STAFF" && user.role !== "ADMIN") redirect("/inbox");

  const { q, page: pageParam, archived } = await searchParams;
  const query = (q ?? "").trim();
  const showArchived = archived === "1";
  const page = Math.max(1, Number(pageParam) || 1);
  const PAGE_SIZE = 25;

  const where: Prisma.DocumentWhereInput = {
    ...(showArchived ? {} : { status: { not: "ARCHIVED" } }),
    ...(query
      ? {
          OR: [
            { referenceNumber: { contains: query, mode: "insensitive" } },
            { senderName: { contains: query, mode: "insensitive" } },
            { senderOrg: { contains: query, mode: "insensitive" } },
            { subject: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [documents, totalCount, counts] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        routes: {
          orderBy: { sequence: "desc" },
          take: 1,
          include: { toDept: true },
        },
      },
    }),
    prisma.document.count({ where }),
    prisma.document.groupBy({ by: ["status"], _count: { status: true } }),
  ]);

  const countFor = (s: string) => counts.find((c) => c.status === s)?._count.status ?? 0;
  const totalActive = counts.filter((c) => c.status !== "ARCHIVED").reduce((sum, c) => sum + c._count.status, 0);

  const overdueCandidates = await prisma.documentRoute.findMany({
    where: { status: { in: ["PENDING", "OPENED"] } },
    select: { receivedAt: true, status: true },
  });
  const overdueCount = overdueCandidates.filter((r) => isOverdue(r.receivedAt, r.status)).length;

  const stats = [
    { label: "Active Documents", value: totalActive, icon: FileStack, color: "text-navy" },
    { label: "Pending", value: countFor("PENDING"), icon: Inbox, color: "text-status-pending" },
    { label: "In Progress", value: countFor("IN_PROGRESS"), icon: Clock, color: "text-status-progress" },
    { label: "Completed", value: countFor("COMPLETED"), icon: CheckCircle2, color: "text-status-completed" },
  ];

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const exportParams = new URLSearchParams({
    ...(query ? { q: query } : {}),
    ...(showArchived ? { archived: "1" } : {}),
  });

  function pageHref(p: number) {
    const params = new URLSearchParams({
      ...(query ? { q: query } : {}),
      ...(showArchived ? { archived: "1" } : {}),
      page: String(p),
    });
    return `/dashboard?${params.toString()}`;
  }

  return (
    <>
      <Topbar
        title="Master Ledger"
        subtitle="Real-time location and status of every registered document"
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-rule bg-paper-raised p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-ink-soft">{s.label}</p>
                <s.icon className={s.color} size={18} />
              </div>
              <p className="text-2xl font-semibold text-ink">{s.value}</p>
            </div>
          ))}
          <div className={cn(
            "rounded-lg border p-4 shadow-sm",
            overdueCount > 0 ? "border-red-200 bg-red-50" : "border-rule bg-paper-raised"
          )}>
            <div className="mb-2 flex items-center justify-between">
              <p className={cn("text-sm", overdueCount > 0 ? "text-red-700" : "text-ink-soft")}>
                Overdue ({SLA_DAYS}+ days)
              </p>
              <AlertTriangle className={overdueCount > 0 ? "text-red-600" : "text-ink-soft"} size={18} />
            </div>
            <p className={cn("text-2xl font-semibold", overdueCount > 0 ? "text-red-700" : "text-ink")}>
              {overdueCount}
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBar defaultValue={query} />
          <div className="flex items-center gap-3">
            <ArchiveToggle showArchived={showArchived} />
            <a
              href={`/api/documents/export?${exportParams.toString()}`}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-rule bg-paper-raised px-3 text-sm font-medium text-ink-soft hover:bg-paper"
            >
              <Download size={14} /> Export CSV
            </a>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-rule bg-paper-raised shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule bg-paper text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">Reference No.</th>
                <th className="px-4 py-3 font-medium">Sender</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Currently At</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Days Open</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const cfg = DOCUMENT_STATUS_CONFIG[doc.status];
                const currentRoute = doc.routes[0];
                const currentDept = currentRoute?.toDept.name ?? "—";
                const overdue = currentRoute ? isOverdue(currentRoute.receivedAt, currentRoute.status) : false;
                return (
                  <tr key={doc.id} className={cn("border-b border-rule last:border-0 hover:bg-paper", overdue && "bg-red-50/60")}>
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
                    <td className="px-4 py-3">
                      <span className={overdue ? "font-medium text-red-700" : "text-ink-soft"}>
                        {daysOpen(doc.receivedDate, doc.completedAt)} day(s)
                        {overdue && " ⚠"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DocumentRowActions documentId={doc.id} status={doc.status} />
                    </td>
                  </tr>
                );
              })}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink-soft">
                    {query ? `No documents match "${query}".` : "No documents registered yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
            <p>Page {page} of {totalPages} ({totalCount} document{totalCount === 1 ? "" : "s"})</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="rounded-md border border-rule px-3 py-1.5 hover:bg-paper">
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={pageHref(page + 1)} className="rounded-md border border-rule px-3 py-1.5 hover:bg-paper">
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
