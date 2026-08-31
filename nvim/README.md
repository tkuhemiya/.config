# Neovim configuration

Leader key: `<Space>`  
Local leader: `<Space>`

This configuration targets Neovim 0.12. Plugins are managed with `vim.pack`, LSP is configured natively with one file per server under `lsp/<server>.lua`, and keymaps are structured under `lua/`.

## Setup & Installation

### 1. Requirements
- **Neovim 0.12+**
- macOS (Homebrew) or Ubuntu / Debian (`apt`)
- Language toolchains: `uv` (Python), `npm` (Node/TS), `go` (Go), `dotnet` (C#), `cargo` (Rust/Lua/TOML)

### 2. Install Tools & Parsers
Run the setup script to install all language servers, formatters, CLI dependencies, and sync Treesitter parsers:

```bash
./install.sh
```

### 3. Verify Health
Launch Neovim and run:
```vim
:checkhealth vim.lsp
```

### 4. Language Server Architecture
Each server is configured in `lsp/<name>.lua` and enabled in `init.lua` via `vim.lsp.enable({ ... })`:

| Language / Domain | Language Server (LSP) | Formatter / Linter | Install Command |
| :--- | :--- | :--- | :--- |
| **Python** | `ty server` (`lsp/ty.lua`) | `ruff` (`lsp/ruff.lua`) | `uv tool install ty ruff` |
| **TypeScript / JS** | `typescript-language-server` (`lsp/ts_ls.lua`) | `prettier`, `eslint` (`lsp/eslint.lua`) | `npm install -g typescript typescript-language-server vscode-langservers-extracted prettier` |
| **Go** | `gopls` (`lsp/gopls.lua`) | `gofmt` (via conform) | `go install golang.org/x/tools/gopls@latest` |
| **C# / .NET** | `csharp-ls` (`lsp/csharp_ls.lua`) | `csharpier` (via conform) | `dotnet tool install -g csharp-ls csharpier` |
| **Lua** | `lua-language-server` (`lsp/lua_ls.lua`) | `stylua` (via conform) | `brew install lua-language-server stylua` / `cargo install stylua` |
| **JSON** | `vscode-json-language-server` (`lsp/jsonls.lua`) | `prettier` (via conform) | `npm install -g vscode-langservers-extracted` |
| **YAML** | `yaml-language-server` (`lsp/yamlls.lua`) | `prettier` (via conform) | `npm install -g yaml-language-server` |
| **TOML** | `taplo` (`lsp/taplo.lua`) | `taplo` (via conform) | `cargo install taplo-cli --locked --features lsp` |


## Global mappings

### Files, buffers, windows, and tabs

| Mode | Key | Action |
| --- | --- | --- |
| Normal | `<leader>w` | Write the current buffer |
| Normal | `<leader>q` | Close the current window |
| Normal | `<leader>Q` | Write all buffers and quit |
| Normal | `<leader>e` | Open `mini.files` |
| Normal | `<C-q>` | Open the quickfix list |
| Normal, Terminal | `<leader>x` | Close the current tab |
| Normal, Terminal | `<leader>t` | Open a terminal split |
| Terminal | `<Esc>` | Leave terminal mode |
| Normal | `<Tab>` | Next buffer |
| Normal | `<S-Tab>` | Previous buffer |
| Normal | `<leader><Tab>` | Delete the current buffer |
| Normal, Terminal | `<leader>1` … `<leader>8` | Go to tab 1 … 8 |
| Normal | `<leader>-` | Change the local directory to the current file |
| Normal | `<C-f>` | Open the current directory in Finder |
| Normal | `<C-h>` | Move to the left window or tmux pane |
| Normal | `<C-j>` | Move to the lower window or tmux pane |
| Normal | `<C-k>` | Move to the upper window or tmux pane |
| Normal | `<C-l>` | Move to the right window or tmux pane |
| Normal | `<M-n>` | Increase window height |
| Normal | `<M-e>` | Decrease window height |
| Normal | `<M-i>` | Increase window width |
| Normal | `<M-m>` | Decrease window width |

### Clipboard and editing

| Mode | Key | Action |
| --- | --- | --- |
| Normal | `<leader>p` | Paste from the system clipboard |
| Normal, Visual | `<leader>y` | Yank to the system clipboard |
| Normal | `U` | Redo |
| Normal | `Q` | Replay the last macro |
| Normal, Visual | `H` | Move to the first non-blank character |
| Visual | `L` | Move to the end of the line |
| Normal | `L` | Open diagnostic float (warnings/errors under cursor) |
| Normal | `S` | Substitute the word under the cursor |
| Normal, Visual | `<C-s>` | Start a literal substitution |
| Normal, Visual, Select | `<leader>r` | Reload the buffer from disk |
| Normal, Visual, Select | `<leader>n` | Start a `:normal` command |
| Normal, Visual, Select | `<leader>lf` | Format the buffer with Conform |
| Visual | `<` | Indent left and keep the selection |
| Visual | `>` | Indent right and keep the selection |

### Search and navigation

| Mode | Key | Action |
| --- | --- | --- |
| Normal | `n` | Next search result and center the screen |
| Normal | `N` | Previous search result and center the screen |
| Normal | `<leader>f` | Find files |
| Normal | `<leader>b` | Find buffers |
| Normal | `<leader>sg` | Live grep |
| Normal | `<leader>si` | Search for the word under the cursor |
| Normal | `<leader>sr` | Find LSP references |
| Normal | `<leader>ss` | Find document symbols |
| Normal | `<leader>sd` | Find diagnostics |
| Normal | `<leader>sk` | Show keymaps |

### Diagnostics and quickfix

| Mode | Key | Action |
| --- | --- | --- |
| Normal | `]d` | Go to the next diagnostic |
| Normal | `[d` | Go to the previous diagnostic |
| Normal | `]e` | Go to the next error |
| Normal | `[e` | Go to the previous error |
| Normal | `<leader>d` | Open a diagnostic float |
| Normal | `<leader>ld` | Send diagnostics to quickfix |
| Normal | `<leader>cn` | Go to the next quickfix item |
| Normal | `<leader>cp` | Go to the previous quickfix item |
| Normal | `<leader>co` | Open quickfix |
| Normal | `<leader>cc` | Close quickfix |

### Git and marks

| Mode | Key | Action |
| --- | --- | --- |
| Normal | `<leader>gd` | Open Diffview |
| Normal | `<leader>gD` | Review the current branch against a selected branch |
| Normal | `<leader>gc` | Close Diffview |
| Normal | `<leader>gh` | Show current-file history |
| Normal | `<leader>gH` | Show repository history |
| Normal | `<leader>m` | Preview marks |
| Normal | `<leader>dm` | Delete the mark under the cursor |
| Visual | `<leader>dm` | Delete all marks in the buffer |

## Treesitter mappings

These mappings require a parser for the current filetype.

### Incremental selection

| Mode | Key | Action |
| --- | --- | --- |
| Normal | `<C-Space>` | Start incremental selection |
| Visual | `<C-Space>` | Expand the Treesitter selection |
| Visual | `<C-h>` | Shrink the Treesitter selection |

### Text objects

These work in Visual and Operator-pending mode.

| Key | Action |
| --- | --- |
| `aa` | Select outer parameter |
| `ia` | Select inner parameter |
| `af` | Select outer function |
| `if` | Select inner function |
| `ac` | Select outer class |
| `ic` | Select inner class |

### Text object motions

These work in Normal, Visual, and Operator-pending mode.

| Key | Action |
| --- | --- |
| `]m` | Next function start |
| `[m` | Previous function start |
| `]M` | Next function end |
| `[M` | Previous function end |
| `]]` | Next class start |
| `[[` | Previous class start |
| `][` | Next class end |
| `[]` | Previous class end |

## LSP mappings

These mappings are available only in buffers with an attached LSP client.

| Mode | Key | Action |
| --- | --- | --- |
| Normal | `gd` | Go to definition |
| Normal | `gr` | Go to references |
| Normal | `gI` | Go to implementation |
| Normal | `K` | Show hover documentation |
| Normal | `<leader>rn` | Rename the symbol |
| Normal | `<leader>lf` | Format the buffer |

## Completion and snippets

| Mode | Key | Action |
| --- | --- | --- |
| Insert | `<Tab>` | Select the next completion or expand a snippet |
| Insert | `<S-Tab>` | Select the previous completion or move back in a snippet |
| Insert | `<CR>` | Accept the completion or insert a newline |
| Insert | `<C-Space>` | Force the completion menu's second step |
| Insert, Select | `<C-e>` | Expand or jump forward in a snippet |
| Insert, Select | `<C-J>` | Jump forward in a snippet |
| Insert, Select | `<C-K>` | Jump backward in a snippet |

## Folding

| Mode | Key | Action |
| --- | --- | --- |
| Normal | `zm` | Toggle the fold under the cursor |
| Normal | `zM` | Close all folds, or open all folds if already closed |

## Plugin-specific mappings

### `mini.files`

| Mode | Key | Action |
| --- | --- | --- |
| Normal | `<CR>` | Enter a directory or open a file |

### `actions-preview.nvim`

| Mode | Key | Action |
| --- | --- | --- |
| Normal, Visual | `<leader>ca` | Preview and select a code action |

### Diffview

| Mode | Key | Action |
| --- | --- | --- |
| Normal | `<Tab>` | Select the next diff entry |
| Normal | `<S-Tab>` | Select the previous diff entry |
| Normal | `<CR>` | Open the selected diff entry |
| Normal | `q` | Close Diffview |
| Normal | `<leader>gf` | Toggle the file panel |
| Normal | `<leader>e` | Focus the file panel |
| Normal | `s` | Stage or unstage the selected file |
| Normal | `S` | Stage all files |
| Normal | `U` | Unstage all files |
| Normal | `X` | Restore the selected file |
| Normal | `R` | Refresh the file list |
| Normal | `y` | Copy a commit hash in file history |

## Commands

| Command | Action |
| --- | --- |
| `:PackClean` | Ask before removing inactive `vim.pack` plugins |
| `:TSInstall <language>` | Install a Treesitter parser manually |
| `:ConformInfo` | Show formatter information |
