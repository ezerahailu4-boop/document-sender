import { getCurrentUser } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS, ROUTE_STATUS_CONFIG, daysOpen } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RefNumber } from "@/components/ui/ref-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { InboxRowActions } from "./inbox-row-actions";
import { Inbox as InboxIcon } from "lucide-react";

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
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-rule bg-paper-raised py-16 text-center">
            <InboxIcon className="mb-3 text-ink-soft" size={32} />
            <p className="text-sm font-medium text-ink">Inbox is clear</p>
            <p className="text-sm text-ink-soft">Nothing is currently waiting on your department.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {routes.map((route) => {
              const cfg = ROUTE_STATUS_CONFIG[route.status];
              return (
                <div
                  key={route.id}
                  className="rounded-lg border border-rule bg-paper-raised p-4 shadow-sm"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <RefNumber value={route.document.referenceNumber} />
                        <StatusBadge label={cfg.label} textClass={cfg.text} bgClass={cfg.bg} />
                      </div>
                      <p className="font-medium text-ink">{route.document.subject}</p>
                      <p className="text-sm text-ink-soft">
                        From {route.document.senderName}
                        {route.fromDept ? ` · forwarded from ${route.fromDept.name}` : " · via Registry"}
                      </p>
                    </div>
                    <div className="text-right text-sm text-ink-soft">
                      <p>{daysOpen(route.receivedAt, null)} day(s) here</p>
                    </div>
                  </div>
                  <InboxRowActions
                    routeId={route.id}
                    documentId={route.documentId}
                    status={route.status}
                    filePath={route.document.scannedFilePath}
                    departments={departments.filter((d) => d.id !== user.departmentId)}
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
