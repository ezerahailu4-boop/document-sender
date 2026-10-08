"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Tag, Plus, X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tag = {
  id: string;
  name: string;
  color: string | null;
};

type DocumentTag = {
  id: string;
  tag: Tag;
  appliedAt: string;
  appliedBy: {
    id: string;
    fullName: string;
  };
};

type DocumentTagsProps = {
  documentId: string;
  initialTags?: DocumentTag[];
};

export function DocumentTags({ documentId, initialTags = [] }: DocumentTagsProps) {
  const [tags, setTags] = useState<DocumentTag[]>(initialTags);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/documents/${documentId}/tags`);
      if (!res.ok) throw new Error("Failed to fetch document tags");
      const data = await res.json();
      setTags(data.documentTags || []);
    } catch (err) {
      setError("Failed to load document tags");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/tags`);
      if (!res.ok) throw new Error("Failed to fetch available tags");
      const data = await res.json();
      setAvailableTags(data.tags || []);
    } catch (err) {
      setError("Failed to load available tags");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addTag = async () => {
    if (!selectedTagId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: selectedTagId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add tag");
      }

      const newTag = await res.json();
      setTags(prev => [newTag.documentTag, ...prev]);
      setSelectedTagId(null);
      setInputValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add tag");
    } finally {
      setLoading(false);
    }
  };

  const removeTag = async (tagId: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to remove tag");
      }

      setTags(prev => prev.filter(t => t.tag.id !== tagId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove tag");
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchTags();
    fetchAvailableTags();
  }, [documentId]);

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Document Tags
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              fetchTags();
              fetchAvailableTags();
            }}
          >
            <Loader2 className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </div>

        {loading && tags.length === 0 && availableTags.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="h-5 w-5 text-secondary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading tags...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Tags */}
            <div className="border-b border-border pb-3">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Current Tags</h4>
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">No tags applied to this document.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <div key={tag.id} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                      {tag.tag.color && (
                        <div className="h-3 w-3 rounded" style={{ backgroundColor: tag.tag.color }} />
                      )}
                      <span className="font-medium text-foreground">{tag.tag.name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeTag(tag.tag.id)}
                        className="hover:text-destructive/80"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Tag Section */}
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Add Tag</h4>
              <div className="space-y-3">
                <div className="flex items-baseline gap-3 mb-2">
                  <Input
                    placeholder="Search for a tag..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={loading}
                    className="input-sm"
                  />
                  {inputValue.trim() !== "" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const matchingTag = availableTags.find(t =>
                          t.name.toLowerCase().includes(inputValue.toLowerCase())
                        );
                        if (matchingTag) {
                          setSelectedTagId(matchingTag.id);
                          setInputValue("");
                        }
                      }}
                    >
                      Search
                    </Button>
                  )}
                </div>

                {selectedTagId && (
                  <div className="border-t border-border pt-3">
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="font-medium text-foreground">Selected:</span>
                      {availableTags.find(t => t.id === selectedTagId)?.color && (
                        <div className="h-3 w-3 rounded" style={{ backgroundColor: availableTags.find(t => t.id === selectedTagId)?.color ?? undefined }} />
                      )}
                      <span className="font-medium text-foreground">
                        {availableTags.find(t => t.id === selectedTagId)?.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTagId(null)}
                        className="px-2"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={addTag}
                        disabled={loading || !selectedTagId}
                        className="px-3"
                      >
                        {loading ? "Adding..." : "Add Tag"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Available Tags List */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Available Tags</h4>
                  {availableTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">No tags available.</p>
                  ) : (
                    <div className="space-y-2">
                      {availableTags
                        .filter(tag =>
                          inputValue.trim() === "" ||
                          tag.name.toLowerCase().includes(inputValue.toLowerCase())
                        )
                        .slice(0, 8) // Limit to 8 results
                        .map(tag => (
                          <div key={tag.id} className="flex items-center gap-2 rounded-md border border-tag px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-foreground transition-all duration-150"
                            onClick={() => {
                              setSelectedTagId(tag.id);
                              setInputValue("");
                            }}
                          >
                            {tag.color && (
                              <div className="h-3 w-3 rounded" style={{ backgroundColor: tag.color }} />
                            )}
                            <span className="font-medium text-foreground">{tag.name}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}