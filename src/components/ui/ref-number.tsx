import { cn } from "@/lib/utils";

export function RefNumber({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "ref-stamp inline-block rounded border border-stamp/30 bg-stamp-soft px-2 py-0.5 text-stamp",
        className
      )}
    >
      {value}
    </span>
  );
}
