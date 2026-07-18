/** Returns the decoded byte length of a base64 payload without allocating the decoded buffer. */
export function base64Size(value: string) {
  const trimmed = value.replace(/\s/g, "");
  const padding = trimmed.endsWith("==") ? 2 : trimmed.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((trimmed.length * 3) / 4) - padding);
}

/** Formats a byte count for short human-facing MCP status text. */
export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${Math.ceil(value / (1024 * 1024))} MB`;
}
