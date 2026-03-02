local map = vim.keymap.set

map('n', '<leader>w', '<Cmd>write<CR>')
map('n', '<leader>q', '<Cmd>quit<CR>')
map('n', '<leader>h', '<Cmd>Telescope help_tags<CR>')
map('n', '<leader>f', '<Cmd>Telescope find_files<CR>')
map('n', '<leader>g', '<Cmd>Telescope live_grep<CR>')
map('n', 'Q', '@@')

local toggle_mini_files = function()
    if vim.bo.filetype == 'minifiles' then
        MiniFiles.close()
    else
        MiniFiles.open()
    end
end

map('n', '<leader>r', toggle_mini_files, { desc = 'Toggle file explorer' })
map('n', '<leader>e', toggle_mini_files, { desc = 'Toggle file explorer' })
map('n', '-', function()
    MiniFiles.open(vim.api.nvim_buf_get_name(0), true)
end, { desc = 'Open explorer at current file' })

map({ 'n', 'v' }, '<leader>z', '1z=', { silent = true })
map('n', 'U', '<C-r>')


map({ 'n', 'v', 'x' }, ';', ':')
map({ 'n', 'v' }, '<leader>n', ':norm ')
map({ 'n', 'v' }, '<leader>y', '"+y', { desc = 'Yank to system clipboard' })
map('n', '<leader>yy', '"+yy', { desc = 'Yank line to system clipboard' })
map({ 'n', 'v' }, '<leader>p', '"+p', { desc = 'Paste from system clipboard' })

map('n', '<leader>m', '<Cmd>Mason<CR>')
map('n', '<C-a>', '<Cmd>:%yank +<CR>', { desc = 'Yank entire buffer into " register' })
map('n', '<leader>li', '<Cmd>LspInfo<CR>')
map("t", "<Esc>", "<C-\\><C-N>") -- Exit terminal mode
map("n", "<leader>cw", '<Cmd>cd %:p:h<CR>', { desc = "Set cwd to current file" })
map('n', ']r', function()
    Snacks.words.jump(1, true)
end, { desc = 'Next reference' })
map('n', '[r', function()
    Snacks.words.jump(-1, true)
end, { desc = 'Previous reference' })

--map('i', '<C-Space>', function() require('mini.completion').complete() end, {})
--map('i', '<Tab>', function() require('mini.completion').complete() end, {})

map("v", "<", "<gv")
map("v", ">", ">gv")

map("i", ",", ",<c-g>u")
map("i", ".", ".<c-g>u")
map("i", ";", ";<c-g>u")

map('n', '<Tab>', '<Cmd>bnext<CR>', { desc = 'Next Buffer' })
map('n', '<S-Tab>', '<Cmd>bprev<CR>', { desc = 'Prev Buffer' })
map('n', '<Leader><Tab>', '<Cmd>bdelete<CR>', { desc = 'Close Buffer' })

local has_flash, flash = pcall(require, 'flash')
if has_flash then
    map({ 'n', 'x', 'o' }, '<leader>s', function()
        flash.jump()
    end, { desc = 'Flash jump' })
    map({ 'n', 'x', 'o' }, '<leader>S', function()
        flash.treesitter()
    end, { desc = 'Flash treesitter' })
end
