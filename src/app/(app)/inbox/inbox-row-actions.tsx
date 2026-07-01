"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/form";
import { Eye, Send, CheckCircle, Undo2 } from "lucide-react";

type Dept = { id: string; name: string };
type Mode = "idle" | "forwarding" | "returning";

export function InboxRowActions({
  routeId,
  documentId,
  status,
  departments,
  canReturn,
}: {
  routeId: string;
  documentId: string;
  status: string;
  filePath: string;
  departments: Dept[];
  canReturn: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
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
    setMode("idle");
    router.refresh();
  }

  async function submitReturn() {
    if (!comment.trim()) { setError("A reason is required to return a document."); return; }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/routes/${routeId}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: comment }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setMode("idle");
    router.refresh();
  }

  return (
    <div className="border-t border-rule pt-3">
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={viewFile}>
            <Eye size={14} /> View File
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setMode("forwarding")}>
            <Send size={14} /> Forward
          </Button>
          {canReturn && (
            <Button size="sm" variant="ghost" onClick={() => setMode("returning")}>
              <Undo2 size={14} /> Return
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={complete} disabled={loading}>
            <CheckCircle size={14} /> Mark Completed
          </Button>
        </div>
      )}

      {mode === "forwarding" && (
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
            <Button size="sm" variant="ghost" onClick={() => { setMode("idle"); setError(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === "returning" && (
        <div className="space-y-2">
          <Textarea
            placeholder="Why is this being returned? (required)"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={submitReturn} disabled={loading}>
              {loading ? "Returning…" : "Confirm return"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setMode("idle"); setError(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p className="mt-1 text-xs text-ink-soft">Status: {status}</p>
    </div>
  );
}
