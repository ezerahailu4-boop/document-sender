"use client";

import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export function ViewFileButton({ documentId }: { documentId: string }) {
  async function view() {
    const res = await fetch(`/api/documents/${documentId}/file`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  }

  return (
    <Button size="sm" variant="secondary" onClick={view}>
      <Eye size={14} /> View PDF
    </Button>
  );
}
