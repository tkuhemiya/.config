---
name: ketchup
description: Catch the user up on what happened since their last message, in plain words, and list every decision waiting on them with enough to decide from the reply alone. Use for /ketchup, "catch me up", "what happened", or when handing back unattended work.
---

# Ketchup

Assume the user remembers their last message and nothing after it. Tool output, subagent reports, and notifications are not their messages.

Stay read-only. Don't change code, start jobs, or post anything.

## Gather

- Your work since their last message, and any subagent reports.
- The current state of each branch, PR, CI run, and background task this chat touched. Check it now instead of repeating an old status.
- Each decision only the user can make: a product or preference call, an approval, an irreversible action, access you lack. Include open ones raised earlier. Work you can do yourself is not one of these. Never invent one to fill the reply.

## Write

1. One sentence that names what waits on the user, or says nothing does.
2. What happened, in under 100 words. One line per thing they asked for: what came of it, and whether it is done, running, failed, or unchecked. Name any bug found and fixed on the way. Never mark something done that still waits on them.
3. Decisions waiting. For each one: the call, your pick, what it changes for them, the evidence, and the risk. For a choice between options, give each option's gain and cost.
4. One line naming the work left that you will do yourself.

Use the **bro** skill's voice: plain words, as one person catching up another. Say "the tests pass", not "CI is green". Leave out hashes, paths, and commands unless the user needs one to act. Draw a Mermaid diagram only when a picture explains a change better than sentences, with at most six boxes.
