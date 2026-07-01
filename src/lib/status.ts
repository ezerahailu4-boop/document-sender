export const DOCUMENT_STATUS_CONFIG = {
  PENDING: { label: "Pending", text: "text-warning", bg: "bg-warning/15" },
  IN_PROGRESS: { label: "In Progress", text: "text-secondary", bg: "bg-secondary/15" },
  COMPLETED: { label: "Completed", text: "text-success", bg: "bg-success/15" },
  ARCHIVED: { label: "Archived", text: "text-muted-foreground", bg: "bg-muted" },
} as const;

export const ROUTE_STATUS_CONFIG = {
  PENDING: { label: "Pending", text: "text-warning", bg: "bg-warning/15" },
  OPENED: { label: "Opened", text: "text-secondary", bg: "bg-secondary/15" },
  FORWARDED: { label: "Forwarded", text: "text-secondary", bg: "bg-secondary/15" },
  COMPLETED: { label: "Completed", text: "text-success", bg: "bg-success/15" },
} as const;

export const ROLE_LABELS = {
  REGISTRY_STAFF: "Registry Staff",
  GM: "General Manager",
  DEPARTMENT_USER: "Department User",
  DEPARTMENT_HEAD: "Department Head",
  ADMIN: "Administrator",
} as const;

// Number of days a document may sit in a single department's inbox before
// it's flagged overdue on the dashboard and inbox. Configurable via env so
// it can be tuned per-institution without a code change.
export const SLA_DAYS = Number(process.env.NEXT_PUBLIC_SLA_DAYS || 3);

export function daysOpen(receivedDate: Date, completedAt: Date | null): number {
  const end = completedAt ?? new Date();
  const ms = end.getTime() - new Date(receivedDate).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function isOverdue(receivedAt: Date, status: string): boolean {
  if (status === "COMPLETED" || status === "FORWARDED") return false;
  const days = daysOpen(receivedAt, null);
  return days >= SLA_DAYS;
}
