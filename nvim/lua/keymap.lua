local map = vim.keymap.set

vim.g.mapleader = " "

map('n', '<leader>w', '<Cmd>write<CR>')
map('i', 'jk', '')
map('n', '<leader>q', '<Cmd>:quit<CR>')
map('n', '<leader>h', ':Pick help<CR>')
map('n', '<leader>f', ':Pick files<CR>')
map('n', '<leader>g', ':Pick grep<CR>')
map('n', '<leader>r', ':lua MiniFiles.open()<CR>')
map('n', 'Q', '@@')

map({ 'n', 'v' }, '<leader>z', '1z=', { silent = true })
map('n', 'U', '<C-r>')


map({ 'n', 'v', 'x' }, ';', ':')
map({ 'n', 'v' }, '<leader>n', ':norm ')
map({ 'n', 'v' }, '<leader>y', '"+y')
map({ 'n', 'v' }, '<leader>p', '"+p')

map('n', '<leader>m', '<Cmd>:Mason<CR>')
map('n', '<leader>li', ':LspInfo<CR>')
map('n', '<leader>lf', vim.lsp.buf.format)
map("t", "<Esc>", "<C-\\><C-N>") -- Exit terminal mode
map("n", "<leader>cd", '<cmd>lua vim.fn.chdir(vim.fn.expand("%:p:h"))<CR>')

map('n', 'gd', vim.lsp.buf.definition, { desc = 'Go to definition' })
map('n', 'K', vim.lsp.buf.hover, { desc = 'Hover documentation' })

--map('i', '<C-Space>', function() require('mini.completion').complete() end, {})
--map('i', '<Tab>', function() require('mini.completion').complete() end, {})

map("v", "<", "<gv")
map("v", ">", ">gv")

map("i", ",", ",<c-g>u")
map("i", ".", ".<c-g>u")
map("i", ";", ";<c-g>u")

map('n', '<Tab>', ':bnext<CR>', { desc = 'Next Buffer' })
map('n', '<S-Tab>', ':bprev<CR>', { desc = 'Prev Buffer' })
map('n', '<Leader><Tab>', ':bdelete<CR>', { desc = 'Close Buffer' })
