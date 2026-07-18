import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { OAUTH_CALLBACK_PATH, OAUTH_CALLBACK_PORT, parseRedirectUri } from "./oauth-provider.js";

const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

interface PendingAuth {
  resolve: (code: string) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

let server: Server | undefined;
let currentPort = OAUTH_CALLBACK_PORT;
let currentPath = OAUTH_CALLBACK_PATH;
const pendingAuths = new Map<string, PendingAuth>();
const mcpNameToState = new Map<string, string>();

/** Starts the local OAuth callback server and fails if the configured port is unavailable. */
export async function ensureCallbackServer(redirectUri?: string) {
  const { port, path } = parseRedirectUri(redirectUri);
  if (server && (currentPort !== port || currentPath !== path)) await stopCallbackServer();
  if (server) return;

  currentPort = port;
  currentPath = path;
  const nextServer = createServer(handleRequest);
  await new Promise<void>((resolve, reject) => {
    nextServer.once("error", (error) => {
      reject(new Error(`OAuth callback server could not listen on 127.0.0.1:${currentPort}: ${error.message}`));
    });
    nextServer.listen(currentPort, "127.0.0.1", () => resolve());
  });
  server = nextServer;
}

/** Waits for a matching OAuth callback code for one state value. */
export function waitForCallback(oauthState: string, mcpName?: string) {
  if (mcpName) mcpNameToState.set(mcpName, oauthState);
  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      const pending = pendingAuths.get(oauthState);
      if (!pending) return;
      pendingAuths.delete(oauthState);
      if (mcpName) mcpNameToState.delete(mcpName);
      pending.reject(new Error("OAuth callback timeout - authorization took too long"));
      stopIfIdle();
    }, CALLBACK_TIMEOUT_MS);
    pendingAuths.set(oauthState, { resolve, reject, timeout });
  });
}

/** Rejects and removes any pending OAuth callback for the named MCP server. */
export function cancelPendingCallback(mcpName: string) {
  const oauthState = mcpNameToState.get(mcpName);
  const key = oauthState ?? mcpName;
  const pending = pendingAuths.get(key);
  if (!pending) return;
  clearTimeout(pending.timeout);
  pendingAuths.delete(key);
  mcpNameToState.delete(mcpName);
  pending.reject(new Error("Authorization cancelled"));
  stopIfIdle();
}

/** Stops the local OAuth callback server and rejects all pending callback waits. */
export async function stopCallbackServer() {
  const activeServer = server;
  if (activeServer) {
    await new Promise<void>((resolve) => activeServer.close(() => resolve()));
    server = undefined;
  }

  for (const pending of pendingAuths.values()) {
    clearTimeout(pending.timeout);
    pending.reject(new Error("OAuth callback server stopped"));
  }
  pendingAuths.clear();
  mcpNameToState.clear();
}

function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "/", `http://127.0.0.1:${currentPort}`);
  if (url.pathname !== currentPath) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (!state) {
    sendHtml(res, 400, errorPage("Missing required state parameter"));
    return;
  }

  if (error) {
    const message = errorDescription || error;
    const pending = pendingAuths.get(state);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingAuths.delete(state);
      cleanupStateIndex(state);
      pending.reject(new Error(message));
    }
    sendHtml(res, 200, errorPage(message));
    stopIfIdle();
    return;
  }

  if (!code) {
    sendHtml(res, 400, errorPage("No authorization code provided"));
    return;
  }

  const pending = pendingAuths.get(state);
  if (!pending) {
    sendHtml(res, 400, errorPage("Invalid or expired state parameter"));
    return;
  }

  clearTimeout(pending.timeout);
  pendingAuths.delete(state);
  cleanupStateIndex(state);
  pending.resolve(code);
  sendHtml(res, 200, successPage());
  stopIfIdle();
}

function cleanupStateIndex(oauthState: string) {
  for (const [name, state] of mcpNameToState) {
    if (state === oauthState) {
      mcpNameToState.delete(name);
      return;
    }
  }
}

function stopIfIdle() {
  if (pendingAuths.size > 0 || !server) return;
  server.close();
  server = undefined;
}

function sendHtml(res: ServerResponse, status: number, html: string) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function successPage() {
  return `<!doctype html><html><head><title>Pi MCP Authorization</title><style>${style()}</style></head><body><main><h1>Authorization Successful</h1><p>You can close this window and return to Pi.</p></main><script>setTimeout(() => window.close(), 2000)</script></body></html>`;
}

function errorPage(error: string) {
  return `<!doctype html><html><head><title>Pi MCP Authorization Failed</title><style>${style()}</style></head><body><main><h1>Authorization Failed</h1><p>${escapeHtml(error)}</p></main></body></html>`;
}

function style() {
  return "body{font-family:system-ui,-apple-system,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#101014;color:#f4f4f5}main{text-align:center;padding:2rem;max-width:36rem}h1{margin:0 0 1rem}p{color:#c4c4cc}";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
