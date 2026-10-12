"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select-native";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ListFilter, Trash2, Edit2, Check, X, Loader2 } from "lucide-react";

interface CustomFieldItem {
  id: string;
  name: string;
  fieldType: string;
  options: string | null;
  isRequired: boolean;
  usageCount: number;
}

const FIELD_TYPES = [
  { value: "text", label: "Text String" },
  { value: "number", label: "Number / Currency" },
  { value: "date", label: "Date" },
  { value: "select", label: "Single Select Dropdown" },
  { value: "checkbox", label: "Multi-select Checkboxes" },
];

export function CustomFieldsManager({ initialFields }: { initialFields: CustomFieldItem[] }) {
  const [fields, setFields] = useState<CustomFieldItem[]>(initialFields);
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [optionsStr, setOptionsStr] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRequired, setEditRequired] = useState(false);
  const [editOptions, setEditOptions] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError(null);

    let parsedOptions: string[] | null = null;
    if (fieldType === "select" || fieldType === "checkbox") {
      parsedOptions = optionsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (parsedOptions.length === 0) {
        setError("Please enter at least one option (comma-separated)");
        setCreating(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          fieldType,
          options: parsedOptions,
          isRequired,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create custom field");

      setFields((prev) => [...prev, { ...data.customField, usageCount: 0 }]);
      setName("");
      setOptionsStr("");
      setIsRequired(false);
      setFieldType("text");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating custom field");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSavingEdit(true);
    setError(null);

    let parsedOptions: string[] | null = null;
    const current = fields.find((f) => f.id === id);
    if (current && (current.fieldType === "select" || current.fieldType === "checkbox")) {
      parsedOptions = editOptions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    try {
      const res = await fetch(`/api/custom-fields/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          isRequired: editRequired,
          options: parsedOptions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update custom field");

      setFields((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                name: data.customField.name,
                isRequired: data.customField.isRequired,
                options: data.customField.options,
              }
            : f
        )
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating custom field");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string, fieldName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the field "${fieldName}"? All recorded values for this field across documents will also be removed.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/custom-fields/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete custom field");

      setFields((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting field");
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Field Form */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus size={16} className="text-primary" /> Add Custom Document Field
        </h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Field Label *</label>
              <Input
                placeholder="e.g. Contract Amount, Due Date, Tax ID"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Data Type</label>
              <Select value={fieldType} onChange={(e) => setFieldType(e.target.value)}>
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {(fieldType === "select" || fieldType === "checkbox") && (
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                Choices (comma separated) *
              </label>
              <Input
                placeholder="e.g. Low, Medium, High, Critical"
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="req-checkbox"
                checked={isRequired}
                onCheckedChange={(checked) => setIsRequired(!!checked)}
              />
              <label htmlFor="req-checkbox" className="text-xs text-foreground cursor-pointer">
                Mandatory field (required on document registration)
              </label>
            </div>

            <Button type="submit" disabled={creating || !name.trim()} size="sm">
              {creating ? <Loader2 size={16} className="animate-spin" /> : "Save Custom Field"}
            </Button>
          </div>
        </form>
        {error && <p className="mt-2 text-xs text-destructive font-medium">{error}</p>}
      </div>

      {/* Custom Fields List */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ListFilter size={16} className="text-primary" /> Active Metadata Fields ({fields.length})
          </h2>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Field Name</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Options</th>
              <th className="px-5 py-3 font-medium">Required</th>
              <th className="px-5 py-3 font-medium">Recorded In</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => {
              const isEditing = editingId === f.id;
              let parsedOpts: string[] = [];
              try {
                parsedOpts = f.options ? JSON.parse(f.options) : [];
              } catch {
                parsedOpts = [];
              }

              return (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-background/50">
                  <td className="px-5 py-3.5">
                    {isEditing ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-xs max-w-xs"
                      />
                    ) : (
                      <span className="font-semibold text-foreground">{f.name}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">
                      {f.fieldType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-xs truncate">
                    {isEditing && (f.fieldType === "select" || f.fieldType === "checkbox") ? (
                      <Input
                        value={editOptions}
                        onChange={(e) => setEditOptions(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="Option 1, Option 2"
                      />
                    ) : parsedOpts.length > 0 ? (
                      <span>{parsedOpts.join(", ")}</span>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {isEditing ? (
                      <Checkbox
                        checked={editRequired}
                        onCheckedChange={(c) => setEditRequired(!!c)}
                      />
                    ) : f.isRequired ? (
                      <span className="rounded bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                        Required
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Optional</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">
                    {f.usageCount} document{f.usageCount === 1 ? "" : "s"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveEdit(f.id)}
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
                            setEditingId(f.id);
                            setEditName(f.name);
                            setEditRequired(f.isRequired);
                            setEditOptions(parsedOpts.join(", "));
                          }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Edit field"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(f.id, f.name)}
                          className="h-8 w-8 p-0 text-destructive/70 hover:text-destructive"
                          title="Delete field"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {fields.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No custom fields configured yet. Add fields to collect specific metadata during document workflows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
