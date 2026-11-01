---
name: reflect
description: Review the current chat for lessons worth keeping, and turn each one into a concrete edit to a skill or instruction file. Use when the user says "reflect" or /reflect.
disable-model-invocation: true
---

Read this chat from the start. Find lessons the next agent should not have to learn again, and propose where each one goes. Do it yourself in one pass. Do not spawn subagents.

Skip the run if the chat was trivial or every skill used was followed correctly. Say so in one line.

## 1. Read with three lenses

- **Judgment.** A mistake you made, a correction the user gave, or a preference they stated. Name the rule behind it.
- **Tooling.** A command, path, flag, or tool quirk you had to figure out. Also any context the user pasted that you could have fetched yourself.
- **Missed.** A check you skipped or only claimed, an effect on code outside the change, or a fix that hid a problem instead of solving it.

## 2. Filter

Keep a finding only if all of these hold:

- It will still be true in six months, after paths, versions, and code have changed.
- The user corrected it explicitly, or it happened more than once.
- No existing skill or instruction already says it. If one says it and you ignored it, the finding is that the rule is not prominent enough. Propose moving or sharpening it, not repeating it.

If a script, lint, or type would enforce the lesson, propose that instead of more text.

## 3. Route

For each finding, pick the one file it changes: a skill under `~/.config/.agents/skills/`, a leaf file inside one, a repo's `CLAUDE.md`, or a new skill when no file fits. Read the target first, then write the exact line or lines to add, change, or delete.

## 4. Propose, then apply

Show the list and wait for the user's approval:

```
1. <lesson in one sentence>
   evidence: <what happened in this chat>
   file: <path>
   edit: <exact text>
```

Below it, list dropped findings with the reason, one line each.

Apply only what the user approves. Then list each file you changed and what changed, one line each.
