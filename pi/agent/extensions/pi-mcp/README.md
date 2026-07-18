# pi-mcp

Pi extension that ports OpenCode-style MCP client support to Pi.

## Install

From GitHub:

```bash
pi install git:github.com/dmmulroy/pi-mcp
```

For a temporary run:

```bash
pi -e /Users/dmmulroy/Documents/pi-mcp
```

## Configuration

The extension reads OpenCode-compatible MCP config from, in order:

1. `PI_MCP_CONFIG` as a JSON string or path to a JSON/JSONC file
2. `.pi/mcp.json` or `.pi/mcp.jsonc`
3. `opencode.json`, `opencode.jsonc`, `.opencode/opencode.json`, `.opencode/opencode.jsonc`
4. `~/.pi/agent/mcp.json` or `~/.pi/agent/mcp.jsonc`

Supported flat OpenCode shape:

```jsonc
{
  "mcp": {
    "playwright": {
      "type": "local",
      "command": ["npx", "-y", "@playwright/mcp"],
      "enabled": true,
      "timeout": 30000
    },
    "docs": {
      "type": "remote",
      "url": "https://example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${DOCS_TOKEN}"
      }
    }
  }
}
```

Also supported:

```jsonc
{
  "mcp": {
    "timeout": 30000,
    "startup": "lazy",
    "servers": {
      "playwright": {
        "type": "local",
        "command": ["npx", "-y", "@playwright/mcp"]
      }
    }
  }
}
```

`startup` controls connection timing:

In direct tool mode, `startup: "lazy"` means MCP tools are not registered at
startup. Run `/mcp-connect <server>` or `/mcp-reload` to connect servers and
register direct tools. Use `startup: "eager"` if you want direct MCP tools to
appear automatically without blocking Pi startup.

In proxy tool mode, the `mcp` gateway registers immediately. With
`startup: "lazy"`, it connects enabled servers on demand.

`"eager"` starts connecting enabled servers in the background after Pi startup.
Eager connects run in parallel and do not block Pi's `session_start` handler.

`${ENV_VAR}` placeholders in `environment`, `headers`, `url`, and `cwd` are expanded from the process environment.

## Commands

- `/mcp-list` shows configured servers and connection status.
- `/mcp-reload` reloads config and reconnects servers.
- `/mcp-connect <name>` connects or reconnects a configured server.
- `/mcp-disconnect <name>` disables a server for the current runtime.
- `/mcp-auth [name]` starts OAuth for a remote server.
- `/mcp-logout <name>` removes stored OAuth credentials.
- `/mcp-prompts` lists MCP prompts from connected servers.
- `/mcp-prompt <server> <prompt> [json args]` fetches an MCP prompt and sends it as a user message.

In direct tool mode, connected MCP tools are registered as Pi tools using OpenCode's sanitized name convention:

```text
<server>_<tool>
```

To hide individual MCP tools from the system prompt and expose only a progressive-disclosure gateway, set `toolMode` (or `mode`) to `"proxy"`. With the default `startup: "lazy"`, this registers the gateway at startup without connecting MCP servers until the gateway needs them:

```jsonc
{
  "mcp": {
    "toolMode": "proxy",
    "playwright": {
      "type": "local",
      "command": ["npx", "-y", "@playwright/mcp"]
    }
  }
}
```

Proxy usage:

```js
mcp({})                                      // status
mcp({ server: "playwright" })              // list one server's tools
mcp({ search: "screenshot" })              // search tools
mcp({ describe: "playwright_take_screenshot" })
mcp({ tool: "playwright_take_screenshot", args: '{"fullPage":true}' })
mcp({ action: "resources", server: "docs" })
mcp({ action: "read-resource", server: "docs", uri: "file://..." })
```

The extension also registers `list_mcp_resources` and `read_mcp_resource` in direct mode when any connected server supports MCP resources. In proxy mode, resources are available through the `mcp` gateway actions instead.

## Elicitation

The MCP client advertises form and URL elicitation support. In TUI/RPC modes, form fields are mapped to Pi UI dialogs:

- string enums use `ctx.ui.select`
- booleans use `ctx.ui.confirm`
- strings, numbers, integers, and string arrays use `ctx.ui.input`

URL elicitation asks for confirmation and then opens the URL in the browser. In print/JSON modes, elicitation declines by default so non-interactive runs do not hang.

For deterministic non-interactive runs, set `PI_MCP_ELICITATION_RESPONSE` to either an elicitation result object:

```bash
PI_MCP_ELICITATION_RESPONSE='{"action":"accept","content":{"name":"test","count":1,"confirm":true,"color":"green"}}'
```

or directly to a content object, which is treated as an accepted response.

## Local fixture

This repo includes a local MCP fixture server for development:

```bash
npm run mcp-fixture
```

It can also run as a local Streamable HTTP server with OAuth:

```bash
node test/local-mcp-server.mjs --http --oauth
```

The smoke suite starts both stdio and local Streamable HTTP fixture transports and exercises tools, structured content, resources, prompts, roots, list-change notifications, and elicitation:

```bash
npm run smoke
```

OAuth and token refresh are covered separately:

```bash
npm run smoke:oauth
```
