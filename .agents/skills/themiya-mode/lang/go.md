# Go

Applies `types.md`, `code.md`, and `errors.md` to Go.

## Modeling

- Give each meaningful primitive a defined type: `type UserID string`. Defined types don't mix without a conversion.
- When a value needs checking, hide the field: `type Email struct{ s string }` with `ParseEmail(string) (Email, error)` as the only way to build one outside the package.
- Model variants as a sealed interface: an interface with an unexported marker method, one struct per variant, marked `//sumtype:decl`. No structs of optional fields with booleans.
- Handle every variant. Enable `gochecksumtype` for type switches on sealed interfaces and `exhaustive` for switches on enum constants, so adding a variant breaks the lint.
- The zero value must be valid or impossible to mistake for valid. Start `iota` enums at 1 so `0` is never a real state.
- No `nil` pointer as "absent". Return `(T, bool)` from lookups, or a variant that names the absence.

## Boundaries

- Decode external data into a wire struct that mirrors the format, then parse it into domain types. Use `json.Decoder.DisallowUnknownFields` when the format is yours.
- Generate wire types from the source that owns the shape: `sqlc` for SQL, `oapi-codegen` for OpenAPI, `protoc-gen-go` for protobuf. Don't hand-write a parallel struct.
- Past the parse, no `map[string]any`, no `any`, and no re-checking.

## Narrowing

- Narrow in this order of preference: type switch on a sealed interface, comma-ok type assertion, `errors.As`.
- Never use a type assertion without comma-ok outside a defect path.
- Use generics only when the duplication exists today, not for reuse that might come later.

## Effects

- Go has no effect system. A function that does I/O, blocks, or can be cancelled takes `ctx context.Context` as its first parameter. A function without `ctx` is pure or only allocates.
- Pass dependencies as parameters or struct fields. No package-level mutable variables and no `init()` with side effects.
- Define an interface in the package that consumes it, and only when a second implementation exists. Don't add one to mock what you can run.
- Every goroutine has an owner that waits for it and cancels it. Use `errgroup.WithContext` for fan-out. No fire-and-forget goroutines.

## Errors

- Expected failures are sentinel values (`var ErrNotFound = errors.New("not found")`) or error structs that carry the data a handler needs (`type NotFoundError struct{ UserID UserID }`). Callers match with `errors.Is` and `errors.As`, never on the message.
- Wrap with `fmt.Errorf("load user %s: %w", id, err)` only to add context the caller lacks. Use `%w` to keep the cause matchable. Use `%v` when the cause is an internal detail callers must not depend on.
- Defects `panic`. `recover` only at the outer edge (request handler, job runner) to report and fail that unit of work.
- Check every returned error. `_ = f()` needs a comment saying why the error can't matter.

## Style

- Pass a config struct instead of many positional arguments or functional options.
- `gofmt`, `goimports`, and the repo's `golangci-lint` config are the formatter and style guide.
- Log with `log/slog` and structured attributes, or the repo's logger. No `fmt.Println` or `log.Printf` in shipped code.
- Write table-driven tests that assert what callers observe.
