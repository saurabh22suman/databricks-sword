# AGENTS.md — Databricks Sword

> Universal agent instructions for AI coding assistants (GitHub Copilot, Codex, Cursor, Claude Code, etc.)

## Project Overview

**Databricks Sword** is a gamified learning platform for mastering the Databricks ecosystem. It combines:
- **Story-driven missions** — Deep learning through realistic industry scenarios (20 missions across 10 industries)
- **Open challenge library** — Standalone drills for practice and interview prep (~50 challenges)
- **Spaced repetition** — SM-2 algorithm for long-term concept retention

**All execution is simulated** — no real Spark, no AI APIs, no cloud costs.

**Theme:** Dark-only cyberpunk/anime aesthetic. NO light mode.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, React Server Components) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 (dark-only, anime-950 palette) |
| Content | JSON configs + MDX in `src/content/` |
| Database | SQLite via Turso + Drizzle ORM |
| Auth | Auth.js v5 (mandatory — Google + GitHub OAuth) |
| Testing | Vitest + React Testing Library + Playwright |
| Code Editor | Monaco Editor (simulated execution only) |
| Package Manager | pnpm |
| Fonts | Saira (headings) + JetBrains Mono (code) |
| Deployment | Docker → Dokploy on VPS |

## Quick Start

```bash
pnpm install          # Install dependencies
pnpm dev              # Development server (http://localhost:3000)
pnpm test:run         # Run all tests once
pnpm tsc --noEmit     # Type check
pnpm build            # Production build
```

## Implementation Progress

**Check `docs/implementation-plan.md` for current progress.**

```bash
# Find the next task
grep -n "\[ \]" docs/implementation-plan.md | head -5
```

## Core Architecture

### Gamification (`src/lib/gamification/`)

```typescript
// 8 Military/Mecha ranks
RANKS: Cadet (0) → Recruit (100) → Operative (500) → Specialist (1500) 
       → Commander (4000) → Sentinel (8000) → Architect (15000) → Grandmaster (25000)

getRankForXp(xp: number): Rank
getStreakMultiplier(streak: number): number  // 1x → 1.25x → 1.5x → 2x
checkAchievement(condition, profile): boolean
```

### Browser Sandbox (`src/lib/sandbox/`)

Progress stored in localStorage (5-15KB per mission), syncs to Turso on login.

```typescript
saveSandbox(data: SandboxData): void
loadSandbox(): SandboxData | null
syncToServer(userId: string): Promise<void>
```

### Mission System (`src/lib/missions/`)

Each mission follows the **full pedagogical loop**:
```
Briefing (WHY) → Diagram (WHERE/WHAT) → Code Challenges (HOW) 
→ Quiz (RECALL) → Debrief (REFLECT)
```

Stage types: `briefing`, `diagram`, `drag-drop`, `fill-blank`, `free-text`, `quiz`, `compare`, `debrief`

### Challenge Library (`src/lib/challenges/`)

Categories: pyspark, sql, delta-lake, streaming, mlflow, unity-catalog, architecture

### Intel/Challenge Topic Alignment (`src/lib/intel/`)

Baseline Intel topics (`delta-lake`, `pyspark`, `sql`, `mlflow`, `architecture`) must have challenge coverage at runtime. The `topicAlignment.ts` helper computes missing baseline topics and maps Intel categories to challenge category filters. Non-baseline topics (e.g., `general`, future admin-added categories) are allowed without challenge requirements.

- `getIntelTopicCoverage(challenges)` → returns missing baseline topics
- `getChallengeCategoryForIntelTopic(topic)` → maps Intel topic to challenge category or `null`

### Spaced Repetition (`src/lib/srs/`)

SM-2 algorithm. Concepts from completed missions auto-become flashcards.

