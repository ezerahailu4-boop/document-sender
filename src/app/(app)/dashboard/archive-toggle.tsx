"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function ArchiveToggle({ showArchived }: { showArchived: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (showArchived) {
      params.delete("archived");
    } else {
      params.set("archived", "1");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex h-10 items-center gap-2 rounded-md border border-rule bg-paper-raised px-3 text-sm text-ink-soft">
      <input type="checkbox" checked={showArchived} onChange={toggle} />
      Show archived
    </label>
  );
}
