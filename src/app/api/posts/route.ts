import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().max(10000).optional(),
  url: z.string().url().optional().or(z.literal("")),
  communityId: z.string(),
  type: z.enum(["text", "link"]).default("text"),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") || "hot";
  const community = searchParams.get("community");
  const limit = parseInt(searchParams.get("limit") || "20");
  const cursor = searchParams.get("cursor");

  try {
    const where: any = {};
    if (community) {
      where.community = { name: community };
    }

    let orderBy: any = { createdAt: "desc" };
    if (sort === "top") {
      orderBy = { score: "desc" };
    } else if (sort === "hot") {
      // Simple hot: score + recency boost
      orderBy = [{ score: "desc" }, { createdAt: "desc" }];
    }

    const posts = await prisma.post.findMany({
      where,
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
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

    return NextResponse.json({ posts });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createPostSchema.parse(body);

    const community = await prisma.community.findUnique({
      where: { id: data.communityId },
    });
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const post = await prisma.post.create({
      data: {
        title: data.title,
        content: data.content || null,
        url: data.url || null,
        type: data.type,
        authorId: session.user.id,
        communityId: data.communityId,
      },
      include: {
        author: {
          select: { id: true, username: true, name: true, image: true },
        },
        community: {
          select: { id: true, name: true, displayName: true },
        },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
