export const DOCUMENT_STATUS_CONFIG = {
  PENDING: { label: "Pending", text: "text-status-pending", bg: "bg-status-pending-bg" },
  IN_PROGRESS: { label: "In Progress", text: "text-status-progress", bg: "bg-status-progress-bg" },
  COMPLETED: { label: "Completed", text: "text-status-completed", bg: "bg-status-completed-bg" },
  ARCHIVED: { label: "Archived", text: "text-status-archived", bg: "bg-status-archived-bg" },
} as const;

export const ROUTE_STATUS_CONFIG = {
  PENDING: { label: "Pending", text: "text-status-pending", bg: "bg-status-pending-bg" },
  OPENED: { label: "Opened", text: "text-status-progress", bg: "bg-status-progress-bg" },
  FORWARDED: { label: "Forwarded", text: "text-navy", bg: "bg-navy-soft" },
  COMPLETED: { label: "Completed", text: "text-status-completed", bg: "bg-status-completed-bg" },
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
