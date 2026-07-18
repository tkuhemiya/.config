/** Runtime connection status for one configured MCP server. */
export type McpStatus =
  | { readonly status: "connected" }
  | { readonly status: "connecting" }
  | { readonly status: "disconnected" }
  | { readonly status: "disabled" }
  | { readonly status: "failed"; readonly error: string }
  | { readonly status: "needs_auth" }
  | { readonly status: "needs_client_registration"; readonly error: string };

/** Optional OAuth settings supplied by an MCP server configuration. */
export interface OAuthConfig {
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly scope?: string;
  readonly callbackPort?: number;
  readonly redirectUri?: string;
}

/** Configuration for an MCP server launched as a local subprocess over stdio. */
export interface LocalMcpConfig {
  readonly type: "local";
  readonly command: readonly string[];
  readonly cwd?: string;
  readonly environment?: Readonly<Record<string, string>>;
  readonly enabled?: boolean;
  readonly disabled?: boolean;
  readonly timeout?: number;
}

/** Configuration for a remote MCP server reached over Streamable HTTP or SSE. */
export interface RemoteMcpConfig {
  readonly type: "remote";
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly oauth?: OAuthConfig | false;
  readonly enabled?: boolean;
  readonly disabled?: boolean;
  readonly timeout?: number;
}

/** Parsed configuration for one local or remote MCP server. */
export type McpServerConfig = LocalMcpConfig | RemoteMcpConfig;

/** Controls whether MCP tools are exposed individually or hidden behind the single mcp gateway tool. */
export type McpToolMode = "direct" | "proxy";

/** Controls whether configured MCP servers connect automatically after startup or only on demand. */
export type McpStartupMode = "eager" | "lazy";

/** Names whether a connection request is automatic lazy/eager work or explicit user intent. */
export type McpConnectIntent = "automatic" | "explicit";

/** Common options for MCP operations that can observe caller-owned cancellation. */
export interface CancellableOptions {
  readonly signal: AbortSignal | undefined;
}

/** Options for connecting one configured MCP server. */
export interface McpConnectOptions extends CancellableOptions {
  readonly intent: McpConnectIntent;
}

/** Options for connecting all eligible configured MCP servers. */
export interface McpConnectAllOptions extends CancellableOptions {
  readonly intent: McpConnectIntent;
}

/** Parsed operation for applying a new MCP configuration. */
export type McpInitializeOptions =
  | {
      readonly mode: "configure-only";
    }
  | {
      readonly mode: "connect";
      readonly intent: McpConnectIntent;
      readonly signal: AbortSignal | undefined;
    };

/** Parsed MCP configuration and the source it came from, when loaded from a file. */
export interface McpConfig {
  readonly timeout?: number;
  readonly servers: Readonly<Record<string, McpServerConfig>>;
  readonly source?: string;
  readonly toolMode?: McpToolMode;
  readonly startup?: McpStartupMode;
}

/** OAuth tokens stored for one MCP server. */
export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresAt?: number;
  readonly scope?: string;
}

/** OAuth dynamic-client registration metadata stored for one MCP server. */
export interface AuthClientInfo {
  readonly clientId: string;
  readonly clientSecret?: string;
  readonly clientIdIssuedAt?: number;
  readonly clientSecretExpiresAt?: number;
}

/** Persisted OAuth state for one MCP server. */
export interface AuthEntry {
  readonly tokens?: AuthTokens;
  readonly clientInfo?: AuthClientInfo;
  readonly codeVerifier?: string;
  readonly oauthState?: string;
  readonly serverUrl?: string;
}

/** Coarse authentication state reported to Pi commands. */
export type AuthStatus = "authenticated" | "expired" | "not_authenticated";
