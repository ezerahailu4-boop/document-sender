"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select-native";
import { ROLE_LABELS } from "@/lib/status";
import { Plus, Search, Pencil, Check, X } from "lucide-react";

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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function UserAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-sm font-semibold text-secondary">
      {initials(name)}
    </div>
  );
}

function EditableRow({
  u,
  departments,
  onSaved,
}: {
  u: Usr;
  departments: Dept[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(u.role);
  const [departmentId, setDepartmentId] = useState(u.department?.id ?? "");
  const [loading, setLoading] = useState(false);
  const needsDept = role === "DEPARTMENT_USER" || role === "DEPARTMENT_HEAD" || role === "GM";

  async function save() {
    setLoading(true);
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, departmentId: needsDept ? departmentId || null : null }),
    });
    setLoading(false);
    setEditing(false);
    onSaved();
  }

  async function toggleActive() {
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    onSaved();
  }

  if (editing) {
    return (
      <tr className="border-b border-border bg-card last:border-0">
        <td className="px-4 py-3" colSpan={2}>
          <div className="flex items-center gap-3">
            <UserAvatar name={u.fullName} />
            <div>
              <p className="font-medium text-foreground">{u.fullName}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Select value={role} onChange={(e) => setRole(e.target.value as keyof typeof ROLE_LABELS)} className="h-9">
            {ROLE_OPTIONS.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </Select>
        </td>
        <td className="px-4 py-3">
          {needsDept ? (
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="h-9">
              <option value="">Select…</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-muted-foreground">{u.isActive ? "Active" : "Inactive"}</td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2">
            <button onClick={save} disabled={loading} className="text-success hover:opacity-70">
              <Check size={16} />
            </button>
            <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-background">
      <td className="px-4 py-3" colSpan={2}>
        <div className="flex items-center gap-3">
          <UserAvatar name={u.fullName} />
          <div>
            <p className="font-medium text-foreground">{u.fullName}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{ROLE_LABELS[u.role]}</td>
      <td className="px-4 py-3 text-muted-foreground">{u.department?.name ?? "—"}</td>
      <td className="px-4 py-3">
        <span className={u.isActive ? "text-success" : "text-muted-foreground"}>
          {u.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-3">
          <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground" title="Edit role/department">
            <Pencil size={14} />
          </button>
          <button onClick={toggleActive} className="text-xs text-muted-foreground underline hover:text-foreground">
            {u.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function UsersManager({ initialUsers, departments }: { initialUsers: Usr[]; departments: Dept[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
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

  const filtered = users.filter((u) =>
    !search ||
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <form onSubmit={createUser} className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Plus size={16} className="text-primary" /> Add a user
        </h2>
        {error && <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </div>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users…"
          className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3" colSpan={2}>User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <EditableRow key={u.id} u={u} departments={departments} onSaved={refresh} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No users match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
