# TypeScript

Applies `types.md` and `code.md` to TypeScript.

## Modeling

- Model variants as a discriminated union on one literal field (`kind`). No bags of optional fields with booleans.
- Brand primitives that mean different things: `type UserId = string & { readonly __brand: "UserId" }`. A brand comes only from a function that checks the value, never from `as`.
- Build shapes where the bad value can't be constructed: `[T, ...T[]]` for non-empty, `[T, T][]` for pairs, `{ start, durationMs }` for a range.
- Keep the loose type while every operation on it stays total. Strengthen it, for example to `NonEmpty<T>`, only where the loose type forces a `!`, a cast, or a "should never happen" throw.
- Handle every variant. End each `switch` on a union with `default: { const _exhaustive: never = x; }` so adding a variant breaks the build.

## Boundaries

- External data is `unknown`, never `any`: `JSON.parse`, fetch bodies, IPC, env, files, database rows.
- Parse it with the repo's schema library and infer the type from the schema (`z.infer<typeof S>`). Don't keep a schema, an interface, and a hand-written guard that can drift apart.
- Past the parse, no `Record<string, unknown>` and no re-checking.

## Casts and narrowing

- No `as`. Use `satisfies` to check a value against a type without widening it.
- Narrow in this order of preference: discriminant `switch`, `in`, `typeof` or `instanceof`, a type guard, and `as` last.
- A type guard (`isX`, `hasX`) must actually check what it claims. A guard that lies is worse than a cast.
- Derive types with `Pick`, `Omit`, `Parameters`, `ReturnType`, `Awaited`, and `typeof` before declaring a new one.

## Effects

- When the repo uses Effect (`effect`), write effectful code as `Effect<A, E, R>` so errors and dependencies show in the type. Use `Effect.gen` for direct-style code.
- In a repo without Effect, keep effects at the edges and return errors as values in a union. Ask before adding Effect to a repo.

## Style

- Pass an object instead of several positional arguments, except on hot paths such as render loops and parsers.
- Don't mock what you can run. Mock only what you can't run locally.
- No `console.log` in shipped code. Use the repo's logger with structured context.
