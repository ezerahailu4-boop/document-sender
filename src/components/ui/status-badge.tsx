import { cn } from "@/lib/utils";

export function StatusBadge({
  label,
  textClass,
  bgClass,
}: {
  label: string;
  textClass: string;
  bgClass: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        textClass,
        bgClass
      )}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
