"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select-native";
import { RefNumber } from "@/components/ui/ref-number";
import { UploadCloud, FileText, CheckCircle2, Image as ImageIcon, FileType2, Crown, Building2 } from "lucide-react";
import { ACCEPTED_FILE_EXTENSIONS, ACCEPTED_FILE_LABEL } from "@/lib/file-type";
import { cn } from "@/lib/utils";

type Dept = { id: string; name: string; isGmOffice: boolean };
type DeptUser = { id: string; fullName: string; role: string };

function FilePreviewIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return <ImageIcon className="text-primary" size={28} />;
  if (["doc", "docx"].includes(ext)) return <FileType2 className="text-primary" size={28} />;
  return <FileText className="text-primary" size={28} />;
}

export function RegisterForm({ gmDeptName, departments }: { gmDeptName: string | null; departments: Dept[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ referenceNumber: string; destName: string } | null>(null);

  const [routeMode, setRouteMode] = useState<"gm" | "direct">("gm");
  const [targetDeptId, setTargetDeptId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [deptUsers, setDeptUsers] = useState<DeptUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const nonGmDepartments = departments.filter((d) => !d.isGmOffice);

  useEffect(() => {
    if (routeMode !== "direct" || !targetDeptId) {
      setDeptUsers([]);
      setTargetUserId("");
      return;
    }
    setLoadingUsers(true);
    fetch(`/api/departments/${targetDeptId}/users`)
      .then((r) => r.json())
      .then((data) => setDeptUsers(data.users ?? []))
      .finally(() => setLoadingUsers(false));
    setTargetUserId("");
  }, [routeMode, targetDeptId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Attach the scanned document before submitting.");
      return;
    }
    if (routeMode === "direct" && !targetDeptId) {
      setError("Choose a destination department, or switch back to General Manager's Office.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData();
    formData.set("senderName", (form.elements.namedItem("senderName") as HTMLInputElement).value);
    formData.set("senderOrg", (form.elements.namedItem("senderOrg") as HTMLInputElement).value);
    formData.set("subject", (form.elements.namedItem("subject") as HTMLTextAreaElement).value);
    formData.set("receivedDate", (form.elements.namedItem("receivedDate") as HTMLInputElement).value);
    formData.set("file", file);
    if (routeMode === "direct") {
      formData.set("targetDeptId", targetDeptId);
      if (targetUserId) formData.set("targetUserId", targetUserId);
    }

    setLoading(true);
    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      const destName =
        routeMode === "direct"
          ? (targetUserId ? deptUsers.find((u) => u.id === targetUserId)?.fullName : null) ??
            departments.find((d) => d.id === targetDeptId)?.name ??
            "the selected department"
          : gmDeptName ?? "the GM's office";
      setSuccess({ referenceNumber: data.referenceNumber, destName });
    } catch {
      setError("Network error — please check your connection and try again.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-border bg-card px-8 py-12 text-center shadow-sm">
        <CheckCircle2 className="mb-4 text-success" size={40} />
        <p className="mb-1 text-sm text-muted-foreground">Document registered and routed to {success.destName}</p>
        <RefNumber value={success.referenceNumber} className="mb-6 text-base" />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push("/dashboard")}>
            View on Master Ledger
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSuccess(null);
              setFile(null);
              setLoading(false);
              setRouteMode("gm");
              setTargetDeptId("");
              setTargetUserId("");
            }}
          >
            Register another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-border bg-card p-6 shadow-sm">
      {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

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
          className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background px-4 py-8 text-center transition-colors hover:border-primary/40"
        >
          {file ? (
            <>
              <FilePreviewIcon name={file.name} />
              <span className="text-sm font-medium text-foreground">{file.name}</span>
              <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB — click to change</span>
            </>
          ) : (
            <>
              <UploadCloud className="text-muted-foreground" size={28} />
              <span className="text-sm font-medium text-foreground">Click to upload the document</span>
              <span className="text-xs text-muted-foreground">{ACCEPTED_FILE_LABEL}, up to 25MB</span>
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

      <div className="border-t border-border pt-5">
        <Label className="mb-2 block">Route this document to *</Label>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setRouteMode("gm")}
            className={cn(
              "flex items-center gap-3 rounded-md border p-3 text-left transition-colors",
              routeMode === "gm" ? "border-primary bg-accent" : "border-border hover:border-primary/40"
            )}
          >
            <Crown className={routeMode === "gm" ? "text-primary" : "text-muted-foreground"} size={18} />
            <div>
              <p className="text-sm font-medium text-foreground">General Manager&apos;s Office</p>
              <p className="text-xs text-muted-foreground">Default — GM reviews and forwards it on</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setRouteMode("direct")}
            className={cn(
              "flex items-center gap-3 rounded-md border p-3 text-left transition-colors",
              routeMode === "direct" ? "border-primary bg-accent" : "border-border hover:border-primary/40"
            )}
          >
            <Building2 className={routeMode === "direct" ? "text-primary" : "text-muted-foreground"} size={18} />
            <div>
              <p className="text-sm font-medium text-foreground">Choose a department</p>
              <p className="text-xs text-muted-foreground">Skip the GM, send directly</p>
            </div>
          </button>
        </div>

        {routeMode === "direct" && (
          <div className="space-y-3 rounded-md border border-border bg-background p-3">
            <div>
              <Label htmlFor="targetDept">Department *</Label>
              <Select id="targetDept" value={targetDeptId} onChange={(e) => setTargetDeptId(e.target.value)} required>
                <option value="">Select department…</option>
                {nonGmDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </div>
            {targetDeptId && (
              <div>
                <Label htmlFor="targetUser">Specific person (optional)</Label>
                <Select
                  id="targetUser"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  disabled={loadingUsers}
                >
                  <option value="">Anyone in this department</option>
                  {deptUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </Select>
                {loadingUsers && <p className="mt-1 text-xs text-muted-foreground">Loading people…</p>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-stretch gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">A reference number is generated automatically on submit.</p>
        <Button type="submit" disabled={loading || (routeMode === "gm" && !gmDeptName)} className="w-full sm:w-auto">
          {loading ? "Registering…" : "Register & route"}
        </Button>
      </div>
    </form>
  );
}
