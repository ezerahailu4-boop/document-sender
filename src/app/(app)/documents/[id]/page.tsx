import { getCurrentUser } from "../../actions";
import { Topbar } from "@/components/layout/topbar";
import { ROLE_LABELS, ROUTE_STATUS_CONFIG, DOCUMENT_STATUS_CONFIG } from "@/lib/status";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { RefNumber } from "@/components/ui/ref-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewFileButton } from "./view-file-button";
import { EditDocumentPanel } from "./edit-document-panel";
import { CommentThread } from "@/components/comment-thread";
import { DocumentVersionHistory } from "@/components/document-version-history";
import { CustomFieldsEditor } from "@/components/custom-fields-editor";
import { DocumentTags } from "@/components/document-tags";
import { ArrowRight, FileText, Mail, RefreshCw, Info, MapPin, User as UserIcon, Clock, CheckCircle2 } from "lucide-react";
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
          actions: true
        }
      },
      auditEvents: { orderBy: { createdAt: "asc" } },
      // Include related data for new features
      comments: {
        where: { routeId: null }, // Only top-level comments for now
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { author: { select: { id: true, fullName: true, email: true } } }
      },
      versions: {
        orderBy: { versionNum: "desc" },
        take: 5,
        include: { createdBy: { select: { id: true, fullName: true, email: true } } }
      },
      customValues: {
        include: { customField: { select: { id: true, name: true, fieldType: true, options: true } } }
      },
      tags: {
        include: { tag: { select: { id: true, name: true, color: true } },
                 appliedBy: { select: { id: true, fullName: true } } }
      }
    },
  });

  if (!document) notFound();

  const isRegistryOrAdmin = user.role === "REGISTRY_STAFF" || user.role === "ADMIN";
  const hasAccess =
    isRegistryOrAdmin ||
    document.routes.some(
      (r) => r.toDeptId === user.departmentId || (!r.toDeptId && r.assignedUserId === user.id)
    );
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
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Enhanced Document Header */}
          <div className="border border-border rounded-lg bg-card p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-6">
              <div className="flex flex-col items-center lg:items-start lg:mb-0 lg:mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <RefNumber value={document.referenceNumber} className="text-3xl font-bold" />
                  <div className="flex items-center gap-2">
                    <StatusBadge label={cfg.label} textClass={cfg.text} bgClass={cfg.bg} />
                    {/* Version badge */}
                    <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/20 text-secondary">
                      v{document.versions?.[0]?.versionNum || 1}
                    </span>
                  </div>
                </div>

                {/* Document preview area */}
                <div className="w-full max-w-xs lg:w-48 bg-gradient-to-t from-background to-muted/50 rounded-lg p-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      <FileText className="h-10 w-10 text-primary" />
                    </div>
                    <p className="font-medium text-foreground">{document.subject}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {document.senderName} • {format(new Date(document.receivedDate), "MMM d, yyyy")}
                    </p>
                    <div className="mt-3 flex justify-center">
                      <ViewFileButton documentId={document.id} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-3/4 space-y-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-muted-foreground mb-2">Basic Information</h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Sender</dt>
                        <dd className="text-base text-foreground truncate">{document.senderName}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Sender organization</dt>
                        <dd className="text-base text-foreground">{document.senderOrg ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Received</dt>
                        <dd className="text-base text-foreground">{format(new Date(document.receivedDate), "PPP")}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Registered by</dt>
                        <dd className="text-base text-foreground">{document.registeredBy.fullName}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-muted-foreground mb-2">Classification</h3>
                    <div className="space-y-3">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {document.tags.map(tagLink => (
                          <div key={tagLink.id} className="flex items-center gap-2 rounded-md border border-tag px-3 py-1.5 text-sm">
                            {tagLink.tag.color && (
                              <div className="h-3 w-3 rounded" style={{ backgroundColor: tagLink.tag.color }} />
                            )}
                            <span className="font-medium text-foreground">{tagLink.tag.name}</span>
                          </div>
                        ))}
                        {document.tags.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">No tags</span>
                        )}
                      </div>

                      {/* Custom Fields */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Custom Fields</h4>
                        {document.customValues.length > 0 ? (
                          <div className="space-y-2">
                            {document.customValues.map(cv => (
                              <div key={cv.id} className="flex items-baseline gap-3">
                                <span className="font-medium text-foreground w-32">{cv.customField.name}:</span>
                                <span className="text-base text-foreground">
                                  {(() => {
                                    try {
                                      if (cv.customField.fieldType === "number") {
                                        return parseFloat(cv.value || "0");
                                      } else if (cv.customField.fieldType === "date") {
                                        return cv.value ? new Date(cv.value).toLocaleDateString() : "—";
                                      } else if (cv.customField.fieldType === "checkbox") {
                                        const parsed = JSON.parse(cv.value || "[]");
                                        return Array.isArray(parsed) ? parsed.join(", ") : String(parsed);
                                      }
                                      return cv.value || "—";
                                    } catch {
                                      return cv.value || "—";
                                    }
                                  })()}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm italic text-muted-foreground">No custom fields</p>
                        )}
                      </div>
                    </div>
                  </div>

                <div className="col-span-2">
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">Routing Info</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-2">Origin: {document.originDept.name}</p>
                    {document.registeredById !== user.id && (
                      <p className="text-sm text-muted-foreground mb-2">Registered by: {document.registeredBy.fullName}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Tabs for different views */}
          <div className="space-y-4">
            {/* Document Content Tab */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-primary" />
                Document
              </h2>
              {/* In a real implementation, this would show the actual document preview */}
              <div className="border border-border rounded-lg bg-card p-6 min-h-[300px]">
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Document preview would appear here
                  {/* In reality, this would be an iframe, PDF viewer, or image viewer */}
                </div>
              </div>
            </section>

            {/* Discussion Tab */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <Mail className="h-4 w-4 text-primary" />
                Discussion & Comments
              </h2>
              <CommentThread documentId={document.id} />
            </section>

            {/* Version History Tab */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <RefreshCw className="h-4 w-4 text-primary" />
                Version History
              </h2>
              <DocumentVersionHistory documentId={document.id} />
            </section>

            {/* Metadata Tab */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <Info className="h-4 w-4 text-primary" />
                Metadata
              </h2>
              <div className="space-y-4">
                {/* Custom Fields Editor */}
                <CustomFieldsEditor
                  documentId={document.id}
                />

                {/* Tags Manager */}
                <DocumentTags documentId={document.id} />
              </div>
            </section>

            {/* Routing Journey Tab */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-primary" />
                Routing Journey
              </h2>
              <div className="space-y-4">
                {document.routes.map((route, index) => (
                  <div key={route.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-xs font-semibold text-secondary">
                              {route.sequence}
                            </span>
                            <div className="flex flex-1 flex-wrap items-center gap-2 text-sm sm:flex-1">
                              <span className="text-muted-foreground">{route.fromDept?.name ?? "Registry"}</span>
                              <ArrowRight size={14} className="text-muted-foreground" />
                              <span className="font-medium text-foreground">
                                {route.toDept?.name ?? route.assignedUser?.fullName ?? "Unassigned"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-baseline gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-3 w-3 mr-1" />
                              <span>{route.assignedUser?.fullName ?? "System"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{new Date(route.receivedAt).toLocaleString()}</span>
                            </div>
                            {document.fileSizeBytes ? (
                              <>
                                <span className="ml-2">•</span>
                                <span className="ml-1 text-xs text-muted-foreground">
                                  {(document.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        {route.comments && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            <strong>Comments:</strong> {route.comments}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex items-center">
                      <StatusBadge
                        label={route.status}
                        textClass={ROUTE_STATUS_CONFIG[route.status]?.text}
                        bgClass={ROUTE_STATUS_CONFIG[route.status]?.bg}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Audit Trail Tab */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Audit Trail
              </h2>
              <div className="max-h-[300px] overflow-y-auto border border-border rounded-lg p-4">
                {document.auditEvents.length > 0 ? (
                  <div className="space-y-3">
                    {document.auditEvents.map((ev) => (
                      <div key={ev.id} className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="flex items-baseline gap-2 mb-1">
                            <span className="font-medium text-foreground">{ev.actorName}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(ev.createdAt), "PPp")}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {ev.event.replace(/_/g, " ").toLowerCase()}
                            {ev.detail && <span className="ml-2">{ev.detail}</span>}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <RefreshCw className="h-2 w-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-sm text-muted-foreground">No audit events recorded.</p>
                )}
              </div>
            </section>
          </div>

          {/* Action Buttons */}
          {isRegistryOrAdmin && (
            <div className="mt-6">
              <EditDocumentPanel document={document} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}