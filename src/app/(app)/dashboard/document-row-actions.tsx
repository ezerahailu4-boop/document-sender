"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";

export function DocumentRowActions({ documentId, status }: { documentId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (status !== "COMPLETED" && status !== "ARCHIVED") return null;

  async function toggleArchive() {
    setLoading(true);
    await fetch(`/api/documents/${documentId}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: status !== "ARCHIVED" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggleArchive}
      disabled={loading}
      title={status === "ARCHIVED" ? "Restore from archive" : "Archive"}
      className="text-ink-soft hover:text-ink disabled:opacity-50"
    >
      {status === "ARCHIVED" ? <ArchiveRestore size={16} /> : <Archive size={16} />}
    </button>
  );
}
