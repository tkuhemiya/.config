# Errors

## Classify first

- An expected failure is part of the domain: not found, invalid input, conflict, permission denied, a timeout from the network. The caller can do something about it. Return it as a value and put it in the type.
- A defect is a bug: a broken invariant, an impossible branch, a programmer mistake. No caller can recover. Crash with an assert or throw. Never catch a defect to keep going.
- Before handling an error, try to make it impossible with types (`types.md`). An error you can't construct needs no handler.

## Shape

- Errors are domain types. Model them as a tagged union with the data a handler needs (`{ kind: "NotFound", userId }`), not a message string.
- A function's error type lists only the failures it can actually produce. Don't widen to `unknown` or a catch-all `Error`.
- Handle every error variant, like any other union.
- Keep the original error as `cause` when you translate one.

## Where to handle

- Handle an error only where something can be decided: retry, fall back, ask the user, or map to a response. Everywhere else, propagate it unchanged.
- At the boundary, turn thrown exceptions from libraries and I/O into typed errors. At the outer edge (request handler, CLI main, job runner), turn typed errors into an exit code, HTTP status, or message.
- Log an error once, where it is handled, with structured context. Never log and rethrow.
- No silent fallbacks: no `catch` that returns `null`, an empty list, or a default unless the domain says that value is correct, and never mock, sample, or placeholder data outside tests.

## Policies

- Retry only failures that are transient by nature, only around operations that converge (`code.md`), with a bound and backoff, at the edge.
- When validating input a person wrote, collect every error and report them together. In a pipeline, stop at the first.
- Release resources on every path, failure included.

## Messages

- Say what was expected, what was found, and what to do next. A user-facing message names no internals. A developer-facing one names the ids and values involved.
