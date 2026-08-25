-- External tools are installed outside Neovim.
-- See AGENTS.md for the required commands.

local capabilities = vim.lsp.protocol.make_client_capabilities()
capabilities = require("mini.completion").get_lsp_capabilities(capabilities)

vim.lsp.config("*", {
  capabilities = capabilities,
  -- This is a project-oriented setup. Do not start servers for unnamed files.
  single_file_support = false,
})

local servers = {
  ty = {
    cmd = { "ty", "server" },
    filetypes = { "python" },
    root_markers = { "ty.toml", "pyproject.toml", "uv.lock", ".git" },
  },

  ruff = {
    cmd = { "ruff", "server" },
    filetypes = { "python" },
    root_markers = { "pyproject.toml", "ruff.toml", ".ruff.toml", ".git" },
  },

  ts_ls = {
    cmd = { "typescript-language-server", "--stdio" },
    filetypes = { "javascript", "javascriptreact", "typescript", "typescriptreact" },
    root_markers = { "tsconfig.json", "jsconfig.json", "package.json", ".git" },
  },

  eslint = {
    cmd = { "vscode-eslint-language-server", "--stdio" },
    filetypes = { "javascript", "javascriptreact", "typescript", "typescriptreact" },
    root_markers = { "eslint.config.js", "eslint.config.mjs", "package.json", ".git" },
  },

  gopls = {
    cmd = { "gopls" },
    filetypes = { "go", "gomod", "gowork" },
    root_markers = { "go.work", "go.mod", ".git" },
  },

  jsonls = {
    cmd = { "vscode-json-language-server", "--stdio" },
    filetypes = { "json", "jsonc" },
    root_markers = { "package.json", ".git" },
  },

  yamlls = {
    cmd = { "yaml-language-server", "--stdio" },
    filetypes = { "yaml" },
    root_markers = { ".git" },
  },

  taplo = {
    cmd = { "taplo", "lsp", "stdio" },
    filetypes = { "toml" },
    root_markers = { "pyproject.toml", "Cargo.toml", ".git" },
  },

  lua_ls = {
    cmd = { "lua-language-server" },
    filetypes = { "lua" },
    root_markers = { ".luarc.json", ".luacheckrc", ".git" },
    settings = {
      Lua = {
        runtime = { version = "LuaJIT" },
        diagnostics = { globals = { "vim" } },
        workspace = {
          library = {
            vim.env.VIMRUNTIME,
            "${3rd}/luv/library",
          },
          checkThirdParty = false,
        },
        telemetry = { enable = false },
      },
    },
  },
}

for name, config in pairs(servers) do
  vim.lsp.config(name, vim.tbl_deep_extend("force", { capabilities = capabilities }, config))
  vim.lsp.enable(name)
end

-- Roslyn handles solution discovery and multiple .NET solutions.
require("roslyn").setup({
  filewatching = "auto",
})
vim.lsp.config("roslyn", {
  capabilities = capabilities,
})

vim.api.nvim_create_autocmd("LspAttach", {
  callback = function(args)
    local client = vim.lsp.get_client_by_id(args.data.client_id)
    require("keymaps").on_attach(client, args.buf)

    -- mini.completion owns the completion UI.
    if vim.lsp.completion then
      vim.lsp.completion.enable(false, client.id, args.buf)
    end
  end,
})
