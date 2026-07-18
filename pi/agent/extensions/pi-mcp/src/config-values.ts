import { homedir } from "node:os";
import path from "node:path";

/** Expands `${NAME}` placeholders or throws when a referenced variable is unavailable. */
export function expandEnv(value: string, source = "MCP configuration") {
  return value.replace(/\$\{([A-Z0-9_]+)\}/gi, (_match, name: string) => {
    const replacement = process.env[name];
    if (replacement === undefined) {
      throw new Error(`${source} references missing environment variable ${name}`);
    }
    return replacement;
  });
}

/** Resolves a leading `~` or `~/` path segment against the current user's home directory. */
export function resolveHome(input: string) {
  if (input === "~") return homedir();
  if (input.startsWith("~/")) return path.join(homedir(), input.slice(2));
  return input;
}
