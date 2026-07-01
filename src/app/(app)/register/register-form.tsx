"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/form";
import { RefNumber } from "@/components/ui/ref-number";
import { UploadCloud, FileText, CheckCircle2, Image as ImageIcon, FileType2 } from "lucide-react";
import { ACCEPTED_FILE_EXTENSIONS, ACCEPTED_FILE_LABEL } from "@/lib/file-type";

function FilePreviewIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return <ImageIcon className="text-stamp" size={28} />;
  if (["doc", "docx"].includes(ext)) return <FileType2 className="text-stamp" size={28} />;
  return <FileText className="text-stamp" size={28} />;
}

export function RegisterForm({ gmDeptName }: { gmDeptName: string | null }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ referenceNumber: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Attach the scanned document before submitting.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData();
    formData.set("senderName", (form.elements.namedItem("senderName") as HTMLInputElement).value);
    formData.set("senderOrg", (form.elements.namedItem("senderOrg") as HTMLInputElement).value);
    formData.set("subject", (form.elements.namedItem("subject") as HTMLTextAreaElement).value);
    formData.set("receivedDate", (form.elements.namedItem("receivedDate") as HTMLInputElement).value);
    formData.set("file", file);

    setLoading(true);
    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      setSuccess({ referenceNumber: data.referenceNumber });
    } catch {
      setError("Network error — please check your connection and try again.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-rule bg-paper-raised px-8 py-12 text-center shadow-sm">
        <CheckCircle2 className="mb-4 text-status-completed" size={40} />
        <p className="mb-1 text-sm text-ink-soft">Document registered and routed to {gmDeptName}</p>
        <RefNumber value={success.referenceNumber} className="mb-6 text-base" />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push("/dashboard")}>
            View on Master Ledger
          </Button>
          <Button variant="ghost" onClick={() => { setSuccess(null); setFile(null); setLoading(false); }}>
            Register another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-lg border border-rule bg-paper-raised p-6 shadow-sm"
    >
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div>
        <Label htmlFor="senderName">Sender name *</Label>
        <Input id="senderName" name="senderName" required placeholder="e.g. Ethio Telecom" />
      </div>

      <div>
        <Label htmlFor="senderOrg">Sender organization (optional)</Label>
        <Input id="senderOrg" name="senderOrg" placeholder="e.g. Customer Relations Division" />
      </div>

      <div>
        <Label htmlFor="subject">Subject *</Label>
        <Textarea id="subject" name="subject" rows={3} required placeholder="What is this letter about?" />
      </div>

      <div>
        <Label htmlFor="receivedDate">Date received *</Label>
        <Input id="receivedDate" name="receivedDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>

      <div>
        <Label>Document file *</Label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-rule bg-paper px-4 py-8 text-center transition-colors hover:border-stamp/40"
        >
          {file ? (
            <>
              <FilePreviewIcon name={file.name} />
              <span className="text-sm font-medium text-ink">{file.name}</span>
              <span className="text-xs text-ink-soft">{(file.size / 1024 / 1024).toFixed(2)} MB — click to change</span>
            </>
          ) : (
            <>
              <UploadCloud className="text-ink-soft" size={28} />
              <span className="text-sm font-medium text-ink">Click to upload the document</span>
              <span className="text-xs text-ink-soft">{ACCEPTED_FILE_LABEL}, up to 25MB</span>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_EXTENSIONS}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex items-center justify-between border-t border-rule pt-4">
        <p className="text-xs text-ink-soft">
          A reference number is generated automatically on submit and this document
          will be routed to <span className="font-medium text-ink">{gmDeptName ?? "the GM's office"}</span>.
        </p>
        <Button type="submit" disabled={loading || !gmDeptName}>
          {loading ? "Registering…" : "Register & route"}
        </Button>
      </div>
    </form>
  );
}
