-- TypeScript & JavaScript Language Server (ts_ls / typescript-language-server)
-- Install: npm install -g typescript typescript-language-server

---@type vim.lsp.Config
return {
  cmd = { "typescript-language-server", "--stdio" },
  filetypes = {
    "javascript",
    "javascriptreact",
    "javascript.jsx",
    "typescript",
    "typescriptreact",
    "typescript.tsx",
  },
  root_markers = {
    "tsconfig.json",
    "jsconfig.json",
    "package.json",
    ".git",
  },
  single_file_support = false,
  init_options = {
    hostInfo = "neovim",
    maxTsServerMemory = 4096,
    preferences = {
      -- Inlay Hints
      includeInlayParameterNameHints = "all", -- "none" | "literals" | "all"
      includeInlayParameterNameHintsWhenArgumentMatchesName = false,
      includeInlayFunctionParameterTypeHints = true,
      includeInlayVariableTypeHints = true,
      includeInlayVariableTypeHintsWhenTypeMatchesName = false,
      includeInlayPropertyDeclarationTypeHints = true,
      includeInlayFunctionLikeReturnTypeHints = true,
      includeInlayEnumMemberValueHints = true,

      -- Completions & Imports
      includeCompletionsForModuleExports = true,
      includeCompletionsForImportStatements = true,
      importModuleSpecifierPreference = "shortest", -- "shortest" | "project-relative" | "relative" | "non-relative"
      importModuleSpecifierEnding = "auto", -- "auto" | "minimal" | "index" | "js"
      quotePreference = "auto", -- "auto" | "double" | "single"
      jsxAttributeCompletionStyle = "auto", -- "auto" | "braces" | "none"
      allowTextChangesInNewFiles = true,
      providePrefixAndSuffixTextForRename = true,
    },
  },
  settings = {
    typescript = {
      inlayHints = {
        includeInlayParameterNameHints = "all",
        includeInlayParameterNameHintsWhenArgumentMatchesName = false,
        includeInlayFunctionParameterTypeHints = true,
        includeInlayVariableTypeHints = true,
        includeInlayPropertyDeclarationTypeHints = true,
        includeInlayFunctionLikeReturnTypeHints = true,
        includeInlayEnumMemberValueHints = true,
      },
      suggest = {
        completeFunctionCalls = true,
      },
      -- updateImportsOnFileMove = { enabled = "always" }, -- "prompt" | "always" | "never"
    },
    javascript = {
      inlayHints = {
        includeInlayParameterNameHints = "all",
        includeInlayParameterNameHintsWhenArgumentMatchesName = false,
        includeInlayFunctionParameterTypeHints = true,
        includeInlayVariableTypeHints = true,
        includeInlayPropertyDeclarationTypeHints = true,
        includeInlayFunctionLikeReturnTypeHints = true,
        includeInlayEnumMemberValueHints = true,
      },
      suggest = {
        completeFunctionCalls = true,
      },
      -- updateImportsOnFileMove = { enabled = "always" },
    },
    -- tsserver = {
    --   logVerbosity = "off", -- "off" | "normal" | "verbose"
    --   trace = "off",
    -- },
  },
}
