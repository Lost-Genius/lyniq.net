# Lyniq

**lyniq.net** — A dark cyberpunk community platform (Reddit-style).

Built with Next.js 15, Prisma, NextAuth, and Tailwind CSS.

---

## Features

- User accounts (register / login)
- Communities (create & join style)
- Text & link posts
- Nested comments
- Upvote / downvote
- Hot / New / Top feeds
- User profiles
- Search communities
- Fully dark cyberpunk theme (neon cyan + magenta)

---

## Quick Start (VS Code)

### 1. Install dependencies

```bash
cd lyniq
npm install
```

### 2. Set up the database

```bash
npx prisma db push
npm run db:seed
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo account after seeding:**
- Email: `admin@lyniq.net`
- Password: `password123`

---

## Environment Variables

Copy `.env.example` to `.env` (already done for local):

```
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-this-to-a-long-random-string"
```

For production, generate a strong secret:
```bash
openssl rand -base64 32
```

---

## Production Deployment

### Recommended stack
- **Hosting**: Vercel (easiest for Next.js)
- **Database**: Switch to PostgreSQL (Neon, Supabase, or Railway)
- **Domain**: Point `lyniq.net` (GoDaddy) to your host

### Switch to PostgreSQL

1. Change `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Update `.env` with your Postgres connection string.

3. Run:
```bash
npx prisma db push
npm run db:seed
```

### Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add the environment variables in the Vercel dashboard.

Point your GoDaddy domain `lyniq.net` to Vercel following their custom domain guide.

---

## Project Structure

```
lyniq/
├── prisma/
│   ├── schema.prisma      # Database models
│   └── seed.ts            # Demo data
├── src/
│   ├── app/               # Next.js App Router pages
│   ├── components/        # UI components
│   ├── lib/               # Auth, Prisma, utils
│   └── types/
├── package.json
└── README.md
```

---

## Next Steps You Can Add

- Image uploads (Cloudinary / Uploadthing)
- Real-time notifications
- Better ranking algorithm
- Moderator tools
- Dark/light toggle (if ever wanted)
- Mobile app later

---

Built for the network.
