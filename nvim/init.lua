-- installed on runtime
vim.cmd("colorscheme lucid")

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
vim.opt.expandtab = true
vim.opt.tabstop = 2
vim.opt.shiftwidth = 2
vim.opt.softtabstop = 2

vim.o.undofile = true
vim.o.undolevels = 30
vim.o.swapfile = false

vim.pack.add({
	{src = "https://github.com/stevearc/oil.nvim"},
	{src = "https://github.com/nvim-mini/mini.pick"},
})
require "mini.pick".setup()
require "oil".setup()


vim.g.mapleader = " "
local map = vim.keymap.set
map('n', '<leader>w', '<Cmd>write<CR>')
map('n', '<leader>q', '<Cmd>:quit<CR>')
map('n', '<leader>o', '<Cmd>:Oil .<CR>')
map('n', '<leader>h', ':Pick help<CR>')
map('n', '<leader>f', ':Pick files tool="git"<CR>')
map('n', 'Q', '@@')
map({'n', 'v'}, '<leader>z', '1z=', { silent = true })
map('n', 'U', '<C-r>')


map({ 'n', 'v', 'x' }, ';', ':')
map({ 'n', 'v' }, '<leader>n', ':norm ')
map({ 'n', 'v' }, '<leader>y', '"+y')
map({ 'n', 'v' }, '<leader>p', '"+p')


