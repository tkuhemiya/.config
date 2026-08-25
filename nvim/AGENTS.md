# NEOVIM CONFIG

**Generated:** 2026-08-25T09:00:47Z  
**Commit:** 395ef08

Lua-based Neovim 0.12 configuration. Plugins are managed with `vim.pack`. LSP uses the native Neovim API. External tools are installed outside Neovim.

## STRUCTURE

```
nvim/
├── init.lua                 # Entry: options, vim.pack plugins, colorscheme
├── lua/
│   ├── options.lua          # vim.opt settings and filetype autocmds
│   ├── keymaps.lua          # Global and LSP buffer keybindings
│   ├── prelude.lua          # Small shared utility module
│   └── plugins/             # Plugin setup modules, loaded by plugins/init.lua
│       ├── init.lua         # Orchestrates plugin setup
│       ├── lsp.lua          # Native LSP servers and LspAttach behavior
│       ├── conform.lua      # Formatter mappings
│       ├── treesitter.lua   # Parser startup; never installs on FileType
│       └── ...              # Individual plugin setup files
├── after/                   # Filetype overrides
│   └── ftdetect/
├── nvim-pack-lock.json      # vim.pack revisions
├── AGENTS.md                # Configuration rules and external tool setup
└── AGENTS.md                # This file
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add or remove a plugin | `init.lua` — edit the `vim.pack.add` list |
| Configure a plugin | `lua/plugins/<name>.lua` |
| Load a plugin setup module | `lua/plugins/init.lua` |
| Add a keymap | `lua/keymaps.lua` |
| Change an option | `lua/options.lua` |
| Add an LSP server | `lua/plugins/lsp.lua` — add to the `servers` table |
| Change formatters | `lua/plugins/conform.lua` |
| Change completion | `lua/plugins/mini-completion.lua` |
| Change code-action UI | `lua/plugins/actions-preview.lua` and `<leader>ca` in `lua/keymaps.lua` |
| Change Treesitter startup | `lua/plugins/treesitter.lua` |
| Change a filetype | `after/ftdetect/` |
| Add or change an external tool | `AGENTS.md` and the owning config file |

## CONVENTIONS

- Target Neovim 0.12.
- Use `vim.pack.add`; do not introduce lazy.nvim for this configuration.
- Use `vim.lsp.config()` and `vim.lsp.enable()` for LSP setup.
- Apply LSP buffer mappings from the `LspAttach` autocmd.
- Use `actions-preview.nvim` as the only code-action interface on `<leader>ca`.
- Use `conform.nvim` for formatting on `<leader>lf`.
- Keep one primary language server per language. Add auxiliary diagnostic servers only when intentional.
- Keep LSP servers project-oriented; do not enable single-file servers by default.
- Install external tools with `uv`, `npm`, `go`, `cargo`, or `dotnet`, not Mason.
- Keep external tool ownership documented in this file.
- Install Treesitter parsers ahead of time. Never download or compile one from a `FileType` callback.
- Use small setup modules under `lua/plugins/`; `plugins/init.lua` controls load order.
- Preserve existing root markers when adding a server. Avoid broad fallback roots such as `.git` unless the server needs them.
- Use `/grill-me` when a decision is uncertain or needs stress testing.

## ANTI-PATTERNS

- Do not add Mason, `mason-lspconfig`, or `mason-tool-installer`.
- Do not add `nvim-lspconfig` as an LSP framework.
- Do not add Pyright or BasedPyright; Python uses Ty and Ruff.
- Do not create duplicate primary LSP clients for the same language and project root.
- Do not map code actions directly to `vim.lsp.buf.code_action`.
- Do not map formatting directly to `vim.lsp.buf.format`; use Conform.
- Do not auto-install Treesitter parsers while opening files.
- Do not add a formatter without documenting its executable in this file.
- Do not assume a Windows executable is valid inside WSL.
- Do not add broad project watchers or synchronous startup work without testing WSL behavior.

## KEY BINDINGS

| Key | Mode | Action |
|-----|------|--------|
| `<leader>w` | n | Write buffer |
| `<leader>q` | n | Close window |
| `<leader>Q` | n | Write all and quit |
| `<leader>e` | n | Open `mini.files` |
| `<Tab>` / `<S-Tab>` | n | Next / previous buffer |
| `<leader><Tab>` | n | Delete current buffer |
| `U` | n | Redo |
| `H` / `L` | n,x | Line start / end |
| `n` / `N` | n | Next / previous search result, centered |
| `<leader>f` | n | Find files |
| `<leader>b` | n | Find buffers |
| `<leader>sg` | n | Live grep |
| `<leader>si` | n | Grep word under cursor |
| `<leader>sr` | n | LSP references |
| `<leader>sd` | n | Diagnostics |
| `<leader>sk` | n | Show keymaps |
| `<leader>ca` | n,x | Code-action preview |
| `<leader>lf` | n,v,x | Format buffer with Conform |
| `<leader>gd` | n | Open Diffview |
| `<leader>gD` | n | Diffview code review |
| `<leader>gc` | n | Close Diffview |
| `<leader>gh` / `<leader>gH` | n | Current-file / repository history |
| `<leader>m` | n | Marks preview |
| `<leader>dm` | n,x | Delete mark / marks |
| `<leader>rn` | n,LSP | Rename symbol |
| `gd` / `gr` / `gI` | n,LSP | Definition / references / implementation |
| `K` | n,LSP | Hover documentation |
| `<C-h/j/k/l>` | n | Window or tmux navigation |
| `<leader>-` | n | Change directory to current file |
| `<C-f>` | n | Open current directory externally |

## LSP SERVERS

| Server | Filetypes | Role |
|--------|-----------|------|
| `ty` | Python | Language features and type checking |
| `ruff` | Python | Diagnostics and Ruff actions |
| `ts_ls` | JavaScript, TypeScript, React | TypeScript language features |
| `eslint` | JavaScript, TypeScript, React | ESLint diagnostics |
| `gopls` | Go | Language features and diagnostics |
| `jsonls` | JSON, JSONC | Language features and validation |
| `yamlls` | YAML | Language features and validation |
| `taplo` | TOML | Language features and validation |
| `lua_ls` | Lua | Language features and diagnostics |
| `roslyn` | C# | C# language features and diagnostics |

## EXTERNAL TOOLS

Neovim does not install these tools. Install them with the ecosystem package manager and keep them on Neovim's `PATH`.

| Language | LSP | Formatter | Diagnostics |
|----------|-----|-----------|------------|
| Python | `ty` | `ruff` | `ruff` |
| JavaScript / TypeScript / React | `ts_ls` | `prettier` | `eslint` |
| Go | `gopls` | `gofmt` | `gopls` |
| C# | Roslyn | `csharpier` or Roslyn | Roslyn |
| JSON | `jsonls` | `prettier` | LSP validation |
| YAML | `yamlls` | `prettier` | LSP validation |
| TOML | `taplo` | `taplo` | LSP validation |
| Lua | `lua_ls` | `stylua` | `lua_ls` |

## FORMATTER CHAIN

Formatting is manual with `<leader>lf`. Conform uses:

- Python: `ruff_organize_imports` → `ruff_format`
- JavaScript, JSX, TypeScript, TSX: `prettier`
- Go: `gofmt`
- C#: `csharpier`, with LSP fallback
- JSON, JSONC, YAML: `prettier`
- TOML: `taplo`
- Lua: `stylua`

Do not add format-on-save or a formatter chain without checking WSL performance and project configuration.

