-- Python Linter, Formatter & Language Server (ruff)
-- Install: uv tool install ruff

---@type vim.lsp.Config
return {
  cmd = { "ruff", "server" },
  filetypes = { "python" },
  root_markers = {
    ".venv",
    "pyproject.toml",
    "ruff.toml",
    ".ruff.toml",
    "requirements.txt",
    ".git",
  },
  single_file_support = false,
  init_options = {
    settings = {
      -- Ruff language server settings
      -- logLevel = "info", -- "debug" | "info" | "warn" | "error" | "off"
      -- configuration = "~/.config/ruff/ruff.toml", -- path to custom configuration
      -- configurationPreference = "filesystemFirst", -- "editorFirst" | "filesystemFirst"
      -- lineLength = 88,
      -- preview = false, -- enable preview rules/features
      -- organizeImports = true,
      -- fixAll = true,
      -- showSyntaxErrors = true,
      -- codeAction = {
      --   disableRuleComment = { enable = true },
      --   fixViolation = { enable = true },
      -- },
      -- lint = {
      --   enable = true,
      --   preview = false,
      --   select = { "E", "F", "I" },
      --   extendSelect = { "B", "SIM" },
      --   ignore = {},
      -- },
      -- format = {
      --   preview = false,
      -- },
    },
  },
}
