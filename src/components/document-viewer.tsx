"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ExternalLink,
  Download,
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";

interface DocumentViewerProps {
  documentId: string;
  subject: string;
  mimeType?: string | null;
  className?: string;
}

export function DocumentViewer({
  documentId,
  subject,
  mimeType: initialMimeType,
  className = "",
}: DocumentViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(initialMimeType || null);
  const [originalFileName, setOriginalFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchFile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/documents/${documentId}/file`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load document file");
      }
      const data = await res.json();
      if (!data.url) {
        throw new Error("No file URL returned");
      }
      setUrl(data.url);
      if (data.mimeType) setMimeType(data.mimeType);
      if (data.originalFileName) setOriginalFileName(data.originalFileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading document");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/documents/${documentId}/file`);
        if (ignore) return;
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load document file");
        }
        const data = await res.json();
        if (ignore) return;
        if (!data.url) throw new Error("No file URL returned");
        setUrl(data.url);
        if (data.mimeType) setMimeType(data.mimeType);
        if (data.originalFileName) setOriginalFileName(data.originalFileName);
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Error loading document");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [documentId]);

  const isPdf = mimeType?.includes("pdf") || originalFileName?.toLowerCase().endsWith(".pdf");
  const isImage =
    mimeType?.startsWith("image/") ||
    [".jpg", ".jpeg", ".png", ".webp"].some((ext) => originalFileName?.toLowerCase().endsWith(ext));

  return (
    <div
      className={`flex flex-col rounded-lg border border-border bg-card shadow-sm overflow-hidden transition-all duration-200 ${
        isExpanded ? "fixed inset-4 z-50 bg-background max-h-none h-[calc(100vh-2rem)]" : className
      }`}
    >
      {/* Viewer Header / Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {isImage ? (
            <ImageIcon className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <FileText className="h-4 w-4 text-primary shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground truncate" title={subject}>
            {originalFileName || subject}
          </span>
          {mimeType && (
            <span className="hidden sm:inline-block rounded bg-primary/10 px-2 py-0.5 text-xs text-primary font-mono shrink-0">
              {mimeType.split("/")[1]?.toUpperCase() || mimeType}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchFile}
            disabled={loading}
            className="h-8 px-2 text-xs"
            title="Reload file"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline ml-1">Reload</span>
          </Button>

          {url && (
            <>
              <a href={url} target="_blank" rel="noopener noreferrer" download={originalFileName || true}>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" title="Download">
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline ml-1">Download</span>
                </Button>
              </a>

              <a href={url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" title="Open in new window">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline ml-1">Open</span>
                </Button>
              </a>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 px-2 text-xs"
                title={isExpanded ? "Exit full view" : "Expand viewer"}
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Viewer Body */}
      <div className="relative flex-1 min-h-[420px] bg-muted/20 flex items-center justify-center p-2">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">Loading document preview…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4 max-w-md">
            <AlertCircle className="h-8 w-8 text-destructive mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">Failed to load preview</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchFile}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try Again
            </Button>
          </div>
        )}

        {!loading && !error && url && (
          <>
            {isPdf ? (
              <iframe
                src={`${url}#toolbar=1&navpanes=0`}
                className="w-full h-full min-h-[500px] rounded border border-border bg-white"
                title={subject}
              />
            ) : isImage ? (
              <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={subject}
                  className="max-h-[600px] w-auto max-w-full rounded object-contain shadow-sm border border-border"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <FileText className="h-12 w-12 text-primary/70 mb-3" />
                <p className="text-sm font-semibold text-foreground mb-1">Preview not available directly in browser</p>
                <p className="text-xs text-muted-foreground max-w-sm mb-4">
                  This document format ({mimeType || "unknown"}) cannot be rendered inline. You can download or open it in your desktop application.
                </p>
                <div className="flex gap-2">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="default">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open File
                    </Button>
                  </a>
                  <a href={url} target="_blank" rel="noopener noreferrer" download={originalFileName || true}>
                    <Button size="sm" variant="outline">
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
