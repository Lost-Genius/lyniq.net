"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import VoteButtons from "./VoteButtons";
import { timeAgo } from "@/lib/utils";

interface CommentData {
  id: string;
  content: string;
  score: number;
  createdAt: string | Date;
  author: {
    id: string;
    username: string;
    name?: string | null;
  };
  votes?: { userId: string; value: number }[];
  replies?: CommentData[];
}

interface CommentProps {
  comment: CommentData;
  postId: string;
  currentUserId?: string;
  depth?: number;
}

export default function Comment({
  comment,
  postId,
  currentUserId,
  depth = 0,
}: CommentProps) {
  const { data: session } = useSession();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState(comment.replies || []);
  const [submitting, setSubmitting] = useState(false);

  const userVote =
    comment.votes?.find((v) => v.userId === currentUserId)?.value || 0;

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !session) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyText,
          postId,
          parentId: comment.id,
        }),
      });

      if (res.ok) {
        const { comment: newComment } = await res.json();
        setReplies([...replies, newComment]);
        setReplyText("");
        setShowReply(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${depth > 0 ? "ml-4 md:ml-6 border-l border-cyber-border pl-3 md:pl-4" : ""}`}>
      <div className="flex gap-2 py-3">
        <VoteButtons
          score={comment.score}
          commentId={comment.id}
          userVote={userVote}
          vertical={true}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-cyber-muted mb-1">
            <Link
              href={`/u/${comment.author.username}`}
              className="font-medium text-cyber-cyan hover:underline"
            >
              u/{comment.author.username}
            </Link>
            <span>•</span>
            <span>{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-cyber-text whitespace-pre-wrap break-words">
            {comment.content}
          </p>
          {session && depth < 4 && (
            <button
              onClick={() => setShowReply(!showReply)}
              className="mt-1.5 text-xs text-cyber-muted hover:text-cyber-cyan"
            >
              Reply
            </button>
          )}

          {showReply && (
            <form onSubmit={handleReply} className="mt-2 space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="cyber-input text-sm min-h-[80px] resize-y"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting || !replyText.trim()}
                  className="cyber-button-primary text-xs"
                >
                  {submitting ? "Posting..." : "Reply"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReply(false)}
                  className="cyber-button-ghost text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {replies.map((reply) => (
        <Comment
          key={reply.id}
          comment={reply}
          postId={postId}
          currentUserId={currentUserId}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}
