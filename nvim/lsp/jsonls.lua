-- JSON Language Server (jsonls)
-- Install: npm install -g vscode-langservers-extracted

---@type vim.lsp.Config
return {
  cmd = { "vscode-json-language-server", "--stdio" },
  filetypes = { "json", "jsonc" },
  root_markers = { "package.json", ".git" },
  single_file_support = false,
  init_options = {
    provideFormatter = false,
  },
  settings = {
    json = {
      validate = { enable = true },
      format = { enable = false }, -- formatting handled by conform (prettier)
      -- schemas = {
      --   {
      --     fileMatch = { "package.json" },
      --     url = "https://json.schemastore.org/package.json",
      --   },
      --   {
      --     fileMatch = { "tsconfig*.json" },
      --     url = "https://json.schemastore.org/tsconfig.json",
      --   },
      -- },
    },
  },
}
