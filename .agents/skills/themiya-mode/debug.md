# Debug

- Reproduce first. Read the actual error and the actual state. Don't guess.
- Ask "why" at each step until the answer is a wrong decision in the code, not a consequence of an earlier one. Fix it there.
- Decide whether the state that broke things is legitimate. If it is, the code that broke on it is the bug. If it should never exist, a check where it broke hides the bug, so find what produced the state.
- Guards, retries, swallowed errors, clamped values, and discarded state usually hide bugs. Don't add them as fixes.
- When something fails only after a restart, suspect persisted state first: config, caches, lock files, serialized state.
- Fix the pattern, not just the instance. Search for every place with the same fault.
- When two fixes that rest on the same assumption fail the same check, stop. Write the assumption as one sentence and test it directly before the next fix.
- If a workaround needs a long comment to justify it, the code is wrong.
