"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/form";
import { Eye, Send, CheckCircle } from "lucide-react";

type Dept = { id: string; name: string };

export function InboxRowActions({
  routeId,
  documentId,
  status,
  departments,
}: {
  routeId: string;
  documentId: string;
  status: string;
  filePath: string;
  departments: Dept[];
}) {
  const router = useRouter();
  const [forwarding, setForwarding] = useState(false);
  const [destDept, setDestDept] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function viewFile() {
    await fetch(`/api/routes/${routeId}/open`, { method: "POST" }).catch(() => {});
    const res = await fetch(`/api/documents/${documentId}/file`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
    router.refresh();
  }

  async function complete() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/routes/${routeId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: comment || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.refresh();
  }

  async function submitForward() {
    if (!destDept) { setError("Choose a department to forward to."); return; }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/routes/${routeId}/forward`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toDepartmentId: destDept, comments: comment || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setForwarding(false);
    router.refresh();
  }

  return (
    <div className="border-t border-rule pt-3">
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {!forwarding ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={viewFile}>
            <Eye size={14} /> View PDF
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setForwarding(true)}>
            <Send size={14} /> Forward
          </Button>
          <Button size="sm" variant="primary" onClick={complete} disabled={loading}>
            <CheckCircle size={14} /> Mark Completed
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Select value={destDept} onChange={(e) => setDestDept(e.target.value)}>
            <option value="">Select destination department…</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
          <Textarea
            placeholder="Note (optional)"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submitForward} disabled={loading}>
              {loading ? "Forwarding…" : "Confirm forward"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setForwarding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      <p className="mt-1 text-xs text-ink-soft">Status: {status}</p>
    </div>
  );
}
