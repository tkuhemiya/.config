local prettier_configs = {
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.js",
  ".prettierrc.cjs",
  ".prettierrc.mjs",
  ".prettierrc.yaml",
  ".prettierrc.yml",
  ".prettierrc.toml",
  "prettier.config.js",
  "prettier.config.cjs",
  "prettier.config.mjs",
  "prettier.config.ts",
}

require("conform").setup({
  formatters_by_ft = {
    lua = { "stylua" },
    python = { "ruff_organize_imports", "ruff_format" },
    javascript = { "prettier" },
    javascriptreact = { "prettier" },
    typescript = { "prettier" },
    typescriptreact = { "prettier" },
    go = { "gofmt" },
    cs = { "csharpier" },
    json = { "prettier" },
    jsonc = { "prettier" },
    yaml = { "prettier" },
    toml = { "taplo" },
  },

  formatters = {
    prettier = {
      condition = function(_, ctx)
        return vim.fs.find(prettier_configs, {
          path = ctx.filename,
          upward = true,
          stop = vim.uv.os_homedir(),
        })[1] ~= nil
      end,
    },
  },

  -- Formatting remains manual through <leader>lf.
  default_format_opts = {
    lsp_format = "fallback",
  },
})
