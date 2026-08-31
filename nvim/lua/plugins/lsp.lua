-- LSP Setup & Global Configuration (Neovim 0.12 Native LSP)
-- Individual server configs live in `lsp/<server>.lua`.
-- Servers are enabled in `init.lua` via `vim.lsp.enable({ ... })`.

local capabilities = vim.lsp.protocol.make_client_capabilities()
capabilities = require("mini.completion").get_lsp_capabilities(capabilities)

-- Global defaults for all language servers
vim.lsp.config("*", {
  capabilities = capabilities,
  -- Project-oriented setup: do not start servers for unnamed single files
  single_file_support = false,
})

-- Buffer attachment autocmd
vim.api.nvim_create_autocmd("LspAttach", {
  group = vim.api.nvim_create_augroup("lsp_attach", { clear = true }),
  callback = function(args)
    local client = vim.lsp.get_client_by_id(args.data.client_id)
    require("keymaps").on_attach(client, args.buf)

    -- mini.completion owns the completion UI
    if vim.lsp.completion then
      vim.lsp.completion.enable(false, client.id, args.buf)
    end
  end,
})
