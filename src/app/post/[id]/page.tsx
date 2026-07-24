import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import VoteButtons from "@/components/VoteButtons";
import Comment from "@/components/Comment";
import { timeAgo } from "@/lib/utils";
import CommentForm from "@/components/CommentForm";

export const dynamic = "force-dynamic";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, username: true, name: true, image: true },
      },
      community: {
        select: { id: true, name: true, displayName: true, description: true },
      },
      votes: true,
      comments: {
        where: { parentId: null },
        include: {
          author: {
            select: { id: true, username: true, name: true, image: true },
          },
          votes: true,
          replies: {
            include: {
              author: {
                select: { id: true, username: true, name: true, image: true },
              },
              votes: true,
              replies: {
                include: {
                  author: {
                    select: {
                      id: true,
                      username: true,
                      name: true,
                      image: true,
                    },
                  },
                  votes: true,
                },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ score: "desc" }, { createdAt: "asc" }],
      },
      _count: { select: { comments: true } },
    },
  });

  if (!post) notFound();

  const userVote =
    post.votes.find((v) => v.userId === session?.user?.id)?.value || 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <article className="cyber-card p-5">
        <div className="flex gap-4">
          <VoteButtons
            score={post.score}
            postId={post.id}
            userVote={userVote}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-cyber-muted mb-2 flex-wrap">
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

            <h1 className="text-xl font-medium text-cyber-text leading-snug">
              {post.title}
            </h1>

            {post.type === "link" && post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-cyber-cyan mt-2 hover:underline"
              >
                <ExternalLink size={14} />
                {post.url}
              </a>
            )}

            {post.content && (
              <div className="mt-4 text-sm text-cyber-text whitespace-pre-wrap leading-relaxed">
                {post.content}
              </div>
            )}
          </div>
        </div>
      </article>

      {session ? (
        <CommentForm postId={post.id} />
      ) : (
        <div className="cyber-card p-4 text-center text-sm text-cyber-muted">
          <Link href="/login" className="text-cyber-cyan hover:underline">
            Log in
          </Link>{" "}
          to comment
        </div>
      )}

      <div className="space-y-1">
        <h2 className="text-sm text-cyber-muted mb-3">
          {post._count.comments} comments
        </h2>
        {post.comments.length === 0 ? (
          <p className="text-sm text-cyber-muted py-4">No comments yet.</p>
        ) : (
          post.comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              postId={post.id}
              currentUserId={session?.user?.id}
            />
          ))
        )}
      </div>
    </div>
  );
}