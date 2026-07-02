import { getCurrentUser } from "../../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS, ROUTE_STATUS_CONFIG, daysOpen, isOverdue, SLA_DAYS } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RefNumber } from "@/components/ui/ref-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { AlertTriangle, ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AdminRoutingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect("/dashboard");

  const { status } = await searchParams;
  const statusFilter = status && status !== "all" ? status : null;

  // Every currently-active route (one per document, since a document has
  // exactly one active hop at a time) — this is the live "where is
  // everything right now" view across the whole institution, distinct
  // from the Master Ledger's per-document summary table.
  const activeRoutes = await prisma.documentRoute.findMany({
    where: {
      status: statusFilter ? (statusFilter as "PENDING" | "OPENED") : { in: ["PENDING", "OPENED"] },
    },
    include: {
      document: { select: { id: true, referenceNumber: true, subject: true, senderName: true, status: true } },
      toDept: true,
      fromDept: true,
      assignedUser: { select: { fullName: true } },
    },
    orderBy: { receivedAt: "asc" },
  });

  const overdueCount = activeRoutes.filter((r) => isOverdue(r.receivedAt, r.status)).length;

  return (
    <>
      <Topbar
        title="Document Routing"
        subtitle="Live location and status of every active document, system-wide"
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {[
              { key: "all", label: "All active" },
              { key: "PENDING", label: "Pending" },
              { key: "OPENED", label: "Opened" },
            ].map((f) => (
              <Link
                key={f.key}
                href={f.key === "all" ? "/admin/routing" : `/admin/routing?status=${f.key}`}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium",
                  (statusFilter ?? "all") === f.key
                    ? "border-primary bg-accent text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {f.label}
              </Link>
            ))}
          </div>
          {overdueCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
              <AlertTriangle size={14} /> {overdueCount} overdue ({SLA_DAYS}+ days)
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Currently With</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Days Here</th>
              </tr>
            </thead>
            <tbody>
              {activeRoutes.map((r) => {
                const cfg = ROUTE_STATUS_CONFIG[r.status];
                const overdue = isOverdue(r.receivedAt, r.status);
                const currentHolder = r.toDept?.name ?? r.assignedUser?.fullName ?? "Unassigned";
                return (
                  <tr key={r.id} className={cn("border-b border-border last:border-0 hover:bg-background", overdue && "bg-destructive/5")}>
                    <td className="px-4 py-3">
                      <Link href={`/documents/${r.document.id}`}>
                        <RefNumber value={r.document.referenceNumber} />
                      </Link>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-foreground">{r.document.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {r.fromDept?.name ?? "Registry"}
                        <ArrowRight size={12} />
                        <MapPin size={12} className="text-primary" />
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{currentHolder}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={cfg.label} textClass={cfg.text} bgClass={cfg.bg} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={overdue ? "font-medium text-destructive" : "text-muted-foreground"}>
                        {daysOpen(r.receivedAt, null)} day(s){overdue && " ⚠"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {activeRoutes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Nothing currently active{statusFilter ? ` with status ${statusFilter}` : ""}.
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
