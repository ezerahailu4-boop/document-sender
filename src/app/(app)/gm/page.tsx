import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS, ROUTE_STATUS_CONFIG, daysOpen, isOverdue, SLA_DAYS } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RefNumber } from "@/components/ui/ref-number";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import {
  Crown,
  Inbox as InboxIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileStack,
} from "lucide-react";

export default async function GmOfficePage() {
  const user = await getCurrentUser();
  const allowed = ["GM", "ADMIN"];
  if (!allowed.includes(user.role)) redirect("/dashboard");

  // The GM's department is whichever one is flagged isGmOffice — resolved
  // dynamically, same as the auto-routing logic, so this stays correct if
  // an Admin ever reassigns which department holds that flag.
  const gmDept = await prisma.department.findFirst({ where: { isGmOffice: true } });
  if (!gmDept) redirect("/dashboard");

  const [pendingRoutes, allRoutesEver, recentHistory] = await Promise.all([
    prisma.documentRoute.findMany({
      where: { toDeptId: gmDept.id, status: { in: ["PENDING", "OPENED"] } },
      include: { document: true, fromDept: true },
      orderBy: { receivedAt: "asc" },
    }),
    prisma.documentRoute.findMany({
      where: { toDeptId: gmDept.id },
      select: { status: true, receivedAt: true, completedAt: true },
    }),
    prisma.documentRoute.findMany({
      where: { toDeptId: gmDept.id },
      orderBy: { receivedAt: "desc" },
      take: 15,
      include: { document: true, fromDept: true },
    }),
  ]);

  const totalEverHandled = allRoutesEver.length;
  const completedCount = allRoutesEver.filter((r) => r.status === "COMPLETED").length;
  const forwardedCount = allRoutesEver.filter((r) => r.status === "FORWARDED").length;
  const overdueCount = pendingRoutes.filter((r) => isOverdue(r.receivedAt, r.status)).length;

  const avgDaysHandled = (() => {
    const done = allRoutesEver.filter((r) => r.completedAt);
    if (done.length === 0) return null;
    const totalDays = done.reduce((sum, r) => sum + daysOpen(r.receivedAt, r.completedAt), 0);
    return (totalDays / done.length).toFixed(1);
  })();

  const stats = [
    { label: "Total Ever Handled", value: totalEverHandled, icon: FileStack, color: "text-secondary" },
    { label: "Currently Waiting", value: pendingRoutes.length, icon: InboxIcon, color: "text-warning" },
    { label: "Forwarded On", value: forwardedCount, icon: Clock, color: "text-secondary" },
    { label: "Completed Here", value: completedCount, icon: CheckCircle2, color: "text-success" },
  ];

  return (
    <>
      <Topbar
        title="General Manager's Office"
        subtitle={`${gmDept.name} — overview and history`}
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className={s.color} size={18} />
              </div>
              <p className="text-2xl font-semibold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Crown size={16} className="text-primary" /> Average time to act
            </div>
            <p className="text-xl font-semibold text-foreground">
              {avgDaysHandled ? `${avgDaysHandled} days` : "No completed items yet"}
            </p>
          </div>
          <div className={`rounded-lg border p-4 shadow-sm ${overdueCount > 0 ? "border-destructive/30 bg-destructive/10" : "border-border bg-card"}`}>
            <div className={`mb-1 flex items-center gap-2 text-sm ${overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              <AlertTriangle size={16} /> Overdue right now ({SLA_DAYS}+ days)
            </div>
            <p className={`text-xl font-semibold ${overdueCount > 0 ? "text-destructive" : "text-foreground"}`}>{overdueCount}</p>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Waiting for review</h2>
          <Link href="/inbox" className="text-xs text-primary hover:underline">Open full inbox →</Link>
        </div>
        <div className="mb-6 space-y-2">
          {pendingRoutes.length === 0 && (
            <p className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              Nothing waiting right now.
            </p>
          )}
          {pendingRoutes.slice(0, 5).map((r) => {
            const overdue = isOverdue(r.receivedAt, r.status);
            return (
              <Link
                key={r.id}
                href={`/documents/${r.documentId}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-sm hover:border-primary/40"
              >
                <div className="min-w-0">
                  <RefNumber value={r.document.referenceNumber} className="mb-1" />
                  <p className="truncate text-sm text-foreground">{r.document.subject}</p>
                </div>
                <span className={`ml-3 shrink-0 text-xs font-medium ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                  {daysOpen(r.receivedAt, null)}d{overdue ? " ⚠" : ""}
                </span>
              </Link>
            );
          })}
        </div>

        <h2 className="mb-2 text-sm font-semibold text-foreground">Recent history through this office</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentHistory.map((r) => {
                const cfg = ROUTE_STATUS_CONFIG[r.status];
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-background">
                    <td className="px-4 py-3">
                      <Link href={`/documents/${r.documentId}`}>
                        <RefNumber value={r.document.referenceNumber} />
                      </Link>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-foreground">{r.document.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.fromDept?.name ?? "Registry"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={cfg.label} textClass={cfg.text} bgClass={cfg.bg} />
                    </td>
                  </tr>
                );
              })}
              {recentHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No history yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
