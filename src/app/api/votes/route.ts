import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
  postId: z.string().optional(),
  commentId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = voteSchema.parse(body);

    if (!data.postId && !data.commentId) {
      return NextResponse.json(
        { error: "postId or commentId required" },
        { status: 400 }
      );
    }

    if (data.postId && data.commentId) {
      return NextResponse.json(
        { error: "Provide only one of postId or commentId" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    if (data.postId) {
      const existing = await prisma.vote.findUnique({
        where: {
          userId_postId: { userId, postId: data.postId },
        },
      });

      if (data.value === 0) {
        // Remove vote
        if (existing) {
          await prisma.vote.delete({ where: { id: existing.id } });
          await prisma.post.update({
            where: { id: data.postId },
            data: { score: { decrement: existing.value } },
          });
        }
        return NextResponse.json({ success: true });
      }

      if (existing) {
        // Change vote
        const diff = data.value - existing.value;
        await prisma.vote.update({
          where: { id: existing.id },
          data: { value: data.value },
        });
        await prisma.post.update({
          where: { id: data.postId },
          data: { score: { increment: diff } },
        });
      } else {
        // New vote
        await prisma.vote.create({
          data: {
            value: data.value,
            userId,
            postId: data.postId,
          },
        });
        await prisma.post.update({
          where: { id: data.postId },
          data: { score: { increment: data.value } },
        });
      }
    }

    if (data.commentId) {
      const existing = await prisma.vote.findUnique({
        where: {
          userId_commentId: { userId, commentId: data.commentId },
        },
      });

      if (data.value === 0) {
        if (existing) {
          await prisma.vote.delete({ where: { id: existing.id } });
          await prisma.comment.update({
            where: { id: data.commentId },
            data: { score: { decrement: existing.value } },
          });
        }
        return NextResponse.json({ success: true });
      }

      if (existing) {
        const diff = data.value - existing.value;
        await prisma.vote.update({
          where: { id: existing.id },
          data: { value: data.value },
        });
        await prisma.comment.update({
          where: { id: data.commentId },
          data: { score: { increment: diff } },
        });
      } else {
        await prisma.vote.create({
          data: {
            value: data.value,
            userId,
            commentId: data.commentId,
          },
        });
        await prisma.comment.update({
          where: { id: data.commentId },
          data: { score: { increment: data.value } },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
