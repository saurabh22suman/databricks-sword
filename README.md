# Databricks Sword

> Gamified learning platform for mastering the Databricks ecosystem.

Story-driven missions, standalone challenges, and spaced-repetition flashcards — all with simulated execution (no real Spark, no cloud costs).

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials (see below)

# Run database migrations
pnpm drizzle-kit push

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Mock Auth (optional)

To bypass OAuth during local development, add to `.env.local`:

```
MOCK_AUTH=true
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Required | Description |
|----------|----------|-------------|
| `TURSO_DATABASE_URL` | Yes | Turso/libSQL database URL |
| `TURSO_AUTH_TOKEN` | Yes (prod) | Turso auth token |
| `AUTH_SECRET` | Yes | Auth.js session secret (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Yes | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Yes | Google OAuth client secret |
| `AUTH_GITHUB_ID` | Yes | GitHub OAuth client ID |
| `AUTH_GITHUB_SECRET` | Yes | GitHub OAuth client secret |
| `AES_ENCRYPTION_KEY` | Optional | 32-byte hex key for PAT encryption (`openssl rand -hex 32`) |
| `ADMIN_PASSWORD` | Optional | Password for `/admin` panel |
| `NEXT_PUBLIC_SITE_URL` | Optional | Public site URL (defaults to `http://localhost:3000`) |
| `MOCK_AUTH` | Optional | Set `true` to bypass OAuth in development |

## Scripts

```bash
pnpm dev              # Development server (Turbopack)
pnpm build            # Production build
pnpm start            # Start production server
pnpm test:run         # Run all tests once
pnpm test             # Run tests in watch mode
pnpm test:coverage    # Tests with coverage report
pnpm typecheck        # Type checking (tsc --noEmit)
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm validate         # Type-check + lint + test (CI gate)
pnpm validate:content # Validate mission/challenge JSON configs
```

## Architecture

```
src/
├── app/               # Next.js App Router (pages, layouts, API routes)
├── components/        # React components (ui/, missions/, challenges/, gamification/)
├── content/           # Mission & challenge JSON configs + MDX
├── lib/               # Core libraries
│   ├── gamification/  # Ranks, achievements, streaks, XP
│   ├── sandbox/       # localStorage progress + Turso sync
│   ├── missions/      # Mission loader & validation
│   ├── challenges/    # Challenge loader & validation
│   ├── intel/         # Intel/Challenge topic alignment
│   ├── srs/           # SM-2 spaced repetition engine
│   ├── db/            # Drizzle ORM schema & client
│   └── auth/          # Auth.js v5 configuration
└── types/             # Shared TypeScript types
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, React Server Components) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 (dark-only cyberpunk theme) |
| Database | SQLite via Turso + Drizzle ORM |
| Auth | Auth.js v5 (Google + GitHub OAuth) |
| Testing | Vitest + React Testing Library |
| Package Manager | pnpm |
| Deployment | Docker → Dokploy |

## Gamification

8 military/mecha ranks from **Cadet** (0 XP) to **Grandmaster** (25,000 XP), 21 achievements, daily streak tracking with freeze mechanics, and XP multipliers.

## Docker

```bash
# Development
docker compose up

# Production
docker compose -f docker-compose.prod.yml up -d --build
```

## License

Private — All rights reserved.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
