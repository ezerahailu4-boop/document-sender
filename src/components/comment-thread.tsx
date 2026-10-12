"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmojiPicker } from "@/components/emoji-picker";
import { motion } from "framer-motion";
import { Loader2, Mail, Edit, Trash2, AlertCircle, AtSign } from "lucide-react";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  content: string;
  author: {
    id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  reactions: Array<{
    id: string;
    emoji: string;
    user: {
      id: string;
      fullName: string;
      email: string;
    };
  }>;
  mentions: Array<{
    id: string;
    user: {
      id: string;
      fullName: string;
      email: string;
    };
  }>;
  reactionCounts?: Record<string, { count: number; hasReactedByMe: boolean }>;
};

type RoutableUser = {
  id: string;
  fullName: string;
  departmentName: string;
  email?: string;
};

type CommentThreadProps = {
  documentId: string;
  routeId?: string | null;
  initialComments?: Comment[];
};

export function CommentThread({
  documentId,
  routeId = null,
  initialComments = [],
}: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [me, setMe] = useState<{ id: string; fullName: string; email: string } | null>(null);

  // Mention autocomplete state
  const [routableUsers, setRoutableUsers] = useState<RoutableUser[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/documents/${documentId}/comments${routeId ? `?routeId=${routeId}` : ""}`
      );
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      setError("Failed to load comments");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    // Fetch current user info
    fetch("/api/user/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((userData) => {
        if (!cancelled && userData && !userData.error) {
          setMe(userData);
        }
      })
      .catch(() => {});

    // Fetch users for mention autocomplete
    fetch("/api/users/routable")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.users) setRoutableUsers(data.users);
      })
      .catch(() => {});

    fetch(`/api/documents/${documentId}/comments${routeId ? `?routeId=${routeId}` : ""}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch comments");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setComments(data.comments || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError("Failed to load comments");
          setLoading(false);
          console.error(err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [documentId, routeId]);

  // Handle typing to detect @mention
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputValue(text);

    const cursorPos = e.target.selectionStart ?? text.length;
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf("@");

    if (lastAtPos !== -1 && !textBeforeCursor.slice(lastAtPos, cursorPos).includes(" ")) {
      const q = textBeforeCursor.slice(lastAtPos + 1, cursorPos);
      setMentionQuery(q);
      setShowMentionMenu(true);
    } else {
      setShowMentionMenu(false);
    }
  };

  const insertMention = (user: RoutableUser) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart ?? inputValue.length;
    const textBeforeCursor = inputValue.slice(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf("@");
    if (lastAtPos === -1) return;

    // Use username from email or firstName
    const username = user.email ? user.email.split("@")[0] : user.fullName.replace(/\s+/g, "").toLowerCase();
    const newText =
      inputValue.slice(0, lastAtPos) + `@${username} ` + inputValue.slice(cursorPos);
    setInputValue(newText);
    setShowMentionMenu(false);
    textareaRef.current.focus();
  };

  const filteredUsers = routableUsers
    .filter(
      (u) =>
        u.fullName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        u.departmentName?.toLowerCase().includes(mentionQuery.toLowerCase())
    )
    .slice(0, 5);

  const addComment = async () => {
    if (!inputValue.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: inputValue.trim(), routeId: routeId || undefined }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add comment");
      }

      const newComment = await res.json();
      setComments((prev) => [newComment.comment, ...prev]);
      setInputValue("");
      setShowMentionMenu(false);

      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setLoading(false);
    }
  };

  const updateComment = async (commentId: string, content: string) => {
    if (!content.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update comment");
      }

      const updatedComment = await res.json();
      setComments((prev) => prev.map((c) => (c.id === commentId ? updatedComment.comment : c)));
      setEditingCommentId(null);
      setEditValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update comment");
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete comment");
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !showMentionMenu) {
      e.preventDefault();
      addComment();
    }
  };

  const toggleReaction = async (commentId: string, emoji: string) => {
    if (!me) return;

    try {
      const res = await fetch(`/api/documents/${documentId}/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to toggle reaction");
      }

      const result = await res.json();

      setComments((prevComments) =>
        prevComments.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                reactionCounts: {
                  ...(comment.reactionCounts || {}),
                  [emoji]: {
                    count:
                      result.action === "added"
                        ? ((comment.reactionCounts || {})[emoji]?.count || 0) + 1
                        : Math.max(0, ((comment.reactionCounts || {})[emoji]?.count || 0) - 1),
                    hasReactedByMe: result.action === "added",
                  },
                },
              }
            : comment
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle reaction");
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Discussion & Minutes Notes
        </h2>
        <Button variant="ghost" size="sm" onClick={fetchComments} className="h-8 px-2 text-xs">
          <Loader2 className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Comments List */}
      <div className="border border-border rounded-lg bg-card p-4 min-h-[220px] max-h-[460px] overflow-hidden relative flex flex-col">
        {loading && comments.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="ml-2 text-xs text-muted-foreground">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground text-center py-8">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span className="text-xs">No comments or notes yet. Use @username to mention a colleague!</span>
          </div>
        ) : (
          <div className="flex-1 w-full overflow-y-auto pr-2">
            <div className="space-y-3">
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  className="rounded-md border border-border bg-background/60 p-3"
                  initial={{ scale: 1 }}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                          {comment.author.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-xs text-foreground">
                          {comment.author.fullName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatTimeAgo(comment.createdAt)}
                        </span>
                        {comment.updatedAt !== comment.createdAt && (
                          <span className="text-[10px] text-muted-foreground italic">(edited)</span>
                        )}
                      </div>

                      <p className="text-xs text-foreground break-words whitespace-pre-wrap leading-relaxed">
                        {comment.content}
                      </p>

                      {/* Reactions display */}
                      <div className="flex flex-wrap items-center gap-1 mt-2.5">
                        {Object.entries(comment.reactionCounts || {}).map(
                          ([emoji, { count, hasReactedByMe }]) => (
                            <button
                              key={`${comment.id}-${emoji}`}
                              onClick={() => toggleReaction(comment.id, emoji)}
                              className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 text-xs rounded border transition-colors",
                                hasReactedByMe
                                  ? "bg-primary/20 text-primary border-primary/30"
                                  : "bg-background hover:bg-accent/40 border-border"
                              )}
                              title={hasReactedByMe ? "Remove reaction" : "React"}
                            >
                              <span className="text-xs leading-none">{emoji}</span>
                              <span className="text-[10px] font-semibold">{count}</span>
                            </button>
                          )
                        )}
                        <EmojiPicker
                          onEmojiSelect={(selectedEmoji) => toggleReaction(comment.id, selectedEmoji)}
                        />
                      </div>
                    </div>

                    {/* Edit/Delete buttons for owner or admin */}
                    <div className="flex items-center space-x-1 mt-2 sm:mt-0 shrink-0">
                      {editingCommentId === comment.id ? (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => updateComment(comment.id, editValue)}
                            disabled={loading}
                            className="h-7 px-2 text-xs"
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditValue("");
                            }}
                            className="h-7 px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        (me?.id === comment.author.id || me?.email?.includes("admin")) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditValue(comment.content);
                              }}
                              className="h-7 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                              title="Edit comment"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteComment(comment.id)}
                              className="h-7 px-1.5 text-xs text-destructive/70 hover:text-destructive"
                              title="Delete comment"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Comment Form with @mention autocomplete popup */}
      <div className="border border-border rounded-lg bg-card p-3 relative">
        {showMentionMenu && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-3 mb-1 w-64 rounded-md border border-border bg-popover shadow-md z-30 max-h-48 overflow-y-auto p-1">
            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <AtSign className="h-3 w-3" /> Mention Colleague
            </div>
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => insertMention(u)}
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center justify-between transition-colors"
              >
                <span className="font-medium text-foreground truncate">{u.fullName}</span>
                <span className="text-[10px] text-muted-foreground truncate">{u.departmentName}</span>
              </button>
            ))}
          </div>
        )}

        <Textarea
          ref={textareaRef}
          placeholder="Add a comment or note... Type @ to mention a person"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={loading}
          className="resize-none text-xs"
        />

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <AtSign className="h-3 w-3" /> Type @ to mention • Press Enter to post
          </span>
          <Button
            variant="default"
            size="sm"
            onClick={addComment}
            disabled={loading || !inputValue.trim()}
            className="h-8 px-3 text-xs"
          >
            {loading ? "Posting..." : "Post Comment"}
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}