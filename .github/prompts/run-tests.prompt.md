---
mode: "agent"
description: "Run the full test suite, fix failures, and verify type safety"
---

# Run Tests

Run the complete test and verification pipeline for Databricks Sword.

## Steps

1. Run TypeScript type checking: `pnpm tsc --noEmit`
2. Run ESLint: `pnpm lint`
3. Run all unit and component tests: `pnpm test:run`
4. If any step fails, diagnose and fix the issues
5. Re-run until everything passes

## Commands

```bash
# Step 1: Type check
pnpm tsc --noEmit

# Step 2: Lint
pnpm lint

# Step 3: Run tests
pnpm test:run

# Step 4: Build verification
pnpm build
```

## Handling Failures

- **Type errors:** Fix the TypeScript types — never use `any` as a workaround
- **Lint errors:** Fix the code to comply — don't disable rules unless absolutely necessary
- **Test failures:** Read the test assertion carefully, fix the source code OR update tests if requirements changed
- **Build errors:** Check for SSR issues, missing environment variables, or import problems

## Success Criteria

All four commands must pass with zero errors before considering the task complete.
