-- YAML Language Server (yamlls)
-- Install: npm install -g yaml-language-server

---@type vim.lsp.Config
return {
  cmd = { "yaml-language-server", "--stdio" },
  filetypes = { "yaml", "yaml.docker-compose", "yaml.gitlab" },
  root_markers = { ".git" },
  single_file_support = false,
  settings = {
    yaml = {
      schemaStore = {
        enable = true,
        url = "",
      },
      validate = true,
      format = {
        enable = false, -- formatting handled by conform (prettier)
      },
      -- schemas = {
      --   kubernetes = "*.k8s.yaml",
      --   ["http://json.schemastore.org/github-workflow"] = ".github/workflows/*",
      --   ["http://json.schemastore.org/github-action"] = ".github/action.{yml,yaml}",
      -- },
      -- customTags = {
      --   "!fn",
      --   "!And",
      --   "!If",
      --   "!Not",
      --   "!Equals",
      -- },
    },
  },
}
