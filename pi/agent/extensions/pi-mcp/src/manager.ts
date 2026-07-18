import path from "node:path";
import { pathToFileURL } from "node:url";
import { Client, type ClientOptions } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import {
  ElicitRequestSchema,
  ListRootsRequestSchema,
  LoggingMessageNotificationSchema,
  ToolListChangedNotificationSchema,
  type ElicitRequest,
  type ElicitResult,
  type LoggingMessageNotification,
  type Prompt,
  type Resource,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import open from "open";
import type {
  AuthStatus,
  CancellableOptions,
  McpConfig,
  McpConnectAllOptions,
  McpConnectOptions,
  McpInitializeOptions,
  McpServerConfig,
  McpStatus,
  OAuthConfig,
} from "./types.js";
import { AuthStore } from "./auth-store.js";
import { resolveHome } from "./config-values.js";
import { redactSecrets } from "./display.js";
import { randomHex } from "./random.js";
import { DEFAULT_TIMEOUT } from "./request-limits.js";
import { mcpToolKey, sanitizeName } from "./tool-names.js";
import { withTimeout } from "./timeout.js";
import { listPrompts, listResources, listTools } from "./catalog.js";
import { McpOAuthProvider } from "./oauth-provider.js";
import {
  cancelPendingCallback,
  ensureCallbackServer,
  stopCallbackServer,
  waitForCallback,
} from "./oauth-callback.js";

const CLIENT_OPTIONS = {
  capabilities: {
    elicitation: {
      form: { applyDefaults: true },
      url: {},
    },
    roots: {},
  },
} satisfies ClientOptions;

type Transport = StdioClientTransport | StreamableHTTPClientTransport | SSEClientTransport;
type TransportWithAuth = StreamableHTTPClientTransport | SSEClientTransport;

interface ManagedClient {
  client: Client;
  transport: Transport;
  config: McpServerConfig;
  tools: Tool[];
}

/** Connected MCP client snapshot exposed for extension integration and tests. */
export interface ConnectedMcpClient {
  readonly client: Client;
  readonly hasPrompts: boolean;
  readonly hasResources: boolean;
  readonly hasTools: boolean;
}

/** Connected MCP tool metadata used to register Pi dynamic tools. */
export interface McpToolEntry {
  readonly server: string;
  readonly name: string;
  readonly key: string;
  readonly client: Client;
  readonly tool: Tool;
  readonly timeout: number;
}

/** Result of listing resources across one or more MCP servers. */
export interface McpResourcesResult {
  readonly resources: Array<Resource & { readonly client: string }>;
  readonly failures: readonly McpServerFailure[];
}

/** Result of listing prompts across one or more MCP servers. */
export interface McpPromptsResult {
  readonly prompts: Array<Prompt & { readonly client: string; readonly commandName: string }>;
  readonly failures: readonly McpServerFailure[];
}

/** Safe summary for a per-server list failure when partial results remain useful. */
export interface McpServerFailure {
  readonly server: string;
  readonly error: string;
}

interface ManagerOptions {
  cwd: string;
  authStore?: AuthStore;
  onElicitation?: (server: string, request: ElicitRequest) => ElicitResult | Promise<ElicitResult>;
  onToolsChanged?: (server: string) => void | Promise<void>;
  onStatusChanged?: () => void | Promise<void>;
  openAuthorizationUrl?: (url: string) => void | Promise<void>;
}

/** Manages configured MCP clients, dynamic Pi tool registration data, resources, prompts, and OAuth state. */
export class McpManager {
  private auth: AuthStore;
  private clients = new Map<string, ManagedClient>();
  private statuses = new Map<string, McpStatus>();
  private config: McpConfig = { servers: {} };
  private pendingOAuthTransports = new Map<string, TransportWithAuth>();
  private manuallyDisconnected = new Set<string>();
  private connectionAttempts = new Map<string, Promise<McpStatus>>();
  private closed = false;
  private revision = 0;

  /** Creates a manager for one Pi workspace and optional auth/UI callback seams. */
  constructor(private options: ManagerOptions) {
    this.auth = options.authStore ?? new AuthStore();
  }

  /** Replaces the active MCP configuration and runs the caller-selected startup operation. */
  async initialize(config: McpConfig, options: McpInitializeOptions): Promise<void> {
    this.closed = false;
    this.revision += 1;
    await this.closeClients();
    this.connectionAttempts.clear();
    this.statuses.clear();
    this.config = cloneMcpConfig(config);

    for (const [name, serverConfig] of Object.entries(this.config.servers)) {
      this.statuses.set(name, isConfigDisabled(serverConfig) ? { status: "disabled" } : { status: "disconnected" });
    }

    if (options.mode === "connect") {
      await this.connectAll({
        intent: options.intent,
        signal: options.signal,
      });
      return;
    }

    await this.emitStatusChanged();
  }

  /** Connects every eligible configured MCP server in parallel and returns the latest status snapshot. */
  async connectAll(options: McpConnectAllOptions): Promise<Record<string, McpStatus>> {
    const targets = Object.entries(this.config.servers).filter(([name, serverConfig]) => {
      const status = this.statuses.get(name);

      if (options.intent === "automatic") {
        return this.canAutoConnect(name, serverConfig, status);
      }

      return this.canExplicitConnect(serverConfig);
    });

    const settled = await Promise.allSettled(
      targets.map(([name]) =>
        this.connect(name, {
          intent: options.intent,
          signal: options.signal,
        }),
      ),
    );

    let hasUnhandledFailure = false;

    for (let index = 0; index < settled.length; index++) {
      const result = settled[index];
      const target = targets[index];

      if (!result || !target) continue;
      if (result.status === "fulfilled") continue;

      if (isAbortError(result.reason)) {
        throw result.reason;
      }

      this.statuses.set(target[0], {
        status: "failed",
        error: errorMessage(result.reason),
      });

      hasUnhandledFailure = true;
    }

    if (hasUnhandledFailure) await this.emitStatusChanged();

    return this.status();
  }

  /** Returns connection status for every configured MCP server. */
  status() {
    const result: Record<string, McpStatus> = {};
    for (const name of Object.keys(this.config.servers)) {
      result[name] = cloneStatus(this.statuses.get(name) ?? { status: "disabled" });
    }
    return result;
  }

  /** Returns the parsed server configuration keyed by MCP server name. */
  configuredServers() {
    return cloneMcpConfig(this.config).servers;
  }

  /** Returns a snapshot of currently connected MCP clients. */
  connectedClients(): ReadonlyMap<string, ConnectedMcpClient> {
    return new Map(
      Array.from(this.clients, ([name, managed]) => [
        name,
        {
          client: managed.client,
          hasPrompts: !!managed.client.getServerCapabilities()?.prompts,
          hasResources: !!managed.client.getServerCapabilities()?.resources,
          hasTools: !!managed.client.getServerCapabilities()?.tools,
        },
      ]),
    );
  }

  /** Returns the connected MCP tools that should be exposed as Pi tools. */
  getToolEntries(): McpToolEntry[] {
    const result: McpToolEntry[] = [];
    for (const [server, managed] of this.clients) {
      if (this.statuses.get(server)?.status !== "connected") continue;
      for (const tool of managed.tools) {
        result.push({
          server,
          name: tool.name,
          key: mcpToolKey(server, tool.name),
          client: managed.client,
          tool,
          timeout: managed.config.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT,
        });
      }
    }
    return result;
  }

  /** Finds a connected MCP tool by its Pi tool key. */
  getToolEntry(key: string) {
    return this.getToolEntries().find((entry) => entry.key === key);
  }

  /** Connects or reconnects one configured MCP server. */
  async connect(name: string, options: McpConnectOptions): Promise<McpStatus> {
    const serverConfig = this.config.servers[name];
    if (!serverConfig) throw new Error(`MCP server not found: ${name}`);

    const currentStatus = this.statuses.get(name);

    if (options.intent === "automatic") {
      if (!this.canAutoConnect(name, serverConfig, currentStatus)) {
        return currentStatus ?? { status: "disabled" };
      }
    }

    if (options.intent === "explicit") {
      if (!this.canExplicitConnect(serverConfig)) {
        const disabled = { status: "disabled" as const };
        this.statuses.set(name, disabled);
        return disabled;
      }

      this.manuallyDisconnected.delete(name);
    }

    options.signal?.throwIfAborted();

    const existing = this.connectionAttempts.get(name);
    if (existing) {
      return waitForConnectAttempt(existing, options.signal);
    }

    const revision = this.revision;
    const attempt = this.connectFresh(name, serverConfig, revision, {
      signal: options.signal,
    }).finally(() => {
      if (this.connectionAttempts.get(name) === attempt) {
        this.connectionAttempts.delete(name);
      }
    });

    this.connectionAttempts.set(name, attempt);

    return waitForConnectAttempt(attempt, options.signal);
  }

  /** Disconnects one configured MCP server for the current runtime. */
  async disconnect(name: string) {
    if (!this.config.servers[name]) throw new Error(`MCP server not found: ${name}`);

    this.manuallyDisconnected.add(name);

    await this.disconnectClient(name, { status: "disabled" });
    await this.options.onToolsChanged?.(name);
    await this.emitStatusChanged();
  }

  /** Lists resources exposed by connected MCP servers, optionally restricted to one server. */
  async resources(server: string | undefined, options: CancellableOptions): Promise<McpResourcesResult> {
    const targets = Array.from(this.clients).filter(([name, managed]) => {
      if (server && name !== server) return false;
      return !!managed.client.getServerCapabilities()?.resources;
    });
    if (server) {
      const managed = targets[0]?.[1];
      if (!managed) return { resources: [], failures: [] };
      const resources = await listResources(managed.client, managed.config.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT, options.signal);
      return { resources: resources.map((resource) => ({ ...resource, client: server })), failures: [] };
    }
    const collected = await collectPartial(targets, options.signal, async (name, managed) => {
      const resources = await listResources(managed.client, managed.config.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT, options.signal);
      return resources.map((resource) => ({ ...resource, client: name }));
    });
    return { resources: collected.items, failures: collected.failures };
  }

  /** Lists prompts exposed by every connected MCP server. */
  async prompts(options: CancellableOptions): Promise<McpPromptsResult> {
    const targets = Array.from(this.clients).filter(([, managed]) => !!managed.client.getServerCapabilities()?.prompts);
    const collected = await collectPartial(targets, options.signal, async (name, managed) => {
      const prompts = await listPrompts(managed.client, managed.config.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT, options.signal);
      return prompts.map((prompt) => ({
        ...prompt,
        client: name,
        commandName: `${sanitizeName(name)}:${sanitizeName(prompt.name)}`,
      }));
    });
    return { prompts: collected.items, failures: collected.failures };
  }

  /** Fetches one prompt from a connected MCP server. */
  async getPrompt(clientName: string, name: string, args: Record<string, string> | undefined, options: CancellableOptions) {
    const managed = this.clients.get(clientName);
    if (!managed) throw new Error(`MCP server "${clientName}" is not connected`);
    return managed.client.getPrompt(
      { name, arguments: args },
      sdkRequestOptions(managed.config.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT, options.signal),
    );
  }

  /** Reads one resource from a connected MCP server. */
  async readResource(clientName: string, uri: string, options: CancellableOptions) {
    const managed = this.clients.get(clientName);
    if (!managed) throw new Error(`MCP server "${clientName}" is not connected`);
    if (!managed.client.getServerCapabilities()?.resources) throw new Error(`MCP server "${clientName}" does not support resources`);
    return managed.client.readResource(
      { uri },
      sdkRequestOptions(managed.config.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT, options.signal),
    );
  }

  /** Reports whether any connected MCP server currently supports resources. */
  supportsResources() {
    for (const managed of this.clients.values()) {
      if (managed.client.getServerCapabilities()?.resources) return true;
    }
    return false;
  }

  /** Runs the OAuth flow for one remote MCP server and reconnects it after successful authorization. */
  async authenticate(name: string, onAuthorizationUrl?: (url: string) => void | Promise<void>) {
    const result = await this.startAuth(name);
    if (!result.authorizationUrl) {
      if (!result.client) return { status: "failed", error: "OAuth did not return a connected client" } satisfies McpStatus;
      const serverConfig = this.requireRemote(name);
      const tools = result.client.getServerCapabilities()?.tools
        ? await listTools(result.client, serverConfig.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT, undefined)
        : [];
      if (!result.transport) return { status: "failed", error: "OAuth did not return a connected transport" } satisfies McpStatus;
      await this.storeClient(name, result.client, result.transport, serverConfig, tools);
      await this.auth.clearOAuthState(name);
      return this.statuses.get(name) ?? { status: "failed", error: "OAuth did not store a connected status" };
    }

    const callbackPromise = waitForCallback(result.oauthState, name);
    await this.openAuthorizationUrl(result.authorizationUrl, onAuthorizationUrl);

    const code = await callbackPromise;
    const storedState = await this.auth.getOAuthState(name);
    if (storedState !== result.oauthState) {
      await this.auth.clearOAuthState(name);
      throw new Error("OAuth state mismatch");
    }
    await this.auth.clearOAuthState(name);
    return this.finishAuth(name, code);
  }

  /** Removes stored OAuth state and cancels any in-flight authorization for one MCP server. */
  async removeAuth(name: string) {
    await this.auth.remove(name);
    cancelPendingCallback(name);
    this.pendingOAuthTransports.delete(name);
  }

  /** Returns the persisted OAuth status for one MCP server. */
  async authStatus(name: string): Promise<AuthStatus> {
    return this.auth.authStatus(name);
  }

  /** Closes all connected MCP clients and any local OAuth callback listener. */
  async close() {
    this.closed = true;
    this.revision += 1;
    await this.closeClients();
    await stopCallbackServer();
    this.pendingOAuthTransports.clear();
    this.connectionAttempts.clear();
  }

  private async connectFresh(
    name: string,
    serverConfig: McpServerConfig,
    revision: number,
    options: CancellableOptions,
  ): Promise<McpStatus> {
    options.signal?.throwIfAborted();

    await this.disconnectClient(name, { status: "connecting" });

    const result =
      serverConfig.type === "local"
        ? await this.connectLocal(name, serverConfig, options)
        : await this.connectRemote(name, serverConfig, options);

    if (options.signal?.aborted) {
      if (result.client && result.transport) await safeCloseClient(result.client, result.transport);
      options.signal.throwIfAborted();
    }

    if (!this.isCurrentRevision(revision)) {
      if (result.client && result.transport) await safeCloseClient(result.client, result.transport);
      return { status: "disconnected" };
    }

    if (this.manuallyDisconnected.has(name)) {
      if (result.client && result.transport) await safeCloseClient(result.client, result.transport);
      const disabled = { status: "disabled" as const };
      this.statuses.set(name, disabled);
      return disabled;
    }

    this.statuses.set(name, result.status);

    if (!result.client || !result.transport) {
      await this.options.onToolsChanged?.(name);
      await this.emitStatusChanged();
      return result.status;
    }

    let tools: Tool[];
    try {
      tools = result.client.getServerCapabilities()?.tools
        ? await listTools(
            result.client,
            serverConfig.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT,
            options.signal,
          )
        : [];
    } catch (error: unknown) {
      await safeCloseClient(result.client, result.transport);
      throw error;
    }

    if (options.signal?.aborted) {
      await safeCloseClient(result.client, result.transport);
      options.signal.throwIfAborted();
    }

    if (!this.isCurrentRevision(revision)) {
      await safeCloseClient(result.client, result.transport);
      return { status: "disconnected" };
    }

    if (this.manuallyDisconnected.has(name)) {
      await safeCloseClient(result.client, result.transport);
      const disabled = { status: "disabled" as const };
      this.statuses.set(name, disabled);
      return disabled;
    }

    const collision = findToolKeyCollision(
      new Map(this.clients).set(name, {
        client: result.client,
        transport: result.transport,
        config: serverConfig,
        tools,
      }),
    );

    if (collision) {
      const status = { status: "failed" as const, error: collision.message };
      await safeCloseClient(result.client, result.transport);
      this.statuses.set(name, status);
      await this.options.onToolsChanged?.(name);
      await this.emitStatusChanged();
      return status;
    }

    this.clients.set(name, {
      client: result.client,
      transport: result.transport,
      config: serverConfig,
      tools,
    });
    this.watch(name, result.client, serverConfig.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT);
    await this.options.onToolsChanged?.(name);
    await this.emitStatusChanged();
    return result.status;
  }

  private async connectLocal(name: string, serverConfig: Extract<McpServerConfig, { type: "local" }>, options: CancellableOptions) {
    const [command, ...args] = serverConfig.command;
    if (!command) return { status: { status: "failed" as const, error: "Local MCP command is empty" } };
    const cwd = serverConfig.cwd ? path.resolve(this.options.cwd, resolveHome(serverConfig.cwd)) : this.options.cwd;
    const transport = new StdioClientTransport({
      stderr: "pipe",
      command,
      args,
      cwd,
      env: {
        ...definedProcessEnv(),
        ...(command === "opencode" ? { BUN_BE_BUN: "1" } : {}),
        ...serverConfig.environment,
      },
    });

    try {
      const client = await this.connectTransport(
        name,
        transport,
        serverConfig.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT,
        options,
      );
      return { client, transport, status: { status: "connected" as const } };
    } catch (error: unknown) {
      await safeCloseTransport(transport);
      if (isAbortError(error)) throw error;
      return { status: { status: "failed" as const, error: errorMessage(error) } };
    }
  }

  private async connectRemote(name: string, serverConfig: Extract<McpServerConfig, { type: "remote" }>, options: CancellableOptions) {
    const url = URL.canParse(serverConfig.url) ? new URL(serverConfig.url) : undefined;
    if (!url) return { status: { status: "failed" as const, error: `Invalid MCP URL for "${name}"` } };

    const oauthDisabled = serverConfig.oauth === false;
    const authProvider = oauthDisabled
      ? undefined
      : new McpOAuthProvider(
          name,
          serverConfig.url,
          typeof serverConfig.oauth === "object" ? serverConfig.oauth : undefined,
          { onRedirect: async () => undefined },
          this.auth,
        );

    const transports: Array<{ name: string; transport: TransportWithAuth }> = [
      {
        name: "StreamableHTTP",
        transport: new StreamableHTTPClientTransport(url, transportOptions(authProvider, serverConfig.headers)),
      },
      {
        name: "SSE",
        transport: new SSEClientTransport(url, transportOptions(authProvider, serverConfig.headers)),
      },
    ];

    let lastStatus: McpStatus | undefined;
    for (const candidate of transports) {
      try {
        const client = await this.connectTransport(
          name,
          candidate.transport,
          serverConfig.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT,
          options,
        );
        return { client, transport: candidate.transport, status: { status: "connected" as const } };
      } catch (error: unknown) {
        if (isAbortError(error)) {
          await safeCloseTransport(candidate.transport);
          throw error;
        }

        const message = errorMessage(error);
        const isAuthError = error instanceof UnauthorizedError || (!!authProvider && /oauth|authorization|unauthorized/i.test(message));
        if (isAuthError) {
          await safeCloseTransport(candidate.transport);
          if (/registration|client_id/i.test(message)) {
            lastStatus = {
              status: "needs_client_registration",
              error: "Server does not support dynamic client registration. Provide oauth.clientId in config.",
            };
          } else {
            this.pendingOAuthTransports.set(name, candidate.transport);
            lastStatus = { status: "needs_auth" };
          }
          break;
        }
        await safeCloseTransport(candidate.transport);
        lastStatus = { status: "failed", error: message };
      }
    }

    return { status: lastStatus ?? { status: "failed", error: "Unknown MCP connection error" } };
  }

  private async connectTransport(name: string, transport: Transport, timeout: number, options: CancellableOptions) {
    options.signal?.throwIfAborted();

    const client = this.createClient(name);
    await withTimeout(client.connect(asSdkTransport(transport)), timeout, "MCP connect", { signal: undefined });
    return client;
  }

  private createClient(server = "unknown") {
    const client = new Client({ name: "pi", version: "0.1.0" }, CLIENT_OPTIONS);
    client.setRequestHandler(ListRootsRequestSchema, () =>
      Promise.resolve({ roots: [{ uri: pathToFileURL(this.options.cwd).href }] }),
    );
    client.setRequestHandler(ElicitRequestSchema, (request) => {
      return this.options.onElicitation?.(server, request) ?? { action: "decline" };
    });
    return client;
  }

  private watch(name: string, client: Client, timeout: number) {
    client.onclose = () => {
      const closed = this.handleClientClosed(name, client);
      closed.catch((error) => {
        console.error(`[mcp:${name}] close handler failed: ${safeErrorSummary(error)}`);
      });
    };

    client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
      logServerMessage(name, notification.params);
    });

    if (!client.getServerCapabilities()?.tools) return;
    client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
      const refreshed = this.handleToolListChanged(name, client, timeout);
      refreshed.catch((error) => {
        console.error(`[mcp:${name}] tool list refresh failed: ${safeErrorSummary(error)}`);
      });
    });
  }

  private async handleToolListChanged(name: string, client: Client, timeout: number) {
    const managed = this.clients.get(name);
    if (!managed || managed.client !== client || this.statuses.get(name)?.status !== "connected") return;
    const tools = await listTools(client, timeout, undefined);
    const collision = findToolKeyCollision(new Map(this.clients).set(name, { ...managed, tools }));
    if (collision) {
      this.clients.delete(name);
      this.statuses.set(name, { status: "failed", error: collision.message });
      await safeCloseClient(managed.client, managed.transport);
      await this.options.onToolsChanged?.(name);
      await this.emitStatusChanged();
      return;
    }
    managed.tools = tools;
    await this.options.onToolsChanged?.(name);
  }

  private async startAuth(name: string) {
    const serverConfig = this.requireRemote(name);
    if (serverConfig.oauth === false) throw new Error(`MCP server ${name} has OAuth disabled`);

    const oauthConfig = typeof serverConfig.oauth === "object" ? serverConfig.oauth : undefined;
    const redirectUri =
      oauthConfig?.redirectUri ??
      (oauthConfig?.callbackPort ? `http://127.0.0.1:${oauthConfig.callbackPort}/mcp/oauth/callback` : undefined);
    await ensureCallbackServer(redirectUri);

    const oauthState = randomHex();
    await this.auth.updateOAuthState(name, oauthState);

    let capturedUrl: URL | undefined;
    const authProvider = new McpOAuthProvider(
      name,
      serverConfig.url,
      oauthProviderConfig(oauthConfig, redirectUri),
      {
        onRedirect: async (url) => {
          capturedUrl = url;
        },
      },
      this.auth,
    );

    const transport = new StreamableHTTPClientTransport(new URL(serverConfig.url), transportOptions(authProvider, serverConfig.headers));

    try {
      const client = this.createClient(name);
      await client.connect(asSdkTransport(transport));
      return { authorizationUrl: "", oauthState, client, transport };
    } catch (error) {
      if (error instanceof UnauthorizedError && capturedUrl) {
        this.pendingOAuthTransports.set(name, transport);
        return { authorizationUrl: capturedUrl.toString(), oauthState };
      }
      await safeCloseTransport(transport);
      throw error;
    }
  }

  private async finishAuth(name: string, authorizationCode: string) {
    const transport = this.pendingOAuthTransports.get(name);
    if (!transport) throw new Error(`No pending OAuth flow for MCP server: ${name}`);

    try {
      await transport.finishAuth(authorizationCode);
      const exchangedEntry = await this.auth.get(name);
      await this.auth.clearCodeVerifier(name);
      this.pendingOAuthTransports.delete(name);
      const status = await this.connect(name, { intent: "explicit", signal: undefined });
      if (status.status === "needs_auth" && exchangedEntry?.tokens) {
        return {
          status: "failed",
          error: "OAuth callback completed and an access token was issued, but the server rejected it on reconnect. The token may have an incompatible audience/resource for this MCP endpoint.",
        } satisfies McpStatus;
      }
      return status;
    } catch (error) {
      return { status: "failed", error: errorMessage(error) } satisfies McpStatus;
    }
  }

  private requireRemote(name: string) {
    const serverConfig = this.config.servers[name];
    if (!serverConfig) throw new Error(`MCP server not found: ${name}`);
    if (serverConfig.type !== "remote") throw new Error(`MCP server ${name} is not a remote server`);
    if (!URL.canParse(serverConfig.url)) throw new Error(`Invalid MCP URL for "${name}"`);
    return serverConfig;
  }

  private async storeClient(name: string, client: Client, transport: Transport, config: McpServerConfig, tools: Tool[]) {
    await this.disconnectClient(name, { status: "connected" });
    const collision = findToolKeyCollision(new Map(this.clients).set(name, { client, transport, config, tools }));
    if (collision) {
      await safeCloseClient(client, transport);
      this.statuses.set(name, { status: "failed", error: collision.message });
      await this.emitStatusChanged();
      return;
    }
    this.statuses.set(name, { status: "connected" });
    this.clients.set(name, { client, transport, config, tools });
    this.watch(name, client, config.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT);
    await this.options.onToolsChanged?.(name);
    await this.emitStatusChanged();
  }

  private async handleClientClosed(name: string, client: Client) {
    const managed = this.clients.get(name);
    if (managed?.client !== client) return;
    this.clients.delete(name);
    this.statuses.set(name, { status: "failed", error: "Connection closed" });
    await this.options.onToolsChanged?.(name);
    await this.emitStatusChanged();
  }

  private async disconnectClient(name: string, status: McpStatus) {
    const managed = this.clients.get(name);
    this.clients.delete(name);
    this.statuses.set(name, status);
    if (managed) await safeCloseClient(managed.client, managed.transport);
  }

  private async closeClients() {
    const clients = Array.from(this.clients.values());
    this.clients.clear();
    await Promise.all(clients.map((managed) => safeCloseClient(managed.client, managed.transport)));
  }

  private async emitStatusChanged() {
    await this.options.onStatusChanged?.();
  }

  private isCurrentRevision(revision: number) {
    return !this.closed && this.revision === revision;
  }

  private canAutoConnect(name: string, config: McpServerConfig, status: McpStatus | undefined): boolean {
    if (isConfigDisabled(config)) return false;
    if (this.manuallyDisconnected.has(name)) return false;

    return status === undefined || status.status === "disconnected" || status.status === "connecting";
  }

  private canExplicitConnect(config: McpServerConfig): boolean {
    return !isConfigDisabled(config);
  }

  private async openAuthorizationUrl(url: string, onAuthorizationUrl?: (url: string) => void | Promise<void>) {
    if (this.options.openAuthorizationUrl) {
      await this.options.openAuthorizationUrl(url);
      return;
    }

    try {
      const subprocess = await open(url);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 500);
        subprocess.on("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
        subprocess.on("exit", (code) => {
          if (code !== null && code !== 0) {
            clearTimeout(timer);
            reject(new Error(`Browser open failed with exit code ${code}`));
          }
        });
      });
    } catch {
      await onAuthorizationUrl?.(url);
    }
  }
}

