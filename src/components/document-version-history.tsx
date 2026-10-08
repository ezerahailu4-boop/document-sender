"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Download, RefreshCw, FileText, Clock, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function DocumentVersionHistory({ documentId, initialVersions = [] }: DocumentVersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>(initialVersions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = async () => {
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
  };

  const handleDownload = async (versionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/documents/${documentId}/versions/${versionId}/download`, {
        method: "POST"
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to download version");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `document_v${Date.now()}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download version");
    } finally {
      setLoading(false);
    }
  };

  // Format file size
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
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Document Version History
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchVersions}
          >
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </div>

        {loading && versions.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="h-5 w-5 text-secondary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading version history...</p>
          </div>
        ) : (
          versions.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-4 w-4 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No version history available for this document.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map(version => (
                <div key={version.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium text-foreground">Version {version.versionNum}</span>
                          <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-secondary/20 text-secondary rounded">
                            v{version.versionNum}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-2 w-2 mr-1" />
                            <span>{version.createdBy.fullName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-2 w-2 mr-1" />
                            <span>{new Date(version.createdAt).toLocaleString()}</span>
                          </div>
                          {version.fileSizeBytes ? (
                            <>
                              <span className="ml-2">•</span>
                              <span className="ml-1 text-xs text-muted-foreground">
                                {formatFileSize(version.fileSizeBytes)}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      {version.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          <strong>Notes:</strong> {version.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(version.id)}
                      className="px-3"
                    >
                      <Download className="h-3 w-3 mr-1" /> Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}