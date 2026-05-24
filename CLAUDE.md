# CLAUDE.md — Databricks Sword

> Project memory and AI guidance for Claude Code and similar AI assistants.

## Project Status (May 2026)

**Production Readiness: 85/100 ✅**

Key files for reference:
- `docs/readiness.md` - Latest production audit and fixes
- `docs/phase-2.md` - UX improvements in progress
- `docs/learner-feedback-audit.md` - Learner feedback analysis

## Quick Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Development (http://localhost:3000) |
| `pnpm test:run` | Run tests once |
| `pnpm tsc --noEmit` | Type check |
| `pnpm build` | Production build |
| `pnpm validate:content` | Validate mission/challenge content |

## Critical Security Notes

- **MOCK_AUTH is BLOCKED in production** - App throws error on startup if detected
- Rate limiting delegated to infrastructure (Vercel/CDN/nginx)
- All sensitive configs use environment variables

## Common Patterns

- Dark-only theme (anime-950 palette)
- API routes return: `{ success: true/false, ... }` or use `apiOk()`/`apiError()`
- Database interactions via Drizzle ORM in `/src/lib/db/`
- Content validation before commits via `pnpm validate:content`

## Architecture

```
src/
├── app/           # Next.js App Router pages + API routes
├── components/    # React components
├── lib/           # Library modules (auth, db, gamification, etc.)
├── content/       # Mission/Challenge JSON configs
└── types/         # Shared TypeScript types
```

## Common Issues

1. **Type errors after API changes** - Update corresponding test files
2. **Content validation fails** - Check `scripts/validate-content.ts`
3. **Middleware auth bypass** - Check `src/middleware.ts`