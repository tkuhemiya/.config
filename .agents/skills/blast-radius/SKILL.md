---
name: blast-radius
description: Find what a change could break outside its diff before it ships, and prove the one fact it is safe because of by running real code. Use for "blast radius of X", "what could this break", or reviewing a small diff you don't trust.
---

# Blast radius

Listing callers is not the job, since grep does that in a second. The job is the breakage grep won't show.

A writeup that sounds right proves nothing, so don't hand one back on its own. Find the one or two facts the change's safety depends on and prove them by running code.

## How sure are you

For each fact, get as far down this list as is cheap, and say where you stopped.

1. You said so. Worthless on its own.
2. You pointed at the line: a real `file:line`, or the library's own source.
3. You walked the failure step by step and showed it can't happen.
4. You ran it. A script or test calls the real code and fails loudly if you're wrong.
5. You reproduced it in the running app.

Step 4 is usually one small script that imports the library the app ships and calls the exact function you're worried about.

## Steps

1. **Read the change.** The diff, the symbols it adds, changes, and deletes, and what it now does differently, including what the diff doesn't spell out. Read the commits and PR description for intent.
2. **Find the fact it's safe because of.** Most risky-looking changes are safe because of one fact, such as "this call only drops cache entries that are already dead". If that fact holds, most risks clear at once. Spend your time here.
3. **Look where grep stops.** Read the source of libraries you call, at the pinned version, including any local patch. Work out when things run: microtasks, teardown, render order. Follow what a symbol search misses: JSON an API returns, a DB column, a wire format, another language reading the same bytes, a feature flag, code three calls downstream.
4. **Rate each risk honestly**, with a real chance of happening and a real cost. Keep confirmed risks. List checked-and-cleared ones separately. Cite real `file:line`s. A search that finds nothing is still an answer. Never invent a caller or an API.
5. **Prove the fact.** Write a script or test that runs the real code, run it, and paste the output.

## Reply

- **What it does.** What changed, including the part that isn't obvious.
- **The fact it's safe because of.** State it, name the step you reached, and show the proof. If you couldn't prove it, write "unproven".
- **Risks.** For each: how it breaks, `file:line`, likelihood and cost, how to check. Paste proof for the ones that matter.
- **Cleared.** What you checked and why it's fine.
- **Before you merge.** The cheapest test or repro that would catch the real bug, including the script you wrote.
