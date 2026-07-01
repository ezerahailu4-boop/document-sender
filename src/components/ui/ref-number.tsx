import { cn } from "@/lib/utils";

export function RefNumber({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "ref-stamp inline-block rounded border border-primary/30 bg-accent px-2 py-0.5 text-primary",
        className
      )}
    >
      {value}
    </span>
  );
}
