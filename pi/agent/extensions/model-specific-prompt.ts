import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Model-specific system prompt injector.
 * 1. INLINE: Add entries to MODEL_PROMPTS below.
 * 2. FILE: Create ~/.pi/agent/prompts/<model-id>.md (run `/model` to see the exact ID string)
*/
export default function (pi: ExtensionAPI) {
  let currentModelId = "";
  let promptsInjected = false;

  const PROMPTS_DIR = path.join(
    process.env.HOME || process.env.USERPROFILE || ".",
    ".pi/agent/prompts",
  );

  const MODEL_PROMPTS: Record<string, string> = {
    "kimi-k2.6": "Stop reasoning about syntax correctness. Write it, compile it, let the compiler tell you if it's wrong. You are not a compiler.",
    "kimi-k2.5": "Stop reasoning about syntax correctness. Write it, compile it, let the compiler tell you if it's wrong. You are not a compiler.",
  };

  function findAppend(): { text: string; source: string } | null {
    if (!currentModelId) return null;

    // 1. Exact inline match
    if (MODEL_PROMPTS[currentModelId]) {
      return { text: MODEL_PROMPTS[currentModelId], source: "inline" };
    }

    // 2. Partial inline match (e.g. "kimi-k2.6" matches "kimi-k2.6-20250601")
    const partialKey = Object.keys(MODEL_PROMPTS).find(k =>
      currentModelId.includes(k),
    );
    if (partialKey) {
      return { text: MODEL_PROMPTS[partialKey], source: `inline(${partialKey})` };
    }

    // 3. Exact file match
    const exactFile = path.join(PROMPTS_DIR, `${currentModelId}.md`);
    try {
      if (fs.statSync(exactFile).isFile()) {
        return { text: fs.readFileSync(exactFile, "utf-8").trim(), source: "file" };
      }
    } catch { /* no file */ }

    // 4. Partial file match
    try {
      const files = fs.readdirSync(PROMPTS_DIR).filter(f => f.endsWith(".md"));
      const match = files.find(f => currentModelId.includes(f.slice(0, -3)));
      if (match) {
        return {
          text: fs.readFileSync(path.join(PROMPTS_DIR, match), "utf-8").trim(),
          source: `file(${match.slice(0, -3)})`,
        };
      }
    } catch { /* dir doesn't exist */ }

    return null;
  }

  pi.on("model_select", async (event, ctx) => {
    currentModelId = event.model.id;

    if (findAppend()) {
      ctx.ui.notify(`Model prompt active for ${currentModelId}`, "info");
    }
  });

	 pi.on("session_start", async (_event, ctx) => {
		 if (ctx.model) {
			 ctx.ui.notify(`Model: ${ctx.model.provider}/${ctx.model.id}`, "info");
		 }
	 });

  pi.on("before_agent_start", async (event) => {
    if (promptsInjected) return;
    promptsInjected = true;

    const result = findAppend();
    if (!result) return;

    return {
      systemPrompt: event.systemPrompt + "\n\n" + result.text,
    };
  });
}
