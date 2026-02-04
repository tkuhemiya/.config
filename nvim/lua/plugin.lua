require('mini.completion').setup({
    delay = { completion = 10, info = 100, signature = 10 },
    mappings = {
        force_twopt = '<C-Space>',
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

local keymap = vim.keymap.set
local check_backspace = function()
  local col = vim.fn.col('.') - 1
  return col == 0 or vim.fn.getline('.'):sub(col, col):match('%s')
end
keymap('i', '<Tab>', [[pumvisible() ? "\<C-n>" : "\<Tab>"]], { expr = true })
keymap('i', '<S-Tab>', [[pumvisible() ? "\<C-p>" : "\<S-Tab>"]], { expr = true })
keymap('i', '<CR>', [[pumvisible() ? "\<C-y>" : "\<CR>"]], { expr = true })

require('mini.cmdline').setup({
    autopeek = {
        enable = true,
        n_context = 1,
        predicate = nil,
    },
})

require('mini.diff').setup()
-- :h MiniDiff-overview
-- :h MiniDiff-source-specification
-- :h MiniDiff-hunk-specification
-- :h MiniDiff-diff-summary

-- Setup icons first so other modules can use them
require('mini.icons').setup({
    style = 'glyph',
})

require('mini.files').setup({
    content = {
        filter = function(entry)
            return entry.name ~= '.git' and entry.name ~= 'node_modules'
        end,
    },
    mappings = {
        synchronize = '=',
        go_in       = 'l',
        go_in_plus  = '<CR>',
    },
    windows = {
        -- max_number = math.huge,
        preview = false,
        width_focus = 50,
        width_nofocus = 15,
        width_preview = 25,
    },
})

require('mini.pick').setup()

--require('mini.cursorword').setup()
--require('mini.operators').setup()

local status, ts = pcall(require, 'nvim-treesitter.configs')
if status then
    ts.setup({
        ensure_installed = { "go", "gomod", "gowork", "gosum", "lua", "typescript", "javascript" },
        highlight = {
            enable = true,
            additional_vim_regex_highlighting = false,
        },
    })
end
