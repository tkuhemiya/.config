
local map = vim.keymap.set
vim.g.mapleader = " "
map('n', '<leader>w', '<Cmd>write<CR>')
map('n', '<leader>f', "<Cmd>Pick files<CR>")

if vim.g.vscode then

else
  -- NeoVim only
end