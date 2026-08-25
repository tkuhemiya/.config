-- Neovim 0.12 provides the Treesitter runtime. nvim-treesitter manages
-- parsers and queries; install the parsers listed in AGENTS.md manually.
--
-- Example:
--   :TSInstall python javascript typescript tsx go c_sharp json yaml toml lua

local parser_filetypes = {
  "python",
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact",
  "go",
  "cs",
  "json",
  "jsonc",
  "yaml",
  "toml",
  "lua",
  "markdown",
}

require("nvim-treesitter-textobjects").setup({
  select = { lookahead = true },
  move = { set_jumps = true },
})

vim.api.nvim_create_autocmd("FileType", {
  group = vim.api.nvim_create_augroup("treesitter_start", { clear = true }),
  pattern = parser_filetypes,
  callback = function(args)
    -- Do not download or compile while opening a file.
    local started = pcall(vim.treesitter.start, args.buf)
    if started and vim.treesitter.get_parser(args.buf, nil, { error = false }) then
      vim.wo.foldmethod = "expr"
      vim.wo.foldexpr = "v:lua.vim.treesitter.foldexpr()"
    end
  end,
})
