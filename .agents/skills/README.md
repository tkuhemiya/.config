# Skills

These are my agent skills. Most of them exist for one reason. I want to hand an agent a task, walk away, and trust what I find when I come back.

Each folder holds one skill. Claude Code sees them through symlinks in `~/.claude/skills/`. After adding a new skill, rerun the link loop:

```sh
for d in ~/.config/.agents/skills/*/; do ln -sfn "${d%/}" ~/.claude/skills/; done
```

Some skills load on their own when a task matches their description. The rest run only when I type the slash command. The tables say which.

## How I work

| Skill | What it does | Runs |
|---|---|---|
| `themiya-mode` | My coding and writing style. It sends the agent to a short file for each kind of work, covering code, types, refactoring, debugging, checking work, and writing. It also says when the agent may act alone and when it must stop and ask. | on its own |
| `unslop` | Strips the stuff that makes text sound like AI wrote it, then makes it sound like a person. | on its own |

What's inside `themiya-mode`:

- `code.md` covers simple code you can read one function at a time. No global state, no comments that repeat the code, validation only at the edges.
- `types.md` says to model the data first. Use state machines and make bad states impossible to write.
- `refactor.md` is my cleanup pass, in order. Delete, inline, drop defensive checks, flatten, then format.
- `debug.md` says to fix the first thing that went wrong, not the place the error showed up.
- `verify.md` says done means you checked the real result. "It compiles" doesn't count.
- `writing.md` says to define words using simpler words.
- `lang/typescript.md` holds the TypeScript rules: unions, branded IDs, no `as`, zod at the edges, Effect for side effects.

## Leaving an agent alone

| Skill | What it does | Runs |
|---|---|---|
| `unattended` | For work I'll check later. The agent writes down what "done" means as a test it can run, builds that test first, works in small steps it checks one at a time, and logs each decision in a file. | on its own |
| `ketchup` | Catches me up when I come back. What happened, in plain words, and every decision that's waiting on me, with its pick and the risk. | on its own |
| `verify-setup` | Writes a skill inside a repo that teaches agents to start the app and use it like a person would. Without one, "I checked it" is just a claim. | on its own |

## Checking a change

| Skill | What it does | Runs |
|---|---|---|
| `blast-radius` | Finds what a change could break outside the lines it touched. It finds the one fact that makes the change safe and proves it by running code. | on its own |
| `statechart` | Takes a model of something that moves between states, like a checkout flow or a protocol. A model checker tries every path, then draws the result as a diagram with the shortest route to each broken rule. It needs Java the first time and installs it with mise. | on its own |
| `benchmark-checklist` | Seven questions to ask before you believe a speed number. What limits it, was each side tuned, did anything error, does it hold up over several runs. | on its own |

## Talking to the agent

| Skill | What it does | Runs |
|---|---|---|
| `grill-me` | Questions me hard about a plan until we agree on every decision. | on its own |
| `bro` | Says the last message again in plain words. | `/bro` |
| `sharpen` | Rewrites my prompt to ask for what an expert would actually do, instead of just more. | `/sharpen` |
| `reflect` | Reads the chat for lessons worth keeping, then suggests exact edits to my skills. Nothing changes until I say yes. | `/reflect` |

## Credit

Most of these started from [pstack](https://github.com/cursor/plugins/tree/main/pstack/skills). I cut them down for a setup that only uses Claude, and dropped the multi-agent parts. The `statechart` tool and `unattended/scripts/log.sh` are copied from pstack under the MIT license, and the license sits next to each one.