function isConfigDisabled(config: McpServerConfig) {
  return config.enabled === false || config.disabled === true;
}

function definedProcessEnv() {
  return Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined));
}

function transportOptions(authProvider: McpOAuthProvider | undefined, headers: Record<string, string> | undefined) {
  return {
    ...(authProvider ? { authProvider } : {}),
    ...(headers ? { requestInit: { headers } } : {}),
  };
}

function oauthProviderConfig(config: OAuthConfig | undefined, redirectUri: string | undefined): OAuthConfig | undefined {
  if (!config && !redirectUri) return undefined;
  return {
    ...(config?.clientId !== undefined ? { clientId: config.clientId } : {}),
    ...(config?.clientSecret !== undefined ? { clientSecret: config.clientSecret } : {}),
    ...(config?.scope !== undefined ? { scope: config.scope } : {}),
    ...(config?.callbackPort !== undefined ? { callbackPort: config.callbackPort } : {}),
    ...(redirectUri !== undefined ? { redirectUri } : {}),
  };
}

function cloneMcpConfig(config: McpConfig): McpConfig {
  const servers: Record<string, McpServerConfig> = {};
  for (const [name, server] of Object.entries(config.servers)) {
    servers[name] = cloneServerConfig(server);
  }
  return {
    servers,
    ...(config.timeout !== undefined ? { timeout: config.timeout } : {}),
    ...(config.source !== undefined ? { source: config.source } : {}),
    ...(config.toolMode !== undefined ? { toolMode: config.toolMode } : {}),
    ...(config.startup !== undefined ? { startup: config.startup } : {}),
  };
}

