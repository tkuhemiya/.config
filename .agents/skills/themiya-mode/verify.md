# Verify

Done means you checked the real result, not a stand-in for it.

- Run the feature, read the actual value, inspect the actual output. "It compiles", a passing type check, or a subagent's summary is not proof.
- When a check passes too easily, suspect the check before you trust the result.
- Prefer a script you can rerun over a one-time look. Keep the script and its output where the user can find them.
- If the repo has a `verify-<app>` skill, use it. If it has none and the change is user-facing, offer the **verify-setup** skill.
- A test must fail when the behavior breaks and keep passing when only the internals change. Assert what callers observe: return values, errors, state they read back, effects on outside systems. Don't assert on private helpers or call order. Derive expected values from the requirement, not from running the code.
- After writing a test, break the line it protects and confirm the test fails, then restore the line. A test that survives the break tests nothing.
- A verdict is verified, not verified, or inconclusive. Inconclusive is not a pass. Report negative results.
