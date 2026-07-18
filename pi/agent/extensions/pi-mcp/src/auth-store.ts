import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { AuthClientInfo, AuthEntry, AuthStatus, AuthTokens } from "./types.js";

type AuthData = Record<string, AuthEntry>;

/** Persists OAuth client metadata, tokens, and in-flight PKCE state for MCP servers. */
export class AuthStore {
  private filepath: string;
  private queue = Promise.resolve();

  /** Creates an auth store backed by the default Pi MCP auth file or a test-supplied path. */
  constructor(filepath = path.join(homedir(), ".pi", "agent", "mcp-auth.json")) {
    this.filepath = filepath;
  }

  /** Reads every valid persisted auth entry keyed by configured MCP server name. */
  all(): Promise<AuthData> {
    return this.withLock(() => this.read());
  }

  /** Reads one valid persisted auth entry, if present. */
  async get(mcpName: string): Promise<AuthEntry | undefined> {
    const data = await this.all();
    return data[mcpName];
  }

  /** Reads an auth entry only when it was saved for the same remote server URL. */
  async getForUrl(mcpName: string, serverUrl: string) {
    const entry = await this.get(mcpName);
    if (!entry?.serverUrl || entry.serverUrl !== serverUrl) return undefined;
    return entry;
  }

  /** Replaces the auth entry for one MCP server. */
  set(mcpName: string, entry: AuthEntry, serverUrl?: string) {
    return this.mutate((data) => ({
      ...data,
      [mcpName]: serverUrl ? { ...entry, serverUrl } : entry,
    }));
  }

  /** Removes all stored auth state for one MCP server. */
  remove(mcpName: string) {
    return this.mutate((data) => {
      const next = { ...data };
      delete next[mcpName];
      return next;
    });
  }

  /** Stores OAuth tokens for one MCP server. */
  updateTokens(mcpName: string, tokens: AuthTokens, serverUrl?: string) {
    return this.updateEntry(mcpName, (entry) => ({ ...entry, tokens, ...(serverUrl ? { serverUrl } : {}) }));
  }

  /** Stores OAuth client registration metadata for one MCP server. */
  updateClientInfo(mcpName: string, clientInfo: AuthClientInfo, serverUrl?: string) {
    return this.updateEntry(mcpName, (entry) => ({ ...entry, clientInfo, ...(serverUrl ? { serverUrl } : {}) }));
  }

  /** Stores a PKCE code verifier for an in-flight OAuth flow. */
  updateCodeVerifier(mcpName: string, codeVerifier: string) {
    return this.updateEntry(mcpName, (entry) => ({ ...entry, codeVerifier }));
  }

  /** Removes the PKCE code verifier after OAuth completion or cancellation. */
  clearCodeVerifier(mcpName: string) {
    return this.clearField(mcpName, "codeVerifier");
  }

  /** Stores the OAuth state value for an in-flight OAuth flow. */
  updateOAuthState(mcpName: string, oauthState: string) {
    return this.updateEntry(mcpName, (entry) => ({ ...entry, oauthState }));
  }

  /** Reads the OAuth state value for an in-flight OAuth flow, if present. */
  async getOAuthState(mcpName: string) {
    return (await this.get(mcpName))?.oauthState;
  }

  /** Removes the OAuth state value after OAuth completion or cancellation. */
  clearOAuthState(mcpName: string) {
    return this.clearField(mcpName, "oauthState");
  }

  /** Classifies the stored token state for one MCP server. */
  async authStatus(mcpName: string): Promise<AuthStatus> {
    const entry = await this.get(mcpName);
    if (!entry?.tokens) return "not_authenticated";
    if (!entry.tokens.expiresAt) return "authenticated";
    return entry.tokens.expiresAt < Date.now() / 1000 ? "expired" : "authenticated";
  }

  private async updateEntry(mcpName: string, update: (entry: AuthEntry) => AuthEntry) {
    await this.mutate((data) => {
      return { ...data, [mcpName]: update(data[mcpName] ?? {}) };
    });
  }

  private async clearField(mcpName: string, field: keyof AuthEntry) {
    await this.mutate((data) => {
      const entry = data[mcpName];
      if (!entry) return data;
      return { ...data, [mcpName]: clearAuthEntryField(entry, field) };
    });
  }

  private mutate(update: (data: AuthData) => AuthData) {
    return this.withLock(async () => {
      await this.write(update(await this.read()));
    });
  }

  private withLock<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async read(): Promise<AuthData> {
    try {
      if (!existsSync(this.filepath)) return {};
      const parsed = JSON.parse(await readFile(this.filepath, "utf8"));
      const result = parseAuthData(parsed);
      if (result.rejected > 0) {
        warnAuthStore(`ignored ${result.rejected} malformed persisted auth ${result.rejected === 1 ? "entry" : "entries"}`);
      }
      return result.data;
    } catch (error) {
      warnAuthStore(`ignored unreadable persisted auth store: ${safeAuthStoreError(error)}`);
      return {};
    }
  }