function cloneServerConfig(config: McpServerConfig): McpServerConfig {
  if (config.type === "local") {
    return {
      type: "local",
      command: [...config.command],
      ...(config.cwd !== undefined ? { cwd: config.cwd } : {}),
      ...(config.environment !== undefined ? { environment: cloneStringRecord(config.environment) } : {}),
      ...(config.enabled !== undefined ? { enabled: config.enabled } : {}),
      ...(config.disabled !== undefined ? { disabled: config.disabled } : {}),
      ...(config.timeout !== undefined ? { timeout: config.timeout } : {}),
    };
  }

  return {
    type: "remote",
    url: config.url,
    ...(config.headers !== undefined ? { headers: cloneStringRecord(config.headers) } : {}),
    ...(config.oauth !== undefined ? { oauth: cloneOAuthConfig(config.oauth) } : {}),
    ...(config.enabled !== undefined ? { enabled: config.enabled } : {}),
    ...(config.disabled !== undefined ? { disabled: config.disabled } : {}),
    ...(config.timeout !== undefined ? { timeout: config.timeout } : {}),
  };
}

function cloneOAuthConfig(config: OAuthConfig | false): OAuthConfig | false {
  if (config === false) return false;
  return {
    ...(config.clientId !== undefined ? { clientId: config.clientId } : {}),
    ...(config.clientSecret !== undefined ? { clientSecret: config.clientSecret } : {}),
    ...(config.scope !== undefined ? { scope: config.scope } : {}),
    ...(config.callbackPort !== undefined ? { callbackPort: config.callbackPort } : {}),
    ...(config.redirectUri !== undefined ? { redirectUri: config.redirectUri } : {}),
  };
}

