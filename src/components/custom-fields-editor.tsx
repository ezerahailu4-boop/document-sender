"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Edit, CheckCircle2, X, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type CustomField = {
  id: string;
  name: string;
  fieldType: string;
  options: string | null;
  isRequired: boolean;
};

type CustomFieldValue = {
  id: string;
  customFieldId: string;
  customField: CustomField;
  value: string | null;
};

type CustomFieldsEditorProps = {
  documentId: string;
  initialFields?: CustomField[];
  initialValues?: CustomFieldValue[];
};

export function CustomFieldsEditor({ documentId, initialFields = [], initialValues = [] }: CustomFieldsEditorProps) {
  const [fields, setFields] = useState<CustomField[]>(initialFields);
  const [values, setValues] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Initialize values from props
  useEffect(() => {
    const valuesObj: Record<string, string | null> = {};
    initialValues.forEach(val => {
      valuesObj[val.customFieldId] = val.value;
    });
    setValues(valuesObj);
  }, [initialValues]);

  const fetchFields = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/custom-fields`);
      if (!res.ok) throw new Error("Failed to fetch custom fields");
      const data = await res.json();
      setFields(data.customFields || []);
    } catch (err) {
      setError("Failed to load custom fields");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchValues = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/documents/${documentId}/custom-values`);
      if (!res.ok) throw new Error("Failed to fetch custom values");
      const data = await res.json();

      const valuesObj: Record<string, string | null> = {};
      data.customValues.forEach((val: any) => {
        valuesObj[val.customFieldId] = val.value;
      });
      setValues(valuesObj);
    } catch (err) {
      setError("Failed to load custom field values");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      // In a real implementation, we would send each value to the API
      // For now, we'll just simulate saving
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSaved(true);

      // Reset saved state after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save custom field values");
    } finally {
      setLoading(false);
    }
  };

  const renderFieldInput = (field: CustomField) => {
    const value = values[field.id] || "";

    switch (field.fieldType) {
      case "text":
        return (
          <Input
            key={field.id}
            placeholder={`Enter ${field.name}`}
            value={value}
            onChange={(e) => {
              setValues(prev => ({ ...prev, [field.id]: e.target.value || null }));
            }}
            disabled={loading}
            className="input-sm"
          />
        );

      case "number":
        return (
          <Input
            key={field.id}
            placeholder={`Enter ${field.name}`}
            type="number"
            value={value === "" || value === null ? "" : value}
            onChange={(e) => {
              setValues(prev => ({
                ...prev,
                [field.id]: e.target.value === "" ? null : e.target.value
              }));
            }}
            disabled={loading}
            className="input-sm"
          />
        );

      case "date":
        return (
          <Input
            key={field.id}
            placeholder={`Select ${field.name}`}
            type="date"
            value={value === "" || value === null ? "" : value}
            onChange={(e) => {
              setValues(prev => ({
                ...prev,
                [field.id]: e.target.value === "" ? null : e.target.value
              }));
            }}
            disabled={loading}
            className="input-sm"
          />
        );

      case "select": {
        const options: string[] = field.options ? JSON.parse(field.options) : [];
        return (
          <Select
            key={field.id}
            value={value === "" || value === null ? "" : value}
            onChange={(e) => {
              const val = e.target.value;
              setValues(prev => ({
                ...prev,
                [field.id]: val === "" ? null : val
              }));
            }}
            disabled={loading}
          >
            <option value="">Select an option...</option>
            {options.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        );
      }

      case "checkbox": {
        const checkboxOptions: string[] = field.options ? JSON.parse(field.options) : [];
        const currentSelected: string[] = (() => {
          try {
            return value ? (JSON.parse(value) as string[]) : [];
          } catch {
            return [];
          }
        })();

        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-foreground">{field.name}</span>
              {field.isRequired && <span className="text-destructive">*</span>}
            </div>
            <div className="space-y-1 pl-2">
              {checkboxOptions.map((option: string) => (
                <div key={option} className="flex items-start gap-2">
                  <Checkbox
                    checked={currentSelected.includes(option)}
                    onCheckedChange={(checked) => {
                      setValues(prev => {
                        const raw = prev[field.id];
                        let list: string[] = [];
                        try {
                          list = raw ? (JSON.parse(raw) as string[]) : [];
                        } catch {
                          list = [];
                        }
                        const nextList = checked
                          ? [...list.filter(o => o !== option), option]
                          : list.filter(o => o !== option);
                        return {
                          ...prev,
                          [field.id]: nextList.length > 0 ? JSON.stringify(nextList) : null
                        };
                      });
                    }}
                  />
                  <span className="text-sm text-foreground">{option}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      default:
        return (
          <Input
            key={field.id}
            placeholder={`Enter ${field.name}`}
            value={value}
            onChange={(e) => {
              setValues(prev => ({ ...prev, [field.id]: e.target.value || null }));
            }}
            disabled={loading}
            className="input-sm"
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Custom Fields
          </h3>
          {fields.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchFields}
              className="px-3"
            >
              <Loader2 className="h-3 w-3 mr-1" /> Refresh
            </Button>
          )}
        </div>

        {loading && fields.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="h-5 w-5 text-secondary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading custom fields...</p>
          </div>
        ) : (
          fields.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-4 w-4 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No custom fields available.</p>
              <Button
                variant="default"
                size="sm"
                onClick={fetchFields}
                className="px-4"
              >
                Load Custom Fields
              </Button>
            </div>
          ) : (
            <form className="space-y-4">
              {fields.map(field => (
                <div key={field.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="font-medium text-foreground w-40">{field.name}</span>
                    {field.isRequired && <span className="text-destructive">*</span>}
                    <span className="text-xs text-muted-foreground">
                      ({field.fieldType}{field.options ? " [select]" : ""})
                    </span>
                  </div>
                  {renderFieldInput(field)}
                  {field.isRequired && !values[field.id] && (
                    <p className="mt-1 text-sm text-destructive">This field is required</p>
                  )}
                </div>
              ))}

              <div className="flex justify-end mt-4">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                {saved && (
                  <span className="ml-3 text-sm text-success">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Saved!
                  </span>
                )}
              </div>
            </form>
          )
        )}

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}