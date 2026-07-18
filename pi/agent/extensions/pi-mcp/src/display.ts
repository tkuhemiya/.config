import path from "node:path";
import type { McpServerConfig } from "./types.js";

/** Formats an MCP server target for status output without exposing expanded credentials or secret-bearing arguments. */
export function formatMcpServerTarget(config: McpServerConfig | undefined) {
  if (!config) return undefined;
  if (config.type === "remote") return redactUrl(config.url);
  const [command, ...args] = config.command;
  if (!command) return undefined;
  const executable = path.basename(command);
  return args.length === 0 ? executable : `${executable} (${args.length} args)`;
}

/** Removes credentials, query strings, and fragments from a URL intended for human-facing status output. */
export function redactUrl(value: string) {
  try {
    const url = new URL(value);
    const query = url.search ? "?<redacted>" : "";
    const fragment = url.hash ? "#<redacted>" : "";
    return `${url.protocol}//${url.host}${url.pathname}${query}${fragment}`;
  } catch {
    return "[invalid URL]";
  }
}

/** Redacts common secret-bearing substrings from user-facing diagnostics while preserving useful context. */
export function redactSecrets(value: string) {
  return value
    .replace(/\bhttps?:\/\/[^\s"'<>()[\]{}]+/gi, (url) => redactUrl(url))
    .replace(/\b(Authorization["']?\s*[:=]\s*["']?(?:Bearer|Basic)\s+)[^"',\s}]+/gi, "$1<redacted>")
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1<redacted>")
    .replace(
      /\b(access[_-]?token|refresh[_-]?token|id[_-]?token|client[_-]?secret|api[_-]?key|token)(["']?\s*[:=]\s*["']?)[^"',\s}]+/gi,
      "$1$2<redacted>",
    );
}
