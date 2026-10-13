import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS, ROUTE_STATUS_CONFIG, daysOpen, isOverdue, SLA_DAYS } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { RefNumber } from "@/components/ui/ref-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { InboxRowActions } from "./inbox-row-actions";
import { Inbox as InboxIcon, AlertTriangle, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function InboxPage() {
  const user = await getCurrentUser();

  // Anyone can land in an inbox now: a document can be routed straight to
  // a departmentless user (e.g. Registry staff), not just department
  // members. So the only real requirement is "this route is mine" —
  // either because it's addressed to my department, or assigned to me
  // personally with no department at all.
  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });

  const routes = await prisma.documentRoute.findMany({
    where: {
      status: { in: ["PENDING", "OPENED"] },
      OR: [
        { assignedUserId: user.id },
        ...(user.departmentId ? [{ toDeptId: user.departmentId }] : []),
      ],
    },
    include: { document: true, fromDept: true, assignedUser: true },
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
        title="Inbox"
        subtitle={user.department ? `${user.department.name} — items waiting for action` : "Items waiting for action"}
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16 text-center">
            <InboxIcon className="mb-3 text-muted-foreground" size={32} />
            <p className="text-sm font-medium text-foreground">Inbox is clear</p>
            <p className="text-sm text-muted-foreground">Nothing is currently waiting on you.</p>
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
                      <div className="mb-1 flex items-center gap-2 flex-wrap">
                        <RefNumber value={route.document.referenceNumber} />
                        <StatusBadge label={cfg.label} textClass={cfg.text} bgClass={cfg.bg} />
                        {route.assignedUser && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border",
                              route.assignedUser.id === user.id
                                ? "bg-primary/10 text-primary border-primary/20 font-semibold"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            <UserIcon size={11} />
                            {route.assignedUser.id === user.id ? "Assigned to you" : `Assigned: ${route.assignedUser.fullName}`}
                          </span>
                        )}
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
                    isGm={user.role === "GM"}
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
