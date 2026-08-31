-- Go Language Server (gopls)
-- Install: go install golang.org/x/tools/gopls@latest

---@type vim.lsp.Config
return {
  cmd = { "gopls" },
  filetypes = { "go", "gomod", "gowork", "gotmpl" },
  root_markers = { "go.work", "go.mod", ".git" },
  single_file_support = false,
  settings = {
    gopls = {
      -- Analyses
      analyses = {
        unusedparams = true,
        shadow = true,
        nilness = true,
        unusedwrite = true,
        useany = true,
        unreachable = true,
        -- fieldalignment = false, -- warns about struct memory layout
      },
      -- Formatting & Imports
      gofumpt = true,
      staticcheck = true,
      usePlaceholders = true,
      completeUnimported = true,

      -- Code Lens
      codelenses = {
        gc_details = false,
        generate = true,
        regenerate_cgo = true,
        run_govulncheck = true,
        test = true,
        tidy = true,
        upgrade_dependency = true,
        vendor = true,
      },

      -- Inlay Hints
      hints = {
        assignVariableTypes = true,
        compositeLiteralFields = true,
        compositeLiteralTypes = true,
        constantValues = true,
        functionTypeParameters = true,
        parameterNames = true,
        rangeVariableTypes = true,
      },

      -- Semantic tokens & diagnostics
      semanticTokens = true,
      diagnosticsDelay = "300ms",
      -- directoryFilters = { "-.git", "-.vscode", "-.idea", "-node_modules" },
    },
  },
}