function cloneStringRecord(value: Readonly<Record<string, string>>) {
  return Object.fromEntries(Object.entries(value));
}

function cloneStatus(status: McpStatus): McpStatus {
  switch (status.status) {
    case "connected":
      return { status: "connected" };
    case "connecting":
      return { status: "connecting" };
    case "disconnected":
      return { status: "disconnected" };
    case "disabled":
      return { status: "disabled" };
    case "needs_auth":
      return { status: "needs_auth" };
    case "failed":
      return { status: "failed", error: status.error };
    case "needs_client_registration":
      return { status: "needs_client_registration", error: status.error };
  }
}

function findToolKeyCollision(clients: ReadonlyMap<string, ManagedClient>) {
  const owners = new Map<string, { server: string; tool: string }>();
  for (const [server, managed] of clients) {
    for (const tool of managed.tools) {
      const key = mcpToolKey(server, tool.name);
      const existing = owners.get(key);
      if (existing) {
        return {
          message: `MCP tool name collision for "${key}": ${existing.server}/${existing.tool} and ${server}/${tool.name} both map to the same Pi tool name`,
        };
      }
      owners.set(key, { server, tool: tool.name });
    }
  }
  return undefined;
}

async function waitForConnectAttempt(attempt: Promise<McpStatus>, signal: AbortSignal | undefined): Promise<McpStatus> {
  signal?.throwIfAborted();

  if (!signal) return attempt;

  let abortHandler: (() => void) | undefined;

  const abortPromise = new Promise<never>((_resolve, reject) => {
    abortHandler = () => {
      reject(new DOMException("MCP connect aborted", "AbortError"));
    };

    signal.addEventListener("abort", abortHandler, { once: true });
  });

  try {
    return await Promise.race([attempt, abortPromise]);
  } finally {
    if (abortHandler) {
      signal.removeEventListener("abort", abortHandler);
    }
  }
}

