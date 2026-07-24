import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PostCard from "@/components/PostCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const session = await getServerSession(authOptions);

  const community = await prisma.community.findUnique({
    where: { name },
    include: {
      _count: { select: { members: true, posts: true } },
      creator: { select: { username: true } },
    },
  });

  if (!community) notFound();

  const posts = await prisma.post.findMany({
    where: { communityId: community.id },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 30,
    include: {
      author: {
        select: { id: true, username: true, name: true, image: true },
      },
      community: {
        select: { id: true, name: true, displayName: true },
      },
      votes: true,
      _count: { select: { comments: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="cyber-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-cyber-cyan">
              c/{community.name}
            </h1>
            <p className="text-cyber-text mt-1">{community.displayName}</p>
            {community.description && (
              <p className="text-sm text-cyber-muted mt-3">
                {community.description}
              </p>
            )}
            <div className="flex gap-4 mt-4 text-xs text-cyber-muted">
              <span>{community._count.members} members</span>
              <span>{community._count.posts} posts</span>
              <span>Created by u/{community.creator.username}</span>
            </div>
          </div>
          {session && (
            <Link
              href={`/create?community=${community.id}`}
              className="cyber-button-primary text-sm whitespace-nowrap"
            >
              Create Post
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="cyber-card p-8 text-center text-cyber-muted">
            No posts in this community yet.
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                ...post,
                commentCount: post._count.comments,
              }}
              currentUserId={session?.user?.id}
            />
          ))
        )}
      </div>
    </div>
  );
}