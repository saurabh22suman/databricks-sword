# Copilot Instructions — Databricks Sword

## Project Context

**Databricks Sword** is a gamified learning platform for mastering the Databricks ecosystem. It combines:
- **Story-driven missions** — Deep learning through realistic industry scenarios
- **Open challenge library** — Skill drilling for practice and interview prep
- **Spaced repetition flashcards** — Long-term retention of concepts

All execution is **simulated** — no real Spark, no AI APIs, no cloud costs.

**Theme:** Dark-only cyberpunk/anime aesthetic (anime-950 palette, neon accents, glitch effects).

## Tech Stack

- **Framework:** Next.js 15 with App Router and React Server Components
- **Language:** TypeScript (strict mode, no `any`)
- **Styling:** Tailwind CSS 4 (dark-only, cyberpunk theme)
- **Content:** MDX + JSON configs in `src/content/`
- **Database:** Turso (SQLite) with Drizzle ORM
- **Testing:** Vitest + React Testing Library + Playwright
- **Package Manager:** pnpm
- **Import Alias:** `@/*` → `src/*`
- **Fonts:** Saira (headings) + JetBrains Mono (code)

## Core Architecture

### Gamification System (`src/lib/gamification/`)

```typescript
// 8 Military/Mecha ranks
RANKS: Cadet (0 XP) → Recruit (100) → Operative (500) → Specialist (1500) 
       → Commander (4000) → Sentinel (8000) → Architect (15000) → Grandmaster (25000)

// Key functions
getRankForXp(xp: number): Rank
getStreakMultiplier(streak: number): number  // 1x → 1.25x → 1.5x → 2x
checkAchievement(condition, profile): boolean
```

### Browser Sandbox (`src/lib/sandbox/`)

Progress stored in localStorage (5-15KB per mission), synced to Turso DB on login.

```typescript
saveSandbox(data: SandboxData): void
loadSandbox(): SandboxData | null
syncToServer(userId: string): Promise<void>
syncFromServer(userId: string): Promise<void>
```

### Mission System (`src/lib/missions/`)

Each mission follows the **full pedagogical loop**:

```
Briefing (WHY) → Diagram (WHERE/WHAT) → Code Challenges (HOW) 
→ Quiz (RECALL) → Debrief (REFLECT)
```

**Stage types:** `briefing`, `diagram`, `drag-drop`, `fill-blank`, `free-text`, `quiz`, `compare`, `debrief`

**Ranks:** B (beginner), A (intermediate), S (advanced)

### Challenge Library (`src/lib/challenges/`)

Standalone challenges for drilling. Categories: pyspark, sql, delta-lake, streaming, mlflow, unity-catalog, architecture.

### Spaced Repetition (`src/lib/srs/`)

SM-2 algorithm. Concepts from completed missions auto-become flashcards.

## Architecture Rules

1. **Server Components by default** — only add `"use client"` when the component needs browser APIs, event handlers, or React hooks
2. **App Router patterns** — use layouts, loading.tsx, error.tsx, not-found.tsx for each route group
3. **Dark-only theme** — NO light mode, NO `dark:` variants. The anime-950 palette IS the default.
4. **Simulated execution** — code challenges use pattern matching, not real Spark. Pre-recorded outputs only.
5. **Mandatory auth** — `/`, `/blog`, `/intel` are public. Everything else requires Google/GitHub login.
6. **Mission content in JSON** — `src/content/missions/{slug}/mission.json` + stage configs
7. **Challenge content in JSON** — `src/content/challenges/{category}/{id}.json`

## Code Conventions

- Use `type` over `interface` unless you need declaration merging
- All exported functions must have explicit return types
- Use Zod for validating mission configs, challenge configs, and API inputs
- Prefer named exports over default exports (except for page/layout components)
- File naming: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- Tests co-located in `__tests__/` directories next to the code they test
- Use `cn()` utility (clsx + tailwind-merge) for conditional class names
- ALWAYS add JSDoc comments to exported functions and components

## Key Imports

```typescript
// Gamification
import { getRankForXp, RANKS, checkAchievement } from "@/lib/gamification";
import type { Rank, Achievement, StreakData, UserProfile } from "@/lib/gamification/types";

// Missions
import { getMission, getAllMissions, getStageConfig } from "@/lib/missions";
import type { Mission, Stage, SideQuest } from "@/lib/missions/types";

// Challenges
import { getChallenge, validateChallengeResponse } from "@/lib/challenges";
import type { Challenge, ChallengeResult } from "@/lib/challenges/types";

// Sandbox
import { loadSandbox, saveSandbox, updateSandbox } from "@/lib/sandbox";
import type { SandboxData } from "@/lib/sandbox/types";

// SRS
import { getDueCards, recordReview } from "@/lib/srs";

// Utilities
import { cn } from "@/lib/utils";
```

## Component Patterns

### Server Component (default)
```tsx
export function MissionCard({ mission }: MissionCardProps): React.ReactElement {
  return (
    <div className="cut-corner bg-anime-900 border border-anime-700 shadow-neon-cyan">
      <RankBadge rank={mission.rank} />
      <h3 className="font-heading text-anime-cyan">{mission.title}</h3>
    </div>
  )
}
```

### Client Component (interactive)
```tsx
"use client"
export function DragDropChallenge({ config }: DragDropChallengeProps): React.ReactElement {
  const [blocks, setBlocks] = useState(config.blocks)
  const sandbox = useSandbox()
  
  const handleComplete = () => {
    sandbox.update((data) => ({
      ...data,
      // update progress
    }))
  }
  
  return <div>...</div>
}
```

