"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select-native";
import { Input } from "@/components/ui/input";
import { Eye, Send, CheckCircle, Undo2, Search, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Dept = { id: string; name: string };
type RoutableUser = { id: string; fullName: string; role: string; departmentId: string; departmentName: string };
type Mode = "idle" | "forwarding" | "returning";

export function InboxRowActions({
  routeId,
  documentId,
  status,
  departments,
  canReturn,
  isGm,
}: {
  routeId: string;
  documentId: string;
  status: string;
  filePath: string;
  departments: Dept[];
  canReturn: boolean;
  isGm?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [destDept, setDestDept] = useState("");
  const [selectedUser, setSelectedUser] = useState<RoutableUser | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [routableUsers, setRoutableUsers] = useState<RoutableUser[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "forwarding" && isGm && routableUsers.length === 0) {
      fetch("/api/users/routable")
        .then((r) => r.json())
        .then((data) => setRoutableUsers(data.users ?? []));
    }
  }, [mode, isGm, routableUsers.length]);

  const filteredUsers = useMemo(() => {
    if (!userQuery.trim()) return routableUsers.slice(0, 8);
    const q = userQuery.toLowerCase();
    return routableUsers
      .filter((u) => u.fullName.toLowerCase().includes(q) || u.departmentName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [userQuery, routableUsers]);

  async function viewFile() {
    await fetch(`/api/routes/${routeId}/open`, { method: "POST" }).catch(() => {});
    const res = await fetch(`/api/documents/${documentId}/file`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
    router.refresh();
  }

  async function complete() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/routes/${routeId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: comment || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.refresh();
  }

  async function submitForward() {
    const toDepartmentId = isGm ? selectedUser?.departmentId : destDept;
    if (!toDepartmentId) {
      setError(isGm ? "Search for and pick a person to forward to." : "Choose a department to forward to.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/routes/${routeId}/forward`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toDepartmentId,
        toUserId: selectedUser?.id,
        comments: comment || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setMode("idle");
    setSelectedUser(null);
    setUserQuery("");
    setDestDept("");
    router.refresh();
  }

  async function submitReturn() {
    if (!comment.trim()) { setError("A reason is required to return a document."); return; }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/routes/${routeId}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: comment }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setMode("idle");
    router.refresh();
  }

  return (
    <div className="border-t border-border pt-3">
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={viewFile}>
            <Eye size={14} /> View File
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setMode("forwarding")}>
            <Send size={14} /> Forward
          </Button>
          {canReturn && (
            <Button size="sm" variant="ghost" onClick={() => setMode("returning")}>
              <Undo2 size={14} /> Return
            </Button>
          )}
          <Button size="sm" variant="default" onClick={complete} disabled={loading}>
            <CheckCircle size={14} /> Mark Completed
          </Button>
        </div>
      )}

      {mode === "forwarding" && (
        <div className="space-y-2">
          {isGm ? (
            <div>
              {selectedUser ? (
                <div className="flex items-center justify-between rounded-md border border-primary/40 bg-accent px-3 py-2">
                  <div className="flex items-center gap-2">
                    <UserIcon size={14} className="text-primary" />
                    <span className="text-sm font-medium text-foreground">{selectedUser.fullName}</span>
                    <span className="text-xs text-muted-foreground">— {selectedUser.departmentName}</span>
                  </div>
                  <button
                    onClick={() => { setSelectedUser(null); setUserQuery(""); }}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Search for a person by name or department…"
                    className="pl-9"
                  />
                  {(userQuery.trim() || routableUsers.length > 0) && (
                    <div className="mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                      {filteredUsers.length === 0 && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No matching users.</p>
                      )}
                      {filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => { setSelectedUser(u); setUserQuery(""); }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span className="font-medium text-foreground">{u.fullName}</span>
                          <span className="text-xs text-muted-foreground">{u.departmentName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Select value={destDept} onChange={(e) => setDestDept(e.target.value)}>
              <option value="">Select destination department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          )}
          <Textarea
            placeholder="Note (optional)"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submitForward} disabled={loading}>
              {loading ? "Forwarding…" : "Confirm forward"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setMode("idle"); setError(null); setSelectedUser(null); setUserQuery(""); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === "returning" && (
        <div className="space-y-2">
          <Textarea
            placeholder="Why is this being returned? (required)"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={submitReturn} disabled={loading}>
              {loading ? "Returning…" : "Confirm return"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setMode("idle"); setError(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p className="mt-1 text-xs text-muted-foreground">Status: {status}</p>
    </div>
  );
}
