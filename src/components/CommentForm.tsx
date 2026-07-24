"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, postId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to post comment");
        setLoading(false);
        return;
      }

      setContent("");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="cyber-card p-4 space-y-3">
      {error && (
        <div className="text-sm text-cyber-magenta">{error}</div>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What are your thoughts?"
        className="cyber-input min-h-[100px] resize-y text-sm"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="cyber-button-primary text-sm"
        >
          {loading ? "Posting..." : "Comment"}
        </button>
      </div>
    </form>
  );
}
