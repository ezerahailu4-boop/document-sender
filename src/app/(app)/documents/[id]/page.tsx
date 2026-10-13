import { getCurrentUser } from "../../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS, ROUTE_STATUS_CONFIG, DOCUMENT_STATUS_CONFIG } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { RefNumber } from "@/components/ui/ref-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewFileButton } from "./view-file-button";
import { EditDocumentPanel } from "./edit-document-panel";
import { DocumentTabs } from "./document-tabs";
import { DocumentViewer } from "@/components/document-viewer";
import { CommentThread } from "@/components/comment-thread";
import { DocumentVersionHistory } from "@/components/document-version-history";
import { CustomFieldsEditor } from "@/components/custom-fields-editor";
import { DocumentTags } from "@/components/document-tags";
import { InboxRowActions } from "../../inbox/inbox-row-actions";
import Link from "next/link";
import { ArrowLeft, ArrowRight, User as UserIcon, Clock, CheckCircle2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      registeredBy: true,
      originDept: true,
      routes: {
        orderBy: { sequence: "asc" },
        include: {
          toDept: true,
          fromDept: true,
          assignedUser: true,
          actions: true,
        },
      },
      auditEvents: { orderBy: { createdAt: "desc" } },
      comments: {
        where: { routeId: null },
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, fullName: true, email: true } } },
      },
      versions: {
        orderBy: { versionNum: "desc" },
        include: { createdBy: { select: { id: true, fullName: true, email: true } } },
      },
      customValues: {
        include: { customField: { select: { id: true, name: true, fieldType: true, options: true } } },
      },
      tags: {
        include: {
          tag: { select: { id: true, name: true, color: true } },
          appliedBy: { select: { id: true, fullName: true } },
        },
      },
    },
  });

  if (!document) notFound();

  const isRegistryOrAdmin = user.role === "REGISTRY_STAFF" || user.role === "ADMIN";
  const hasAccess =
    isRegistryOrAdmin ||
    document.routes.some(
      (r) => r.assignedUserId === user.id || (r.toDeptId && r.toDeptId === user.departmentId)
    );
  if (!hasAccess) redirect("/inbox");

  const activeRouteForUser = document.routes.find(
    (r) =>
      (r.status === "PENDING" || r.status === "OPENED") &&
      (user.role === "ADMIN" ||
        r.assignedUserId === user.id ||
        (r.toDeptId && r.toDeptId === user.departmentId))
  );

  const allDepartments = activeRouteForUser
    ? await prisma.department.findMany({ orderBy: { name: "asc" } })
    : [];

  const cfg = DOCUMENT_STATUS_CONFIG[document.status];

  // Document Preview Tab content
  const documentTab = (
    <div className="space-y-4">
      <DocumentViewer
        documentId={document.id}
        subject={document.subject}
        mimeType={document.mimeType}
      />
    </div>
  );

  // Routing Journey Tab content
  const routingTab = (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-4">
      <h3 className="text-base font-semibold text-foreground">Routing Journey & Current Location</h3>
      <div className="space-y-3">
        {document.routes.map((route) => {
          const rCfg = ROUTE_STATUS_CONFIG[route.status];
          const isCurrent = route.status === "PENDING" || route.status === "OPENED";

          return (
            <div
              key={route.id}
              className={`rounded-lg border p-4 transition-all ${
                isCurrent ? "border-primary/40 bg-accent/30 shadow-xs" : "border-border bg-background/50"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/15 text-secondary"
                    }`}
                  >
                    {route.sequence}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{route.fromDept?.name ?? "Registry"}</span>
                      <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                      <span className="font-semibold text-foreground">
                        {route.toDept?.name ?? route.assignedUser?.fullName ?? "Unassigned"}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wide">
                          Current Location
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        {route.assignedUser?.fullName ?? "Department Intake"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(route.receivedAt), "PPp")}
                      </span>
                    </div>

                    {route.comments && (
                      <p className="mt-2 text-xs text-foreground bg-muted/40 rounded p-2">
                        <strong className="text-muted-foreground">Handover Note:</strong> {route.comments}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  <StatusBadge
                    label={route.status}
                    textClass={rCfg?.text}
                    bgClass={rCfg?.bg}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Discussion Tab content
  const discussionTab = (
    <div className="space-y-4">
      <CommentThread documentId={document.id} />
    </div>
  );

  // Metadata & Tags Tab content
  const metadataTab = (
    <div className="space-y-4">
      <CustomFieldsEditor documentId={document.id} />
      <DocumentTags documentId={document.id} />
    </div>
  );

  // Versions Tab content
  const versionsTab = (
    <div className="space-y-4">
      <DocumentVersionHistory documentId={document.id} />
    </div>
  );

  // Audit Trail Tab content
  const auditTab = (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <CheckCircle2 size={16} className="text-primary" /> Full Audit Trail & Compliance Log
        </h3>
        <span className="text-xs text-muted-foreground">
          {document.auditEvents.length} recorded events
        </span>
      </div>

      <div className="space-y-3">
        {document.auditEvents.map((ev) => (
          <div
            key={ev.id}
            className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2 mb-0.5">
                <span className="font-semibold text-xs text-foreground">{ev.actorName}</span>
                <span className="text-[11px] text-muted-foreground">
                  {format(new Date(ev.createdAt), "PPp")}
                </span>
              </p>
              <p className="text-xs text-foreground">
                <span className="font-medium text-primary uppercase font-mono tracking-wide text-[11px] mr-1.5">
                  [{ev.event}]
                </span>
                {ev.detail || ev.event.replace(/_/g, " ").toLowerCase()}
              </p>
            </div>
            <RefreshCw className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
          </div>
        ))}
        {document.auditEvents.length === 0 && (
          <p className="text-center py-8 text-xs text-muted-foreground">No audit events recorded.</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Topbar
        title={document.referenceNumber}
        subtitle={document.subject}
        userName={user.fullName}
        userRole={ROLE_LABELS[user.role]}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              prefetch={false}
              className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Master Ledger</span>
            </Link>

            {isRegistryOrAdmin && <EditDocumentPanel document={document} />}
          </div>

          {/* Master Document Header Card */}
          <div className="border border-border rounded-lg bg-card p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <RefNumber value={document.referenceNumber} className="text-2xl font-bold" />
                  <StatusBadge label={cfg.label} textClass={cfg.text} bgClass={cfg.bg} />
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary/15 text-secondary">
                    v{document.versions?.[0]?.versionNum || 1}
                  </span>
                </div>
                <h1 className="text-lg font-semibold text-foreground tracking-tight">{document.subject}</h1>
              </div>

              <div className="flex items-center gap-2">
                <ViewFileButton documentId={document.id} />
              </div>
            </div>

            {/* Quick Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">Sender</span>
                <span className="font-semibold text-foreground truncate block">
                  {document.senderName}
                  {document.senderOrg ? ` (${document.senderOrg})` : ""}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Date Received</span>
                <span className="font-semibold text-foreground">
                  {format(new Date(document.receivedDate), "PPP")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Origin Department</span>
                <span className="font-semibold text-foreground">{document.originDept.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Intake Staff</span>
                <span className="font-semibold text-foreground">{document.registeredBy.fullName}</span>
              </div>
            </div>
          </div>

          {activeRouteForUser && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Waiting For Your Action
                </span>
                {activeRouteForUser.assignedUserId === user.id && (
                  <span className="rounded-full bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-bold">
                    Assigned Personally To You
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                This document is currently at your station. You can forward it directly to another person or department, or mark it completed.
              </p>
              <InboxRowActions
                routeId={activeRouteForUser.id}
                documentId={document.id}
                status={activeRouteForUser.status}
                filePath={document.scannedFilePath}
                departments={allDepartments.filter((d) => d.id !== user.departmentId)}
                canReturn={!!activeRouteForUser.fromDeptId}
                isGm={user.role === "GM"}
              />
            </div>
          )}

          {/* Tabbed Workspace */}
          <DocumentTabs
            documentTab={documentTab}
            routingTab={routingTab}
            discussionTab={discussionTab}
            metadataTab={metadataTab}
            versionsTab={versionsTab}
            auditTab={auditTab}
            commentsCount={document.comments.length}
            versionsCount={document.versions.length || 1}
            routesCount={document.routes.length}
          />
        </div>
      </main>
    </>
  );
}