function sdkRequestOptions(timeout: number, signal: AbortSignal | undefined) {
  return {
    timeout,
    ...(signal ? { signal } : {}),
  };
}

async function collectPartial<T>(
  targets: Array<[string, ManagedClient]>,
  signal: AbortSignal | undefined,
  list: (name: string, managed: ManagedClient) => Promise<T[]>,
) {
  signal?.throwIfAborted();
  const settled = await Promise.allSettled(
    targets.map(async ([name, managed]) => ({
      name,
      items: await list(name, managed),
    })),
  );
  const items: T[] = [];
  const failures: McpServerFailure[] = [];
  for (let index = 0; index < settled.length; index++) {
    const result = settled[index];
    const target = targets[index];
    if (!result || !target) continue;
    if (result.status === "fulfilled") {
      items.push(...result.value.items);
      continue;
    }
    if (isAbortError(result.reason)) throw result.reason;
    failures.push({ server: target[0], error: safeErrorSummary(result.reason) });
  }
  return { items, failures };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function asSdkTransport(transport: Transport): Parameters<Client["connect"]>[0] {
  // SAFETY: The MCP SDK transport classes implement the SDK Transport interface at runtime; exact optional
  // property checking makes their declaration files structurally incompatible with that interface.
  return transport as Parameters<Client["connect"]>[0];
}

async function safeCloseClient(client: Client, transport: Transport) {
  try {
    await client.close();
  } catch {
    await safeCloseTransport(transport);
  }
}

async function safeCloseTransport(transport: Transport) {
  try {
    await transport.close();
  } catch {}
}

function errorMessage(error: unknown) {
  return redactSecrets(error instanceof Error ? error.message : String(error));
}

function logServerMessage(name: string, params: LoggingMessageNotification["params"]) {
  const prefix = `[mcp:${name}]`;
  const message = `${prefix} ${params.logger ? `${params.logger}: ` : ""}${safeLogDataSummary(params.data)}`;
  if (["error", "critical", "alert", "emergency"].includes(params.level)) console.error(message);
  else if (params.level === "warning") console.warn(message);
  else console.info(message);
}

function safeLogDataSummary(data: unknown) {
  if (data === null) return "data=null";
  if (Array.isArray(data)) return `data=array(length=${data.length})`;
  if (typeof data === "object") return `data=object(keys=${Object.keys(data).length})`;
  return `data=${typeof data}`;
}

function safeErrorSummary(error: unknown) {
  return error instanceof Error ? `${error.name}: ${redactSecrets(error.message)}` : `thrown ${typeof error}`;
}
