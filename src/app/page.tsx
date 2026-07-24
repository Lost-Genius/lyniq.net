import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PostCard from "@/components/PostCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getPosts(sort: string = "hot") {
  const orderBy =
    sort === "new"
      ? { createdAt: "desc" as const }
      : sort === "top"
      ? { score: "desc" as const }
      : [{ score: "desc" as const }, { createdAt: "desc" as const }];

  return prisma.post.findMany({
    take: 30,
    orderBy,
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
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const sort = params.sort || "hot";
  const posts = await getPosts(sort);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-wide text-cyber-text">
          Feed
        </h1>
        <div className="flex gap-2 text-sm">
          {["hot", "new", "top"].map((s) => (
            <Link
              key={s}
              href={`/?sort=${s}`}
              className={`px-3 py-1 rounded-md capitalize transition-colors ${
                sort === s
                  ? "bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40"
                  : "text-cyber-muted hover:text-cyber-text"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="cyber-card p-12 text-center">
          <p className="text-cyber-muted mb-4">No posts yet. Be the first.</p>
          <Link href="/create" className="cyber-button-primary">
            Create a post
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                ...post,
                commentCount: post._count.comments,
              }}
              currentUserId={session?.user?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
