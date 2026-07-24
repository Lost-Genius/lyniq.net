"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Community {
  id: string;
  name: string;
  displayName: string;
}

export default function CreatePostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [form, setForm] = useState({
    title: "",
    content: "",
    url: "",
    communityId: "",
    type: "text" as "text" | "link",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetch("/api/communities")
      .then((res) => res.json())
      .then((data) => setCommunities(data.communities || []))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.type === "text" ? form.content : undefined,
          url: form.type === "link" ? form.url : undefined,
          communityId: form.communityId,
          type: form.type,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create post");
        setLoading(false);
        return;
      }

      router.push(`/post/${data.post.id}`);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="text-center text-cyber-muted py-20">Loading...</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold mb-6">Create Post</h1>

      <form onSubmit={handleSubmit} className="cyber-card p-6 space-y-5">
        {error && (
          <div className="text-sm text-cyber-magenta bg-cyber-magenta/10 border border-cyber-magenta/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {/* Type toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setForm({ ...form, type: "text" })}
            className={`px-4 py-2 text-sm rounded-md border transition-colors ${
              form.type === "text"
                ? "border-cyber-cyan text-cyber-cyan bg-cyber-cyan/10"
                : "border-cyber-border text-cyber-muted"
            }`}
          >
            Text
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, type: "link" })}
            className={`px-4 py-2 text-sm rounded-md border transition-colors ${
              form.type === "link"
                ? "border-cyber-cyan text-cyber-cyan bg-cyber-cyan/10"
                : "border-cyber-border text-cyber-muted"
            }`}
          >
            Link
          </button>
        </div>

        <div>
          <label className="block text-xs text-cyber-muted mb-1.5">
            Community
          </label>
          <select
            value={form.communityId}
            onChange={(e) => setForm({ ...form, communityId: e.target.value })}
            className="cyber-input"
            required
          >
            <option value="">Select a community</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                c/{c.name} — {c.displayName}
              </option>
            ))}
          </select>
          {communities.length === 0 && (
            <p className="text-xs text-cyber-muted mt-1">
              No communities yet.{" "}
              <Link href="/create-community" className="text-cyber-cyan">
                Create one
              </Link>
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs text-cyber-muted mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="cyber-input"
            required
            maxLength={300}
            placeholder="An interesting title"
          />
        </div>

        {form.type === "text" ? (
          <div>
            <label className="block text-xs text-cyber-muted mb-1.5">
              Content
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="cyber-input min-h-[160px] resize-y"
              placeholder="Share your thoughts..."
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-cyber-muted mb-1.5">URL</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="cyber-input"
              required
              placeholder="https://..."
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !form.communityId}
          className="cyber-button-primary w-full"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </form>
    </div>
  );
}
