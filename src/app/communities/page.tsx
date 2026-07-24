import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CommunitiesPage() {
  const session = await getServerSession(authOptions);
  const communities = await prisma.community.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true, posts: true } },
      creator: { select: { username: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Communities</h1>
        {session && (
          <Link href="/create-community" className="cyber-button-primary text-sm">
            Create Community
          </Link>
        )}
      </div>

      {communities.length === 0 ? (
        <div className="cyber-card p-12 text-center">
          <p className="text-cyber-muted mb-4">No communities yet.</p>
          {session && (
            <Link href="/create-community" className="cyber-button-primary">
              Create the first one
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {communities.map((c) => (
            <Link
              key={c.id}
              href={`/c/${c.name}`}
              className="cyber-card p-5 block hover:border-cyber-cyan/40"
            >
              <h2 className="font-medium text-cyber-cyan">
                c/{c.name}
              </h2>
              <p className="text-sm text-cyber-text mt-1">{c.displayName}</p>
              {c.description && (
                <p className="text-xs text-cyber-muted mt-2 line-clamp-2">
                  {c.description}
                </p>
              )}
              <div className="flex gap-4 mt-3 text-xs text-cyber-muted">
                <span>{c._count.members} members</span>
                <span>{c._count.posts} posts</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
