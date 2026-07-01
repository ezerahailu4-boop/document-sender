import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS, isOverdue, SLA_DAYS } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RefNumber } from "@/components/ui/ref-number";
import { format } from "date-fns";
import {
  FileStack,
  Building2,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [docCounts, deptCount, userCounts, recentAudit, overdueRoutes] = await Promise.all([
    prisma.document.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.department.count(),
    prisma.user.groupBy({ by: ["isActive"], _count: { isActive: true } }),
    prisma.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { document: { select: { referenceNumber: true, id: true } } },
    }),
    prisma.documentRoute.findMany({
      where: { status: { in: ["PENDING", "OPENED"] } },
      include: { toDept: true, document: { select: { referenceNumber: true, subject: true, id: true } } },
    }),
  ]);

  const countFor = (s: string) => docCounts.find((c) => c.status === s)?._count.status ?? 0;
  const totalDocs = docCounts.reduce((sum, c) => sum + c._count.status, 0);
  const activeUsers = userCounts.find((c) => c.isActive)?._count.isActive ?? 0;
  const inactiveUsers = userCounts.find((c) => !c.isActive)?._count.isActive ?? 0;

  const overdueDocs = overdueRoutes.filter((r) => isOverdue(r.receivedAt, r.status));

  const stats = [
    { label: "Total Documents", value: totalDocs, icon: FileStack, color: "text-secondary", bg: "bg-secondary/15" },
    { label: "Departments", value: deptCount, icon: Building2, color: "text-primary", bg: "bg-accent" },
    { label: "Active Users", value: activeUsers, icon: Users, color: "text-success", bg: "bg-success/15" },
    { label: "Completed", value: countFor("COMPLETED"), icon: CheckCircle2, color: "text-success", bg: "bg-success/15" },
  ];

  return (
    <>
      <Topbar
        title="Admin Overview"
        subtitle="System-wide snapshot across departments and documents"
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${s.bg}`}>
                <s.icon className={s.color} size={18} />
              </div>
              <p className="text-2xl font-semibold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Overdue items panel */}
          <div className="rounded-lg border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className={overdueDocs.length > 0 ? "text-destructive" : "text-muted-foreground"} size={18} />
                <h2 className="text-sm font-semibold text-foreground">Overdue across all departments</h2>
              </div>
              <span className="text-xs text-muted-foreground">{SLA_DAYS}+ days</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {overdueDocs.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">Nothing overdue right now.</p>
              ) : (
                overdueDocs.slice(0, 10).map((r) => (
                  <Link
                    key={r.id}
                    href={`/documents/${r.document.id}`}
                    className="flex items-center justify-between border-b border-border px-5 py-3 last:border-0 hover:bg-background"
                  >
                    <div className="min-w-0">
                      <RefNumber value={r.document.referenceNumber} className="mb-1" />
                      <p className="truncate text-sm text-muted-foreground">{r.document.subject}</p>
                    </div>
                    <span className="ml-3 shrink-0 text-xs font-medium text-destructive">{r.toDept.name}</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent activity panel */}
          <div className="rounded-lg border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground" size={18} />
                <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
              </div>
              <Link href="/admin/audit-log" className="flex items-center gap-1 text-xs text-primary hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {recentAudit.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/documents/${ev.document.id}`}
                  className="flex items-start justify-between gap-3 border-b border-border px-5 py-3 last:border-0 hover:bg-background"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{ev.actorName}</span>{" "}
                      <span className="text-muted-foreground">{ev.event.toLowerCase().replace(/_/g, " ")}</span>{" "}
                      <RefNumber value={ev.document.referenceNumber} className="ml-1" />
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(ev.createdAt), "PPp")}</p>
                  </div>
                </Link>
              ))}
              {recentAudit.length === 0 && (
                <p className="px-5 py-6 text-sm text-muted-foreground">No activity yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link href="/admin/departments" className="rounded-lg border border-border bg-card p-5 shadow-sm hover:border-primary/40">
            <Building2 className="mb-2 text-primary" size={20} />
            <p className="font-medium text-foreground">Manage Departments</p>
            <p className="text-sm text-muted-foreground">Add departments, set the GM office</p>
          </Link>
          <Link href="/admin/users" className="rounded-lg border border-border bg-card p-5 shadow-sm hover:border-primary/40">
            <Users className="mb-2 text-primary" size={20} />
            <p className="font-medium text-foreground">Manage Users</p>
            <p className="text-sm text-muted-foreground">{activeUsers} active · {inactiveUsers} inactive</p>
          </Link>
          <Link href="/admin/audit-log" className="rounded-lg border border-border bg-card p-5 shadow-sm hover:border-primary/40">
            <Clock className="mb-2 text-primary" size={20} />
            <p className="font-medium text-foreground">Audit Log</p>
            <p className="text-sm text-muted-foreground">Full history across every document</p>
          </Link>
        </div>
      </main>
    </>
  );
}
