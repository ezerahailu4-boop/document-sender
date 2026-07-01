"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";

type DocumentFields = {
  id: string;
  senderName: string;
  senderOrg: string | null;
  subject: string;
  receivedDate: Date | string;
};

export function EditDocumentPanel({ document }: { document: DocumentFields }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [senderName, setSenderName] = useState(document.senderName);
  const [senderOrg, setSenderOrg] = useState(document.senderOrg ?? "");
  const [subject, setSubject] = useState(document.subject);
  const [receivedDate, setReceivedDate] = useState(
    new Date(document.receivedDate).toISOString().slice(0, 10)
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!editing) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
        <Pencil size={14} /> Correct details
      </Button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/documents/${document.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderName, senderOrg, subject, receivedDate, reason }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setEditing(false);
    setReason("");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-accent/40 p-4">
      <p className="mb-3 text-sm font-medium text-foreground">Correct document details</p>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edit-sender">Sender name</Label>
            <Input id="edit-sender" value={senderName} onChange={(e) => setSenderName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="edit-org">Sender organization</Label>
            <Input id="edit-org" value={senderOrg} onChange={(e) => setSenderOrg(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="edit-subject">Subject</Label>
          <Textarea id="edit-subject" rows={2} value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="edit-date">Date received</Label>
          <Input id="edit-date" type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="edit-reason">Reason for correction (required, kept in audit trail)</Label>
          <Textarea
            id="edit-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Sender name was mistyped during intake"
            required
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Saving…" : "Save correction"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
