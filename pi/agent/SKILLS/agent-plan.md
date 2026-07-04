---
name: agent-plan
description: Produces a clear, executable agent plan for a coding task — scoped steps, discovery, verification, risks, and delegation. Use when the user asks to plan a task, wants a plan before implementation, says "plan this", "how would you approach", or needs a structured breakdown for an agent to execute.
---

# Agent Plan

Turn a user task into a plan an agent can execute reliably. **Plan only — do not implement** unless the user explicitly asks to execute afterward.

## When to plan

| Situation | Action |
|-----------|--------|
| Trivial (one file, obvious fix, <5 min) | Skip formal plan; state approach in 2–3 sentences |
| Medium (few files, some unknowns) | Short plan (3–6 steps) |
| Large (architecture, many files, external deps, unclear scope) | Full plan with discovery phase |

When unsure, plan. A 30-second plan beats a 30-minute wrong path.

## Workflow

### 1. Clarify the task

Extract or infer:

- **Goal** — what "done" looks like in user-visible terms
- **Success criteria** — how to verify (tests, commands, manual checks)
- **Constraints** — scope limits, patterns to follow, things not to touch
- **Non-goals** — explicitly out of scope

If a blocker cannot be inferred from the task or codebase, ask **one** precise question. Otherwise proceed with a labeled assumption.

### 2. Discover (when codebase is involved)

Before committing to steps, gather facts:

- Read `AGENTS.md`, README, and relevant config if present
- Use `rg` to locate symbols, patterns, and call sites
- For broad or unfamiliar areas, delegate to **explorer** or **scout** sub-agents and fold their findings into the plan

Do not plan file paths you have not verified exist.

### 3. Decompose

Each step must be:

- **Atomic** — one clear outcome; splittable if it mixes discovery + edit + verify
- **Ordered** — later steps depend on earlier ones; call out parallelizable work
- **Verifiable** — end with how to confirm success (command, test, or observable behavior)
- **Minimal** — smallest change that satisfies the goal; no speculative refactors

Prefer editing existing code over adding new abstractions. Flag optional improvements separately from required work.

### 4. Surface risks

Call out explicitly:

- Assumptions made to proceed without user input
- Decisions that need user choice (with a recommended default)
- Breaking changes, migrations, or irreversible actions
- Steps likely to fail or need iteration

### 5. Present the plan

Use this structure. Omit sections that do not apply.

```markdown
# Plan: [short task title]

## Goal
[One sentence]

## Success criteria
- [ ] ...

## Context
[2–4 sentences: what exists today, what matters for this task]

## Assumptions
- ...

## Plan
1. **[Step title]** — [what to do]
   - Files: `path/to/file` (if known)
   - Verify: `[command or check]`
2. ...

## Delegation (if any)
- **explorer/scout**: [what to find]
- **worker**: [what to implement after discovery]

## Risks / open questions
- ...

## Out of scope
- ...
```

For plan-mode compatibility, keep the numbered list under a `Plan:` header:

```markdown
Plan:
1. First step
2. Second step
```

During execution, steps complete with `[DONE:n]` markers.

## Planning principles

- **Explore before commit.** Paths, interfaces, and conventions come from the repo, not memory.
- **Verify early.** Put a cheap check after risky or foundational steps, not only at the end.
- **One concern per step.** "Refactor auth and add tests" → two steps.
- **Name files, not vibes.** `src/auth/middleware.ts` not "the auth layer".
- **Default to the boring solution.** Note alternatives only when the trade-off matters.
- **Right-size delegation.** Use sub-agents when discovery would bloat context; keep implementation steps for the main agent or worker unless parallel work is obvious.

## Anti-patterns

- Steps with no verification ("update the handler")
- Planning changes to files you have not located
- Bundling unrelated cleanup with the requested task
- Plans longer than the work they describe
- Hidden assumptions presented as facts

## After the plan

End with:

> Ready to execute? Say **go** (or name a step to start with).

Do not start implementation until the user confirms — unless they asked for plan-and-execute in the same message.

## Example

**Task:** "Add rate limiting to the login endpoint"

```markdown
# Plan: Rate limit login endpoint

## Goal
Reject excessive login attempts per IP with 429 and a Retry-After header.

## Success criteria
- [ ] >N requests/min from one IP → 429
- [ ] Normal login still works
- [ ] Existing auth tests pass

## Context
Login handler in `src/routes/auth.ts`. App uses Express. No existing rate-limit middleware.

## Assumptions
- In-memory limiter is acceptable (single instance); Redis only if user needs multi-instance.

## Plan
1. **Locate login route and middleware chain** — read `src/routes/auth.ts`, note where to attach middleware
   - Verify: can point to exact handler function
2. **Add rate-limit middleware** — use `express-rate-limit` or existing project pattern if found
   - Files: `src/routes/auth.ts`, possibly `src/middleware/rateLimit.ts`
   - Verify: `npm test -- auth` (or project equivalent)
3. **Add/adjust tests** — cover throttle trigger and success path
   - Verify: new tests pass

## Risks / open questions
- Multi-instance deploy? → needs shared store, not in-memory.

## Out of scope
- Rate limiting other endpoints
- CAPTCHA / account lockout
```
