"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Menu, X, Plus, LogOut, User, Home, Search } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-cyber-border bg-cyber-bg/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-wider text-cyber-cyan neon-text glitch-hover"
          >
            LYNIQ
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm text-cyber-muted hover:text-cyber-cyan transition-colors flex items-center gap-1.5"
            >
              <Home size={16} />
              Feed
            </Link>
            <Link
              href="/communities"
              className="text-sm text-cyber-muted hover:text-cyber-cyan transition-colors"
            >
              Communities
            </Link>
            <Link
              href="/search"
              className="text-sm text-cyber-muted hover:text-cyber-cyan transition-colors flex items-center gap-1.5"
            >
              <Search size={16} />
              Search
            </Link>
          </div>

          {/* Auth section */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <Link
                  href="/create"
                  className="cyber-button-primary text-sm flex items-center gap-1.5"
                >
                  <Plus size={16} />
                  Create
                </Link>
                <Link
                  href={`/u/${session.user.username}`}
                  className="text-sm text-cyber-muted hover:text-cyber-text flex items-center gap-1.5"
                >
                  <User size={16} />
                  {session.user.username}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="cyber-button-ghost text-sm flex items-center gap-1.5"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="cyber-button-ghost text-sm">
                  Log in
                </Link>
                <Link href="/signup" className="cyber-button-primary text-sm">
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-cyber-muted hover:text-cyber-cyan"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-cyber-border space-y-3">
            <Link
              href="/"
              className="block text-sm text-cyber-muted hover:text-cyber-cyan"
              onClick={() => setMobileOpen(false)}
            >
              Feed
            </Link>
            <Link
              href="/communities"
              className="block text-sm text-cyber-muted hover:text-cyber-cyan"
              onClick={() => setMobileOpen(false)}
            >
              Communities
            </Link>
            {session ? (
              <>
                <Link
                  href="/create"
                  className="block text-sm text-cyber-cyan"
                  onClick={() => setMobileOpen(false)}
                >
                  Create Post
                </Link>
                <Link
                  href={`/u/${session.user.username}`}
                  className="block text-sm text-cyber-muted"
                  onClick={() => setMobileOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  className="block text-sm text-cyber-muted"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block text-sm text-cyber-muted"
                  onClick={() => setMobileOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="block text-sm text-cyber-cyan"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
