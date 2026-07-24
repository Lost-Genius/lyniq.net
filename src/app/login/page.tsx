"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="cyber-card p-8">
        <h1 className="font-display text-2xl font-bold text-center mb-2 neon-text">
          LYNIQ
        </h1>
        <p className="text-center text-cyber-muted text-sm mb-8">
          Access the network
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-cyber-magenta bg-cyber-magenta/10 border border-cyber-magenta/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-cyber-muted mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="cyber-input"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs text-cyber-muted mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="cyber-input"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cyber-button-primary w-full mt-2"
          >
            {loading ? "Connecting..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-cyber-muted">
          New here?{" "}
          <Link href="/signup" className="text-cyber-cyan hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
