import { getCurrentUser } from "../../actions";
import { Topbar } from "@/components/layout/topbar";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { RefNumber } from "@/components/ui/ref-number";
import { RefreshCw, Share2, FileText, Activity } from "lucide-react";

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [docStats, routeStats, userStats, recentEvents] = await Promise.all([
    // Document statistics
    prisma.document.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    // Route statistics
    prisma.documentRoute.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    // User statistics
    prisma.user.groupBy({
      by: ["role", "isActive"],
      _count: true,
    }),
    // Recent analytics events (7 days)
    prisma.analyticsEvent.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { timestamp: "desc" },
      take: 10,
      include: {
        document: { select: { referenceNumber: true } },
        user: { select: { fullName: true } },
      },
    }),
  ]);

  const docCountFor = (status: string) =>
    docStats.find((s) => s.status === status)?._count.status ?? 0;
  const routeCountFor = (status: string) =>
    routeStats.find((s) => s.status === status)?._count.status ?? 0;

  const totalDocs = docStats.reduce((sum, s) => sum + s._count.status, 0);
  const activeRoutes = routeCountFor("PENDING") + routeCountFor("OPENED");
  const totalUsers = userStats.reduce((sum, s) => sum + s._count, 0);
  const activeUsers = userStats
    .filter((s) => s.isActive === true)
    .reduce((sum, s) => sum + s._count, 0);

  return (
    <>
      <Topbar
        title="Analytics Dashboard"
        subtitle="System usage and performance metrics"
        userName={user.fullName}
        userRole={user.role === "ADMIN" ? "Administrator" : user.role}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Document Stats */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-foreground">Documents</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-semibold text-primary">{totalDocs}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active:</span>
                  <span className="text-foreground">{docCountFor("PENDING") + docCountFor("IN_PROGRESS")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="text-success">{docCountFor("COMPLETED")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Archived:</span>
                  <span className="text-muted-foreground">{docCountFor("ARCHIVED")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Route Stats */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-foreground">Document Routes</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-semibold text-primary">{activeRoutes}</p>
                <p className="text-sm text-muted-foreground">Active Routes</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pending:</span>
                  <span className="text-warning">{routeCountFor("PENDING")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">In Progress:</span>
                  <span className="text-secondary">{routeCountFor("OPENED")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="text-success">{routeCountFor("COMPLETED")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Forwarded:</span>
                  <span className="text-muted-foreground">{routeCountFor("FORWARDED")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* User Stats */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-foreground">Users</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-semibold text-primary">{totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active:</span>
                  <span className="text-success">{activeUsers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Inactive:</span>
                  <span className="text-destructive">{totalUsers - activeUsers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Admins:</span>
                  <span className="text-primary">
                    {userStats.find((s) => s.role === "ADMIN" && s.isActive === true)?._count || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Registry Staff:</span>
                  <span className="text-primary">
                    {userStats.find((s) => s.role === "REGISTRY_STAFF" && s.isActive === true)?._count || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* System Activity */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-foreground">System Activity (7 days)</h3>
            {recentEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div key={event.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 flex items-baseline gap-2">
                          <span className="font-medium text-foreground">
                            {event.user?.fullName || "System"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.timestamp), "PPp")}
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {event.eventType.replace(/_/g, " ").toLowerCase()}
                          {event.documentId && event.document?.referenceNumber && (
                            <span className="ml-2">
                              <RefNumber value={event.document.referenceNumber} className="ml-1" />
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Share2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Comments & Discussion</p>
                  <p className="text-sm text-muted-foreground">Collaborative notes on documents</p>
                </div>
              </div>
              <span className="rounded bg-success/15 px-2 py-1 text-xs font-semibold text-success">Active</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Custom Fields</p>
                  <p className="text-sm text-muted-foreground">Dynamic document metadata</p>
                </div>
              </div>
              <span className="rounded bg-success/15 px-2 py-1 text-xs font-semibold text-success">Active</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Version History</p>
                  <p className="text-sm text-muted-foreground">Multi-version file tracking</p>
                </div>
              </div>
              <span className="rounded bg-success/15 px-2 py-1 text-xs font-semibold text-success">Active</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
