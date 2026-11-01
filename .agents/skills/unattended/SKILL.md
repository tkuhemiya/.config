---
name: unattended
description: Run long or unattended work so the user can trust it when they come back. Define done as a check, build the check first, work in small verified steps, keep a decision log, and hand back with evidence. Use for "run until done", "going to bed", background or delegated threads, large migrations, or any work the user reviews later.
---

# Unattended

The user is not watching. They will judge the work from the diff, the decision log, and your handback. Make each one enough on its own.

## 1. Frame

Before changing anything, write these down and log them:

- **Done**, as a check that passes or fails: a command, a test, an observable output. "Looks good" is not a check.
- **Scope**: the rough number of units and what is out of scope.
- **Stops**: the irreversible actions and owner-only decisions you expect, per the Autonomy section of **themiya-mode**.

If you can't state done as a check, ask the user. That is the one question worth blocking on.

## 2. Build the check first

Write the script or test that decides done. Run it on the current state to record a baseline, so the result reads as before and after. Commit it before the work.

When the same edit repeats across many places, write a script or codemod instead of editing by hand. Do the first unit by hand, build the tool, rerun it on that unit, and diff against your hand edit.

## 3. Loop

For each unit:

1. Say what you expect the change to do.
2. Make the smallest change that could do it.
3. Run the check against the real result.
4. If the change moved toward done, commit it. Otherwise revert it. Don't keep changes that "might help".
5. Log a row.

Don't start the next unit while the check is red. A plateau is not a stop, so try a different approach. Never loosen the check to call the work done.

Fix related breakage you hit, such as broken tooling or a flaky check, in its own commit. Then return to the goal.

Stop only when the check passes, when the next step is irreversible or an owner-only decision, or at a real dead end.

## 4. Decision log

Keep one TSV file with one row per decision: a fork chosen, a unit verified, a revert and what triggered it, a blocker.

```sh
<skill dir>/scripts/log.sh <logfile> <phase> <decision> <why> <evidence> <result>
```

- Put it at `.audit/<task-slug>.tsv` and add `.audit/` to `.git/info/exclude`. Commit it only when the work is large enough that the user needs the trail to trust it.
- Evidence is a pointer, such as a commit SHA, a `file:line`, or a command and the path of its output. Never a paragraph.
- Write rows in plain words, as you would tell a teammate.
- Append only. A wrong row gets a new row that corrects it.
- Read it in a terminal with `column -s$'\t' -t <logfile>`.

## 5. Audit before handback

Compare the log with what you actually did this session.

- Every row maps to something that happened, and its evidence shows what the row claims.
- Every fork, pivot, and abandoned approach has a row. Add the missing ones.
- Rerun the done check on the final state.

Correct mistakes by appending rows, not by editing old ones.

## 6. Handback

Reply per the **ketchup** skill. Add the done check's command and final result, and the path to the log. List under "Not verified" anything you could not check, with the reason.
