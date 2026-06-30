"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { ROLE_LABELS } from "@/lib/status";
import { Plus } from "lucide-react";

type Dept = { id: string; name: string };
type Usr = {
  id: string;
  fullName: string;
  email: string;
  role: keyof typeof ROLE_LABELS;
  isActive: boolean;
  department: Dept | null;
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [keyof typeof ROLE_LABELS, string][];

export function UsersManager({ initialUsers, departments }: { initialUsers: Usr[]; departments: Dept[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<keyof typeof ROLE_LABELS>("DEPARTMENT_USER");
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const needsDept = role === "DEPARTMENT_USER" || role === "DEPARTMENT_HEAD" || role === "GM";

  async function refresh() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (data.users) setUsers(data.users);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password, role, departmentId: departmentId || null }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setFullName(""); setEmail(""); setPassword(""); setRole("DEPARTMENT_USER"); setDepartmentId("");
    await refresh();
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    await refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createUser} className="rounded-lg border border-rule bg-paper-raised p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-ink">Add a user</h2>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="password">Temporary password</Label>
            <Input id="password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select id="role" value={role} onChange={(e) => setRole(e.target.value as keyof typeof ROLE_LABELS)}>
              {ROLE_OPTIONS.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </Select>
          </div>
        </div>
        {needsDept && (
          <div className="mb-4">
            <Label htmlFor="dept">Department</Label>
            <Select id="dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
              <option value="">Select department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
        )}
        <Button type="submit" disabled={loading}>
          <Plus size={14} /> {loading ? "Creating…" : "Create user"}
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border border-rule bg-paper-raised shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule bg-paper text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-rule last:border-0">
                <td className="px-4 py-3 text-ink">{u.fullName}</td>
                <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                <td className="px-4 py-3 text-ink-soft">{ROLE_LABELS[u.role]}</td>
                <td className="px-4 py-3 text-ink-soft">{u.department?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={u.isActive ? "text-status-completed" : "text-ink-soft"}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleActive(u.id, u.isActive)}
                    className="text-xs text-ink-soft underline hover:text-ink"
                  >
                    {u.isActive ? "Deactivate" : "Activate"}
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
