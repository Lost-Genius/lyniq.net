import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create a demo user
  const password = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@lyniq.net" },
    update: {},
    create: {
      email: "admin@lyniq.net",
      username: "admin",
      name: "Admin",
      password,
    },
  });

  // Create a starter community
  const community = await prisma.community.upsert({
    where: { name: "general" },
    update: {},
    create: {
      name: "general",
      displayName: "General",
      description: "The main hub for all discussions on Lyniq.",
      creatorId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "admin",
        },
      },
    },
  });

  // Create a second community
  await prisma.community.upsert({
    where: { name: "cyberpunk" },
    update: {},
    create: {
      name: "cyberpunk",
      displayName: "Cyberpunk",
      description: "Neon lights, high tech, low life. Discuss the genre and the future.",
      creatorId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "admin",
        },
      },
    },
  });

  // Create a sample post
  const existingPost = await prisma.post.findFirst({
    where: { title: "Welcome to Lyniq" },
  });

  if (!existingPost) {
    await prisma.post.create({
      data: {
        title: "Welcome to Lyniq",
        content:
          "This is the beginning of the network.\n\nCreate communities, share posts, upvote what matters, and discuss.\n\nThe dark cyberpunk aesthetic is intentional — stay in the neon.",
        type: "text",
        authorId: user.id,
        communityId: community.id,
        score: 1,
      },
    });
  }

  console.log("Seed completed.");
  console.log("Demo account: admin@lyniq.net / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
