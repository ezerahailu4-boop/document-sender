import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS, isOverdue, SLA_DAYS } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SearchBar } from "./search-bar";
import { ArchiveToggle } from "./archive-toggle";
import { LedgerTable } from "./ledger-table";
import Link from "next/link";
import { FileStack, Clock, CheckCircle2, Inbox, AlertTriangle, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Prisma, DocumentStatus } from "@prisma/client";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; archived?: string; status?: string; dept?: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "REGISTRY_STAFF" && user.role !== "ADMIN") redirect("/inbox");

  const { q, page: pageParam, archived, status: statusParam, dept: deptParam } = await searchParams;
  const query = (q ?? "").trim();
  const showArchived = archived === "1" || statusParam === "ARCHIVED";
  const page = Math.max(1, Number(pageParam) || 1);
  const PAGE_SIZE = 25;

  const statusFilter = statusParam && statusParam !== "ALL" ? (statusParam as DocumentStatus) : undefined;
  const deptFilter = deptParam && deptParam !== "ALL" ? deptParam : undefined;

  const where: Prisma.DocumentWhereInput = {
    ...(statusFilter
      ? { status: statusFilter }
      : showArchived
      ? {}
      : { status: { not: "ARCHIVED" } }),
    ...(deptFilter ? { routes: { some: { toDeptId: deptFilter } } } : {}),
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

  const [documents, totalCount, counts, departments, tags] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        routes: {
          orderBy: { sequence: "desc" },
          take: 1,
          include: { toDept: true, assignedUser: true },
        },
      },
    }),
    prisma.document.count({ where }),
    prisma.document.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  const countFor = (s: string) => counts.find((c) => c.status === s)?._count.status ?? 0;
  const totalActive = counts.filter((c) => c.status !== "ARCHIVED").reduce((sum, c) => sum + c._count.status, 0);

  const overdueCandidates = await prisma.documentRoute.findMany({
    where: { status: { in: ["PENDING", "OPENED"] } },
    select: { receivedAt: true, status: true },
  });
  const overdueCount = overdueCandidates.filter((r) => isOverdue(r.receivedAt, r.status)).length;

  const stats = [
    { label: "Active Documents", value: totalActive, icon: FileStack, color: "text-secondary" },
    { label: "Pending", value: countFor("PENDING"), icon: Inbox, color: "text-warning" },
    { label: "In Progress", value: countFor("IN_PROGRESS"), icon: Clock, color: "text-secondary" },
    { label: "Completed", value: countFor("COMPLETED"), icon: CheckCircle2, color: "text-success" },
  ];

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const exportParams = new URLSearchParams({
    ...(query ? { q: query } : {}),
    ...(showArchived ? { archived: "1" } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(deptFilter ? { dept: deptFilter } : {}),
  });

  function pageHref(p: number) {
    const params = new URLSearchParams({
      ...(query ? { q: query } : {}),
      ...(showArchived ? { archived: "1" } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(deptFilter ? { dept: deptFilter } : {}),
      page: String(p),
    });
    return `/dashboard?${params.toString()}`;
  }

  const tableDocuments = documents.map((doc) => {
    const currentRoute = doc.routes[0];
    const currentDeptName = currentRoute?.toDept?.name ?? currentRoute?.assignedUser?.fullName ?? "—";
    const overdue = currentRoute ? isOverdue(currentRoute.receivedAt, currentRoute.status) : false;
    return {
      id: doc.id,
      referenceNumber: doc.referenceNumber,
      senderName: doc.senderName,
      senderOrg: doc.senderOrg,
      subject: doc.subject,
      receivedDate: doc.receivedDate.toISOString(),
      completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
      status: doc.status,
      currentDept: currentDeptName,
      isOverdue: overdue,
    };
  });

  return (
    <>
      <Topbar
        title="Master Ledger"
        subtitle="Real-time location, bulk operations, and audit tracking across all documents"
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className={s.color} size={18} />
              </div>
              <p className="text-2xl font-semibold text-foreground">{s.value}</p>
            </div>
          ))}
          <div
            className={cn(
              "rounded-lg border p-4 shadow-sm",
              overdueCount > 0 ? "border-destructive/30 bg-destructive/10" : "border-border bg-card"
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className={cn("text-sm", overdueCount > 0 ? "text-destructive" : "text-muted-foreground")}>
                Overdue ({SLA_DAYS}+ days)
              </p>
              <AlertTriangle className={overdueCount > 0 ? "text-destructive" : "text-muted-foreground"} size={18} />
            </div>
            <p className={cn("text-2xl font-semibold", overdueCount > 0 ? "text-destructive" : "text-foreground")}>
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
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-muted-foreground hover:bg-background"
            >
              <Download size={14} /> Export CSV
            </a>
          </div>
        </div>

        <LedgerTable
          documents={tableDocuments}
          departments={departments}
          tags={tags}
          totalCount={totalCount}
        />

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Page {page} of {totalPages} ({totalCount} document{totalCount === 1 ? "" : "s"})
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="rounded-md border border-border px-3 py-1.5 hover:bg-background">
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={pageHref(page + 1)} className="rounded-md border border-border px-3 py-1.5 hover:bg-background">
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
