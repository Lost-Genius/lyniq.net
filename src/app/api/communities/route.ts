import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCommunitySchema = z.object({
  name: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Name must be lowercase letters, numbers, underscores"),
  displayName: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  try {
    const communities = await prisma.community.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q } },
              { displayName: { contains: q } },
            ],
          }
        : undefined,
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true, posts: true } },
        creator: { select: { username: true } },
      },
    });

    return NextResponse.json({ communities });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch communities" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createCommunitySchema.parse(body);

    const existing = await prisma.community.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Community name already taken" },
        { status: 400 }
      );
    }

    const community = await prisma.community.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        creatorId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "admin",
          },
        },
      },
    });

    return NextResponse.json({ community }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to create community" }, { status: 500 });
  }
}
