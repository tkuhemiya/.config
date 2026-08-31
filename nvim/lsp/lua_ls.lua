-- Lua Language Server (lua_ls)
-- Install: brew install lua-language-server (macOS) or package manager

---@type vim.lsp.Config
return {
  cmd = { "lua-language-server" },
  filetypes = { "lua" },
  root_markers = {
    ".luarc.json",
    ".luarc.jsonc",
    ".luacheckrc",
    ".stylua.toml",
    "stylua.toml",
    ".git",
  },
  single_file_support = false,
  settings = {
    Lua = {
      runtime = {
        version = "LuaJIT",
      },
      diagnostics = {
        globals = { "vim" },
        -- disable = { "missing-fields" },
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
      hint = {
        enable = true,
        arrayIndex = "Disable",
        setType = true,
        paramName = "Literal",
        paramType = true,
      },
      format = {
        enable = false, -- Formatting is handled by conform (stylua)
      },
      completion = {
        callSnippet = "Replace",
      },
    },
  },
}
