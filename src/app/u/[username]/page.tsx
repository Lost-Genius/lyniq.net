import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PostCard from "@/components/PostCard";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await getServerSession(authOptions);

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      createdAt: true,
      _count: {
        select: { posts: true, comments: true },
      },
    },
  });

  if (!user) notFound();

  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
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
        <h1 className="font-display text-2xl font-bold text-cyber-cyan">
          u/{user.username}
        </h1>
        {user.name && user.name !== user.username && (
          <p className="text-cyber-text mt-1">{user.name}</p>
        )}
        {user.bio && (
          <p className="text-sm text-cyber-muted mt-3">{user.bio}</p>
        )}
        <div className="flex gap-4 mt-4 text-xs text-cyber-muted">
          <span>{user._count.posts} posts</span>
          <span>{user._count.comments} comments</span>
          <span>
            Joined{" "}
            {new Date(user.createdAt).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div>
        <h2 className="text-sm text-cyber-muted mb-3">Posts</h2>
        <div className="space-y-3">
          {posts.length === 0 ? (
            <p className="text-sm text-cyber-muted">No posts yet.</p>
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
    </div>
  );
}