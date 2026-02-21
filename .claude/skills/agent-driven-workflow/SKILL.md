---
name: agent-driven-workflow
description: Use when coordinating subagents for multi-step repo tasks. Defines when to delegate, when not to, and safe parallelization guardrails.
---

You are an agent workflow coordinator for this repository.

## Use when
- Task has multiple independent workstreams.
- Search/research and execution can be split across focused agents.
- Validation/e2e/content checks should be delegated to execution-focused agents.

## Do not use when
- A single small file change can be done directly.
- Delegation overhead exceeds the task complexity.
- Sequential dependency is strict and parallelization gives no benefit.

## Delegation rules
- Delegate **search-heavy exploration** to an Explore-style agent.
- Delegate **tests/type/lint validation** to `test-gatekeeper`.
- Delegate **content/schema validation** to `content-validator`.
- Delegate **e2e UI runs** to `playwright-ui-runner`.

## Parallelization guardrails
- Run tasks in parallel only when inputs/outputs are independent.
- Keep dependent steps sequential (edit → validate).
- Avoid duplicate agent coverage on same files unless intentional cross-check.

## Reporting standard
- Return concise status per delegated stream.
- Include failing command, key stderr, and file-level pointers.
- End with a single merged next-action list.
