"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select-native";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, AlertCircle, Info, RefreshCw } from "lucide-react";

type CustomField = {
  id: string;
  name: string;
  fieldType: string;
  options: string | null;
  isRequired: boolean;
};

type CustomFieldValue = {
  id?: string;
  customFieldId: string;
  customField?: CustomField;
  value: string | null;
};

type CustomFieldsEditorProps = {
  documentId: string;
  initialFields?: CustomField[];
  initialValues?: CustomFieldValue[];
};

export function CustomFieldsEditor({
  documentId,
  initialFields = [],
  initialValues = [],
}: CustomFieldsEditorProps) {
  const [fields, setFields] = useState<CustomField[]>(initialFields);
  const [values, setValues] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {};
    for (const val of initialValues) {
      init[val.customFieldId] = val.value;
    }
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fieldsRes, valuesRes] = await Promise.all([
        fetch("/api/custom-fields"),
        fetch(`/api/documents/${documentId}/custom-values`),
      ]);

      if (!fieldsRes.ok) throw new Error("Failed to fetch custom fields list");
      const fieldsData = await fieldsRes.json();
      setFields(fieldsData.customFields || []);

      if (valuesRes.ok) {
        const valuesData = await valuesRes.json();
        const nextVals: Record<string, string | null> = {};
        for (const cv of valuesData.customValues || []) {
          nextVals[cv.customFieldId] =
            typeof cv.value === "object" && cv.value !== null
              ? JSON.stringify(cv.value)
              : cv.value !== null && cv.value !== undefined
              ? String(cv.value)
              : null;
        }
        setValues(nextVals);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load custom fields");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/custom-fields"),
      fetch(`/api/documents/${documentId}/custom-values`),
    ])
      .then(async ([fieldsRes, valuesRes]) => {
        if (!fieldsRes.ok) throw new Error("Failed to fetch custom fields list");
        const fieldsData = await fieldsRes.json();
        let nextVals: Record<string, string | null> | null = null;
        if (valuesRes.ok) {
          const valuesData = await valuesRes.json();
          nextVals = {};
          for (const cv of valuesData.customValues || []) {
            nextVals[cv.customFieldId] =
              typeof cv.value === "object" && cv.value !== null
                ? JSON.stringify(cv.value)
                : cv.value !== null && cv.value !== undefined
                ? String(cv.value)
                : null;
          }
        }
        if (!cancelled) {
          setFields(fieldsData.customFields || []);
          if (nextVals) setValues(nextVals);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load custom fields");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // Validate required fields
      for (const field of fields) {
        if (field.isRequired && (!values[field.id] || values[field.id]?.trim() === "")) {
          throw new Error(`"${field.name}" is a required field`);
        }
      }

      // Save each value to the backend API
      const savePromises = fields.map(async (field) => {
        const val = values[field.id];
        return fetch(`/api/documents/${documentId}/custom-values`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customFieldId: field.id,
            value: val ?? "",
          }),
        });
      });

      const responses = await Promise.all(savePromises);
      const failed = responses.find((r) => !r.ok);
      if (failed) {
        const errJson = await failed.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to save some field values");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save custom field values");
    } finally {
      setSaving(false);
    }
  };

  const renderFieldInput = (field: CustomField) => {
    const value = values[field.id] || "";

    switch (field.fieldType) {
      case "text":
        return (
          <Input
            placeholder={`Enter ${field.name}`}
            value={value}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, [field.id]: e.target.value || null }));
            }}
            disabled={saving}
            className="input-sm"
          />
        );

      case "number":
        return (
          <Input
            placeholder={`Enter ${field.name}`}
            type="number"
            value={value}
            onChange={(e) => {
              setValues((prev) => ({
                ...prev,
                [field.id]: e.target.value === "" ? null : e.target.value,
              }));
            }}
            disabled={saving}
            className="input-sm"
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={value ? value.slice(0, 10) : ""}
            onChange={(e) => {
              setValues((prev) => ({
                ...prev,
                [field.id]: e.target.value === "" ? null : e.target.value,
              }));
            }}
            disabled={saving}
            className="input-sm"
          />
        );

      case "select": {
        let options: string[] = [];
        try {
          options = field.options ? JSON.parse(field.options) : [];
        } catch {
          options = [];
        }
        return (
          <Select
            value={value}
            onChange={(e) => {
              const val = e.target.value;
              setValues((prev) => ({
                ...prev,
                [field.id]: val === "" ? null : val,
              }));
            }}
            disabled={saving}
          >
            <option value="">Select an option...</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        );
      }

      case "checkbox": {
        let checkboxOptions: string[] = [];
        try {
          checkboxOptions = field.options ? JSON.parse(field.options) : [];
        } catch {
          checkboxOptions = [];
        }

        let currentSelected: string[] = [];
        try {
          currentSelected = value ? (JSON.parse(value) as string[]) : [];
        } catch {
          currentSelected = [];
        }

        return (
          <div className="space-y-1.5 pl-1">
            {checkboxOptions.map((option) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={`${field.id}-${option}`}
                  checked={currentSelected.includes(option)}
                  onCheckedChange={(checked) => {
                    setValues((prev) => {
                      const raw = prev[field.id];
                      let list: string[] = [];
                      try {
                        list = raw ? (JSON.parse(raw) as string[]) : [];
                      } catch {
                        list = [];
                      }
                      const nextList = checked
                        ? [...list.filter((o) => o !== option), option]
                        : list.filter((o) => o !== option);
                      return {
                        ...prev,
                        [field.id]: nextList.length > 0 ? JSON.stringify(nextList) : null,
                      };
                    });
                  }}
                  disabled={saving}
                />
                <label
                  htmlFor={`${field.id}-${option}`}
                  className="text-sm text-foreground cursor-pointer select-none"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        );
      }

      default:
        return (
          <Input
            placeholder={`Enter ${field.name}`}
            value={value}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, [field.id]: e.target.value || null }));
            }}
            disabled={saving}
            className="input-sm"
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Document Metadata & Custom Fields
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={loading || saving}
            className="h-8 px-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {loading && fields.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading custom fields...</p>
          </div>
        ) : fields.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border rounded-md">
            <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No custom fields defined</p>
            <p className="text-xs text-muted-foreground mt-1">
              Administrators can define custom fields in the Admin &gt; Custom Fields panel.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field) => (
                <div key={field.id} className="rounded-md border border-border p-3 bg-background/50">
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      {field.name}
                      {field.isRequired && <span className="text-destructive">*</span>}
                    </label>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      {field.fieldType}
                    </span>
                  </div>
                  {renderFieldInput(field)}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              {saved && (
                <span className="flex items-center text-xs font-medium text-success">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> All custom fields saved!
                </span>
              )}
              <Button type="submit" size="sm" disabled={saving || loading}>
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Metadata"
                )}
              </Button>
            </div>
          </form>
        )}

        {error && <p className="mt-2 text-xs text-destructive font-medium">{error}</p>}
      </div>
    </div>
  );
}