"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Download,
  RefreshCw,
  FileText,
  Clock,
  User,
  AlertCircle,
  UploadCloud,
  Plus,
  X,
  CheckCircle2,
} from "lucide-react";
import { ACCEPTED_FILE_EXTENSIONS, ACCEPTED_FILE_LABEL } from "@/lib/file-type";

type DocumentVersion = {
  id: string;
  versionNum: number;
  filePath: string;
  fileSizeBytes: number | null;
  mimeType: string | null;
  createdBy: {
    id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
  notes: string | null;
};

type DocumentVersionHistoryProps = {
  documentId: string;
  initialVersions?: DocumentVersion[];
};

export function DocumentVersionHistory({
  documentId,
  initialVersions = [],
}: DocumentVersionHistoryProps) {
  const router = useRouter();
  const [versions, setVersions] = useState<DocumentVersion[]>(initialVersions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload modal/form state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/documents/${documentId}/versions`);
      if (!res.ok) throw new Error("Failed to fetch versions");
      const data = await res.json();
      setVersions(data.versions || []);
    } catch (err) {
      setError("Failed to load version history");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents/${documentId}/versions`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch versions");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setVersions(data.versions || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError("Failed to load version history");
          setLoading(false);
          console.error(err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const handleDownload = async (versionId: string, versionNum: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/documents/${documentId}/versions/${versionId}/download`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to download version");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `document_v${versionNum}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download version");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setError("Please choose a file to upload as the new version");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }

      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload new version");
      }

      setUploadSuccess(true);
      setUploadFile(null);
      setNotes("");
      setShowUpload(false);
      await fetchVersions();
      router.refresh();
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Document Version History</h3>
            <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-medium text-secondary">
              {versions.length} {versions.length === 1 ? "version" : "versions"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
              className="h-8 text-xs"
            >
              {showUpload ? <X className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              {showUpload ? "Cancel" : "Upload New Version"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchVersions}
              disabled={loading}
              className="h-8 px-2 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {uploadSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-success/10 border border-success/30 px-3 py-2 text-xs text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>New version successfully uploaded and activated as primary document file!</span>
          </div>
        )}

        {/* Upload New Version Form */}
        {showUpload && (
          <form
            onSubmit={handleUploadVersion}
            className="mb-4 rounded-lg border border-primary/30 bg-accent/30 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Upload Revised or Scanned Version</p>
              <span className="text-[11px] text-muted-foreground">{ACCEPTED_FILE_LABEL}, max 25MB</span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-card p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {uploadFile ? (
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>{uploadFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({formatFileSize(uploadFile.size)})
                  </span>
                </div>
              ) : (
                <>
                  <UploadCloud className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Click to select new document file</span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_EXTENSIONS}
              className="hidden"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Version Notes / Change Summary (optional)
              </label>
              <Textarea
                rows={2}
                placeholder="e.g. Added signed cover page, fixed illegible scan"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowUpload(false);
                  setUploadFile(null);
                  setNotes("");
                }}
                disabled={uploading}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={uploading || !uploadFile} className="h-8 text-xs">
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading...
                  </>
                ) : (
                  "Submit Version"
                )}
              </Button>
            </div>
          </form>
        )}

        {loading && versions.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading version history...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-md">
            <AlertCircle className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No extra version history available for this document.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version, idx) => (
              <div
                key={version.id}
                className="flex items-center justify-between rounded-lg border border-border p-3.5 bg-background/50 hover:bg-background transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm text-foreground">Version {version.versionNum}</span>
                    {idx === 0 && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        Current
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatFileSize(version.fileSizeBytes)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {version.createdBy.fullName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(version.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {version.notes && (
                    <p className="mt-1.5 text-xs text-foreground bg-muted/30 rounded px-2 py-1 inline-block">
                      {version.notes}
                    </p>
                  )}
                </div>

                <div className="ml-4 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(version.id, version.versionNum)}
                    className="h-8 px-2.5 text-xs"
                    title={`Download Version ${version.versionNum}`}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-2 text-xs text-destructive font-medium">{error}</p>}
      </div>
    </div>
  );
}