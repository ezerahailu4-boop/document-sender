import { getCurrentUser } from "../../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS, ROUTE_STATUS_CONFIG, DOCUMENT_STATUS_CONFIG } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { RefNumber } from "@/components/ui/ref-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewFileButton } from "./view-file-button";
import { EditDocumentPanel } from "./edit-document-panel";
import { ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      registeredBy: true,
      originDept: true,
      routes: { orderBy: { sequence: "asc" }, include: { toDept: true, fromDept: true } },
      auditEvents: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!document) notFound();

  const isRegistryOrAdmin = user.role === "REGISTRY_STAFF" || user.role === "ADMIN";
  const hasAccess = isRegistryOrAdmin || document.routes.some((r) => r.toDeptId === user.departmentId);
  if (!hasAccess) redirect("/inbox");

  const cfg = DOCUMENT_STATUS_CONFIG[document.status];

  return (
    <>
      <Topbar
        title={document.referenceNumber}
        subtitle={document.subject}
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RefNumber value={document.referenceNumber} className="text-base" />
                <StatusBadge label={cfg.label} textClass={cfg.text} bgClass={cfg.bg} />
              </div>
              <ViewFileButton documentId={document.id} />
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Sender</dt>
                <dd className="text-foreground">{document.senderName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sender organization</dt>
                <dd className="text-foreground">{document.senderOrg ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Received</dt>
                <dd className="text-foreground">{format(new Date(document.receivedDate), "PPP")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Registered by</dt>
                <dd className="text-foreground">{document.registeredBy.fullName}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Subject</dt>
                <dd className="text-foreground">{document.subject}</dd>
              </div>
            </dl>
            {isRegistryOrAdmin && (
              <div className="mt-4 border-t border-border pt-4">
                <EditDocumentPanel document={document} />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Routing journey</h2>
            <div className="space-y-3">
              {document.routes.map((route) => {
                const rcfg = ROUTE_STATUS_CONFIG[route.status];
                return (
                  <div key={route.id} className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-xs font-semibold text-secondary">
                      {route.sequence}
                    </span>
                    <div className="flex flex-1 items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{route.fromDept?.name ?? "Registry"}</span>
                      <ArrowRight size={14} className="text-muted-foreground" />
                      <span className="font-medium text-foreground">{route.toDept.name}</span>
                    </div>
                    <StatusBadge label={rcfg.label} textClass={rcfg.text} bgClass={rcfg.bg} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Audit trail</h2>
            <ol className="space-y-3 border-l border-border pl-4">
              {document.auditEvents.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm font-medium text-foreground">{ev.event.replace(/_/g, " ")}</p>
                  <p className="text-sm text-muted-foreground">{ev.detail}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(ev.createdAt), "PPp")} · {ev.actorName}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </main>
    </>
  );
}
