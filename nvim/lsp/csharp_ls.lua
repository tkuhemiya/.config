-- C# Language Server (csharp-ls)
-- Install: dotnet tool install -g csharp-ls

---@type vim.lsp.Config
return {
  cmd = { "csharp-ls" },
  filetypes = { "cs" },
  root_markers = {
    "*.sln",
    "*.csproj",
    "global.json",
    ".git",
  },
  single_file_support = false,
  init_options = {
    -- Automatic solution loading / decompilation
    -- AutomaticWorkspaceInit = true,
  },
  settings = {
    csharp = {
      -- Inlay Hints (if supported by server version)
      -- inlayHints = {
      --   enableForParameters = true,
      --   enableForLiteralParameters = true,
      --   enableForIndexerParameters = true,
      --   enableForObjectCreationParameters = true,
      --   enableForOtherParameters = true,
      --   suppressForParametersThatDifferOnlyBySuffix = false,
      --   suppressForParametersThatMatchMethodIntent = false,
      --   suppressForParametersThatMatchArgumentName = false,
      --   enableForTypes = true,
      --   forImplicitVariableTypes = true,
      --   forLambdaParameterTypes = true,
      --   forImplicitObjectCreation = true,
      -- },
      -- CodeLens
      -- references = {
      --   codeLens = { enable = true },
      -- },
    },
  },
}
