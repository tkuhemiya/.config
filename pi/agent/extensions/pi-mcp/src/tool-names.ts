/** Converts an MCP server, prompt, or tool name to Pi's stable tool-name character set. */
export function sanitizeName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** Projects an MCP server/tool pair into the Pi dynamic tool key namespace. */
export function mcpToolKey(server: string, tool: string) {
  return `${sanitizeName(server)}_${sanitizeName(tool)}`;
}
