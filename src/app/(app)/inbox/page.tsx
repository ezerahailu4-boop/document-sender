import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS, ROUTE_STATUS_CONFIG, daysOpen, isOverdue, SLA_DAYS } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RefNumber } from "@/components/ui/ref-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { InboxRowActions } from "./inbox-row-actions";
import { Inbox as InboxIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function InboxPage() {
  const user = await getCurrentUser();
  const allowed = ["GM", "DEPARTMENT_USER", "DEPARTMENT_HEAD", "ADMIN"];
  if (!allowed.includes(user.role)) redirect("/dashboard");
  if (!user.departmentId && user.role !== "ADMIN") redirect("/dashboard");

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });

  const routes = await prisma.documentRoute.findMany({
    where: {
      toDeptId: user.departmentId ?? undefined,
      status: { in: ["PENDING", "OPENED"] },
    },
    include: { document: true, fromDept: true },
    orderBy: { receivedAt: "asc" },
  });

  // Surface overdue items first so the most urgent work is never buried.
  const sorted = [...routes].sort((a, b) => {
    const aOver = isOverdue(a.receivedAt, a.status);
    const bOver = isOverdue(b.receivedAt, b.status);
    if (aOver === bOver) return 0;
    return aOver ? -1 : 1;
  });

  return (
    <>
      <Topbar
        title="Department Inbox"
        subtitle={user.department ? `${user.department.name} — items waiting for action` : "Items waiting for action"}
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-6">
        {routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16 text-center">
            <InboxIcon className="mb-3 text-muted-foreground" size={32} />
            <p className="text-sm font-medium text-foreground">Inbox is clear</p>
            <p className="text-sm text-muted-foreground">Nothing is currently waiting on your department.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((route) => {
              const cfg = ROUTE_STATUS_CONFIG[route.status];
              const overdue = isOverdue(route.receivedAt, route.status);
              return (
                <div
                  key={route.id}
                  className={cn(
                    "rounded-lg border bg-card p-4 shadow-sm",
                    overdue ? "border-destructive/40" : "border-border"
                  )}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <RefNumber value={route.document.referenceNumber} />
                        <StatusBadge label={cfg.label} textClass={cfg.text} bgClass={cfg.bg} />
                        {overdue && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                            <AlertTriangle size={12} /> Overdue
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-foreground">{route.document.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        From {route.document.senderName}
                        {route.fromDept ? ` · forwarded from ${route.fromDept.name}` : " · via Registry"}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className={overdue ? "font-medium text-destructive" : "text-muted-foreground"}>
                        {daysOpen(route.receivedAt, null)} day(s) here
                      </p>
                      {overdue && <p className="text-xs text-muted-foreground">SLA is {SLA_DAYS} day(s)</p>}
                    </div>
                  </div>
                  <InboxRowActions
                    routeId={route.id}
                    documentId={route.documentId}
                    status={route.status}
                    filePath={route.document.scannedFilePath}
                    departments={departments.filter((d) => d.id !== user.departmentId)}
                    canReturn={!!route.fromDeptId}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
