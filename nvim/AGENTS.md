# NEOVIM CONFIG

Lua-based Neovim 0.12 configuration. Plugins are managed with `vim.pack`. LSP uses the native Neovim API.

## CONVENTIONS

- Target Neovim 0.12.
- Use `vim.pack.add`; do not use or suggest lazy.nvim for this configuration.
- Use native Neovim 0.12 LSP with one file per server located in `lsp/<server>.lua`.
- Enable servers in `init.lua` via `vim.lsp.enable({ ... })`.
- Apply LSP buffer mappings from the `LspAttach` autocmd.
- Use `actions-preview.nvim` as the only code-action interface on `<leader>ca`.
- Use `conform.nvim` for formatting on `<leader>lf`.
- Keep one primary language server per language. Add auxiliary diagnostic servers only when intentional.
- Keep LSP servers project-oriented; do not enable single-file servers by default.
- Install external tools with `./install.sh` (or manually with `uv`, `npm`, `go`, `cargo`, `dotnet`, `brew`), not Mason.
- Keep external tool ownership documented in this file.
- Install Treesitter parsers ahead of time via `install.sh` or `:TSInstall`. Never download or compile one from a `FileType` callback.
- Use small setup modules under `lua/plugins/`; `plugins/init.lua` controls load order.
- Preserve existing root markers when adding a server. Avoid broad fallback roots such as `.git` unless the server needs them.
- Use `/grill-me` when a decision is uncertain or needs stress testing.

## EXTERNAL TOOL OWNERSHIP

| Language / Domain | Language Server (LSP) | Formatter / Linter | Package Manager |
| :--- | :--- | :--- | :--- |
| **Python** | `ty server` (`lsp/ty.lua`) | `ruff` / `ruff-lsp` (`lsp/ruff.lua`) | `uv tool install ty ruff` |
| **TypeScript / JS** | `typescript-language-server` (`lsp/ts_ls.lua`) | `prettier` (via conform), `eslint` (`lsp/eslint.lua`) | `npm install -g typescript typescript-language-server vscode-langservers-extracted prettier` |
| **Go** | `gopls` (`lsp/gopls.lua`) | `gofmt` (via conform) | `go install golang.org/x/tools/gopls@latest` |
| **C# / .NET** | `csharp-ls` (`lsp/csharp_ls.lua`) | `csharpier` (via conform) | `dotnet tool install -g csharp-ls csharpier` |
| **Lua** | `lua-language-server` (`lsp/lua_ls.lua`) | `stylua` (via conform) | `brew install lua-language-server stylua` / `cargo install stylua` |
| **JSON** | `vscode-json-language-server` (`lsp/jsonls.lua`) | `prettier` (via conform) | `npm install -g vscode-langservers-extracted` |
| **YAML** | `yaml-language-server` (`lsp/yamlls.lua`) | `prettier` (via conform) | `npm install -g yaml-language-server` |
| **TOML** | `taplo` (`lsp/taplo.lua`) | `taplo` (via conform) | `cargo install taplo-cli --locked --features lsp` |

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
