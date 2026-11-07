# Python

Applies `types.md`, `code.md`, and `errors.md` to Python. The type rules below do nothing without a type checker and a linter.

## Tooling

- Use the repo's type checker and linter when it has them, with the strictest settings it already accepts.
- When a repo has no type checker, recommend adding ty and ruff with the config below before writing code. Ask before adding them. ty is pre-1.0; if it misses a check the code relies on, use pyright with `typeCheckingMode = "strict"`.

```toml
[tool.ty.rules]
all = "error"

[tool.ruff.lint]
preview = true
select = ["E", "F", "I", "B", "UP", "SIM", "RUF", "ANN", "BLE", "FBT", "T20", "PGH", "ARG", "ERA", "TID", "TRY", "DOC"]
ignore = ["TRY003"]

[tool.ruff.lint.pydocstyle]
convention = "google"

[tool.ruff.lint.flake8-tidy-imports.banned-api]
"typing.Any".msg = "Parse into a domain type instead."
"typing.cast".msg = "Narrow with match, isinstance, or TypeIs instead."
```

In that config, ty catches non-exhaustive `match` and writes to frozen fields. Ruff catches missing annotations (`ANN`), positional booleans (`FBT`), `except Exception` (`BLE`), `print` (`T20`), `type: ignore` without a code (`PGH`), any use of `Any` or `cast` (`TID`), `raise` in `except` without `from` (`B904`), and a raised exception missing from the docstring's `Raises:` (`DOC501`, a preview rule).

## Modeling

- Model records as `@dataclass(frozen=True, slots=True)`. Use `tuple`, `frozenset`, and `Mapping` or `Sequence` in signatures so callers can't mutate what they pass in.
- Model variants as a union of frozen dataclasses (`type Shape = Circle | Square`) and branch with `match`. No classes of optional fields with booleans.
- Handle every variant. End each `match` on a union with `case _: assert_never(x)` so adding a variant fails the type check.
- Give each meaningful primitive its own type: `UserId = NewType("UserId", str)`. A `NewType` value comes only from a function that checks it, never from calling the `NewType` on unchecked input.
- Use `Literal` or `Enum` for closed sets of values, not bare strings.- Build shapes where the bad value can't be constructed: `tuple[T, *tuple[T, ...]]` for non-empty, a frozen dataclass for a range.

## Boundaries

- External data is `object` until parsed, never `Any`: `json.loads`, request bodies, env, files, database rows.
- Parse it with the repo's schema library (pydantic, msgspec) and use the model as the type. Don't keep a model, a `TypedDict`, and a hand-written check that can drift apart.
- Past the parse, no `dict[str, Any]` and no re-checking.

## Casts and narrowing

- No `cast` and no `Any`. A `# type: ignore` names the error code and the reason.
- Narrow in this order of preference: `match` on a class pattern, `isinstance`, a `TypeIs` guard, and `cast` last.
- A `TypeIs` or `TypeGuard` function must actually check what it claims.

## Effects

- Python has no effect system. Keep I/O at the edges and business logic in plain functions that take and return values.
- `async def` marks I/O. Run concurrent work in an `asyncio.TaskGroup`. No fire-and-forget `create_task`.
- Pass dependencies as parameters. No module-level mutable state and no side effects on import.
- Define a `Protocol` only when a second implementation exists. Don't add one to mock what you can run.

## Errors

Python raises exceptions for expected failures. This departs from `errors.md`'s "return it as a value": Python code and libraries expect exceptions, and values would make the code foreign to other Python developers. The rest of `errors.md` still applies.

- Plain absence is not an error. A lookup that may find nothing returns `T | None`, like `dict.get`.
- Each domain module defines a base exception, and its expected failures subclass it. Make each one a `@dataclass` (not frozen, which breaks `add_note`) carrying the data a handler needs: `class UserNotFound(UserError): user_id: UserId`. Never match on the message.
- The type checker can't see exceptions, so the docstring's `Raises:` section is the signature. List every expected failure there.
- Wrap only the call that raises in `try`. Put the success path in `else:`, so an exception from it isn't caught by mistake.
- Catch the narrowest class, and only where something can be decided. Everywhere else, let it propagate.
- At the boundary, turn library exceptions into domain exceptions with `raise UserNotFound(user_id) from err`. Use `from None` only when the cause is an internal detail.
- To add context while propagating, call `err.add_note(...)` and re-raise with bare `raise`. Don't wrap an exception only to add a message.
- `asyncio.TaskGroup` raises an `ExceptionGroup`. Handle each type with `except*`.
- Defects raise built-in exceptions or fail an `assert`. Never catch them to keep going. Never run with `python -O`, which strips asserts.
- No bare `except:` and no `except Exception` except at the outer edge (request handler, CLI main, job runner).
- Release resources with `with` or `async with`, not manual `close()` calls.
- Test each expected failure with `pytest.raises(UserNotFound)` and assert on its fields, not its message.

## Style

- Python has keyword arguments, so use them instead of a config object. Make parameters keyword-only with `*` when a function takes several of the same type or any flags: `def send(*, sender: UserId, to: UserId, retry: bool)`.
- The repo's formatter and linter are the style guide, usually `ruff format` and `ruff check`.
- Log with the repo's logger and structured context. No `print` in shipped code.
- Test with pytest. Use hypothesis to test laws (`types.md`).
