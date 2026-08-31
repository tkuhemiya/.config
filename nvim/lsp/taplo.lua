-- TOML Language Server (taplo)
-- Install: cargo install taplo-cli --locked --features lsp (or package manager)

---@type vim.lsp.Config
return {
  cmd = { "taplo", "lsp", "stdio" },
  filetypes = { "toml" },
  root_markers = {
    "pyproject.toml",
    "Cargo.toml",
    "taplo.toml",
    ".taplo.toml",
    ".git",
  },
  single_file_support = false,
  settings = {
    evenBetterToml = {
      schema = {
        enabled = true,
        repository = "https://taplo.b-pe.org/schema_index.json",
        -- associations = {
        --   ["^(.*[/\\])?Cargo\\.toml$"] = "taplo://schemas/cargo.json",
        -- },
      },
      formatter = {
        alignEntries = false,
        alignComments = true,
        arrayTrailingComma = true,
        arrayAutoExpand = true,
        inlineTableExpand = true,
        compactArrays = true,
        compactInlineTables = false,
        indentTables = false,
        indentEntries = false,
        reorderKeys = false,
      },
    },
  },
}
