"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Share2, CheckCircle2, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SavedSearch = {
  id: string;
  name: string;
  query: string;
  filters: string | null;
  isPublic: boolean;
  user: {
    id: string;
    fullName: string;
  };
  createdAt: string;
  updatedAt: string;
};

type SavedSearchesProps = {
  initialSearches?: SavedSearch[];
};

export function SavedSearches({ initialSearches = [] }: SavedSearchesProps) {
  const [searches, setSearches] = useState<SavedSearch[]>(initialSearches);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchName, setSearchName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [editingSearchId, setEditingSearchId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuery, setEditQuery] = useState("");
  const [editFilters, setEditFilters] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);

  const fetchSearches = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/saved-searches`);
      if (!res.ok) throw new Error("Failed to fetch saved searches");
      const data = await res.json();
      setSearches(data.savedSearches || []);
    } catch (err) {
      setError("Failed to load saved searches");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!searchName.trim() || !searchQuery.trim()) {
      setError("Name and query are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/saved-searches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: searchName.trim(),
          query: searchQuery.trim(),
          filters: searchFilters.trim() || undefined,
          isPublic
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save search");
      }

      const newSearch = await res.json();
      setSearches(prev => [newSearch.savedSearch, ...prev]);
      setSearchName("");
      setSearchQuery("");
      setSearchFilters("");
      setIsPublic(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save search");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSearchId || !editName.trim() || !editQuery.trim()) {
      setError("Name and query are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/saved-searches`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSearchId,
          name: editName.trim(),
          query: editQuery.trim(),
          filters: editFilters.trim() || undefined,
          isPublic: editIsPublic
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update search");
      }

      const updatedSearch = await res.json();
      setSearches(prev =>
        prev.map(search =>
          search.id === editingSearchId ? updatedSearch.savedSearch : search
        )
      );
      setEditingSearchId(null);
      setEditName("");
      setEditQuery("");
      setEditFilters("");
      setEditIsPublic(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update search");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/saved-searches`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete search");
      }

      setSearches(prev => prev.filter(search => search.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete search");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSearches();
  }, []);

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Saved Searches
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSearches}
          >
            <Loader2 className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </div>

        {loading && searches.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="h-5 w-5 text-secondary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading saved searches...</p>
          </div>
        ) : (
          searches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No saved searches yet.</p>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  // Open the add search form by setting a temporary editing state
                  setEditingSearchId("new");
                  setSearchName("");
                  setSearchQuery("");
                  setSearchFilters("");
                  setIsPublic(false);
                }}
              >
                Create First Search
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add/Edit Search Form */}
              <div className="border-t border-border pt-4">
                {editingSearchId ? (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {editingSearchId === "new" ? "Create New Search" : "Edit Search"}
                    </h4>
                    <div className="space-y-2">
                      <Input
                        placeholder="Search name"
                        value={editingSearchId === "new" ? searchName : editName}
                        onChange={(e) => {
                          if (editingSearchId === "new") setSearchName(e.target.value);
                          else setEditName(e.target.value);
                        }}
                        disabled={loading}
                      />
                      <Input
                        placeholder="Search query (e.g., 'invoice' or 'status:PENDING')"
                        value={editingSearchId === "new" ? searchQuery : editQuery}
                        onChange={(e) => {
                          if (editingSearchId === "new") setSearchQuery(e.target.value);
                          else setEditQuery(e.target.value);
                        }}
                        disabled={loading}
                      />
                      <Input
                        placeholder="Filters (JSON format, optional)"
                        value={editingSearchId === "new" ? searchFilters : editFilters}
                        onChange={(e) => {
                          if (editingSearchId === "new") setSearchFilters(e.target.value);
                          else setEditFilters(e.target.value);
                        }}
                        disabled={loading}
                      />
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm text-muted-foreground">Make public:</span>
                        <input
                          type="checkbox"
                          checked={editingSearchId === "new" ? isPublic : editIsPublic}
                          onChange={(e) => {
                            if (editingSearchId === "new") setIsPublic(e.target.checked);
                            else setEditIsPublic(e.target.checked);
                          }}
                        disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      {editingSearchId === "new" ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleSave}
                          disabled={loading || !searchName.trim() || !searchQuery.trim()}
                        >
                          {loading ? "Saving..." : "Save Search"}
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleUpdate}
                          disabled={loading || !editName.trim() || !editQuery.trim()}
                        >
                          {loading ? "Updating..." : "Update Search"}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingSearchId(null);
                          setEditName("");
                          setEditQuery("");
                          setEditFilters("");
                          setEditIsPublic(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Create New Search</h4>
                    <div className="space-y-2">
                      <Input
                        placeholder="Search name"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        disabled={loading}
                      />
                      <Input
                        placeholder="Search query (e.g., 'invoice' or 'status:PENDING')"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={loading}
                      />
                      <Input
                        placeholder="Filters (JSON format, optional)"
                        value={searchFilters}
                        onChange={(e) => setSearchFilters(e.target.value)}
                        disabled={loading}
                      />
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm text-muted-foreground">Make public:</span>
                        <input
                          type="checkbox"
                          checked={isPublic}
                          onChange={(e) => setIsPublic(e.target.checked)}
                        disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSave}
                        disabled={loading || !searchName.trim() || !searchQuery.trim()}
                      >
                        {loading ? "Saving..." : "Save Search"}
                      </Button>
                    </div>
                  </div>
                )}
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
              </div>

              {/* Searches List */}
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Your Searches</h4>
                {searches.map(search => (
                  <div key={search.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Share2 className="h-3 w-3 text-muted-foreground" />
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{search.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {search.isPublic ? "Public" : "Private"} •
                                {new Date(search.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-baseline gap-3 text-sm text-muted-foreground">
                            <p className="text-sm">{search.query}</p>
                            {search.filters && (
                              <>
                                <span className="ml-2">•</span>
                                <span className="text-xs text-muted-foreground">Filters applied</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingSearchId(search.id);
                            setEditName(search.name);
                            setEditQuery(search.query);
                            setEditFilters(search.filters || "");
                            setEditIsPublic(search.isPublic);
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(search.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive/60 hover:text-destructive" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            // Execute the search by redirecting to find page with the query
                            // We'll implement a proper execute endpoint later, for now we'll use the existing lookup
                            // For saved searches, we could redirect to find page and pre-fill the search
                            // Or we could create a dedicated execute endpoint
                            window.location.href = `/find?query=${encodeURIComponent(search.query)}`;
                          }}
                        >
                          <Search className="h-3 w-3 mr-1" /> Run
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {searches.length === 0 && (
                  <p className="text-center py-8 text-sm text-muted-foreground">No saved searches to display.</p>
                )}
              </div>
            </div>
          )
        )}

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}