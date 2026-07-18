import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformation,
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthClientInfo, AuthTokens, OAuthConfig } from "./types.js";
import { AuthStore } from "./auth-store.js";
import { randomHex } from "./random.js";

/** Default local port used by the OAuth browser callback listener. */
export const OAUTH_CALLBACK_PORT = 19876;
/** Default local path used by the OAuth browser callback listener. */
export const OAUTH_CALLBACK_PATH = "/mcp/oauth/callback";

/** Callback hooks used by the MCP SDK OAuth provider integration. */
export interface OAuthCallbacks {
  onRedirect: (url: URL) => void | Promise<void>;
}

/** Implements the MCP SDK OAuth persistence and redirect contract using Pi's auth store. */
export class McpOAuthProvider implements OAuthClientProvider {
  /** Creates an OAuth provider for one remote MCP server and its persisted auth state. */
  constructor(
    private mcpName: string,
    private serverUrl: string,
    private config: OAuthConfig | undefined,
    private callbacks: OAuthCallbacks,
    private auth: AuthStore,
  ) {}

  /** Redirect URI registered with the OAuth authorization server. */
  get redirectUrl(): string {
    if (this.config?.redirectUri) return this.config.redirectUri;
    const port = this.config?.callbackPort ?? OAUTH_CALLBACK_PORT;
    return `http://127.0.0.1:${port}${OAUTH_CALLBACK_PATH}`;
  }

  /** OAuth client metadata advertised during dynamic client registration. */
  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.redirectUrl],
      client_name: "Pi MCP",
      client_uri: "https://pi.dev",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: this.config?.clientSecret ? "client_secret_post" : "none",
      ...(this.config?.scope ? { scope: this.config.scope } : {}),
    };
  }

  /** Returns saved static or dynamically registered OAuth client information. */
  async clientInformation(): Promise<OAuthClientInformation | undefined> {
    if (this.config?.clientId) {
      const info: OAuthClientInformation = {
        client_id: this.config.clientId,
      };
      if (this.config.clientSecret !== undefined) info.client_secret = this.config.clientSecret;
      return info;
    }

    const entry = await this.auth.getForUrl(this.mcpName, this.serverUrl);
    if (!entry?.clientInfo) return undefined;
    if (entry.clientInfo.clientSecretExpiresAt && entry.clientInfo.clientSecretExpiresAt < Date.now() / 1000) {
      return undefined;
    }

    const info: OAuthClientInformation = {
      client_id: entry.clientInfo.clientId,
    };
    if (entry.clientInfo.clientSecret !== undefined) info.client_secret = entry.clientInfo.clientSecret;
    return info;
  }

  /** Persists dynamically registered OAuth client information. */
  async saveClientInformation(info: OAuthClientInformationFull): Promise<void> {
    const clientInfo: AuthClientInfo = {
      clientId: info.client_id,
      ...(nonEmptyString(info.client_secret) ? { clientSecret: info.client_secret } : {}),
      ...(info.client_id_issued_at !== undefined ? { clientIdIssuedAt: info.client_id_issued_at } : {}),
      ...(info.client_secret_expires_at !== undefined ? { clientSecretExpiresAt: info.client_secret_expires_at } : {}),
    };
    await this.auth.updateClientInfo(
      this.mcpName,
      clientInfo,
      this.serverUrl,
    );
  }

  /** Returns saved OAuth tokens in the shape expected by the MCP SDK. */
  async tokens(): Promise<OAuthTokens | undefined> {
    const entry = await this.auth.getForUrl(this.mcpName, this.serverUrl);
    if (!entry?.tokens) return undefined;

    const tokens: OAuthTokens = {
      access_token: entry.tokens.accessToken,
      token_type: "Bearer",
    };
    if (entry.tokens.refreshToken !== undefined) tokens.refresh_token = entry.tokens.refreshToken;
    if (entry.tokens.expiresAt !== undefined) tokens.expires_in = Math.max(0, Math.floor(entry.tokens.expiresAt - Date.now() / 1000));
    if (entry.tokens.scope !== undefined) tokens.scope = entry.tokens.scope;
    return tokens;
  }

  /** Persists OAuth tokens returned by the MCP SDK after grant or refresh flows. */
  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const authTokens: AuthTokens = {
      accessToken: tokens.access_token,
      ...(nonEmptyString(tokens.refresh_token) ? { refreshToken: tokens.refresh_token } : {}),
      ...(tokens.expires_in !== undefined ? { expiresAt: Date.now() / 1000 + tokens.expires_in } : {}),
      ...(nonEmptyString(tokens.scope) ? { scope: tokens.scope } : {}),
    };
    await this.auth.updateTokens(
      this.mcpName,
      authTokens,
      this.serverUrl,
    );
  }

  /** Captures or opens the authorization URL supplied by the MCP SDK. */
  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    await this.callbacks.onRedirect(authorizationUrl);
  }

  /** Persists the PKCE code verifier supplied by the MCP SDK. */
  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await this.auth.updateCodeVerifier(this.mcpName, codeVerifier);
  }

  /** Returns the PKCE code verifier for the current OAuth flow. */
  async codeVerifier(): Promise<string> {
    const entry = await this.auth.get(this.mcpName);
    if (!entry?.codeVerifier) throw new Error(`No code verifier saved for MCP server: ${this.mcpName}`);
    return entry.codeVerifier;
  }

  /** Persists the OAuth state supplied by the MCP SDK. */
  async saveState(state: string): Promise<void> {
    await this.auth.updateOAuthState(this.mcpName, state);
  }

  /** Returns an existing OAuth state or creates one for the current OAuth flow. */
  async state(): Promise<string> {
    const entry = await this.auth.get(this.mcpName);
    if (entry?.oauthState) return entry.oauthState;
    const state = randomHex();
    await this.auth.updateOAuthState(this.mcpName, state);
    return state;
  }

  /** Removes persisted client or token credentials after the SDK invalidates them. */
  async invalidateCredentials(type: "all" | "client" | "tokens"): Promise<void> {
    const entry = await this.auth.get(this.mcpName);
    if (!entry) return;

    if (type === "all") {
      await this.auth.remove(this.mcpName);
      return;
    }

    const { clientInfo: _clientInfo, ...withoutClient } = entry;
    const { tokens: _tokens, ...withoutTokens } = entry;
    const next = type === "client" ? withoutClient : withoutTokens;
    await this.auth.set(this.mcpName, next);
  }
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Parses a configured redirect URI into the callback listener port and path. */
export function parseRedirectUri(redirectUri?: string): { port: number; path: string } {
  if (!redirectUri) return { port: OAUTH_CALLBACK_PORT, path: OAUTH_CALLBACK_PATH };

  try {
    const url = new URL(redirectUri);
    return {
      port: url.port ? Number.parseInt(url.port, 10) : url.protocol === "https:" ? 443 : 80,
      path: url.pathname || OAUTH_CALLBACK_PATH,
    };
  } catch {
    return { port: OAUTH_CALLBACK_PORT, path: OAUTH_CALLBACK_PATH };
  }
}
