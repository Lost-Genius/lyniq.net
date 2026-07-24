"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Auto login after signup
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but login failed. Please log in.");
        router.push("/login");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="cyber-card p-8">
        <h1 className="font-display text-2xl font-bold text-center mb-2 neon-text">
          LYNIQ
        </h1>
        <p className="text-center text-cyber-muted text-sm mb-8">
          Join the network
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-cyber-magenta bg-cyber-magenta/10 border border-cyber-magenta/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-cyber-muted mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) =>
                setForm({ ...form, username: e.target.value.toLowerCase() })
              }
              className="cyber-input"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              placeholder="lowercase_letters_numbers"
            />
          </div>

          <div>
            <label className="block text-xs text-cyber-muted mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="cyber-input"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-cyber-muted mb-1.5">
              Display name (optional)
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="cyber-input"
            />
          </div>

          <div>
            <label className="block text-xs text-cyber-muted mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="cyber-input"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cyber-button-primary w-full mt-2"
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-cyber-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-cyber-cyan hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