  private async write(data: AuthData) {
    await mkdir(path.dirname(this.filepath), { recursive: true });
    const tmp = `${this.filepath}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    await rename(tmp, this.filepath);
  }
}

function parseAuthData(value: unknown): { data: AuthData; rejected: number } {
  if (!isPlainRecord(value)) return { data: {}, rejected: 1 };
  const result: AuthData = {};
  let rejected = 0;
  for (const [name, entry] of Object.entries(value)) {
    const parsed = parseAuthEntry(entry);
    if (parsed) result[name] = parsed;
    else rejected++;
  }
  return { data: result, rejected };
}

function clearAuthEntryField(entry: AuthEntry, field: keyof AuthEntry): AuthEntry {
  switch (field) {
    case "tokens": {
      const { tokens: _tokens, ...next } = entry;
      return next;
    }
    case "clientInfo": {
      const { clientInfo: _clientInfo, ...next } = entry;
      return next;
    }
    case "codeVerifier": {
      const { codeVerifier: _codeVerifier, ...next } = entry;
      return next;
    }
    case "oauthState": {
      const { oauthState: _oauthState, ...next } = entry;
      return next;
    }
    case "serverUrl": {
      const { serverUrl: _serverUrl, ...next } = entry;
      return next;
    }
  }
}

function parseAuthEntry(value: unknown): AuthEntry | undefined {
  if (!isPlainRecord(value)) return undefined;

  const tokens = parseAuthTokens(value.tokens);
  if ("tokens" in value && !tokens) return undefined;
  const clientInfo = parseAuthClientInfo(value.clientInfo);
  if ("clientInfo" in value && !clientInfo) return undefined;
  const codeVerifier = optionalString(value.codeVerifier);
  if ("codeVerifier" in value && codeVerifier === undefined) return undefined;
  const oauthState = optionalString(value.oauthState);
  if ("oauthState" in value && oauthState === undefined) return undefined;
  const serverUrl = optionalString(value.serverUrl);
  if ("serverUrl" in value && serverUrl === undefined) return undefined;

  return {
    ...(tokens !== undefined ? { tokens } : {}),
    ...(clientInfo !== undefined ? { clientInfo } : {}),
    ...(codeVerifier !== undefined ? { codeVerifier } : {}),
    ...(oauthState !== undefined ? { oauthState } : {}),
    ...(serverUrl !== undefined ? { serverUrl } : {}),
  };
}

function parseAuthTokens(value: unknown): AuthTokens | undefined {
  if (value === undefined) return undefined;
  if (!isPlainRecord(value) || typeof value.accessToken !== "string") return undefined;
  const refreshToken = optionalString(value.refreshToken);
  if ("refreshToken" in value && refreshToken === undefined) return undefined;
  const expiresAt = optionalNumber(value.expiresAt);
  if ("expiresAt" in value && expiresAt === undefined) return undefined;
  const scope = optionalString(value.scope);
  if ("scope" in value && scope === undefined) return undefined;

  return {
    accessToken: value.accessToken,
    ...(refreshToken !== undefined ? { refreshToken } : {}),
    ...(expiresAt !== undefined ? { expiresAt } : {}),
    ...(scope !== undefined ? { scope } : {}),
  };
}

function parseAuthClientInfo(value: unknown): AuthClientInfo | undefined {
  if (value === undefined) return undefined;
  if (!isPlainRecord(value) || typeof value.clientId !== "string") return undefined;
  const clientSecret = optionalString(value.clientSecret);
  if ("clientSecret" in value && clientSecret === undefined) return undefined;
  const clientIdIssuedAt = optionalNumber(value.clientIdIssuedAt);
  if ("clientIdIssuedAt" in value && clientIdIssuedAt === undefined) return undefined;
  const clientSecretExpiresAt = optionalNumber(value.clientSecretExpiresAt);
  if ("clientSecretExpiresAt" in value && clientSecretExpiresAt === undefined) return undefined;

  return {
    clientId: value.clientId,
    ...(clientSecret !== undefined ? { clientSecret } : {}),
    ...(clientIdIssuedAt !== undefined ? { clientIdIssuedAt } : {}),
    ...(clientSecretExpiresAt !== undefined ? { clientSecretExpiresAt } : {}),
  };
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function warnAuthStore(message: string) {
  console.warn(`[mcp-auth] ${message}`);
}

function safeAuthStoreError(error: unknown) {
  return error instanceof Error ? `${error.name}: ${error.message}` : `thrown ${typeof error}`;
}
