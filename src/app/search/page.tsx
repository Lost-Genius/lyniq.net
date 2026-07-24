"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    communities: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/communities?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults({ communities: data.communities || [] });
    } catch {
      setResults({ communities: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold">Search</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search communities..."
            className="cyber-input pl-10"
          />
        </div>
        <button type="submit" className="cyber-button-primary" disabled={loading}>
          {loading ? "..." : "Search"}
        </button>
      </form>

      {results && (
        <div className="space-y-3">
          <h2 className="text-sm text-cyber-muted">
            Communities ({results.communities.length})
          </h2>
          {results.communities.length === 0 ? (
            <p className="text-sm text-cyber-muted">No communities found.</p>
          ) : (
            results.communities.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.name}`}
                className="cyber-card p-4 block"
              >
                <span className="text-cyber-cyan font-medium">c/{c.name}</span>
                <span className="text-cyber-text ml-2">{c.displayName}</span>
                {c.description && (
                  <p className="text-xs text-cyber-muted mt-1 line-clamp-1">
                    {c.description}
                  </p>
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
