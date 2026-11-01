# Code

Goal: a reader understands any function by reading only that function and the types it names.

## Shape

- Choose the simplest solution that solves the whole problem. A small diff beats an elegant one.
- Split out a function only when the program reuses it today, or when it implements a named interface or external API. If understanding a caller means reading its helper, inline the helper. No abstraction for reuse that might come later.
- Each layer must change the abstraction. Inline a wrapper or adapter that has one caller and no second implementation.
- The reader test: can a new reader answer "where does X come from?" and "what can change X?" in under 30 seconds?
- APIs are declarative. The caller states what it wants, not the steps.

## State and effects

- No global mutable state. Values are immutable by default. Mutation stays inside the function that owns it.
- Prefer, in order: return values, locals, fields, module state. Derive a value instead of keeping copies in sync.
- Referential transparency: replacing any expression with its value must not change behavior.
- Keep business logic pure. Do I/O at the edges.
- When a function performs effects, its type shows them. Use an effect system instead of monad stacks. `lang/<language>.md` names the tool.
- An operation that changes state converges. Running it twice, or after a crash at any point, ends in the same state. Read the current state, compare it to the goal, and apply only the difference.
- When two concurrent actors write the same file, key, or object, give each its own target first. Add a lock only when one shared target is a real invariant.

## Boundaries

- Validate and parse at system boundaries: CLI args, config, network, files, env, external APIs. Turn raw input into domain types there.
- Inside, trust the types. No re-validation and no defensive checks. State invariants with plain asserts that crash.

## Parsing

- Prefer structured input such as JSON, an AST, or a typed API over parsing text.
- A regex is a program with its own bugs. Use one only when no structured source exists. Keep it short and test it against real inputs.

## Comments

- Never describe what the code does. The code says that, and a second copy drifts.
- Write a comment only for context nothing in the repo shows: an outside constraint, a dependency bug, the source of a business rule.
