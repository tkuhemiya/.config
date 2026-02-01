require('mason').setup()
require('mason-lspconfig').setup({
})
require('mason-tool-installer').setup({
    ensure_installed = { 'ts_ls' },
})

vim.api.nvim_create_autocmd('LspAttach', {
    callback = function(args)
        local bufnr = args.buf
        local opts = { buffer = bufnr }

        vim.keymap.set('n', 'gd', vim.lsp.buf.definition, opts)
        vim.keymap.set('n', 'K', vim.lsp.buf.hover, opts)
        vim.keymap.set('n', 'gr', vim.lsp.buf.rename, opts)
        vim.keymap.set('n', '<leader>ca', vim.lsp.buf.code_action, opts)
        vim.keymap.set('n', '<leader>cf', function() vim.lsp.buf.format({ async = true }) end, opts)
    end,
})

vim.lsp.config('*', {
    root_markers = { '.git' },
    capabilities = require('mini.completion').get_lsp_capabilities(),
})

vim.lsp.config('ts_ls', {
    capabilities = require('mini.completion').get_lsp_capabilities(),
    settings = {
        completions = {
            completeFunctionCalls = true,
        },
    },
    root_markers = { 'package.json', 'tsconfig.json', '.git' },
    init_options = {
        preferences = {
            disableSuggestions = false,
            importModuleSpecifierPreference = 'shortest',
            quotePreference = 'auto',
        },
    },
})

vim.lsp.enable('ts_ls')
