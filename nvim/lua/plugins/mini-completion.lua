local keymap = vim.keymap.set

keymap('i', '<Tab>', [[pumvisible() ? "\<C-n>" : "\<Tab>"]], { expr = true })
keymap('i', '<S-Tab>', [[pumvisible() ? "\<C-p>" : "\<S-Tab>"]], { expr = true })
keymap('i', '<CR>', [[pumvisible() ? "\<C-y>" : "\<CR>"]], { expr = true })

require('mini.completion').setup({
    delay = { completion = 10, info = 100, signature = 10 },
    mappings = {
        force_twostep = '<C-Space>',
    },
    window = {
        info = { border = 'single' },
        signature = { border = 'single' },
    },
    lsp_completion = {
        source_func = 'omnifunc',
        auto_setup = true,
    },
})
