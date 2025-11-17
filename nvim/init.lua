-- todo
-- https://github.com/nvim-telescope/telescope.nvim
-- https://github.com/nvim-telescope/telescope-ui-select.nvim
-- https://github.com/L3MON4D3/LuaSnip -- for snippets
-- https://cmp.saghen.dev/installation

-- :tabnew, :tabclose, :tabnext -- for tabs

vim.cmd("colorscheme lucid2")

vim.o.number = true
vim.o.relativenumber = true
vim.o.cursorline = true
vim.o.signcolumn = "yes"
vim.o.pumheight = 10
vim.o.winborder = "rounded"
vim.o.list = true
vim.o.ignorecase = true
vim.o.smartcase = true
vim.o.smartindent = true
vim.o.undofile = true
vim.o.undolevels = 100
vim.o.swapfile = false
vim.opt.expandtab = true
vim.opt.tabstop = 2
vim.opt.shiftwidth = 2
vim.opt.softtabstop = 2


vim.pack.add({
  { src = "https://github.com/nvim-mini/mini.pick" },
  { src = "https://github.com/nvim-treesitter/nvim-treesitter",        version = "main" },
  { src = "https://github.com/nvim-lua/plenary.nvim" }, -- dependency
  { src = "https://github.com/nvim-telescope/telescope.nvim" },
  { src = "https://github.com/nvim-telescope/telescope-ui-select.nvim" },
  { src = "https://github.com/neovim/nvim-lspconfig" },
  { src = "https://github.com/mason-org/mason.nvim" },
  { src = "https://github.com/saghen/blink.cmp" }
})

vim.lsp.enable({ "lua_ls"})

require('plugin')
require('keymap')