## Build & Run Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Development server
pnpm build            # Production build
pnpm start            # Start production server
pnpm tsc --noEmit     # Type checking
pnpm lint             # Linting
pnpm format           # Format code
```

## Testing Instructions

```bash
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once (CI mode)
pnpm vitest run src/components/missions/__tests__/MissionCard.test.tsx  # Single file
pnpm vitest run -t "MissionCard"  # Pattern match
pnpm test:e2e         # E2E tests
pnpm test:coverage    # With coverage
```

### Testing Rules

- **ALWAYS** run `pnpm test:run` before committing
- **ALWAYS** run `pnpm tsc --noEmit` to verify type safety
- Tests go in `__tests__/` directories co-located with the code
- Test file naming: `ComponentName.test.tsx` or `utilName.test.ts`
- Prefer `screen.getByRole` and accessible queries over test IDs
- Mock localStorage, fetch, and external dependencies

### Red-Green-Refactor TDD (Mandatory)

**ALWAYS follow the Red-Green-Refactor cycle. NEVER write implementation code before its test exists.**

1. **RED** — Write a failing test first. Run `pnpm test:run` and confirm it fails.
2. **GREEN** — Write the **minimum** code to make the test pass.
3. **REFACTOR** — Clean up while keeping all tests green.

### Agent Workflow

```
1. Check docs/implementation-plan.md for current progress
2. Find the next unchecked task [ ]
3. Create the test file with failing tests (RED)
4. Run `pnpm test:run` — confirm tests FAIL
5. Implement the code (GREEN)
6. Run `pnpm test:run` — confirm tests PASS
7. Refactor if needed, run tests again
8. Run `pnpm tsc --noEmit` — confirm no type errors
9. Update implementation-plan.md with [x] for completed task
10. Commit: `feat(phase): description`
```

## Code Style & Conventions

### TypeScript

- Strict mode enabled — **NEVER** use `any` type
- Prefer `type` over `interface` unless extending
- All functions must have explicit return types
- Use Zod for runtime validation of JSON configs

### React / Next.js

- **Server Components by default** — only add `"use client"` when interactivity is needed
- Use Next.js App Router conventions (layouts, loading, error boundaries)
- File naming: `PascalCase` for components, `camelCase` for utilities
- Import alias: `@/*` maps to `src/*`

### Tailwind CSS — DARK ONLY

- **NO `dark:` variants** — the anime-950 palette IS the default
- **NO light mode** — we are dark-only
- Use CSS variables defined in `globals.css`
- **NEVER** use arbitrary values like `w-[347px]` — use closest utility

```css
/* Anime Color Palette */
--anime-950: #0a0a0f;   /* darkest background */
--anime-900: #12121a;   /* card backgrounds */
--anime-800: #1a1a24;   /* elevated surfaces */
--anime-700: #2a2a3a;   /* borders */
--anime-accent: #ff3366; /* primary (red) */
--anime-cyan: #00ffff;   /* secondary */
--anime-purple: #9933ff; /* tertiary */
--anime-yellow: #ffcc00; /* warnings */
--anime-green: #00ff66;  /* success */
```

```css
/* Key Utilities */
.cut-corner     /* clip-path for anime-styled corners */
.shadow-neon-red, .shadow-neon-cyan, .shadow-neon-purple
.animate-glitch, .animate-float, .animate-scan, .animate-hologram
.cyber-grid     /* background grid effect */
.grain-overlay  /* film grain texture */
```

### Git Conventions

- Commit messages: `type(scope): description` (conventional commits)
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `content`
  - Example: `feat(missions): add drag-drop challenge component`
- Branch naming: `feature/short-description`, `fix/short-description`
- **NEVER** commit `.env` files, secrets, or API keys

## Architecture

```
src/
├── app/                        # Next.js App Router
│   ├── missions/               # Mission routes
│   │   ├── [id]/               # Single mission
│   │   │   └── stage/[stageId]/ # Stage player
│   ├── challenges/             # Challenge routes
│   ├── profile/                # User profile
│   ├── review/                 # Spaced repetition
│   ├── daily/                  # Daily Forge
│   ├── faq/                    # Interview FAQ
│   ├── blog/                   # System Logs
│   └── api/                    # API routes
├── components/
│   ├── ui/                     # Base UI (Button, Card, Badge, etc.)
│   ├── missions/               # Mission components
│   ├── challenges/             # Challenge components
│   ├── gamification/           # XP, rank, streak components
│   ├── landing/                # Landing page sections
│   └── layout/                 # Header, Footer
├── content/
│   ├── missions/               # Mission content (JSON + MDX)
│   │   └── {slug}/
│   │       ├── mission.json    # Manifest
│   │       ├── stages/         # Stage configs
│   │       └── side-quests/    # OSS deep dives
│   └── challenges/             # Challenge content (JSON)
│       └── {category}/
├── lib/
│   ├── gamification/           # Ranks, achievements, streaks
│   ├── sandbox/                # Browser storage + sync
│   ├── missions/               # Mission loader + validation
│   ├── challenges/             # Challenge loader + validation
│   ├── intel/                  # Intel/Challenge topic alignment
│   ├── srs/                    # Spaced repetition engine
│   ├── db/                     # Drizzle schema & client
│   └── utils.ts                # General utilities
└── styles/
    └── globals.css             # Tailwind + anime tokens
```

## Key Files

| File | Purpose |
|------|---------|
| `docs/plan.md` | Full architecture and design decisions |
| `docs/implementation-plan.md` | Task checklist with progress tracking |
| `src/lib/gamification/` | Ranks, achievements, streaks logic |
| `src/lib/sandbox/` | localStorage + Turso sync |
| `src/lib/missions/` | Mission loader, types, validation |
| `src/lib/challenges/` | Challenge loader, validation |
| `src/lib/intel/` | Intel/Challenge topic alignment helpers |
| `src/lib/srs/` | SM-2 spaced repetition |

## Important Notes

- **No actual Spark execution** — pattern matching + pre-recorded outputs
- **Dark-only theme** — NO light mode, NO `dark:` variants
- **Browser-first progress** — localStorage, syncs to DB on login
- **Auth is mandatory** — `/`, `/blog`, `/intel` are public; everything else requires login
- **Simulated outputs** — all code "execution" is fake
- **Accessibility** — WCAG 2.1 AA compliance target
