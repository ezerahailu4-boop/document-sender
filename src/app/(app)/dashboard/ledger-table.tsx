"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RefNumber } from "@/components/ui/ref-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DocumentRowActions } from "./document-row-actions";
import { daysOpen, DOCUMENT_STATUS_CONFIG } from "@/lib/status";
import { cn } from "@/lib/utils";
import { Archive, Tag, CheckCircle2, AlertCircle } from "lucide-react";

interface DocumentItem {
  id: string;
  referenceNumber: string;
  senderName: string;
  senderOrg: string | null;
  subject: string;
  receivedDate: string;
  completedAt: string | null;
  status: string;
  currentDept: string;
  isOverdue: boolean;
}

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

interface DepartmentItem {
  id: string;
  name: string;
}

interface LedgerTableProps {
  documents: DocumentItem[];
  departments: DepartmentItem[];
  tags: TagItem[];
  totalCount: number;
}

export function LedgerTable({
  documents,
  departments,
  tags,
}: LedgerTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string>("");

  const currentStatus = searchParams.get("status") || "ALL";
  const currentDept = searchParams.get("dept") || "ALL";

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(documents.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "ALL") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    params.set("page", "1");
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleDeptFilter = (deptId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (deptId === "ALL") {
      params.delete("dept");
    } else {
      params.set("dept", deptId);
    }
    params.set("page", "1");
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Archive ${selectedIds.length} selected document(s)?`)) return;

    setBulkLoading(true);
    setBulkMessage(null);

    try {
      const res = await fetch("/api/bulk-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationType: "archive",
          documentIds: selectedIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to bulk archive");

      setBulkMessage({
        type: "success",
        text: `Successfully archived ${data.successCount} document(s).`,
      });
      setSelectedIds([]);
      router.refresh();
    } catch (err) {
      setBulkMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error executing bulk archive",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkTag = async () => {
    if (selectedIds.length === 0 || !selectedTagId) return;

    setBulkLoading(true);
    setBulkMessage(null);

    try {
      const res = await fetch("/api/bulk-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationType: "tag",
          documentIds: selectedIds,
          parameters: { tagId: selectedTagId },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to tag documents");

      setBulkMessage({
        type: "success",
        text: `Applied tag to ${data.successCount} document(s).`,
      });
      setSelectedIds([]);
      setSelectedTagId("");
      router.refresh();
    } catch (err) {
      setBulkMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error applying tag",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const allSelected = documents.length > 0 && selectedIds.length === documents.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < documents.length;

  return (
    <div className="space-y-3">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1">Status:</span>
          {[
            { label: "All", value: "ALL" },
            { label: "Pending", value: "PENDING" },
            { label: "In Progress", value: "IN_PROGRESS" },
            { label: "Completed", value: "COMPLETED" },
            { label: "Archived", value: "ARCHIVED" },
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => handleStatusFilter(pill.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                currentStatus === pill.value
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Department:</span>
          <select
            value={currentDept}
            onChange={(e) => handleDeptFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-hidden"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Floating / Active Bulk Operations Bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-accent/80 border border-primary/40 px-4 py-2.5 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
              {selectedIds.length}
            </span>
            <span>Document{selectedIds.length === 1 ? "" : "s"} selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Tag Selector */}
            {tags.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedTagId}
                  onChange={(e) => setSelectedTagId(e.target.value)}
                  disabled={bulkLoading}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-hidden"
                >
                  <option value="">Choose Tag to Apply…</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkTag}
                  disabled={bulkLoading || !selectedTagId}
                  className="h-8 text-xs px-2.5"
                >
                  <Tag size={13} className="mr-1" /> Apply Tag
                </Button>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkArchive}
              disabled={bulkLoading}
              className="h-8 text-xs px-2.5 text-destructive hover:bg-destructive/10"
            >
              <Archive size={13} className="mr-1" /> Bulk Archive
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              disabled={bulkLoading}
              className="h-8 text-xs px-2 text-muted-foreground"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {bulkMessage && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-md p-3 text-xs font-medium border",
            bulkMessage.type === "success"
              ? "bg-success/10 border-success/30 text-success"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          )}
        >
          {bulkMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{bulkMessage.text}</span>
        </div>
      )}

      {/* Main Ledger Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 font-medium">Reference No.</th>
              <th className="px-4 py-3 font-medium">Sender</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Currently At</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Days Open</th>
              <th className="px-4 py-3 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const isSelected = selectedIds.includes(doc.id);
              const cfg = DOCUMENT_STATUS_CONFIG[doc.status as keyof typeof DOCUMENT_STATUS_CONFIG] || {
                label: doc.status,
                text: "text-muted-foreground",
                bg: "bg-muted",
              };

              return (
                <tr
                  key={doc.id}
                  className={cn(
                    "border-b border-border last:border-0 hover:bg-background/60 transition-colors",
                    doc.isOverdue && "bg-destructive/5",
                    isSelected && "bg-accent/30"
                  )}
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => toggleSelectOne(doc.id, !!checked)}
                      aria-label={`Select ${doc.referenceNumber}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/documents/${doc.id}`}>
                      <RefNumber value={doc.referenceNumber} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <div className="truncate max-w-[160px]" title={doc.senderName}>
                      {doc.senderName}
                    </div>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted-foreground" title={doc.subject}>
                    {doc.subject}
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium">{doc.currentDept}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={cfg.label} textClass={cfg.text} bgClass={cfg.bg} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={doc.isOverdue ? "font-semibold text-destructive" : "text-muted-foreground"}>
                      {daysOpen(new Date(doc.receivedDate), doc.completedAt ? new Date(doc.completedAt) : null)} day(s)
                      {doc.isOverdue && " ⚠"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DocumentRowActions documentId={doc.id} status={doc.status} />
                  </td>
                </tr>
              );
            })}
            {documents.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  No documents found matching the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
