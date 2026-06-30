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
          <div className="rounded-lg border border-rule bg-paper-raised p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RefNumber value={document.referenceNumber} className="text-base" />
                <StatusBadge label={cfg.label} textClass={cfg.text} bgClass={cfg.bg} />
              </div>
              <ViewFileButton documentId={document.id} />
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-ink-soft">Sender</dt>
                <dd className="text-ink">{document.senderName}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Sender organization</dt>
                <dd className="text-ink">{document.senderOrg ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Received</dt>
                <dd className="text-ink">{format(new Date(document.receivedDate), "PPP")}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Registered by</dt>
                <dd className="text-ink">{document.registeredBy.fullName}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-ink-soft">Subject</dt>
                <dd className="text-ink">{document.subject}</dd>
              </div>
            </dl>
            {isRegistryOrAdmin && (
              <div className="mt-4 border-t border-rule pt-4">
                <EditDocumentPanel document={document} />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-rule bg-paper-raised p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-ink">Routing journey</h2>
            <div className="space-y-3">
              {document.routes.map((route) => {
                const rcfg = ROUTE_STATUS_CONFIG[route.status];
                return (
                  <div key={route.id} className="flex items-center gap-3 rounded-md border border-rule bg-paper p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-soft text-xs font-semibold text-navy">
                      {route.sequence}
                    </span>
                    <div className="flex flex-1 items-center gap-2 text-sm">
                      <span className="text-ink-soft">{route.fromDept?.name ?? "Registry"}</span>
                      <ArrowRight size={14} className="text-ink-soft" />
                      <span className="font-medium text-ink">{route.toDept.name}</span>
                    </div>
                    <StatusBadge label={rcfg.label} textClass={rcfg.text} bgClass={rcfg.bg} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-rule bg-paper-raised p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-ink">Audit trail</h2>
            <ol className="space-y-3 border-l border-rule pl-4">
              {document.auditEvents.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-stamp" />
                  <p className="text-sm font-medium text-ink">{ev.event.replace(/_/g, " ")}</p>
                  <p className="text-sm text-ink-soft">{ev.detail}</p>
                  <p className="text-xs text-ink-soft">{format(new Date(ev.createdAt), "PPp")} · {ev.actorName}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </main>
    </>
  );
}
