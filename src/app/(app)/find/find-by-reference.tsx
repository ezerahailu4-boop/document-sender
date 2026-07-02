"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, FileStack } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RefNumber } from "@/components/ui/ref-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { DOCUMENT_STATUS_CONFIG } from "@/lib/status";

type Result = {
  id: string;
  referenceNumber: string;
  subject: string;
  senderName: string;
  status: keyof typeof DOCUMENT_STATUS_CONFIG;
  currentDept: string | null;
};

export function FindByReference() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/documents/lookup?ref=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.documents ?? []);
      setLoading(false);
      setSearched(true);
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. TAF/IN/2026/001"
          className="h-12 pl-9 text-base ref-stamp"
        />
      </div>

      {loading && <p className="text-sm text-muted-foreground">Searching…</p>}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-12 text-center">
          <FileStack className="mb-3 text-muted-foreground" size={28} />
          <p className="text-sm text-muted-foreground">No documents match &ldquo;{query}&rdquo;.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((doc) => {
            const cfg = DOCUMENT_STATUS_CONFIG[doc.status];
            return (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <RefNumber value={doc.referenceNumber} />
                  <StatusBadge label={cfg.label} textClass={cfg.text} bgClass={cfg.bg} />
                </div>
                <p className="font-medium text-foreground">{doc.subject}</p>
                <p className="text-sm text-muted-foreground">
                  From {doc.senderName}
                  {doc.currentDept && ` · currently at ${doc.currentDept}`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
