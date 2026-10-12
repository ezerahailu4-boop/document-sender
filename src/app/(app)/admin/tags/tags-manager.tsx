"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Tag as TagIcon, Trash2, Edit2, Check, X, Loader2 } from "lucide-react";

interface TagItem {
  id: string;
  name: string;
  color: string | null;
  documentCount: number;
}

const PRESET_COLORS = [
  "#dc2626", // red
  "#ea580c", // orange
  "#d97706", // amber
  "#16a34a", // green
  "#0d9488", // teal
  "#0284c7", // light blue
  "#2563eb", // blue
  "#7c3aed", // violet
  "#c026d3", // fuchsia
  "#475569", // slate
];

export function TagsManager({ initialTags }: { initialTags: TagItem[] }) {
  const [tags, setTags] = useState<TagItem[]>(initialTags);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create tag");

      setTags((prev) => [...prev, { ...data.tag, documentCount: 0 }]);
      setNewTagName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating tag");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSavingEdit(true);
    setError(null);

    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update tag");

      setTags((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: data.tag.name, color: data.tag.color } : t))
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating tag");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the tag "${name}"? It will be removed from all documents.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete tag");

      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting tag");
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Tag Card */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus size={16} className="text-primary" /> Create New Tag
        </h3>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Tag name (e.g. Urgent, Legal, Confidential, Procurement)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${
                    newTagColor === color ? "scale-110 border-foreground shadow-sm" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <Button type="submit" disabled={creating || !newTagName.trim()} className="shrink-0">
              {creating ? <Loader2 size={16} className="animate-spin" /> : "Add Tag"}
            </Button>
          </div>
        </form>
        {error && <p className="mt-2 text-xs text-destructive font-medium">{error}</p>}
      </div>

      {/* Tags Table */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TagIcon size={16} className="text-primary" /> System Tags ({tags.length})
          </h2>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Tag</th>
              <th className="px-5 py-3 font-medium">Color</th>
              <th className="px-5 py-3 font-medium">Documents Tagged</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => {
              const isEditing = editingId === tag.id;
              return (
                <tr key={tag.id} className="border-b border-border last:border-0 hover:bg-background/50">
                  <td className="px-5 py-3.5">
                    {isEditing ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-xs max-w-xs"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color || "#6b7280" }}
                        />
                        <span className="font-medium text-foreground">{tag.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        {PRESET_COLORS.slice(0, 6).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            className={`h-5 w-5 rounded-full border ${editColor === c ? "border-foreground scale-110" : "border-transparent opacity-70"}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">{tag.color || "None"}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      {tag.documentCount} document{tag.documentCount === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveEdit(tag.id)}
                          disabled={savingEdit}
                          className="h-8 w-8 p-0 text-success"
                        >
                          <Check size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          className="h-8 w-8 p-0 text-muted-foreground"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(tag.id);
                            setEditName(tag.name);
                            setEditColor(tag.color);
                          }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Edit tag"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(tag.id, tag.name)}
                          className="h-8 w-8 p-0 text-destructive/70 hover:text-destructive"
                          title="Delete tag"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {tags.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No tags created yet. Use the form above to add your first document label.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
