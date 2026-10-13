"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select-native";
import { Input } from "@/components/ui/input";
import { Eye, Send, CheckCircle, Undo2, Search, User as UserIcon, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Dept = { id: string; name: string };
type RoutableUser = { id: string; fullName: string; role: string; departmentId: string | null; departmentName: string };
type Mode = "idle" | "forwarding" | "returning";
type TargetType = "person" | "department";

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
  const [targetType, setTargetType] = useState<TargetType>("person");
  const [destDept, setDestDept] = useState("");
  const [selectedUser, setSelectedUser] = useState<RoutableUser | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [routableUsers, setRoutableUsers] = useState<RoutableUser[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "forwarding" && routableUsers.length === 0) {
      fetch("/api/users/routable")
        .then((r) => r.json())
        .then((data) => setRoutableUsers(data.users ?? []))
        .catch(() => {});
    }
  }, [mode, routableUsers.length]);

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
    if (targetType === "person") {
      if (!selectedUser) {
        setError("Search for and select a person to forward to.");
        return;
      }
    } else {
      if (!destDept) {
        setError("Choose a department to forward to.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/routes/${routeId}/forward`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toDepartmentId: targetType === "department" ? destDept : (selectedUser?.departmentId ?? undefined),
        toUserId: targetType === "person" ? selectedUser?.id : undefined,
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
    setComment("");
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
      {error && <p className="mb-2 text-sm text-destructive font-medium">{error}</p>}

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={viewFile} className="cursor-pointer">
            <Eye size={14} className="mr-1.5" /> View File
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setMode("forwarding")} className="cursor-pointer">
            <Send size={14} className="mr-1.5" /> Forward
          </Button>
          {canReturn && (
            <Button size="sm" variant="ghost" onClick={() => setMode("returning")} className="cursor-pointer">
              <Undo2 size={14} className="mr-1.5" /> Return
            </Button>
          )}
          <Button size="sm" variant="default" onClick={complete} disabled={loading} className="cursor-pointer">
            <CheckCircle size={14} className="mr-1.5" /> Mark Completed
          </Button>
        </div>
      )}

      {mode === "forwarding" && (
        <div className="space-y-3 rounded-md border border-border bg-accent/20 p-3 mt-2">
          {/* Target Switcher: Person vs Department */}
          <div className="flex rounded-md bg-muted p-1 gap-1">
            <button
              type="button"
              onClick={() => { setTargetType("person"); setError(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded py-1 px-3 text-xs font-medium transition-all cursor-pointer",
                targetType === "person"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserIcon size={14} className={targetType === "person" ? "text-primary" : ""} />
              Forward to a Person
            </button>
            <button
              type="button"
              onClick={() => { setTargetType("department"); setError(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded py-1 px-3 text-xs font-medium transition-all cursor-pointer",
                targetType === "department"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 size={14} className={targetType === "department" ? "text-primary" : ""} />
              Forward to Department
            </button>
          </div>

          {targetType === "person" ? (
            <div>
              {selectedUser ? (
                <div className="flex items-center justify-between rounded-md border border-primary/40 bg-accent/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <UserIcon size={14} className="text-primary shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-foreground">{selectedUser.fullName}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        — {selectedUser.departmentName}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedUser(null); setUserQuery(""); }}
                    className="text-xs text-muted-foreground underline hover:text-foreground cursor-pointer"
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
                    className="pl-9 bg-background"
                  />
                  {(userQuery.trim() || routableUsers.length > 0) && (
                    <div className="mt-1 max-h-52 overflow-y-auto rounded-md border border-border bg-popover shadow-lg z-20">
                      {filteredUsers.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">No matching users found.</p>
                      ) : (
                        filteredUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => { setSelectedUser(u); setUserQuery(""); }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <UserIcon size={13} className="text-muted-foreground" />
                              <span className="font-medium text-foreground">{u.fullName}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{u.departmentName}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Select value={destDept} onChange={(e) => setDestDept(e.target.value)} className="bg-background">
              <option value="">Select destination department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          )}

          <Textarea
            placeholder="Handover note or instructions (optional)…"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="bg-background text-sm"
          />

          <div className="flex gap-2">
            <Button size="sm" onClick={submitForward} disabled={loading} className="cursor-pointer gap-1.5">
              <Send size={13} />
              {loading ? "Forwarding…" : "Confirm forward"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setMode("idle"); setError(null); setSelectedUser(null); setUserQuery(""); setComment(""); }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === "returning" && (
        <div className="space-y-2 mt-2">
          <Textarea
            placeholder="Why is this being returned? (required)"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="bg-background text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={submitReturn} disabled={loading} className="cursor-pointer">
              {loading ? "Returning…" : "Confirm return"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setMode("idle"); setError(null); }} className="cursor-pointer">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p className="mt-1 text-xs text-muted-foreground">Status: {status}</p>
    </div>
  );
}