## Styling Guide

### Anime Color Palette
```css
--anime-950: #0a0a0f;   /* darkest background */
--anime-900: #12121a;   /* card backgrounds */
--anime-800: #1a1a24;   /* elevated surfaces */
--anime-700: #2a2a3a;   /* borders, dividers */
--anime-accent: #ff3366; /* primary accent (red) */
--anime-cyan: #00ffff;   /* secondary accent */
--anime-purple: #9933ff; /* tertiary accent */
--anime-yellow: #ffcc00; /* warnings, highlights */
--anime-green: #00ff66;  /* success states */
```

### Key Utilities
```css
.cut-corner     /* clip-path for anime-styled corners */
.shadow-neon-red, .shadow-neon-cyan, .shadow-neon-purple
.animate-glitch, .animate-float, .animate-scan, .animate-hologram
.cyber-grid     /* background grid effect */
.grain-overlay  /* film grain texture */
```

### Do NOT use
- `dark:` variants (we are dark-only)
- Light color values for backgrounds
- Theme toggle logic
- Arbitrary values like `w-[347px]`

## Mission Content Structure

```
src/content/missions/{mission-slug}/
├── mission.json          ← Manifest with metadata, stages, side quests
├── briefing.mdx          ← Optional narrative content
├── debrief.mdx           ← Optional summary content
└── stages/
    ├── 01-briefing.json
    ├── 02-architecture.json
    ├── 03-drag-drop.json
    ├── 04-fill-blank.json
    ├── 05-quiz.json
    └── 06-debrief.json
```

### Mission Manifest Schema
```typescript
type Mission = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  industry: Industry;
  rank: "B" | "A" | "S";
  xpRequired: number;
  xpReward: number;
  estimatedMinutes: number;
  primaryFeatures: string[];
  stages: Stage[];
  sideQuests: SideQuest[];
};
```

## Challenge Content Structure

```
src/content/challenges/{category}/
├── df-transformations.json
├── window-functions.json
└── ...
```

### Challenge Schema
```typescript
type Challenge = {
  id: string;
  title: string;
  category: ChallengeCategory;
  difficulty: "B" | "A" | "S";
  format: "drag-drop" | "fill-blank" | "free-text";
  description: string;
  // format-specific fields...
  hints: string[];
  xpReward: number;
  optimalSolution: string;
  explanation: string;
};
```

## Testing Rules — Red-Green-Refactor TDD

**ALWAYS follow the Red-Green-Refactor cycle. NEVER write implementation code before its test exists.**

### The Cycle

1. **RED** — Write a failing test first. The test must fail because the implementation does not exist yet. Run the test and confirm it fails.
2. **GREEN** — Write the **minimum** code needed to make the failing test pass. No extra logic, no premature abstractions.
3. **REFACTOR** — Clean up the code (extract helpers, rename, remove duplication) while keeping all tests green. Run tests after every refactor.

### Practical Rules

- Write tests for every new component and utility function — **before** implementation
- Use `screen.getByRole()` and accessible queries — avoid test IDs
- Mock external dependencies (database, auth, localStorage) in unit tests
- Use `describe` / `it` blocks with descriptive names
- Run `pnpm test:run && pnpm tsc --noEmit` before considering any task complete
- When adding a feature: write the test → watch it fail → implement → watch it pass → refactor
- When fixing a bug: write a test that reproduces the bug (RED) → fix the bug (GREEN) → refactor
- NEVER skip the RED step — if the test passes immediately, the test is wrong or the feature already exists

### Test File Conventions

- Tests co-located in `__tests__/` directories next to the code they test
- Test file naming: `ComponentName.test.tsx` or `utilName.test.ts`
- One `describe` block per component/function, nested `describe` for sub-features
- Each `it` block tests ONE behavior

### Agent Workflow

When working as an AI agent, follow this sequence for every task:

```
1. Check docs/implementation-plan.md for current progress
2. Find the next unchecked task
3. Create the test file with failing tests (RED)
4. Run `pnpm test:run` — confirm tests FAIL
5. Create/edit the implementation file (GREEN)
6. Run `pnpm test:run` — confirm tests PASS
7. Refactor if needed, run tests again
8. Run `pnpm tsc --noEmit` — confirm no type errors
9. Update implementation-plan.md with [x] for completed task
10. Move to next task
```

## Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page (Hero, Active Campaigns, Data Archive) |
| `/missions` | Mission select grid |
| `/missions/[id]` | Mission briefing + start |
| `/missions/[id]/stage/[stageId]` | Active stage player |
| `/challenges` | Challenge library with filters |
| `/challenges/[id]` | Individual challenge player |
| `/daily` | Daily Forge (streak challenge) |
| `/profile` | XP, rank, achievements, streak calendar |
| `/review` | Spaced repetition queue |
| `/intel` | Decrypted knowledge base - interview prep questions |
| `/blog` | System Logs (blog posts) |

## Important Files

| File | Purpose |
|------|---------|
| `docs/plan.md` | Full architecture and design decisions |
| `docs/implementation-plan.md` | Detailed task checklist with progress |
| `src/lib/gamification/` | Ranks, achievements, streaks |
| `src/lib/sandbox/` | Browser storage + DB sync |
| `src/lib/missions/` | Mission loader + validation |
| `src/lib/challenges/` | Challenge loader + validation |
| `src/lib/srs/` | Spaced repetition algorithm |
| `src/content/missions/` | Mission content (JSON + MDX) |
| `src/content/challenges/` | Challenge content (JSON) |
