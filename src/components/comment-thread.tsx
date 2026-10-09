"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmojiPicker } from "@/components/emoji-picker";
import { motion } from "framer-motion";
import { Loader2, Mail, User, Clock, Edit, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
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
    }
  }>;
  mentions: Array<{
    id: string;
    user: {
      id: string;
      fullName: string;
      email: string;
    }
  }>;
  reactionCounts: Record<string, { count: number; hasReactedByMe: boolean }>;
};

type CommentThreadProps = {
  documentId: string;
  routeId?: string | null;
  initialComments?: Comment[];
};

export function CommentThread({ documentId, routeId = null, initialComments = [] }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<{ commentId: string | null }>({ commentId: null });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [me, setMe] = useState<{ id: string; fullName: string; email: string } | null>(null);

  useEffect(() => {
    // Focus textarea when it mounts
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    // Fetch current user info
    fetch("/api/user/me")
      .then(res => res.ok ? res.json() : null)
      .then(userData => {
        if (userData && !userData.error) {
          setMe(userData);
        }
      })
      .catch(() => {});

    // Fetch comments
    fetchComments();
  }, [documentId, routeId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/documents/${documentId}/comments${routeId ? `?routeId=${routeId}` : ""}`);
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

  const addComment = async () => {
    if (!inputValue.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: inputValue.trim(), routeId: routeId || undefined })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add comment");
      }

      const newComment = await res.json();
      setComments(prev => [newComment.comment, ...prev]);
      setInputValue("");

      // Refocus textarea
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
        body: JSON.stringify({ content: content.trim() })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update comment");
      }

      const updatedComment = await res.json();
      setComments(prev => prev.map(c => c.id === commentId ? updatedComment.comment : c));
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
        method: "DELETE"
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete comment");
      }

      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addComment();
    }
  };

  // Updated toggleReaction function to work with the new API that expects emoji in body
  const toggleReaction = async (commentId: string, emoji: string) => {
    if (!me) return;

    try {
      const res = await fetch(`/api/documents/${documentId}/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to toggle reaction");
      }

      const result = await res.json();

      // Update the comment in state
      setComments(prevComments =>
        prevComments.map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                // For now, we'll just update the counts since the actual reactions array
                // would need to be fetched from the server to be accurate
                reactionCounts: {
                  ...(comment.reactionCounts || {}),
                  [emoji]: {
                    count: result.action === "added"
                      ? ((comment.reactionCounts || {})[emoji]?.count || 0) + 1
                      : Math.max(0, ((comment.reactionCounts || {})[emoji]?.count || 0) - 1),
                    hasReactedByMe: result.action === "added"
                  }
                }
              }
            : comment
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle reaction");
    }
  };

  // Format time ago - shows how long ago a date was
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Discussion & Comments
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchComments}
          className="text-sm"
        >
          <Loader2 className="h-3 w-3 mr-1" /> Refresh
        </Button>
      </div>

      {/* Comments List */}
      <div className="border border-border rounded-lg bg-card p-4 h-[400px] overflow-hidden relative">
        {loading && comments.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 text-secondary" />
            <p className="ml-2 text-sm text-muted-foreground">Loading comments...</p>
          </div>
        ) : (
          comments.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>No comments yet. Be the first to comment!</span>
            </div>
          ) : (
            <div className="h-full w-full overflow-y-auto pr-2">
              <div className="space-y-4">
                {comments.map(comment => (
                  <motion.div
                    key={comment.id}
                    className="border-b border-border pb-4 last:border-0 last:pb-0"
                    initial={{ scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{comment.author.fullName}</p>
                              <p className="text-xs text-muted-foreground">{formatTimeAgo(comment.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-foreground break-words whitespace-pre-wrap leading-relaxed">
                          {comment.content}
                        </p>

                        {/* Show reactions */}
                        <div className="flex flex-wrap items-center gap-1 mt-2">
                          {Object.entries(comment.reactionCounts || {}).map(([emoji, { count, hasReactedByMe }]) => (
                            <button
                              key={`${comment.id}-${emoji}`}
                              onClick={() => toggleReaction(comment.id, emoji)}
                              className={cn(
                                "flex items-center gap-1 px-2 py-0.5 text-xs rounded border transition-colors",
                                hasReactedByMe ? "bg-primary/20 text-primary border-primary/30" : "bg-background hover:bg-accent/20 border-border"
                              )}
                              title={hasReactedByMe ? "Remove reaction" : "React"}
                            >
                              <span className="text-base leading-none">{emoji}</span>
                              <span className="ml-1 font-medium">{count}</span>
                            </button>
                          ))}
                          <EmojiPicker
                            onEmojiSelect={(selectedEmoji) => toggleReaction(comment.id, selectedEmoji)}
                          />
                        </div>

                        {/* Show edit indicator if this comment was edited */}
                        {comment.updatedAt !== comment.createdAt && (
                          <p className="mt-1 text-xs text-muted-foreground italic">
                            Edited {formatTimeAgo(comment.updatedAt)}
                          </p>
                        )}
                      </div>

                      {/* Edit/Delete buttons */}
                      <div className="flex items-end space-x-2">
                        {editingCommentId === comment.id ? (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => updateComment(comment.id, editValue)}
                              disabled={loading}
                              className="px-3"
                            >
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditValue("");
                              }}
                              className="px-3"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditValue(comment.content);
                              }}
                              className="px-2"
                            >
                              <Edit className="h-3 w-3" /> Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteComment(comment.id)}
                              className="px-2"
                              aria-label="Delete comment"
                            >
                              <Trash2 className="h-3 w-3 text-destructive/60 hover:text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Loading indicator for list */}
        {loading && comments.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 text-secondary" />
          </div>
        )}
      </div>

      {/* Add Comment Form */}
      <div className="border-t border-border pt-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              placeholder="Add a comment..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={loading}
              className="resize-none"
            />
            <div className="flex justify-end mt-2">
              <Button
                variant="default"
                size="sm"
                onClick={addComment}
                disabled={loading || !inputValue.trim()}
                className="px-4"
              >
                {loading ? "Adding..." : "Comment"}
              </Button>
            </div>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}