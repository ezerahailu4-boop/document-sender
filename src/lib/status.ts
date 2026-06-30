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

export function daysOpen(receivedDate: Date, completedAt: Date | null): number {
  const end = completedAt ?? new Date();
  const ms = end.getTime() - new Date(receivedDate).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}
