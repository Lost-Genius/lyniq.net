import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCommentSchema = z.object({
  content: z.string().min(1).max(10000),
  postId: z.string(),
  parentId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createCommentSchema.parse(body);

    const post = await prisma.post.findUnique({ where: { id: data.postId } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        authorId: session.user.id,
        postId: data.postId,
        parentId: data.parentId || null,
      },
      include: {
        author: {
          select: { id: true, username: true, name: true, image: true },
        },
        votes: true,
      },
    });

    // Update comment count
    await prisma.post.update({
      where: { id: data.postId },
      data: { commentCount: { increment: 1 } },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
