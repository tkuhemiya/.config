
vim.o.cursorline = true
vim.o.number = true
vim.o.relativenumber = true

vim.o.signcolumn = "yes"

vim.o.pumheight = 10

vim.o.list = true

vim.o.ignorecase = true
vim.o.smartcase = true

vim.o.smartindent = true
vim.o.shiftround = true
vim.o.shiftwidth = 0
vim.o.tabstop = 2

vim.o.undofile = true
vim.o.undolevels = 30

vim.g.mapleader = " "
local map = vim.keymap.set
map('n', '<leader>w', '<Cmd>write<CR>')
map('n', '<leader>q', '<Cmd>:quit<CR>')
map('n', '<leader>o', '<Cmd>:Open .<CR>')
map({ 'n', 'v', 'x' }, ';', ':')
map({ 'n', 'v' }, '<leader>n', ':norm ')
map({ 'n', 'v' }, '<leader>y', '"+yy')

map({ 'n', 'v' }, '<leader>c', ':colorscheme ')
