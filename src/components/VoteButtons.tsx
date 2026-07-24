"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown } from "lucide-react";
import { formatScore } from "@/lib/utils";

interface VoteButtonsProps {
  score: number;
  postId?: string;
  commentId?: string;
  userVote?: number; // 1, -1, or 0
  vertical?: boolean;
}

export default function VoteButtons({
  score: initialScore,
  postId,
  commentId,
  userVote = 0,
  vertical = true,
}: VoteButtonsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [score, setScore] = useState(initialScore);
  const [vote, setVote] = useState(userVote);
  const [loading, setLoading] = useState(false);

  const handleVote = async (value: number) => {
    if (!session) {
      router.push("/login");
      return;
    }
    if (loading) return;

    setLoading(true);
    const newValue = vote === value ? 0 : value;
    const prevVote = vote;
    const prevScore = score;

    // Optimistic update
    setVote(newValue);
    setScore(prevScore - prevVote + newValue);

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: newValue,
          postId,
          commentId,
        }),
      });

      if (!res.ok) {
        // Revert
        setVote(prevVote);
        setScore(prevScore);
      }
    } catch {
      setVote(prevVote);
      setScore(prevScore);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex ${
        vertical ? "flex-col" : "flex-row"
      } items-center gap-0.5`}
    >
      <button
        onClick={() => handleVote(1)}
        disabled={loading}
        className={`p-1 rounded transition-colors ${
          vote === 1
            ? "text-cyber-cyan"
            : "text-cyber-muted hover:text-cyber-cyan"
        }`}
        aria-label="Upvote"
      >
        <ChevronUp size={20} strokeWidth={vote === 1 ? 3 : 2} />
      </button>
      <span
        className={`text-sm font-medium min-w-[2rem] text-center ${
          vote === 1
            ? "text-cyber-cyan"
            : vote === -1
            ? "text-cyber-magenta"
            : "text-cyber-text"
        }`}
      >
        {formatScore(score)}
      </span>
      <button
        onClick={() => handleVote(-1)}
        disabled={loading}
        className={`p-1 rounded transition-colors ${
          vote === -1
            ? "text-cyber-magenta"
            : "text-cyber-muted hover:text-cyber-magenta"
        }`}
        aria-label="Downvote"
      >
        <ChevronDown size={20} strokeWidth={vote === -1 ? 3 : 2} />
      </button>
    </div>
  );
}
