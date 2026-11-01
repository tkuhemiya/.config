# Types

## Model the domain first

- Name the data shape before writing logic. Trace how each piece is read and written, then pick the structure that fits the main paths.
- Treat stateful logic as a state machine. Name the states, the events, and the transitions. One state field replaces several booleans that must agree.
- Replace branching spread across files with a lookup table, a registry, or a tagged union.
- Group code by the domain knowledge it owns, not by execution step. Modules named load, validate, and transform repeat the same rules.
- Don't force a structure on code that is already clear, local, and unlikely to grow.
- Signs you skipped this: a feature adds one more branch to an if/else chain, or a second boolean must stay in sync with the first.

## Types as claims

- A type is a claim, and a program with that type is its proof (Curry–Howard). Make each signature claim as much as is true.
- Make illegal states unrepresentable, so the compiler rejects them instead of a runtime check.
- Narrow input types so fewer outputs are possible. Prefer total functions, which return a result for every input of their type.
- Give each meaningful primitive its own type. `UserId` and `OrderId` are not interchangeable strings.
- Derive types from the source that owns the shape, such as a schema, an OpenAPI spec, or a migration. Don't hand-write a parallel type.
- Handle every variant, so the compiler fails when someone adds one.

## Types before bodies

For work that crosses function boundaries, write the caller's usage first, then the types and signatures with empty bodies. Implement against that sketch. If the implementation keeps needing casts, escape hatches, or special cases, the sketch is wrong. Redo the sketch instead of patching around it.

## Laws

Name a mathematical structure (monoid, functor, lattice) only when it gives you a law you can test, such as identity, associativity, or idempotence. Then test the law.
