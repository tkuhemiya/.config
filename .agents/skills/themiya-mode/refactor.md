# Refactor

Run these steps in order. After each one, run the check that proves behavior did not change.

1. Delete dead code, unused parameters, and stale references.
2. Inline every function that has one caller, then simplify the call site.
3. Remove defensive checks inside the program. Validation stays at boundaries (`code.md`). Inside, use plain asserts.
4. Flatten nesting by merging conditions, inverting them, and returning early.
5. For a function with several callers, change it and its callers together so each caller gets simpler.
6. Delete comments that describe what the code does.
7. Apply the repo's formatter and style guide.

When a new requirement doesn't fit the design, redesign as if it had been there from the start instead of bolting it on. When you replace an internal API, migrate every caller and delete the old API in the same change. Internal code gets no compatibility layers.
