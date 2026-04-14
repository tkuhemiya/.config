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

local keymap = vim.keymap.set
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

require('flash').setup()

require('snacks').setup({
    indent = {
        enabled = true,
        animate = {
            enabled = true,
            style = "out",
            duration = {
                step = 16,
                total = 220,
            },
        },
        scope = {
            enabled = true,
        },
        chunk = {
            enabled = false,
        },
    },
    statuscolumn = {
        enabled = true,
    },
    words = {
        enabled = false,
        debounce = 180,
        notify_end = false,
    },
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

local mini_statusline = require('mini.statusline')

mini_statusline.setup({
    content = {
        active = function()
            local mode, mode_hl = mini_statusline.section_mode({ trunc_width = 120 })
            local git           = mini_statusline.section_git({ trunc_width = 40 })
            local diagnostics   = mini_statusline.section_diagnostics({ trunc_width = 75 })
            local lsp           = mini_statusline.section_lsp({ trunc_width = 75 })
            local filename      = mini_statusline.section_filename({ trunc_width = 140 })
            local search        = mini_statusline.section_searchcount({ trunc_width = 75 })
            local recording_reg = vim.fn.reg_recording()
            local recording     = recording_reg == '' and '' or 'Recording ' .. recording_reg:upper()

            return mini_statusline.combine_groups({
                { hl = mode_hl,                  strings = { mode, recording } },
                { hl = 'MiniStatuslineDevinfo',  strings = { git, diagnostics } },
                '%<',
                { hl = 'MiniStatuslineFilename', strings = { filename } },
                '%=',
                { hl = 'MiniStatuslineDevinfo',  strings = { lsp } },
                { hl = mode_hl,                  strings = { search } },
            })
        end,
    },
})

require('telescope').setup({
    defaults = {
        layout_strategy = 'horizontal',
        layout_config = {
            horizontal = {
                preview_width = 0.5,
            },
        },
        vimgrep_arguments = {
            'rg',
            '--color=never',
            '--no-heading',
            '--with-filename',
            '--line-number',
            '--column',
            '--smart-case',
            '--hidden',
            '--glob', '!.git/*',
        },
        file_ignore_patterns = { 'node_modules/' },
        preview = {
            enable = true,
            timeout = 100,
            filesize_limit = 1,
            treesitter = true,
        },
    },
})

--require('mini.cursorword').setup()
--require('mini.operators').setup()

local status, ts = pcall(require, 'nvim-treesitter.configs')
if status then
    ts.setup({
        ensure_installed = { "go", "gomod", "gowork", "gosum", "lua", "typescript", "javascript", "rust", "c", "cpp" },
        auto_install = true,
        highlight = {
            enable = true,
            additional_vim_regex_highlighting = false,
        },
    })
end
