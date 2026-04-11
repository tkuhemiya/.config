local capabilities = require('mini.completion').get_lsp_capabilities()
local servers = { 'ts_ls', 'rust_analyzer', 'clangd', 'gopls' }
local mason_tools = { 'typescript-language-server', 'rust-analyzer', 'clangd', 'gopls' }

require('mason').setup()
require('mason-lspconfig').setup({
    ensure_installed = servers,
    automatic_enable = false,
})
require('mason-tool-installer').setup({
    ensure_installed = mason_tools,
})

vim.api.nvim_create_autocmd('LspAttach', {
    callback = function(args)
        local bufnr = args.buf
        local client = vim.lsp.get_client_by_id(args.data.client_id)
        local opts = { buffer = bufnr, silent = true }

        vim.keymap.set('n', 'gd', vim.lsp.buf.definition, vim.tbl_extend('force', opts, { desc = 'LSP definition' }))
        vim.keymap.set('n', 'gD', vim.lsp.buf.declaration, vim.tbl_extend('force', opts, { desc = 'LSP declaration' }))
        vim.keymap.set('n', 'gr', vim.lsp.buf.references, vim.tbl_extend('force', opts, { desc = 'LSP references' }))
        vim.keymap.set('n', 'gi', vim.lsp.buf.implementation, vim.tbl_extend('force', opts, { desc = 'LSP implementation' }))
        vim.keymap.set('n', 'K', vim.lsp.buf.hover, vim.tbl_extend('force', opts, { desc = 'LSP hover' }))
        vim.keymap.set('n', '<leader>rn', vim.lsp.buf.rename, vim.tbl_extend('force', opts, { desc = 'LSP rename' }))
        vim.keymap.set({ 'n', 'v' }, '<leader>ca', vim.lsp.buf.code_action, vim.tbl_extend('force', opts, { desc = 'LSP code action' }))
        vim.keymap.set('n', '<leader>cf', function()
            vim.lsp.buf.format({ async = false })
        end, vim.tbl_extend('force', opts, { desc = 'LSP format buffer' }))

        if client and client:supports_method(vim.lsp.protocol.Methods.textDocument_inlayHint) then
            vim.keymap.set('n', '<leader>th', function()
                vim.lsp.inlay_hint.enable(not vim.lsp.inlay_hint.is_enabled({ bufnr = bufnr }), { bufnr = bufnr })
            end, vim.tbl_extend('force', opts, { desc = 'Toggle inlay hints' }))
        end
    end,
})

vim.lsp.config('*', {
    root_markers = { '.git' },
    capabilities = capabilities,
})

vim.lsp.config('ts_ls', {
    capabilities = capabilities,
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

vim.lsp.config('rust_analyzer', {
    capabilities = capabilities,
    root_markers = { 'Cargo.toml', '.git' },
    settings = {
        ['rust-analyzer'] = {
            check = { command = 'clippy' },
        },
    },
})

vim.lsp.config('clangd', {
    capabilities = capabilities,
    root_markers = { 'compile_commands.json', 'compile_flags.txt', 'CMakeLists.txt', 'main.c', '.git' },
})

vim.lsp.config('gopls', {
    capabilities = capabilities,
    root_markers = { 'go.mod', 'go.work', '.git' },
})

for _, server in ipairs(servers) do
    vim.lsp.enable(server)
end
