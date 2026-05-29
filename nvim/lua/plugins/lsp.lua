local servers = { 'ts_ls', 'rust_analyzer', 'clangd', 'gopls', 'pyright' }
local mason_tools = { 'typescript-language-server', 'rust-analyzer', 'clangd', 'gopls', 'pyright' }

require('mason').setup()
require('mason-lspconfig').setup({
	ensure_installed = servers,
    automatic_enable = true,
})
require('mason-tool-installer').setup({
    ensure_installed = mason_tools
})

local capabilities = vim.lsp.protocol.make_client_capabilities()
capabilities = require("mini.completion").get_lsp_capabilities(capabilities)

-- Global LSP config
vim.lsp.config("*", {
  capabilities = capabilities,
})

-- LSP attach: keymaps + disable native completion
vim.api.nvim_create_autocmd("LspAttach", {
  callback = function(args)
    local client = vim.lsp.get_client_by_id(args.data.client_id)
    require("keymaps").on_attach(client, args.buf)
    if vim.lsp.completion then
      vim.lsp.completion.enable(false, client.id, args.buf)
    end
  end,
})

-- gleam (not managed by Mason; requires `gleam` binary on PATH)
vim.lsp.config("gleam", {
  capabilities = capabilities,
})
vim.lsp.enable("gleam")

-- lua_ls specific config
vim.lsp.config("lua_ls", {
  capabilities = capabilities,
  settings = {
    Lua = {
      runtime = {
        version = "LuaJIT",
      },
      diagnostics = {
        globals = { "vim" },
      },
      workspace = {
        library = {
          vim.env.VIMRUNTIME,
          "${3rd}/luv/library",
        },
        checkThirdParty = false,
      },
      telemetry = {
        enable = false,
      },
    },
  },
})

-- pyright specific config
vim.lsp.config("pyright", {
  capabilities = capabilities,
  settings = {
    python = {
      analysis = {
        typeCheckingMode = "basic",
        autoSearchPaths = true,
        useLibraryCodeForTypes = true,
      },
    },
  },
})
