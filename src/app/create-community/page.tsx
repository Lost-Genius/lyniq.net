"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CreateCommunityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    displayName: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.toLowerCase().replace(/\s+/g, "_"),
          displayName: form.displayName,
          description: form.description,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create community");
        setLoading(false);
        return;
      }

      router.push(`/c/${data.community.name}`);
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
    <div className="max-w-lg mx-auto">
      <h1 className="font-display text-2xl font-bold mb-6">
        Create Community
      </h1>

      <form onSubmit={handleSubmit} className="cyber-card p-6 space-y-5">
        {error && (
          <div className="text-sm text-cyber-magenta bg-cyber-magenta/10 border border-cyber-magenta/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs text-cyber-muted mb-1.5">
            Community name (url)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-cyber-muted text-sm">c/</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                })
              }
              className="cyber-input flex-1"
              required
              minLength={3}
              maxLength={30}
              placeholder="cyberpunk"
            />
          </div>
          <p className="text-xs text-cyber-muted mt-1">
            Lowercase letters, numbers, underscores only
          </p>
        </div>

        <div>
          <label className="block text-xs text-cyber-muted mb-1.5">
            Display name
          </label>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) =>
              setForm({ ...form, displayName: e.target.value })
            }
            className="cyber-input"
            required
            maxLength={50}
            placeholder="Cyberpunk City"
          />
        </div>

        <div>
          <label className="block text-xs text-cyber-muted mb-1.5">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            className="cyber-input min-h-[100px] resize-y"
            maxLength={500}
            placeholder="What is this community about?"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="cyber-button-primary w-full"
        >
          {loading ? "Creating..." : "Create Community"}
        </button>
      </form>
    </div>
  );
}
