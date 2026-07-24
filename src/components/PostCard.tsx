"use client";

import Link from "next/link";
import { MessageSquare, ExternalLink } from "lucide-react";
import VoteButtons from "./VoteButtons";
import { timeAgo } from "@/lib/utils";

interface PostCardProps {
  post: {
    id: string;
    title: string;
    content?: string | null;
    url?: string | null;
    type: string;
    score: number;
    commentCount: number;
    createdAt: string | Date;
    author: {
      id: string;
      username: string;
      name?: string | null;
    };
    community: {
      id: string;
      name: string;
      displayName: string;
    };
    votes?: { userId: string; value: number }[];
  };
  currentUserId?: string;
}

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const userVote =
    post.votes?.find((v) => v.userId === currentUserId)?.value || 0;

  return (
    <article className="cyber-card p-4 flex gap-3">
      <VoteButtons
        score={post.score}
        postId={post.id}
        userVote={userVote}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-cyber-muted mb-1.5 flex-wrap">
          <Link
            href={`/c/${post.community.name}`}
            className="text-cyber-cyan hover:underline font-medium"
          >
            c/{post.community.name}
          </Link>
          <span>•</span>
          <Link
            href={`/u/${post.author.username}`}
            className="hover:text-cyber-text"
          >
            u/{post.author.username}
          </Link>
          <span>•</span>
          <span>{timeAgo(post.createdAt)}</span>
        </div>

        <Link href={`/post/${post.id}`}>
          <h2 className="text-base font-medium text-cyber-text hover:text-cyber-cyan transition-colors leading-snug">
            {post.title}
          </h2>
        </Link>

        {post.type === "link" && post.url && (
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-cyber-cyan/80 hover:text-cyber-cyan mt-1"
          >
            <ExternalLink size={12} />
            {new URL(post.url).hostname}
          </a>
        )}

        {post.content && post.type === "text" && (
          <p className="mt-2 text-sm text-cyber-muted line-clamp-3">
            {post.content}
          </p>
        )}

        <div className="mt-3 flex items-center gap-4">
          <Link
            href={`/post/${post.id}`}
            className="flex items-center gap-1.5 text-xs text-cyber-muted hover:text-cyber-cyan transition-colors"
          >
            <MessageSquare size={14} />
            {post.commentCount} comments
          </Link>
        </div>
      </div>
    </article>
  );
}
