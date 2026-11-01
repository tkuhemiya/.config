---
name: sharpen
description: Make a task deeper, not bigger, then rewrite the prompt. Use for /sharpen.
disable-model-invocation: true
---

The user wants a deeper version of the task, not a bigger one. Before rewriting it, answer four questions:

1. What would a top professional in this field do here that the user isn't asking for?
2. What raw material would they start from, instead of what has already been summarized?
3. Which specific methods and tools would they use?
4. What, other than you or the user, would show the result is right?

Then rewrite the prompt to ask for exactly that. Leave the user's own choices open instead of deciding them.
