"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Crown, Plus, Trash2 } from "lucide-react";

type Dept = {
  id: string;
  name: string;
  code: string;
  isGmOffice: boolean;
  _count: { users: number };
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
      <form onSubmit={createDept} className="rounded-lg border border-rule bg-paper-raised p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-ink">Add a department</h2>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="dname">Name</Label>
            <Input id="dname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Finance Department" required />
          </div>
          <div>
            <Label htmlFor="dcode">Short code</Label>
            <Input id="dcode" value={code} onChange={(e) => setCode(e.target.value)} placeholder="FIN" required maxLength={6} />
          </div>
        </div>
        <label className="mb-4 flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={isGm} onChange={(e) => setIsGm(e.target.checked)} />
          This is the GM&apos;s office (every new document routes here first)
        </label>
        <Button type="submit" disabled={loading}>
          <Plus size={14} /> {loading ? "Adding…" : "Add department"}
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border border-rule bg-paper-raised shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule bg-paper text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3">GM Office</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id} className="border-b border-rule last:border-0">
                <td className="px-4 py-3 text-ink">{d.name}</td>
                <td className="px-4 py-3 font-mono-tight text-ink-soft">{d.code}</td>
                <td className="px-4 py-3 text-ink-soft">{d._count.users}</td>
                <td className="px-4 py-3">
                  {d.isGmOffice ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-stamp">
                      <Crown size={14} /> GM Office
                    </span>
                  ) : (
                    <button onClick={() => setAsGm(d.id)} className="text-xs text-ink-soft underline hover:text-ink">
                      Set as GM office
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove(d.id)} className="text-ink-soft hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
