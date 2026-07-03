import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CUSTOM_TYPE = "memory-state";
const MEMORY_FILE = "MEMORY.md";

const MEMORY_TEMPLATE = `# Project Memory

## Project Overview
<!-- What this project is and its goals -->

## Key Architecture / Decisions
<!-- Why things are the way they are -->

## Current State
<!-- What's in progress, what's done -->

## Notes / Gotchas
<!-- Things that bit us or are easy to forget -->

## Open Questions
<!-- Unresolved decisions -->
`;

const MEMORY_SYSTEM_PROMPT = `

## Persistent Memory

This project uses \`MEMORY.md\` as the long-term memory file.

- **At session start:** Read \`MEMORY.md\` silently before doing any work.
- **During the session:** Update \`MEMORY.md\` whenever you learn something worth remembering: architecture decisions, gotchas, file structure, tasks in progress, open questions.
- **At session end (if asked to wrap up):** Write a concise summary of what was done and what's next.
- Manage \`MEMORY.md\` autonomously — no asking permission.
- Keep entries concise. Prune stale entries.
`;

export default function memoryExtension(pi: ExtensionAPI) {
	let memoryEnabled = false;

	function updateStatus(ctx: ExtensionContext): void {
		if (memoryEnabled) {
			const theme = ctx.ui.theme;
			ctx.ui.setStatus("memory", theme.fg("accent", "🧠 Memory"));
		} else {
			ctx.ui.setStatus("memory", undefined);
		}
	}

	function ensureMemoryFile(cwd: string): void {
		const filePath = join(cwd, MEMORY_FILE);
		if (!existsSync(filePath)) {
			writeFileSync(filePath, MEMORY_TEMPLATE, "utf-8");
		}
	}

	function toggle(ctx: ExtensionContext): void {
		memoryEnabled = !memoryEnabled;
		pi.appendEntry(CUSTOM_TYPE, { enabled: memoryEnabled });

		if (memoryEnabled) {
			ensureMemoryFile(ctx.cwd);
			ctx.ui.notify("Memory enabled", "info");
		} else {
			ctx.ui.notify("Memory disabled", "info");
		}

		updateStatus(ctx);
	}

	pi.registerCommand("memory", {
		description: "Toggle persistent project memory (MEMORY.md)",
		handler: async (_args, ctx) => toggle(ctx),
	});

	pi.on("before_agent_start", async (event) => {
		if (!memoryEnabled) return undefined;

		return {
			systemPrompt: event.systemPrompt + MEMORY_SYSTEM_PROMPT,
		};
	});
}
