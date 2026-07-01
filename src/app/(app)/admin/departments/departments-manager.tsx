"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Plus, Trash2, Building2, FileStack, Users as UsersIcon } from "lucide-react";

type Dept = {
  id: string;
  name: string;
  code: string;
  isGmOffice: boolean;
  _count: { users: number; routesTo: number };
};

export function DepartmentsManager({ initialDepartments }: { initialDepartments: Dept[] }) {
  const [departments, setDepartments] = useState(initialDepartments);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isGm, setIsGm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/departments");
    const data = await res.json();
    if (data.departments) setDepartments(data.departments);
  }

  async function createDept(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code, isGmOffice: isGm }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setName(""); setCode(""); setIsGm(false);
    await refresh();
  }

  async function setAsGm(id: string) {
    await fetch(`/api/admin/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isGmOffice: true }),
    });
    await refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this department? This only works if it has no document history.")) return;
    const res = await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    await refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createDept} className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Plus size={16} className="text-primary" /> Add a department
        </h2>
        {error && <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="dname">Name</Label>
            <Input id="dname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Finance Department" required />
          </div>
          <div>
            <Label htmlFor="dcode">Short code</Label>
            <Input id="dcode" value={code} onChange={(e) => setCode(e.target.value)} placeholder="FIN" required maxLength={6} />
          </div>
        </div>
        <label className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={isGm} onChange={(e) => setIsGm(e.target.checked)} className="accent-primary" />
          This is the GM&apos;s office (every new document routes here first)
        </label>
        <Button type="submit" disabled={loading}>
          <Plus size={14} /> {loading ? "Adding…" : "Add department"}
        </Button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {departments.map((d) => (
          <div key={d.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary/15 text-secondary">
                  <Building2 size={18} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{d.name}</p>
                  <p className="font-mono-tight text-xs text-muted-foreground">{d.code}</p>
                </div>
              </div>
              <button onClick={() => remove(d.id)} className="text-muted-foreground hover:text-destructive" title="Delete">
                <Trash2 size={14} />
              </button>
            </div>

            <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><UsersIcon size={12} /> {d._count.users} user(s)</span>
              <span className="flex items-center gap-1"><FileStack size={12} /> {d._count.routesTo} document(s) handled</span>
            </div>

            {d.isGmOffice ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-primary">
                <Crown size={12} /> GM Office
              </span>
            ) : (
              <button
                onClick={() => setAsGm(d.id)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                Set as GM office
              </button>
            )}
          </div>
        ))}
        {departments.length === 0 && (
          <p className="col-span-2 py-8 text-center text-sm text-muted-foreground">No departments yet — add one above.</p>
        )}
      </div>
    </div>
  );
}
